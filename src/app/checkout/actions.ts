"use server";

import { prisma } from "@/lib/prisma";
import { validateCart } from "@/lib/cart";
import { generateOrderNumber } from "@/lib/utils";
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

    // Check availability
    for (const item of cartSummary.items) {
      if (!item.inStock || item.quantity > item.maxQty) {
        return {
          success: false,
          error: `Sorry, only ${item.maxQty} of "${item.productName} (${item.volumeMl}ml)" is currently available.`,
        };
      }
    }

    // 3. Customer Resolution
    const currentUser = await getCurrentUser();
    let customerId: string | null = currentUser?.id || null;

    if (!customerId) {
      // Find or create customer by phone
      const existingCustomer = await prisma.customer.findUnique({
        where: { phone },
      });
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const newCustomer = await prisma.customer.create({
          data: {
            name,
            phone,
            email,
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
    const orderNumber = generateOrderNumber();
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

        // Reserve stock
        if (item.format === ProductFormat.DECANT && item.volumeMl) {
          const totalMlToReserve = item.volumeMl.mul(item.quantity);
          await reserveLiquidForOrderItem({
            orderItemId: orderItem.id,
            productId: item.productId,
            variantId: item.variantId,
            volumeMl: totalMlToReserve,
          });
        } else if (item.format === ProductFormat.FULL_BOTTLE) {
          // Reserve discrete sealed bottle units
          const sealedBottle = await tx.sealedBottle.findFirst({
            where: { productId: item.productId, quantity: { gte: item.quantity } },
          });
          if (sealedBottle) {
            await tx.sealedBottle.update({
              where: { id: sealedBottle.id },
              data: { quantity: { decrement: item.quantity } },
            });
            await tx.stockMovement.create({
              data: {
                type: StockMovementType.RESERVE,
                sealedBottleId: sealedBottle.id,
                quantityUnits: item.quantity,
                orderId: newOrder.id,
                note: `Reserved ${item.quantity} sealed bottle(s) for Order ${orderNumber}`,
              },
            });
          }
        }
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
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/inventory");

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      trackingToken: order.trackingToken,
    };
  } catch (err: unknown) {
    console.error("[placeOrder error]", err);
    const message = err instanceof Error ? err.message : "An unexpected error occurred while placing your order.";
    return {
      success: false,
      error: message,
    };
  }
}
