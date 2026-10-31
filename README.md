# ShopMitra — Your Shopping Friend 🛍️

A production-grade e-commerce store built with **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Prisma + PostgreSQL (Neon-ready)**, with Dodo Payments, Resend transactional email and a full admin workflow.

## ✨ Features

- **Storefront** — home with banner carousel, category grid, product listing with search/filters, product detail, wishlist, cart with coupons
- **Marketplace-grade checkout** (Flipkart/Meesho style) — progressive sections, saved addresses (ask once, then just Edit), GPS current-location autofill, PIN-code lookup, UPI (PhonePe / GPay / Paytm) / Card / Cash on Delivery
- **Payments** — Dodo Payments hosted checkout embedded in-app (never navigates away), server-side verification, signature-verified webhooks, idempotent fulfillment with stock conservation; built-in sandbox mode when no API key is set
- **Transactional email (Resend)** — order placed, payment confirmed, shipped, delivered, cancelled; every attempt is auditable in the `EmailLog` table (dev mode without a key logs emails instead of sending)
- **Admin workflow** — dashboard stats, order status pipeline (pending → confirmed → shipped → delivered / cancelled with stock restore), COD mark-paid, customer enable/disable + roles
- **Auth & multi-vendor marketplace** — bcrypt-hashed passwords, signed httpOnly session cookies, login-gated ordering; open registration as Shopper or Seller, each seller runs their own shop (own products, own orders, "Sold by" branding)
- **Shimmer skeleton loading** across home / products / detail / checkout

## 🚀 Quick start (VS Code)

> Prereqs: **Node.js 18.18+** and a free [Neon](https://neon.tech) account (or any PostgreSQL).

```bash
# 1. install dependencies (npm, pnpm or bun all work)
npm install

# 2. create your env file
cp .env.example .env

# 3. put your Neon connection string into .env
#    DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/shopmitra?sslmode=require"

# 4. create the schema + demo catalog in your database
npm run db:push
npm run db:seed

# 5. run it
npm run dev          # → http://localhost:3000
```

That's it — `npm run db:push` is self-healing: pointed at a remote database (Neon) it just pushes the schema; pointed at the bundled sandbox PostgreSQL it boots that automatically.

### Accounts — no demo credentials

There are **no demo accounts or preset passwords** — every user creates their own on `/register` with their own email and password:

- **Shopper** — browse, buy, track orders.
- **Sell on ShopMitra** — multi-vendor marketplace: anyone can open their own shop account (seller dashboard). Every seller manages **only their own products** (create/edit/delete), sees **only orders containing their products**, and their storefront listings show **"Sold by <shop name>"**. Multiple sellers can run their shops side by side.

Coupons: `SAVE10` (10%), `FIRST20` (20% first order), `SHOP15` (15%).

## 🛠️ Developer guide — managing accounts & content

Everything lives in the **Admin Dashboard** (`/admin`). The first super admin is your own registered account promoted via DB (see below); after that everything is point-and-click.

### Roles

| Role         | Powers                                                                 |
| ------------ | ---------------------------------------------------------------------- |
| `customer`   | Shop, track orders, manage addresses                                    |
| `admin`      | **Merchant/seller** — own shop, own products, own orders (seller dashboard) |
| `super_admin`| Everything above **plus**: see all accounts, change roles, block/unblock anyone, reset passwords |

**Make yourself the first super admin** (one-time, from your terminal):

```bash
npm run db:studio        # open Prisma Studio → User table → set role = super_admin
```

### Where each thing lives

| I want to…                       | Go to                                                              |
| -------------------------------- | ------------------------------------------------------------------ |
| See **how many accounts** exist (total / merchants / customers / blocked) | `/admin` → **Dashboard** → "Accounts" strip, or **Customers** tab chips |
| See **every account** (name, email, role, shop, orders, joined date) | `/admin` → **Customers** tab (search by name / email / shop, filter by role or status) |
| **Block / disable** an account (user can no longer sign in) | Customers tab → **Block** on that row (reversible with **Unblock**) |
| Make someone a **merchant/admin** or demote them | Customers tab → role dropdown on that row (super admin only) |
| **Change banners** (edit title, subtitle, CTA, image, colors) | `/admin` → **Banners** tab → ✏️ **Edit** on a banner → Update (add/delete/toggle too) |
| See or set someone's **password** | Customers tab → **Reset password** → type or **Generate** a new one |

### About passwords (read this once)

Passwords are stored as **bcrypt hashes — they can never be viewed by anyone**, not even the super admin or the developer. That is deliberate: if the database ever leaks, every user's real password stays safe. The admin panel therefore has **"Reset password"** instead of "view password": pick the user, click **Reset password**, type or generate a new password, and share it with the user out-of-band. From that moment you effectively control the account.

## 📜 Scripts

| Script             | What it does                                                        |
| ------------------ | ------------------------------------------------------------------- |
| `npm run dev`      | Start the dev server on port 3000 (logs mirrored to `dev.log`)      |
| `npm run build`    | Production build                                                    |
| `npm start`        | Run the standalone production server                                |
| `npm run db:push`  | Sync `prisma/schema.prisma` to the database (boots local PG if needed) |
| `npm run db:seed`  | Seed demo catalog (idempotent — skips if already seeded)            |
| `npm run db:up`    | Boot the bundled local PostgreSQL (no-op for remote DBs)            |
| `npm run db:studio`| Prisma Studio GUI                                                   |
| `npm run lint`     | ESLint                                                              |

## 🔐 Environment variables

| Variable                   | Required | Purpose                                                                 |
| -------------------------- | -------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`             | ✅       | PostgreSQL connection string (Neon pooled URL recommended)              |
| `SESSION_SECRET`           | ✅       | Random 32-byte hex string used to sign session cookies                  |
| `DODO_PAYMENTS_API_KEY`    | –        | Enables real checkout (test or live). Without it → sandbox payments     |
| `DODO_PAYMENTS_ENVIRONMENT`| –        | `test_mode` / `live_mode`                                               |
| `DODO_PAYMENTS_WEBHOOK_KEY`| –        | Webhook signing secret from the Dodo dashboard                          |
| `RESEND_API_KEY`           | –        | Enables real transactional email. Without it → logged to `EmailLog`     |
| `EMAIL_FROM`               | –        | e.g. `ShopMitra <hello@yourdomain.com>`                                 |
| `NEXT_PUBLIC_APP_URL`      | –        | Absolute URL used for links inside emails                               |

### Neon setup in 60 seconds

1. Sign up at [neon.tech](https://neon.tech) → **Create project** (name: `shopmitra`)
2. Dashboard → **Connection Details** → pick **Pooled connection**
3. Copy the string into `.env` as `DATABASE_URL` (keep `?sslmode=require`)
4. `npm run db:push && npm run db:seed` — schema + demo data land in Neon

### Resend setup

1. Free API key at [resend.com/api-keys](https://resend.com/api-keys) → put it in `RESEND_API_KEY`
2. `onboarding@resend.dev` sender works immediately (delivers only to your own account address — perfect for testing)
3. To email real customers: verify your domain in Resend → set `EMAIL_FROM=ShopMitra <orders@yourdomain.com>`

### Dodo Payments setup

1. API key from the Dodo dashboard (test or live) → `DODO_PAYMENTS_API_KEY`
2. Add a webhook endpoint `<your-domain>/api/payments/webhook` → copy its signing secret into `DODO_PAYMENTS_WEBHOOK_KEY`
3. Products are auto-synced to Dodo on first checkout — nothing to configure

## 🗂️ Project structure

```
src/
  app/                 # App Router pages (22 routes) + API routes
    api/               # auth, products, orders, payments, addresses, admin, ...
    admin/             # admin dashboard (stats / orders / customers)
    checkout/          # marketplace-style checkout
  components/shop/     # Header, Footer, Logo, PaymentLogos, Skeletons, ...
  lib/                 # db, auth, payments, dodo, mailer, emails, utils
  store/AppContext.tsx # client store (cart, wishlist, session, notifications)
prisma/schema.prisma   # PostgreSQL schema (11 models incl. EmailLog)
scripts/               # with-env (env runner), db-up (local PG), seed helpers
```

## 🧪 Orders & emails flow

- COD order → confirmation email immediately; mark paid on delivery from Admin
- Online order → email on payment success (server-verified), shipped / delivered / cancelled emails on each admin status change
- Every email attempt is stored in the `EmailLog` table (`status`: sent / logged / failed)
