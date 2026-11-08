# Shubash & Co. (সুবাস & Co.) — Complete Hosting & Supabase Setup Guide

This guide walks you step-by-step through:
1. Creating and configuring a **Supabase PostgreSQL** database.
2. Pushing the schema (40+ models) and seeding initial luxury fragrances & admin accounts.
3. Hosting the website on **Vercel** (the native hosting platform for Next.js 15).

---

## Part 1: Set Up Supabase Database

### Step 1.1: Create a Free Supabase Account & Project
1. Go to [supabase.com](https://supabase.com) and sign in or create an account.
2. Click **New Project**.
3. Choose your organization.
4. Fill in the project details:
   - **Name**: `shubash-co`
   - **Database Password**: Set a strong password (e.g. 16+ characters). **Save this password securely**, you will need it in your connection strings!
   - **Region**: Choose **Singapore (`ap-southeast-1`)** or **India (`ap-south-1`)** for lowest latency to Bangladesh.
   - **Pricing Plan**: Free tier is 100% sufficient.
5. Click **Create new project** and wait ~1-2 minutes for the database to provision.

---

### Step 1.2: Obtain Supabase Connection Strings
Once your project is ready:
1. In the Supabase Dashboard, click the **Connect** button at the top header (or go to **Project Settings** > **Database**).
2. Under **Connection string**, select the **Transaction** / **Prisma** tab.
3. You will see two essential connection URLs:

#### URL 1: Pooled Connection (Used for `DATABASE_URL`)
- Mode: **Transaction**
- Port: **6543**
- It looks like this:
  ```text
  postgresql://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```
  *(Make sure `?pgbouncer=true` is at the end)*

#### URL 2: Direct Connection (Used for `DIRECT_URL`)
- Mode: **Session** (or Direct)
- Port: **5432**
- It looks like this:
  ```text
  postgresql://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
  ```

> ⚠️ **Important Password Escaping**: If your database password contains special characters (like `@`, `#`, `%`, `&`), encode them using URL encoding (e.g., `#` becomes `%23`), or keep your database password alphanumeric.

---

## Part 2: Connect Local Project & Seed Database

### Step 2.1: Configure Local `.env.local`
In your local project directory `F:\Shubash & Co\shubash-co\`:
Create or edit `.env.local`:

```env
# Supabase Pooled Connection (Port 6543)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase Direct Connection (Port 5432)
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Auth.js secret (generate using: openssl rand -base64 32 or any 32+ char string)
AUTH_SECRET="your-super-secret-random-key-at-least-32-chars-long"
AUTH_URL="http://localhost:3000"

# Admin account bootstrap
ADMIN_BOOTSTRAP_EMAIL="admin@shubash.co"
ADMIN_BOOTSTRAP_PASSWORD="YourStrongAdminPassword123!"
ADMIN_BOOTSTRAP_NAME="Super Admin"

# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Shubash & Co."
```

---

### Step 2.2: Push Schema to Supabase
Run the following command from the `shubash-co` directory to create all 40+ database tables in Supabase:

```powershell
cd "F:\Shubash & Co\shubash-co"
node ./node_modules/prisma/build/index.js db push
```

You should see:
```text
✔ Your database is now in sync with your Prisma schema.
```

---

### Step 2.3: Seed Luxury Brands, Fragrances & Admin Account
Populate the database with authentic fragrance catalog (Lattafa, Armaf, Rasasi, Afnan, Nishane), source bottles for decanting, chart of accounts, and Super Admin:

```powershell
# 1. Seed catalog & chart of accounts
node scripts/seed.js

# 2. Bootstrap Super Admin user
node scripts/bootstrap-admin.js
```

Now open your **Supabase Dashboard > Table Editor**: You will see all tables (`products`, `product_variants`, `source_bottles`, `brands`, `users`, `ledger_accounts`, etc.) populated with data!

---

## Part 3: Deploy to Vercel (Recommended Hosting)

**Vercel** is the company behind Next.js. It offers:
- Zero-configuration deployment for Next.js 15
- Edge caching for fast response times in Bangladesh
- Automatic SSL / HTTPS certificates
- Free tier with generous bandwidth and serverless limits

---

### Step 3.1: Push Code to GitHub
1. Open PowerShell and make sure your git repository is initialized:
   ```powershell
   cd "F:\Shubash & Co\shubash-co"
   git init
   git add .
   git commit -m "Complete Shubash & Co. e-commerce platform"
   ```
2. Create a new repository on [GitHub](https://github.com/new) named `shubash-co` (private or public).
3. Push your code:
   ```powershell
   git remote add origin https://github.com/[YOUR-USERNAME]/shubash-co.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 3.2: Import Project into Vercel
1. Go to [vercel.com](https://vercel.com) and sign up / log in with your GitHub account.
2. Click **Add New...** > **Project**.
3. Find your `shubash-co` repository and click **Import**.
4. In the configuration screen:
   - **Framework Preset**: Next.js (automatically detected)
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `next build` (leave default)
   - **Output Directory**: `.next` (leave default)

---

### Step 3.3: Add Environment Variables in Vercel
Before clicking deploy, expand the **Environment Variables** section and add:

| Name | Value | Purpose |
|------|-------|---------|
| `DATABASE_URL` | `postgresql://postgres.[REF]:[PASS]@aws-0-...pooler.supabase.com:6543/postgres?pgbouncer=true` | Supabase pooler connection |
| `DIRECT_URL` | `postgresql://postgres.[REF]:[PASS]@aws-0-...pooler.supabase.com:5432/postgres` | Supabase direct connection |
| `AUTH_SECRET` | *(Your 32+ character random secret)* | JWT encryption |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` (or custom domain) | Auth callback URL |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` (or custom domain) | Public canonical domain |
| `NEXT_PUBLIC_APP_NAME` | `Shubash & Co.` | Site brand name |

---

### Step 3.4: Deploy!
1. Click **Deploy**.
2. Vercel will build the application, compile all 26 routes, and launch your live website in under 2 minutes.
3. You will receive a live URL: `https://shubash-co.vercel.app`.

---

## Part 4: Post-Deployment Verification

1. **Visit Storefront**: Open `https://your-app.vercel.app/`. You will see the warm cream homepage with Bengali logo (`সুবাস & Co.`), fragrance catalog, and decant size breakdown.
2. **Browse Catalog**: Open `/products` and `/products?format=DECANT` to verify live liquid availability indicators.
3. **Test Add to Bag & Checkout**:
   - Add a 5ml decant to your bag.
   - Go to `/checkout`. Select your Bangladesh Division, District, and Thana.
   - Select Cash on Delivery (COD) or bKash. Place the order.
   - You will see the confirmation screen at `/orders/[id]` and live tracking at `/track?token=[UUID]`.
4. **Log in to Admin**:
   - Go to `https://your-app.vercel.app/admin/login`.
   - Sign in with `admin@shubash.co` and your admin password.
   - Verify the Admin Dashboard, Decanting Filling Station (`/admin/orders`), Payment Verification Queue (`/admin/payments`), and Double-Entry General Ledger (`/admin/accounting`).

---

## Part 5: Custom Domain Setup (.com / .com.bd)

If you own `shubash.co` or `shubash.com.bd`:
1. In Vercel, go to **Settings** > **Domains**.
2. Enter your domain name and click **Add**.
3. Follow the DNS instructions (add a `CNAME` or `A` record at your domain registrar).
4. Vercel will automatically provision a free SSL certificate.
5. Update `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` in Vercel environment variables to your new custom domain!
