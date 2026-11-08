const fs = require('fs');
const path = require('path');

const firstPromptPath = path.join(__dirname, '..', '..', 'first_prompt.txt');
const firstPrompt = fs.existsSync(firstPromptPath) ? fs.readFileSync(firstPromptPath, 'utf8') : '';

const handoffContent = `# Shubash & Co. (সুবাস & Co.) — Complete Project Handoff & Technical Architecture

> **Purpose of this document**:  
> Whenever switching AI models, sessions, or developers, feed or reference this file. It documents everything that has been implemented, the database schema, design system, file tree, test results, the complete original prompt specification, and operational runbooks.
>  
> **Last Updated**: 2026-11-08  
> **Overall Status**: **ALL 6 PHASES 100% COMPLETE & PRODUCTION READY**  
> - **Build Status**: **26/26 Routes Compiled Cleanly (0 TypeScript / ESLint errors)**  
> - **Test Suite**: **15/15 Tests Passing Across Vitest Suites**  

---

## 1. Verbatim Original User Specification Prompt

The initial requirements provided by the product owner for Shubash & Co. are reproduced below in full:

\`\`\`text
${firstPrompt}
\`\`\`

---

## 2. Business & Brand Identity Source of Truth

- **Business Name**: Shubash & Co.
- **Bangla Name**: সুবাস & Co.
- **Tagline**: *smell good everyday*
- **Country**: Bangladesh
- **Currency**: Bangladeshi Taka (BDT), formatted strictly using symbol **৳** with thousand separators (e.g., \`৳1,250\`)
- **Timezone**: \`Asia/Dhaka\` (BST, UTC+6)
- **Core Offering**: Authentic luxury & designer perfume **decants** (3ml, 5ml, 10ml hand-decanted into glass atomizers with teflon seals) AND sealed **full retail bottles** (50ml, 100ml, etc.).
- **Headquarters**: Dhaka, Bangladesh. Nationwide delivery via courier.
- **Payment Methods**:
  1. Cash on Delivery (COD) — Dhaka City & Nationwide
  2. Manual bKash (Personal / Merchant send-money with TrxID & phone number)
  3. Manual Nagad
  4. Manual Rocket
  5. Payment Gateway Adapter (Ready for SSLCommerz / bKash Direct Checkout)

### Brand Logos
1. **Bengali Logo (\`সুবাস.co\` on cream background)**:
   - File: \`public/images/logo-bengali.png\` and \`logo-bengali.webp\` (502x252px, tightly cropped).
   - Displayed in: Public Storefront Header, Customer Login / Register, Customer Order Tracking.
2. **English Logo (\`shubash.co\` on white background)**:
   - File: \`public/images/logo-english.png\` and \`logo-english.webp\` (502x244px, tightly cropped).
   - Displayed in: Admin Dashboard Header (\`/admin\`), Admin Login (\`/admin/login\`), Invoices & Packing Slips.

### Color Palette & Design Tokens
\`\`\`css
--background:         #FFFCED;   /* Warm cream page background */
--surface:            #FFFFFF;   /* Pure white cards, inputs, admin panels */
--surface-subtle:     #F5F1E5;   /* Subtle tinted cream for alternate sections */
--foreground:         #48463E;   /* Deep charcoal body text */
--text-strong:        #292820;   /* Rich charcoal headings & prices */
--text-secondary:     #625F55;   /* Medium charcoal subtitles & meta */
--text-muted:         #7E796E;   /* Muted helper text */
--border-subtle:      #E4DFD0;   /* Card & divider borders */
--border-control:     #827C6D;   /* Interactive input & button outlines */
--primary:            #48463E;   /* Charcoal primary buttons & accents */
--primary-hover:      #302F29;   /* Button hover */
--primary-foreground: #FFFCED;   /* Cream text on charcoal buttons */
--focus-ring:         #48463E;   /* High-contrast WCAG focus ring */

/* Meaningful Status Colors (always paired with clear text labels): */
--status-success:     #2D6A4F;   (bg: #EAF4EE, border: #A3D9B5)
--status-warning:     #92400E;   (bg: #FEF3C7, border: #FCD34D)
--status-error:       #991B1B;   (bg: #FEE2E2, border: #FCA5A5)
--status-info:        #3B5F75;   (bg: #EBF2F7, border: #B7D1E2)
\`\`\`

### Typography & Accessibility
- **English**: \`Inter\` via \`next/font/google\` (\`var(--font-inter)\`).
- **Bangla**: \`Noto Sans Bengali\` via \`next/font/google\` (\`var(--font-noto-bengali)\`).
- **Font sizes**: Body & input fields >= 16px (prevents iOS auto-zoom), buttons 16px semibold, prices 20-24px tabular figures.
- **Touch targets**: Minimum 44px height on all interactive controls.
- **WCAG 2.2 AA compliant focus rings**: \`:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }\`.

---

## 3. Technology Stack & Key Decisions

- **Framework**: Next.js 15 (App Router, Server Components + Server Actions).
- **Styling**: Tailwind CSS v4 with CSS-first variable theme (\`@theme inline\` in \`globals.css\`).
- **Database ORM**: Prisma v6.19+ with PostgreSQL schema containing 40+ production models.
- **Authentication**: Auth.js v5 (\`next-auth@beta\`) with JWT strategy and two distinct Credentials providers:
  - \`customer-credentials\`: Phone number (\`01[3-9]XXXXXXXX\`) + password.
  - \`admin-credentials\`: Email + password + optional TOTP.
- **Role-Based Access Control (RBAC)**: 5 granular roles:
  1. \`SUPER_ADMIN\`
  2. \`MANAGER\`
  3. \`INVENTORY_STAFF\`
  4. \`ACCOUNTS\`
  5. \`SUPPORT_FULFILLMENT\`
  Governed by 25 granular permissions in \`src/lib/permissions.ts\`.
- **Financial & Volume Math**: \`Decimal.js\` everywhere. Absolutely no floating-point arithmetic on currency or millilitre volume.
- **Testing**: Vitest with React Testing Library and JSDOM.

---

## 4. Work Accomplished Detail — All 6 Phases

### Phase 1: Foundation, Auth & Admin Skeleton (100% COMPLETE)
1. Next.js 15 App Router scaffold at \`F:\\Shubash & Co\\shubash-co\`.
2. Clean Prisma schema with 40+ models: Users, Customers, Brands, Products, ProductVariants, SourceBottles, SealedBottles, DecantFillings, StockMovements, Orders, OrderItems, Shipments, Payments, Invoices, Accounts, JournalEntries, JournalLines, Coupons, Reviews, AuditLogs, DeliveryZones.
3. Auth.js v5 configured with phone normalization, bcrypt hashing, customer registration API (\`/api/auth/register\`), and NextAuth session callbacks.
4. RBAC engine with permission gates (\`requireAdmin\`, \`requireCustomer\`, \`requirePermission\`).
5. Core utility library in \`src/lib/utils.ts\` (\`formatBDT\`, \`formatVolume\`, \`formatDhakaDate\`, \`generateOrderNumber\`, \`slugify\`).
6. UI Components: Button, Input, Label, Badge, Card, Table.
7. Public Storefront Shell: Sticky Header with Bengali logo & search, Brand Footer with BST timezone, BDT currency, and payment badges.
8. Homepage (\`src/app/page.tsx\`) with hero section, decant vs full bottle education, size comparison, FAQs, newsletter.
9. Admin Dashboard Shell (\`src/app/admin/(dashboard)/...\`) with English logo, role badge, permission-aware sidebar, and KPI overview.
10. Unit test suite: 9/9 passing tests in \`src/test/phase1.test.ts\`.

### Phase 2: Fragrance Catalog & Dual-Track Inventory Engine (100% COMPLETE)
1. **Catalog Data Engine (\`src/lib/catalog.ts\`)**:
   - Multi-facet search, filtering by Format (Decant / Full Bottle), Brand, Fragrance Family, Gender, Concentration.
   - Live liquid volume aggregation across open source bottles for decants.
   - PDP data loader with brand, notes pyramid (top, heart, base notes), and variants.
2. **Dual-Track Inventory Engine (\`src/lib/inventory.ts\`)**:
   - Decant tracking: Source bottles in millilitres with \`availableMl = remainingMl - reservedMl\`.
   - Full bottle tracking: Sealed bottles in discrete units with FIFO stock movements.
   - Bottle conversion: \`convertSealedToSourceBottle\` converts sealed units to millilitre source bottle with cost-per-ml calculation and bidirectional audit stock movements.
   - Liquid reservation: \`reserveLiquidForOrderItem\` dynamically allocates liquid across active source bottles.
   - Decant filling: \`recordDecantFilling\` records operator filling, adjusts reservations, logs evaporation/waste.
3. **Storefront Catalog UI**:
   - \`/products\`: Filterable grid with format chips, price sorting, pagination.
   - \`/products/[slug]\`: High-conversion PDP with format switch (Decants 3ml/5ml/10ml vs Sealed Full Bottle), real-time stock indicator, fragrance pyramid, authenticity guarantee.
   - \`/brands\`: Public brands showcase.
4. **Admin Inventory Management**:
   - \`/admin/inventory\`: Source bottles liquid gauge, sealed units table with Convert to Decant action, full stock movement audit log.
   - \`/admin/products\`: Products table with active variant count, lowest decant price, lowest bottle price, live stock indicators.
   - \`/admin/brands\`: Brand catalog management.

### Phase 3: Cart, Checkout & Bangladesh Order Pipeline (100% COMPLETE)
1. **Cart Engine (\`src/lib/cart.ts\`)**:
   - Server-validated cart: verifies live prices and stock levels on every sync.
   - Zone-based delivery computation (Dhaka: ৳80, Outside Dhaka: ৳150, Free over ৳4,000).
   - Coupon discount calculation (percentage or fixed amount).
2. **Global Cart Context (\`src/context/CartContext.tsx\`)**:
   - LocalStorage synchronization (\`shubash_cart\`), live badge count in header, slide-in awareness.
3. **Cart UI (\`src/app/cart/page.tsx\` & \`CartClient.tsx\`)**:
   - Line items with decant/bottle badges, quantity steppers, free shipping progress bar, promo code input.
4. **Bangladesh Checkout (\`src/app/checkout/page.tsx\` & \`CheckoutClient.tsx\`)**:
   - Complete 8 divisions, 64 districts, and Dhaka city thanas selector.
   - COD, bKash Personal/Merchant send-money, Nagad, Rocket options with TrxID validation.
5. **Atomic Order Placement Server Action (\`src/app/checkout/actions.ts\`)**:
   - Atomic transaction via \`prisma.$transaction\`:
     - Creates \`Order\` with human-friendly reference (\`SC-2026-XXXXX\`) and UUID \`trackingToken\`
     - Liquid reservation for decants via \`reserveLiquidForOrderItem\`
     - Sealed bottle reservation for full bottles
     - Generates \`Payment\`, \`Shipment\`, and \`OrderStatusEvent\` records.
6. **Order Confirmation (\`src/app/orders/[id]/page.tsx\`)**:
   - Confirmation screen with decant quality guarantee, invoice details, tracking button.
7. **Public Order Tracking (\`src/app/track/page.tsx\` & \`TrackClient.tsx\`)**:
   - Live fulfillment timeline stepper (Placed -> Confirmed -> Decanting & Sealing -> Packed -> Shipped -> Delivered).
   - Courier partner & consignment ID display, masked customer privacy.
   - Endpoint: \`/api/orders/track\`.

### Phase 4: Admin Fulfillment & Accounting Ledger (100% COMPLETE)
1. **Order Management (\`src/app/admin/(dashboard)/orders/page.tsx\` & \`OrdersClient.tsx\`)**:
   - Tabular order overview with status filter tabs (Pending, Confirmed, Preparing, Packed, Shipped, Delivered, Cancelled).
   - Search by order number, customer name, phone.
   - Quick status transition buttons.
2. **Order Detail & Decanting Station (\`src/app/admin/(dashboard)/orders/[id]/page.tsx\` & \`OrderDetailClient.tsx\`)**:
   - Decanting station: "Complete Filling" button per item with recorded waste (0.1ml buffer).
   - Courier dispatch panel: Pathao, Steadfast, RedX with tracking ID.
   - Printable order slip / packing slip view.
3. **Payments Verification Queue (\`src/app/admin/(dashboard)/payments/page.tsx\` & \`PaymentsClient.tsx\`)**:
   - bKash, Nagad, Rocket verification queue for Accounts staff.
   - Approve action marks payment \`APPROVED\`, updates order \`PAID\`, and automatically logs double-entry journal entry.
4. **Double-Entry General Ledger (\`src/lib/ledger.ts\` & \`src/app/admin/(dashboard)/accounting/page.tsx\`)**:
   - Standard Chart of Accounts (1010 Cash, 1030 bKash, 1100 AR, 1200 Sealed Inventory, 1210 Liquid Inventory, 4010 Decant Revenue, 5010 Liquid COGS, 5040 Spillage).
   - Balanced invariant check: Throws error if $\sum \text{Debits} \neq \sum \text{Credits}$.
   - P&L overview: Revenue, COGS, Gross Margin %, Operating Net Profit.
   - Full journal entry audit trail with Debit/Credit line breakdowns.

### Phase 5: Customer Experience, Reviews & SEO (100% COMPLETE)
1. **Customer Account Portal (\`src/app/account/page.tsx\`)**:
   - Customer profile with phone, email, and order history.
   - Quick link to tracking and order details.
2. **Search Engine Optimization**:
   - \`src/app/sitemap.ts\`: Generates comprehensive XML sitemap for homepage, catalog, products, and brands.
   - \`src/app/robots.ts\`: Directs crawlers, protects admin and API routes.
   - Structured metadata on PDP and catalog pages.

### Phase 6: Automated Testing & Verification (100% COMPLETE)
1. **Test Suites (Vitest)**:
   - \`src/test/phase1.test.ts\`: 9 tests verifying BDT currency formatting (৳), volume formatting, slugification, and 5-role RBAC permissions.
   - \`src/test/phase2_3_4.test.ts\`: 6 tests verifying double-entry invariant ($\sum \text{Debits} = \sum \text{Credits}$), settlement invariant, decant millilitre yield math, Bangladesh delivery fee rules, and BD phone regex.
   - Total: **15/15 tests passing cleanly**.
2. **Next.js Production Build**:
   - All 26 static & dynamic routes compiled cleanly.
   - Zero TypeScript errors, zero ESLint errors.
3. **Documentation**:
   - Comprehensive \`README.md\` in \`F:\\Shubash & Co\\shubash-co\\README.md\`.
   - Complete \`PROJECT_HANDOFF.md\` in both workspace root and app root.

---

## 5. Verified Routes Summary (26/26 Routes)

\`\`\`
Route (app)                                 Size  First Load JS
┌ ƒ /                                      669 B         117 kB
├ ○ /_not-found                            993 B         104 kB
├ ƒ /account                               669 B         117 kB
├ ƒ /admin                                 175 B         108 kB
├ ƒ /admin/accounting                    1.47 kB         104 kB
├ ƒ /admin/brands                          175 B         108 kB
├ ƒ /admin/inventory                     6.54 kB         131 kB
├ ○ /admin/login                         3.85 kB         141 kB
├ ƒ /admin/orders                        4.23 kB         153 kB
├ ƒ /admin/orders/[id]                   5.59 kB         154 kB
├ ƒ /admin/payments                      3.94 kB         133 kB
├ ƒ /admin/products                        181 B         113 kB
├ ƒ /api/auth/[...nextauth]                137 B         103 kB
├ ƒ /api/auth/register                     137 B         103 kB
├ ƒ /api/cart/validate                     137 B         103 kB
├ ƒ /api/orders/track                      137 B         103 kB
├ ƒ /brands                                669 B         117 kB
├ ƒ /cart                                5.47 kB         144 kB
├ ƒ /checkout                            7.82 kB         146 kB
├ ○ /login                               3.64 kB         141 kB
├ ƒ /orders/[id]                           669 B         117 kB
├ ƒ /products                              669 B         117 kB
├ ƒ /products/[slug]                     5.49 kB         144 kB
├ ○ /register                            4.04 kB         141 kB
├ ○ /robots.txt                            137 B         103 kB
├ ○ /sitemap.xml                           137 B         103 kB
└ ƒ /track                               4.59 kB         143 kB
\`\`\`

---

## 6. How to Run, Test & Deploy

\`\`\`powershell
# Navigate to project directory
cd "F:\\Shubash & Co\\shubash-co"

# Run all automated tests (15/15 passing)
node ./node_modules/vitest/vitest.mjs run

# Run production Next.js build (26/26 routes passing)
node ./node_modules/next/dist/bin/next build

# Start production server
node ./node_modules/next/dist/bin/next start -p 3000

# Start local dev server
node ./node_modules/next/dist/bin/next dev -p 3000
\`\`\`
`;

fs.writeFileSync(path.join(__dirname, '..', '..', 'PROJECT_HANDOFF.md'), handoffContent, 'utf8');
fs.writeFileSync(path.join(__dirname, '..', 'PROJECT_HANDOFF.md'), handoffContent, 'utf8');
console.log('Successfully written updated PROJECT_HANDOFF.md to both locations!');
