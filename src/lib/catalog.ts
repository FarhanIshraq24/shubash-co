import { prisma } from "@/lib/prisma";
import { ProductFormat, FragranceFamily, Gender, Concentration, Prisma } from "@prisma/client";
import Decimal from "decimal.js";

export interface CatalogFilterOptions {
  search?: string;
  format?: ProductFormat;
  brandSlug?: string;
  categorySlug?: string;
  family?: FragranceFamily;
  gender?: Gender;
  concentration?: Concentration;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "newest" | "price_asc" | "price_desc" | "featured";
  page?: number;
  pageSize?: number;
}

/**
 * Fetch products for the public storefront with filtering, sorting, and pagination
 */
export async function getStorefrontProducts(options: CatalogFilterOptions = {}) {
  const {
    search,
    format,
    brandSlug,
    categorySlug,
    family,
    gender,
    concentration,
    minPrice,
    maxPrice,
    sortBy = "newest",
    page = 1,
    pageSize = 12,
  } = options;

  const where: Prisma.ProductWhereInput = {
    active: true,
  };
  const and: Prisma.ProductWhereInput[] = [];

  // Search by name, description, or notes
  if (search && search.trim() !== "") {
    and.push({ OR: [
      { name: { contains: search.trim(), mode: "insensitive" } },
      { description: { contains: search.trim(), mode: "insensitive" } },
      { topNotes: { contains: search.trim(), mode: "insensitive" } },
      { middleNotes: { contains: search.trim(), mode: "insensitive" } },
      { baseNotes: { contains: search.trim(), mode: "insensitive" } },
      { brand: { name: { contains: search.trim(), mode: "insensitive" } } },
    ] });
  }

  // Format filter: product must actually sell that format
  if (format) {
    and.push({ variants: { some: { format, active: true } } });
  }

  // Brand filter
  if (brandSlug) {
    where.brand = { slug: brandSlug };
  }

  // Category filter
  if (categorySlug) {
    where.categories = {
      some: {
        category: { slug: categorySlug },
      },
    };
  }

  // Fragrance Family
  if (family) {
    where.fragranceFamily = family;
  }

  // Gender
  if (gender) {
    where.gender = gender;
  }

  // Concentration
  if (concentration) {
    where.concentration = concentration;
  }

  // Price range (filtering through variants)
  if (minPrice !== undefined || maxPrice !== undefined) {
    and.push({ variants: {
      some: {
        active: true,
        AND: [
          minPrice !== undefined ? { price: { gte: minPrice } } : {},
          maxPrice !== undefined ? { price: { lte: maxPrice } } : {},
        ],
      },
    } });
  }
  if (and.length) where.AND = and;

  // Sorting (price sorts are done in memory below — Prisma can't order by min(variant.price))
  const sortByPrice = sortBy === "price_asc" || sortBy === "price_desc";
  let orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ createdAt: "desc" }];
  if (sortBy === "featured") {
    orderBy = [{ featured: "desc" }, { position: "asc" }, { createdAt: "desc" }];
  }

  const safePage = Math.max(1, Number.isFinite(page) ? page : 1);
  const skip = (safePage - 1) * pageSize;

  try {
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          brand: true,
          images: {
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
            take: 2,
          },
          variants: {
            where: { active: true },
            orderBy: { price: "asc" },
          },
          sourceBottles: {
            where: { status: "ACTIVE" },
            select: { remainingMl: true, reservedMl: true },
          },
          sealedBottles: {
            select: { quantity: true },
          },
        },
        orderBy,
        ...(sortByPrice ? {} : { skip, take: pageSize }),
      }),
      prisma.product.count({ where }),
    ]);

    // Format products with derived inventory availability and min/max prices
    const formatted = products.map((product) => {
      const decantVariants = product.variants.filter(
        (v) => v.format === ProductFormat.DECANT
      );
      const fullBottleVariants = product.variants.filter(
        (v) => v.format === ProductFormat.FULL_BOTTLE
      );

      // Decant liquid calculation
      const totalAvailableMl = product.sourceBottles.reduce((acc, sb) => {
        const remaining = new Decimal(sb.remainingMl.toString());
        const reserved = new Decimal(sb.reservedMl.toString());
        const avail = remaining.minus(reserved);
        return acc.plus(avail.isPositive() ? avail : 0);
      }, new Decimal(0));

      // Sealed bottle units
      const totalSealedUnits = product.sealedBottles.reduce(
        (acc, b) => acc + b.quantity,
        0
      );

      // Price summary labels
      const lowestDecantPrice = decantVariants.length > 0 ? decantVariants[0].price : null;
      const lowestFullBottlePrice = fullBottleVariants.length > 0 ? fullBottleVariants[0].price : null;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        format: product.format,
        concentration: product.concentration,
        fragranceFamily: product.fragranceFamily,
        gender: product.gender,
        images: product.images,
        decantVariants,
        fullBottleVariants,
        lowestDecantPrice,
        lowestFullBottlePrice,
        hasDecants: decantVariants.length > 0 && totalAvailableMl.greaterThan(0),
        hasFullBottles: fullBottleVariants.length > 0 && totalSealedUnits > 0,
        totalAvailableMl: totalAvailableMl.toNumber(),
        totalSealedUnits,
        featured: product.featured,
        minPrice: product.variants.length ? Number(product.variants[0].price) : null,
      };
    });

    let pageItems = formatted;
    if (sortByPrice) {
      const dir = sortBy === "price_asc" ? 1 : -1;
      pageItems = [...formatted]
        .sort((a, b) => ((a.minPrice ?? Infinity) - (b.minPrice ?? Infinity)) * dir)
        .slice(skip, skip + pageSize);
    }

    return {
      products: pageItems,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      currentPage: safePage,
    };
  } catch (error) {
    console.error("Error fetching storefront products:", error);
    return {
      products: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: page,
    };
  }
}

/**
 * Fetch a single product by slug with all details, variants, images, and live inventory
 */
export async function getProductBySlug(slug: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        brand: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        },
        variants: {
          where: { active: true },
          orderBy: [{ format: "asc" }, { volumeMl: "asc" }],
        },
        categories: {
          include: { category: true },
        },
        sourceBottles: {
          where: { status: "ACTIVE" },
        },
        sealedBottles: true,
      },
    });

    if (!product || !product.active) return null;

    // Calculate decant liquid availability
    const availableMl = product.sourceBottles.reduce((acc, sb) => {
      const remaining = new Decimal(sb.remainingMl.toString());
      const reserved = new Decimal(sb.reservedMl.toString());
      const avail = remaining.minus(reserved);
      return acc.plus(avail.isPositive() ? avail : 0);
    }, new Decimal(0));

    // Calculate sealed bottles available
    const sealedUnits = product.sealedBottles.reduce((acc, sb) => acc + sb.quantity, 0);

    const decantVariants = product.variants.filter((v) => v.format === ProductFormat.DECANT);
    const fullBottleVariants = product.variants.filter((v) => v.format === ProductFormat.FULL_BOTTLE);

    return {
      ...product,
      availableMl: availableMl.toNumber(),
      sealedUnits,
      decantVariants,
      fullBottleVariants,
    };
  } catch (error) {
    console.error(`Error fetching product by slug ${slug}:`, error);
    return null;
  }
}

/**
 * Fetch all active brands with product counts
 */
export async function getActiveBrands() {
  try {
    const brands = await prisma.brand.findMany({
      where: { active: true },
      include: {
        _count: {
          select: { products: { where: { active: true } } },
        },
      },
      orderBy: { name: "asc" },
    });
    return brands;
  } catch (error) {
    console.error("Error fetching brands:", error);
    return [];
  }
}
