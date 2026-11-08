# Shubash & Co. (সুবাস & Co.)

> **"smell good everyday"**  
> Complete e-commerce and business-management platform for authentic perfume decants and full retail bottles in Bangladesh.

---

## 🌟 Overview & Key Offerings

Shubash & Co. is a high-performance e-commerce platform built to solve the core challenges of luxury fragrance decanting and retail in Bangladesh:
1. **Dual-Track Inventory Engine**:
   - Decants: Tracked in millilitres (`remainingMl - reservedMl`) across FIFO-ordered open source bottles.
   - Full Retail Bottles: Tracked in discrete sealed units.
   - Sealed-to-Source Bottle Conversion: Automated cost-per-ml calculation, historical batch tracing, and bidirectional stock movement audit logs.
2. **Bangladesh-Centric Checkout & Order Pipeline**:
   - All 8 divisions, 64 districts, and Dhaka city thanas dataset.
   - Zone-based delivery fees (Dhaka City: ৳80, Outside Dhaka: ৳150, Free shipping threshold above ৳4,000).
   - Cash on Delivery (COD) + Manual Mobile Financial Services (bKash, Nagad, Rocket) with TrxID submission.
   - Public order tracking using secure, non-guessable UUID tokens.
3. **Double-Entry General Ledger**:
   - Standard Chart of Accounts (Assets, Liabilities, Equity, Revenue, COGS, Expenses).
   - Strict invariant: $\sum \text{Debits} = \sum \text{Credits}$ on every transaction.
   - Automated event journals on order delivery, payment clearance, and bottle conversions.
4. **Decant Integrity & Packaging Guarantee**:
   - Hand-decanted with sterile medical syringes into premium glass atomizers.
   - Teflon plumbers' tape seal wrapped around sprayer nozzle threads to prevent courier transit leaks or evaporation.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 15 (App Router, Server Actions, Route Handlers)
- **Language**: TypeScript 5+ (Strict typing, no `any`)
- **Database & ORM**: PostgreSQL with Prisma ORM v6 (40+ production models)
- **Authentication**: Auth.js v5 (`next-auth@beta`) with dual providers:
  - Customer Provider: 11-digit Bangladesh phone (`01[3-9]XXXXXXXX`) + bcrypt password
  - Admin Provider: Email + bcrypt password + optional TOTP MFA
- **Financial Math**: `Decimal.js` for arbitrary-precision financial and millilitre arithmetic
- **Styling**: Tailwind CSS v4 with cream & charcoal token theme (`globals.css`)
- **Typography**: Inter (Latin) + Noto Sans Bengali (Bangla)
- **Testing**: Vitest + React Testing Library (15/15 unit & invariant tests passing)

---

## 🚀 Quickstart & Setup

### 1. Prerequisites
- **Node.js**: v20.x or v22.x
- **PostgreSQL**: v14+ instance (local, Supabase, Neon, or Railway)

### 2. Environment Configuration
Copy `.env.example` to `.env.local` and set your credentials:
```bash
cp .env.example .env.local
```
Key environment variables:
- `DATABASE_URL`: `postgresql://user:password@localhost:5432/shubash_co`
- `AUTH_SECRET`: Generate using `openssl rand -base64 32`
- `NEXT_PUBLIC_APP_URL`: `http://localhost:3000`

### 3. Install Dependencies & Generate Prisma Client
```bash
npm install
npx prisma generate
```

### 4. Database Migration & Seed Data
```bash
npx prisma db push
node scripts/seed.js
node scripts/bootstrap-admin.js
```
The seed script populates:
- 5 Luxury & Designer perfume houses (Lattafa, Armaf, Rasasi, Afnan, Nishane)
- Real fragrance catalog with notes pyramid (top, heart, base)
- Decant sizes (3ml, 5ml, 10ml) and Sealed Full Bottles
- Standard Chart of Accounts
- Delivery zone settings (Dhaka ৳80 / Outside ৳150)
- Super Admin account (`admin@shubash.co` / password from bootstrap)

### 5. Running the Application
```bash
# Start development server
node ./node_modules/next/dist/bin/next dev -p 3000

# Run automated tests
node ./node_modules/vitest/vitest.mjs run

# Production build
node ./node_modules/next/dist/bin/next build
```

---

## 📂 Architecture & Directory Structure

```
shubash-co/
├── prisma/
│   └── schema.prisma         # 40+ models (Users, Catalog, Decants, Orders, Ledger)
├── public/
│   └── images/
│       ├── logo-bengali.png   # সুবাস.co logo for public storefront (502x252px)
│       └── logo-english.png   # shubash.co logo for admin dashboard (502x244px)
├── src/
│   ├── app/
│   │   ├── (storefront)
│   │   │   ├── page.tsx       # Homepage (Hero, Size Guide, FAQs)
│   │   │   ├── products/      # Catalog, PDP with live decant vs bottle toggle
│   │   │   ├── cart/          # Cart with live server-side validation & zone toggle
│   │   │   ├── checkout/      # BD 64-district checkout, COD & bKash
│   │   │   ├── orders/[id]/   # Order confirmation & invoice
│   │   │   ├── track/         # Public order tracking by UUID token
│   │   │   ├── account/       # Customer profile & order history
│   │   │   ├── login/         # Phone-based customer authentication
│   │   │   └── register/      # Customer account registration
│   │   ├── admin/
│   │   │   ├── login/         # Role-based admin login
│   │   │   └── (dashboard)/
│   │   │       ├── page.tsx   # Admin overview & KPIs
│   │   │       ├── inventory/ # Source bottles liquid gauge & conversion
│   │   │       ├── orders/    # Fulfillment, decanting station & courier dispatch
│   │   │       ├── payments/  # bKash/Nagad/Rocket TrxID verification queue
│   │   │       └── accounting/# Double-entry ledger & Chart of Accounts
│   │   ├── api/
│   │   │   ├── auth/          # Auth.js v5 route handlers
│   │   │   ├── cart/validate/ # Server-side price & stock verification
│   │   │   └── orders/track/  # Masked public order lookup
│   │   ├── sitemap.ts         # Dynamic SEO sitemap
│   │   └── robots.ts          # Search engine crawler policies
│   ├── components/
│   │   ├── ui/                # Accessible design system (Button, Input, Badge, Card, Table)
│   │   ├── storefront/        # Header (Bangla logo), Footer (BDT & BST), ProductCard
│   │   └── admin/             # AdminHeader (English logo), AdminSidebar (RBAC filtered)
│   ├── context/
│   │   └── CartContext.tsx    # Global cart sync with localStorage & server validation
│   ├── lib/
│   │   ├── auth.ts            # Auth.js credentials providers & session callbacks
│   │   ├── catalog.ts         # Multi-faceted search & liquid availability aggregator
│   │   ├── inventory.ts       # FIFO decant reservations, fillings, and bottle conversions
│   │   ├── ledger.ts          # Double-entry general ledger engine & invariants
│   │   ├── permissions.ts     # 5 roles, 25 granular permissions
│   │   ├── utils.ts           # formatBDT (৳), formatVolume (ml), formatDhakaDate (BST)
│   │   └── bangladesh-locations.ts # 8 divisions, 64 districts, Dhaka thanas
│   └── test/
│       ├── phase1.test.ts     # RBAC, formatting, exact math tests (9/9 passing)
│       └── phase2_3_4.test.ts # Ledger balance invariant, decant yields, BD phone (6/6 passing)
└── scripts/
    ├── seed.js                # Initial database seeder
    └── bootstrap-admin.js     # Super admin account creator
```

---

## 🔒 Security & Compliance

- **Role-Based Access Control**: 5 distinct staff roles (`SUPER_ADMIN`, `MANAGER`, `INVENTORY_STAFF`, `ACCOUNTS`, `SUPPORT_FULFILLMENT`).
- **Account Suspension Check**: Every authenticated request verifies active account status against the live database.
- **Audit Logging**: Immutable audit logs with timestamp, actor ID, action name, IP address, and metadata.
- **Public Privacy**: Public order tracking hides sensitive customer data, displaying only first name and masked phone numbers.
- **Zero Floating-Point Drift**: All currency is stored as `Decimal(12,2)` and volume as `Decimal(10,3)`.

---

© 2026 Shubash & Co. (সুবাস & Co.). Built with pride in Dhaka, Bangladesh.
