import React, { Suspense } from "react";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { TrackClient, TrackingData } from "./TrackClient";
import { prisma } from "@/lib/prisma";
import { formatBDT } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth-helpers";

interface TrackPageProps {
  searchParams: Promise<{
    token?: string;
    order?: string;
  }>;
}

export const metadata = {
  title: "Track Order Status | Shubash & Co. (সুবাস & Co.)",
  description: "Check the real-time preparation, decanting, and courier delivery status of your fragrance order.",
};

export default async function TrackOrderPage({ searchParams }: TrackPageProps) {
  const params = await searchParams;
  const initialQuery = params.token || params.order || "";
  const currentUser = await getCurrentUser();

  let initialData: TrackingData | null = null;

  if (initialQuery) {
    try {
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { trackingToken: initialQuery },
            { orderNumber: { equals: initialQuery, mode: "insensitive" } },
          ],
        },
        include: {
          items: true,
          shipments: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (order) {
        const customerSnapshot = order.customerSnapshot as { name?: string } | null;
        const addressSnapshot = order.addressSnapshot as { district?: string } | null;
        const latestShipment = order.shipments[0];

        const safeName = customerSnapshot?.name
          ? customerSnapshot.name.split(" ")[0] + " ***"
          : "Customer";

        initialData = {
          orderNumber: order.orderNumber,
          trackingToken: order.trackingToken,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt.toISOString(),
          recipientName: safeName,
          recipientCity: addressSnapshot?.district || "Bangladesh",
          totalFormatted: formatBDT(order.total),
          courierName: latestShipment?.courier || null,
          courierTrackingNumber: latestShipment?.trackingNumber || null,
          items: order.items.map((item) => {
            const snap = item.variantSnapshot as {
              productName?: string;
              brandName?: string;
              format?: string;
              volumeMl?: string;
            } | null;
            return {
              name: snap?.productName || "Fragrance Item",
              brand: snap?.brandName || "Luxury Brand",
              format: snap?.format || "DECANT",
              volumeMl: snap?.volumeMl || null,
              quantity: item.quantity,
            };
          }),
        };
      }
    } catch {
      // Database not yet configured
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Header customerName={currentUser?.name || null} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="pb-6 mb-6 border-b border-[var(--border-subtle)] text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-strong)]">
            Live Order Tracking
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Real-time updates from sterile decanting to nationwide doorstep delivery.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="py-20 text-center space-y-4">
              <div className="h-10 w-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-[var(--text-secondary)]">Loading tracker...</p>
            </div>
          }
        >
          <TrackClient initialData={initialData} initialQuery={initialQuery} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
