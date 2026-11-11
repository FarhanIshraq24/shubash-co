import { describe, it, expect, vi } from "vitest";
import { ProductFormat } from "@prisma/client";

// computeVariantStock is pure; stub the DB client so importing lib/cart doesn't connect
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { computeVariantStock } from "@/lib/cart";

const product = { id: "p1" };

describe("computeVariantStock", () => {
  it("limits decants by the best single source bottle (one line is filled from one bottle)", () => {
    const src = [
      { productId: "p1", remainingMl: "12", reservedMl: "0" },
      { productId: "p1", remainingMl: "30", reservedMl: "4" }, // 26 available
      { productId: "other", remainingMl: "500", reservedMl: "0" },
    ];
    expect(computeVariantStock({ format: ProductFormat.DECANT, volumeMl: "5", product }, src, []).maxQty).toBe(5);
    expect(computeVariantStock({ format: ProductFormat.DECANT, volumeMl: "10", product }, src, []).maxQty).toBe(2);
  });

  it("returns 0 decants when everything is reserved", () => {
    const src = [{ productId: "p1", remainingMl: "10", reservedMl: "10" }];
    expect(computeVariantStock({ format: ProductFormat.DECANT, volumeMl: "3", product }, src, []).maxQty).toBe(0);
  });

  it("counts only sealed bottles of the matching size for full bottles", () => {
    const sealed = [
      { productId: "p1", volumeMl: "100", quantity: 3 },
      { productId: "p1", volumeMl: "100.00", quantity: 1 },
      { productId: "p1", volumeMl: "50", quantity: 9 },
    ];
    expect(
      computeVariantStock({ format: ProductFormat.FULL_BOTTLE, volumeMl: "100", product }, [], sealed).maxQty
    ).toBe(4);
    expect(
      computeVariantStock({ format: ProductFormat.FULL_BOTTLE, volumeMl: "200", product }, [], sealed).maxQty
    ).toBe(0);
  });
});
