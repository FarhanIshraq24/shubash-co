"use server";

import { prisma } from "@/lib/prisma";
import { validateCart } from "@/lib/cart";
import { generateOrderNumber, formatVolume } from "@/lib/utils";
import Decimal from "decimal.js";
import { reserveLiquidForOrderItem } from "@/lib/inventory";
import { getCurrentUser } from "@/lib/auth-helpers";
import {
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  PaymentMethod,
  PaymentVerificationStatus,
  ProductFormat,
  StockMovementType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface PlaceOrderInput {
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  address: {
    division: string;
    district: string;
    thana: string;
    fullAddress: string;
    deliveryNote?: string;
  };
  items: Array<{
    variantId: string;
    quantity: number;
  }>;
  payment: {
    method: "COD" | "BKASH" | "NAGAD" | "ROCKET";
    senderPhone?: string;
    trxId?: string;
  };
  couponCode?: string;
}

export interface PlaceOrderResult {
  success: boolean;
  error?: string;
  orderId?: string;
  orderNumber?: string;
  trackingToken?: string;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  try {
    // 1. Validation
    const name = input.customer.name.trim();
    const phone = input.customer.phone.trim().replace(/^(?:\+?88)?0?/, "0");
    const email = input.customer.email?.trim().toLowerCase() || null;

    if (!name || name.length < 2) {
      return { success: false, error: "Please enter your full name (minimum 2 characters)." };
    }

    const phoneRegex = /^01[3-9]\d{8}$/;
    if (!phoneRegex.test(phone)) {
      return {
        success: false,
        error: "Please enter a valid 11-digit Bangladesh mobile number (e.g. 017XXXXXXXX).",
      };
    }

    if (!input.address.division || !input.address.district || !input.address.fullAddress) {
      return { success: false, error: "Please provide your complete delivery address and district." };
    }

    // Payment validation
    const methodEnum =
      input.payment.method === "COD"
        ? PaymentMethod.COD
        : input.payment.method === "BKASH"
        ? PaymentMethod.BKASH
        : input.payment.method === "NAGAD"
        ? PaymentMethod.NAGAD
        : PaymentMethod.ROCKET;

    let trxId: string | null = null;
    let senderPhone: string | null = null;

    if (methodEnum !== PaymentMethod.COD) {
      trxId = (input.payment.trxId || "").trim().toUpperCase();
      senderPhone = (input.payment.senderPhone || "").trim().replace(/^(?:\+?88)?0?/, "0");

      if (!trxId || trxId.length < 4) {
        return {
          success: false,
          error: "Please enter a valid Transaction ID (TrxID) from your mobile banking app.",
        };
      }
      if (!phoneRegex.test(senderPhone)) {
        return {
          success: false,
          error: "Please enter the valid mobile number from which the payment was sent.",
        };
      }
    }

    // 2. Validate Cart and Live Prices/Stock
    const districtSlug = input.address.district.toLowerCase().includes("dhaka") ? "dhaka" : "outside-dhaka";
    const cartSummary = await validateCart(input.items, districtSlug, input.couponCode);

    if (cartSummary.items.length === 0) {
      return { success: false, error: "Your cart is empty. Please add items to proceed." };
    }

    // Check availability (compare against what the customer actually asked for)
    for (const item of cartSummary.items) {
      const requested = input.items.find((i) => i.variantId === item.variantId)?.quantity ?? item.quantity;
      if (!item.inStock || requested > item.maxQty) {
        return {
          success: false,
          error: item.inStock
            ? `Sorry, only ${item.maxQty} of "${item.productName} (${formatVolume(item.volumeMl)})" is available. Please update your cart.`
            : `Sorry, "${item.productName} (${formatVolume(item.volumeMl)})" just went out of stock. Please remove it from your cart.`,
        };
      }
    }
    if (input.items.length !== cartSummary.items.length) {
      return {
        success: false,
        error: "Some items in your cart are no longer available. Please review your cart.",
      };
    }
    if (input.couponCode?.trim() && cartSummary.couponError) {
      return { success: false, error: cartSummary.couponError };
    }

    // 3. Customer Resolution
    // Only a logged-in *customer* owns the order (an admin session must not be used as customerId)
    const currentUser = await getCurrentUser();
    let customerId: string | null = currentUser?.type === "customer" ? currentUser.id : null;

    if (!customerId) {
      // Find or create customer by phone
      const existingCustomer = await prisma.customer.findUnique({
        where: { phone },
      });
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        // email is unique — don't fail checkout if another account already uses it
        const emailTaken = email
          ? await prisma.customer.findUnique({ where: { email }, select: { id: true } })
          : null;
        const newCustomer = await prisma.customer.create({
          data: {
            name,
            phone,
            email: emailTaken ? null : email,
          },
        });
        customerId = newCustomer.id;
      }
    }

    // 4. Save Address
    let addressId: string | null = null;
    if (customerId) {
      const address = await prisma.address.create({
        data: {
          customerId,
          recipientName: name,
          phone,
          district: input.address.district,
          area: input.address.thana,
          fullAddress: input.address.fullAddress,
        },
      });
      addressId = address.id;
    }

    // 5. Unique Order Number & Unguessable Tracking Token
    const yearPrefix = `SC-${new Date().getFullYear()}-`;
    let seq = (await prisma.order.count({ where: { orderNumber: { startsWith: yearPrefix } } })) + 1;
    let orderNumber = generateOrderNumber(seq);
    while (await prisma.order.findUnique({ where: { orderNumber }, select: { id: true } })) {
      orderNumber = generateOrderNumber(++seq);
    }
    const trackingToken = crypto.randomUUID();

    const paymentStatus =
      methodEnum === PaymentMethod.COD
        ? PaymentStatus.UNPAID
        : PaymentStatus.PENDING_VERIFICATION;

    // 6. Atomic Transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          trackingToken,
          customerId,
          addressId,
          customerSnapshot: {
            name,
            phone,
            email,
          },
          addressSnapshot: {
            division: input.address.division,
            district: input.address.district,
            thana: input.address.thana,
            fullAddress: input.address.fullAddress,
            deliveryNote: input.address.deliveryNote || null,
          },
          status: OrderStatus.PENDING,
          paymentStatus,
          fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
          paymentMethod: methodEnum,
          subtotal: cartSummary.subtotal,
          deliveryFee: cartSummary.deliveryFee,
          discountAmount: cartSummary.discount,
          total: cartSummary.total,
          deliveryZone: districtSlug === "dhaka" ? "Dhaka City" : "Outside Dhaka",
          deliveryNote: input.address.deliveryNote || null,
        },
      });

      // Create Order Items and Reservations
      for (const item of cartSummary.items) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            variantId: item.variantId,
            variantSnapshot: {
              productName: item.productName,
              brandName: item.brandName,
              format: item.format,
              volumeMl: item.volumeMl?.toString() || null,
              slug: item.slug,
            },
            quantity: item.quantity,
            unitPrice: item.priceEach,
            totalPrice: item.subtotal,
          },
        });

        // Reserve stock — inside this same transaction so a failure rolls back the whole order
        if (item.format === ProductFormat.DECANT && item.volumeMl) {
          const totalMlToReserve = item.volumeMl.mul(item.quantity);
          await reserveLiquidForOrderItem(
            {
              orderItemId: orderItem.id,
              productId: item.productId,
              variantId: item.variantId,
              volumeMl: totalMlToReserve,
              productName: item.productName,
              // hold for 7 days; staff fill decants after confirming the order
              expiresInMinutes: 60 * 24 * 7,
            },
            tx
          );
        } else {
          // Take sealed units of the matching bottle size, oldest stock first
          const lots = await tx.sealedBottle.findMany({
            where: {
              productId: item.productId,
              quantity: { gt: 0 },
              ...(item.volumeMl ? { volumeMl: new Decimal(item.volumeMl).toFixed(2) } : {}),
            },
            orderBy: { createdAt: "asc" },
          });
          let needed = item.quantity;
          for (const lot of lots) {
            if (needed <= 0) break;
            const take = Math.min(needed, lot.quantity);
            // conditional decrement guards against a concurrent order taking the same units
            const updated = await tx.sealedBottle.updateMany({
              where: { id: lot.id, quantity: { gte: take } },
              data: { quantity: { decrement: take } },
            });
            if (updated.count === 0) continue;
            needed -= take;
            await tx.stockMovement.create({
              data: {
                type: StockMovementType.RESERVE,
                sealedBottleId: lot.id,
                quantityUnits: take,
                orderId: newOrder.id,
                referenceId: orderItem.id,
                referenceType: "OrderItem",
                note: `Reserved ${take} sealed bottle(s) for Order ${orderNumber}`,
              },
            });
          }
          if (needed > 0) {
            throw new Error(
              `Sorry, "${item.productName}" (${formatVolume(item.volumeMl)}) just sold out. Please update your cart.`
            );
          }
        }
      }

      // Record coupon usage
      if (cartSummary.couponId && cartSummary.discount.gt(0)) {
        await tx.order.update({
          where: { id: newOrder.id },
          data: { couponId: cartSummary.couponId, couponCode: cartSummary.couponCode },
        });
        await tx.couponRedemption.create({
          data: {
            couponId: cartSummary.couponId,
            orderId: newOrder.id,
            customerId,
            discountAmount: cartSummary.discount,
          },
        });
        await tx.coupon.update({
          where: { id: cartSummary.couponId },
          data: { timesUsed: { increment: 1 } },
        });
      }

      // Create Payment Record
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          method: methodEnum,
          amount: cartSummary.total,
          status:
            methodEnum === PaymentMethod.COD
              ? PaymentVerificationStatus.APPROVED
              : PaymentVerificationStatus.PENDING,
          payerNumber: senderPhone,
          transactionRef: trxId,
        },
      });

      // Create Initial Shipment
      await tx.shipment.create({
        data: {
          orderId: newOrder.id,
          courier: districtSlug === "dhaka" ? "Pathao / In-house" : "Steadfast Courier",
          notes: "Awaiting decanting and package sealing",
        },
      });

      // Create Order Status Event
      await tx.orderStatusEvent.create({
        data: {
          orderId: newOrder.id,
          toStatus: OrderStatus.PENDING,
          note: `Order placed online via ${methodEnum}`,
        },
      });

      return newOrder;
    }, { timeout: 30000, maxWait: 10000 });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    for (const item of cartSummary.items) revalidatePath(`/products/${item.slug}`);

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      trackingToken: order.trackingToken,
    };
  } catch (err: unknown) {
    console.error("[placeOrder error]", err);
    let message = "An unexpected error occurred while placing your order. Please try again.";
    if (err instanceof Error && err.message.startsWith("Sorry,")) message = err.message;
    return {
      success: false,
      error: message,
    };
  }
}
