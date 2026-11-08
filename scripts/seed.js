/**
 * Shubash & Co. — Development Database Seeder
 * Run with: npm run db:seed
 */

const { PrismaClient, ProductFormat, Concentration, FragranceFamily, Gender, SourceBottleStatus } = require('@prisma/client');
const Decimal = require('decimal.js');

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding Shubash & Co. catalog & inventory...');

  // 1. Storage Location
  const location = await prisma.location.upsert({
    where: { name: 'Dhaka Dispensing Lab' },
    update: {},
    create: {
      name: 'Dhaka Dispensing Lab',
      description: 'Sterile laboratory environment for perfume decanting and retail packaging.',
      active: true,
    },
  });

  // 2. Ledger Accounts (Double-Entry Bookkeeping Setup)
  const accounts = [
    { code: '1001', name: 'Cash in Hand', type: 'ASSET', normal: 'DEBIT' },
    { code: '1002', name: 'City Bank Account', type: 'ASSET', normal: 'DEBIT' },
    { code: '1003', name: 'bKash Merchant Account', type: 'ASSET', normal: 'DEBIT' },
    { code: '1004', name: 'Nagad Merchant Account', type: 'ASSET', normal: 'DEBIT' },
    { code: '1005', name: 'Courier COD Receivable (Steadfast)', type: 'ASSET', normal: 'DEBIT' },
    { code: '1200', name: 'Perfume Inventory Asset', type: 'ASSET', normal: 'DEBIT' },
    { code: '2001', name: 'Supplier Accounts Payable', type: 'LIABILITY', normal: 'CREDIT' },
    { code: '4001', name: 'Sales Revenue — Decants', type: 'REVENUE', normal: 'CREDIT' },
    { code: '4002', name: 'Sales Revenue — Full Bottles', type: 'REVENUE', normal: 'CREDIT' },
    { code: '4003', name: 'Delivery Charge Income', type: 'REVENUE', normal: 'CREDIT' },
    { code: '5001', name: 'Cost of Goods Sold (COGS) — Decants', type: 'EXPENSE', normal: 'DEBIT' },
    { code: '5002', name: 'Cost of Goods Sold (COGS) — Bottles', type: 'EXPENSE', normal: 'DEBIT' },
    { code: '5003', name: 'Courier Delivery Expense', type: 'EXPENSE', normal: 'DEBIT' },
    { code: '5004', name: 'Packaging & Atomizers Expense', type: 'EXPENSE', normal: 'DEBIT' },
  ];

  for (const acc of accounts) {
    await prisma.ledgerAccount.upsert({
      where: { code: acc.code },
      update: {},
      create: acc,
    });
  }

  // 3. Settings (Delivery fees, policies, reservation timeout)
  const settings = [
    {
      key: 'delivery_zones',
      value: {
        insideDhaka: { fee: 80, name: 'Inside Dhaka City', deliveryTimeDays: '1-2 days' },
        outsideDhaka: { fee: 150, name: 'Outside Dhaka (All BD)', deliveryTimeDays: '2-4 days' },
        freeShippingThreshold: 4000,
      },
    },
    {
      key: 'payment_methods',
      value: {
        codEnabled: true,
        bkashManualEnabled: true,
        nagadManualEnabled: true,
        rocketManualEnabled: false,
        gatewayEnabled: false,
      },
    },
    {
      key: 'reservation_expiry_minutes',
      value: 60,
    },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  // 4. Fragrance Brands
  const brandsData = [
    {
      name: 'Lattafa Perfumes',
      slug: 'lattafa-perfumes',
      country: 'United Arab Emirates',
      description: 'Acclaimed Middle Eastern fragrance house famous for opulent gourmands and oriental masterworks.',
    },
    {
      name: 'Armaf',
      slug: 'armaf',
      country: 'United Arab Emirates',
      description: 'Globally celebrated for high-projection, long-lasting designer-alternative scents.',
    },
    {
      name: 'Rasasi',
      slug: 'rasasi',
      country: 'United Arab Emirates',
      description: 'Pioneering Dubai perfume house with 4 decades of heritage in aquatic and fresh compositions.',
    },
    {
      name: 'Afnan',
      slug: 'afnan',
      country: 'United Arab Emirates',
      description: 'Sophisticated modern blends engineered with exquisite sillage and versatility.',
    },
    {
      name: 'Nishane',
      slug: 'nishane',
      country: 'Turkey',
      description: 'Istanbul-based luxury niche house famed for potent extrait de parfum concentrations.',
    },
  ];

  const brandMap = {};
  for (const b of brandsData) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {},
      create: b,
    });
    brandMap[b.slug] = brand;
  }

  // 5. Products, Variants & Sample Inventory
  const productsData = [
    {
      name: 'Khamrah Qahwa',
      slug: 'khamrah-qahwa',
      brandSlug: 'lattafa-perfumes',
      description: 'A luxurious warm blend opening with dark roasted coffee beans and candied ginger, melting into creamy praline, roasted tonka bean, and boozy sweet amber.',
      topNotes: 'Ginger, Cinnamon, Cardamom',
      middleNotes: 'Praline, Candied Fruits, Roasted Coffee Beans',
      baseNotes: 'Vanilla, Tonka Bean, Benzoin, Musk, Coffee Oil',
      concentration: Concentration.EDP,
      fragranceFamily: FragranceFamily.GOURMAND,
      gender: Gender.UNISEX,
      format: ProductFormat.BOTH,
      sealedVolume: 100,
      sealedCost: 3200,
      sealedUnits: 4,
      openMl: 70, // 70ml remaining in source bottle
      decantVariants: [
        { volumeMl: 3, price: 380, sku: 'KHM-QHW-DEC-3ML' },
        { volumeMl: 5, price: 580, sku: 'KHM-QHW-DEC-5ML' },
        { volumeMl: 10, price: 1050, sku: 'KHM-QHW-DEC-10ML' },
      ],
      fullBottleVariant: { volumeMl: 100, price: 4200, sku: 'KHM-QHW-BTL-100ML' },
    },
    {
      name: 'Club de Nuit Intense Man',
      slug: 'club-de-nuit-intense-man',
      brandSlug: 'armaf',
      description: 'The iconic modern masculine standard. Starts with sparkling blackcurrant and smoky birch before settling into a magnetic ambergris and musk finish.',
      topNotes: 'Lemon, Blackcurrant, Apple, Bergamot, Pineapple',
      middleNotes: 'Rose, Jasmine, Birch',
      baseNotes: 'Vanilla, Ambergris, Musk, Patchouli',
      concentration: Concentration.EDP,
      fragranceFamily: FragranceFamily.CITRUS,
      gender: Gender.MASCULINE,
      format: ProductFormat.BOTH,
      sealedVolume: 150,
      sealedCost: 3900,
      sealedUnits: 6,
      openMl: 110,
      decantVariants: [
        { volumeMl: 3, price: 290, sku: 'CDNIM-DEC-3ML' },
        { volumeMl: 5, price: 450, sku: 'CDNIM-DEC-5ML' },
        { volumeMl: 10, price: 850, sku: 'CDNIM-DEC-10ML' },
      ],
      fullBottleVariant: { volumeMl: 150, price: 5200, sku: 'CDNIM-BTL-150ML' },
    },
    {
      name: 'Hawas for Men',
      slug: 'hawas-for-men',
      brandSlug: 'rasasi',
      description: 'An invigorating aquatic powerhouse blending crisp Italian citrus, sweet cinnamon, and fresh oceanic breeze with sensual grey amber.',
      topNotes: 'Apple, Bergamot, Lemon, Cinnamon',
      middleNotes: 'Orange Blossom, Cardamom, Plum, Watery Notes',
      baseNotes: 'Patchouli, Grey Amber, Driftwood, Musk',
      concentration: Concentration.EDP,
      fragranceFamily: FragranceFamily.AQUATIC,
      gender: Gender.MASCULINE,
      format: ProductFormat.BOTH,
      sealedVolume: 100,
      sealedCost: 4600,
      sealedUnits: 3,
      openMl: 45,
      decantVariants: [
        { volumeMl: 3, price: 350, sku: 'HWS-DEC-3ML' },
        { volumeMl: 5, price: 550, sku: 'HWS-DEC-5ML' },
        { volumeMl: 10, price: 980, sku: 'HWS-DEC-10ML' },
      ],
      fullBottleVariant: { volumeMl: 100, price: 5800, sku: 'HWS-BTL-100ML' },
    },
    {
      name: '9pm',
      slug: 'afnan-9pm',
      brandSlug: 'afnan',
      description: 'An evening sensation of wild bergamot, crisp green apple, and spiced lavender wrapped in warm vanilla and toasted tonka bean.',
      topNotes: 'Bergamot, Lavender, Black Pepper, Apple',
      middleNotes: 'Lily-of-the-Valley, Cinnamon',
      baseNotes: 'Amber, Patchouli, Vanilla, Tonka Bean',
      concentration: Concentration.EDP,
      fragranceFamily: FragranceFamily.ORIENTAL,
      gender: Gender.MASCULINE,
      format: ProductFormat.BOTH,
      sealedVolume: 100,
      sealedCost: 3400,
      sealedUnits: 5,
      openMl: 60,
      decantVariants: [
        { volumeMl: 3, price: 300, sku: 'AFN9-DEC-3ML' },
        { volumeMl: 5, price: 480, sku: 'AFN9-DEC-5ML' },
        { volumeMl: 10, price: 890, sku: 'AFN9-DEC-10ML' },
      ],
      fullBottleVariant: { volumeMl: 100, price: 4500, sku: 'AFN9-BTL-100ML' },
    },
    {
      name: 'Hacivat',
      slug: 'nishane-hacivat',
      brandSlug: 'nishane',
      description: 'An extraordinary extrait de parfum paying tribute to elegance and love of art. Juicy pineapple and bergamot meet clean cedarwood and heavy oakmoss.',
      topNotes: 'Pineapple, Bergamot, Grapefruit',
      middleNotes: 'Jasmine, Patchouli, Cedarwood',
      baseNotes: 'Clearwood, Oakmoss, Dry Timber',
      concentration: Concentration.EXTRAIT,
      fragranceFamily: FragranceFamily.CHYPRE,
      gender: Gender.UNISEX,
      format: ProductFormat.DECANT, // decant-only example
      sealedVolume: 100,
      sealedCost: 15500,
      sealedUnits: 1,
      openMl: 35,
      decantVariants: [
        { volumeMl: 3, price: 950, sku: 'HAC-DEC-3ML' },
        { volumeMl: 5, price: 1550, sku: 'HAC-DEC-5ML' },
        { volumeMl: 10, price: 2900, sku: 'HAC-DEC-10ML' },
      ],
      fullBottleVariant: null,
    },
  ];

  for (const item of productsData) {
    const brand = brandMap[item.brandSlug];
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {},
      create: {
        name: item.name,
        slug: item.slug,
        brandId: brand.id,
        description: item.description,
        topNotes: item.topNotes,
        middleNotes: item.middleNotes,
        baseNotes: item.baseNotes,
        concentration: item.concentration,
        fragranceFamily: item.fragranceFamily,
        gender: item.gender,
        format: item.format,
        active: true,
        featured: true,
      },
    });

    // Create variants
    for (const d of item.decantVariants) {
      await prisma.productVariant.upsert({
        where: { sku: d.sku },
        update: {},
        create: {
          productId: product.id,
          sku: d.sku,
          format: ProductFormat.DECANT,
          volumeMl: d.volumeMl.toString(),
          price: d.price.toString(),
          packagingNote: 'Glass atomizer with fine-mist spray nozzle in padded sleeve',
          active: true,
        },
      });
    }

    if (item.fullBottleVariant) {
      await prisma.productVariant.upsert({
        where: { sku: item.fullBottleVariant.sku },
        update: {},
        create: {
          productId: product.id,
          sku: item.fullBottleVariant.sku,
          format: ProductFormat.FULL_BOTTLE,
          volumeMl: item.fullBottleVariant.volumeMl.toString(),
          price: item.fullBottleVariant.price.toString(),
          packagingNote: 'Sealed retail box with batch code verification',
          active: true,
        },
      });
    }

    // Create sealed bottle inventory
    const sealedBottle = await prisma.sealedBottle.create({
      data: {
        productId: product.id,
        locationId: location.id,
        batchRef: `BATCH-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        volumeMl: item.sealedVolume.toString(),
        quantity: item.sealedUnits,
        costPerUnit: item.sealedCost.toString(),
      },
    });

    // Create open decant source bottle
    const costPerMl = new Decimal(item.sealedCost).dividedBy(item.sealedVolume);
    await prisma.sourceBottle.create({
      data: {
        productId: product.id,
        locationId: location.id,
        batchRef: sealedBottle.batchRef,
        totalMl: item.sealedVolume.toString(),
        remainingMl: item.openMl.toString(),
        reservedMl: '0',
        costBasis: item.sealedCost.toString(),
        costPerMl: costPerMl.toFixed(4),
        convertedFromBottleId: sealedBottle.id,
        status: SourceBottleStatus.ACTIVE,
        notes: 'Initial seed source bottle for daily decanting',
      },
    });
  }

  console.log('✔ Seed completed successfully!');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
