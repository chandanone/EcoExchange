# 🌱 EcoExchange - Plant Cutting Marketplace

A high-security, production-ready P2P marketplace for plant cuttings and buds, built with Next.js 16, Auth.js v5, Prisma 7, and Stripe.

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router, Stable Turbopack)
- **Auth**: Auth.js v5 (Google OAuth + Credentials)
- **Database**: Prisma 7 with PostgreSQL (engineType="client")
- **Payments**: Stripe (Subscriptions + Payment Intents)
- **UI**: Tailwind CSS, Shadcn/ui, Framer Motion
- **TypeScript**: Strict mode with Zod validation

## 📋 Features

### Core Functionality
- ✅ User authentication (Google OAuth & Credentials)
- ✅ RBAC (Role-Based Access Control) with Admin panel
- ✅ Plant listing with admin approval workflow
- ✅ Credit-based swap system
- ✅ Tiered subscriptions (Free, Monthly ₹300, Yearly ₹1000)
- ✅ One-time credit top-ups via Stripe
- ✅ Real-time marketplace with caching optimization

### Admin Features
- ✅ Approval queue with Framer Motion animations
- ✅ Bulk approval actions
- ✅ Dashboard statistics
- ✅ User management capabilities

### Security
- ✅ XSS/CSRF protection
- ✅ Zod schema validation on all server actions
- ✅ JWT session management
- ✅ Secure Stripe webhook handling

## 🏗️ Architecture

### Next.js 16 Patterns
- **App Router**: Leveraging React Server Components
- **Turbopack**: Stable build system for faster development
- **'use cache'**: Explicit caching for marketplace optimization
- **proxy.ts**: Root-level RBAC routing (replaces middleware.ts)

### Database Schema
```
User (ADMIN/USER roles)
├── Plants (PENDING/APPROVED/REJECTED)
├── SwapRequests
├── CreditTransactions
└── Subscription details
```

### Payment Flow
1. **Subscriptions**: Stripe Checkout → Webhook → Update User Tier + Credits
2. **Credits**: Payment Intent → Webhook → Add Credits to Account
3. **Swaps**: Accept Request → Deduct 1 Credit

## 📦 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Stripe account
- Google OAuth credentials (optional)

### Quick Start

1. **Run the setup script:**
```bash
chmod +x setup.sh
./setup.sh
```

2. **Configure environment variables:**
```bash
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

3. **Set up the database:**
```bash
npx prisma db push
```

4. **Start development server:**
```bash
npm run dev
```

Visit `http://localhost:3000`

## 🔐 Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ecoexchange"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_MONTHLY_PRICE_ID="price_..."
STRIPE_YEARLY_PRICE_ID="price_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 🎨 Project Structure

```
ecoexchange/
├── proxy.ts                      # Root-level RBAC proxy
├── prisma/
│   └── schema.prisma            # Prisma 7 schema
├── src/
│   ├── app/
│   │   ├── (auth)/              # Auth pages
│   │   ├── (dashboard)/         # Protected routes
│   │   │   ├── dashboard/       # User dashboard
│   │   │   ├── plants/          # Plant management
│   │   │   ├── marketplace/     # Public listings
│   │   │   ├── subscription/    # Payment management
│   │   │   └── admin/           # Admin panel
│   │   └── api/
│   │       ├── auth/            # Auth.js handlers
│   │       └── webhooks/        # Stripe webhooks
│   ├── actions/                 # Server Actions
│   │   ├── plant-actions.ts
│   │   ├── admin-actions.ts
│   │   ├── subscription-actions.ts
│   │   ├── credit-actions.ts
│   │   └── swap-actions.ts
│   ├── components/
│   │   ├── ui/                  # Shadcn components
│   │   ├── plants/              # Plant components
│   │   └── admin/               # Admin components
│   ├── lib/
│   │   ├── auth.ts              # Auth.js v5 config
│   │   ├── db.ts                # Prisma client
│   │   ├── stripe.ts            # Stripe client
│   │   ├── utils.ts             # Utilities
│   │   └── validations.ts       # Zod schemas
│   └── types/
│       └── index.ts             # TypeScript types
└── public/
```

## 🔄 Key Workflows

### Plant Approval Workflow
```mermaid
User → Post Plant (PENDING) → Admin Review → APPROVED/REJECTED → Marketplace
```

### Swap Request Flow
```
User → Browse Marketplace → Request Swap → Owner Approves → Credit Deducted
```

### Subscription Flow
```
User → Choose Plan → Stripe Checkout → Webhook → Update Tier + Add Credits
```

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma studio    # Open Prisma Studio
npx prisma db push   # Push schema to database
```

### Creating a New Page

1. Create the page component in `src/app/(dashboard)/your-page/page.tsx`
2. Add server actions in `src/actions/your-actions.ts`
3. Create Zod validation schemas in `src/lib/validations.ts`
4. Update types in `src/types/index.ts`

## 🎯 Admin Setup

To create an admin user:

1. Register a normal account
2. Open Prisma Studio: `npx prisma studio`
3. Find your user in the User table
4. Change `role` from `USER` to `ADMIN`
5. Refresh and access `/admin/approval`

## 💳 Stripe Setup

### 1. Create Products & Prices
In Stripe Dashboard, create:
- Monthly subscription (₹300/month)
- Yearly subscription (₹1000/year)

### 2. Set Price IDs
Add the price IDs to `.env.local`:
```env
STRIPE_MONTHLY_PRICE_ID="price_xxx"
STRIPE_YEARLY_PRICE_ID="price_xxx"
```

### 3. Configure Webhooks
```bash
# Install Stripe CLI
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook signing secret to .env.local
```

### 4. Test Payments
Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

## 🔍 API Routes

- `GET /api/health` - Health check
- `POST /api/auth/[...nextauth]` - Auth.js handlers
- `POST /api/webhooks/stripe` - Stripe webhook receiver

## 📱 Key Pages

### Public
- `/` - Landing page with pricing
- `/login` - Sign in page
- `/register` - Sign up page

### Protected (User)
- `/dashboard` - User dashboard
- `/plants` - My plants
- `/plants/new` - Create plant listing
- `/marketplace` - Browse approved plants
- `/subscription` - Manage subscription
- `/swap-requests` - View swap requests

### Protected (Admin)
- `/admin/approval` - Approve/reject pending plants

## 🎨 UI Components

Built with Shadcn/ui:
- Button, Card, Input, Label
- Badge, Dialog, Dropdown Menu
- Table, Toast

## 📊 Database Models

### User
- Role (ADMIN/USER)
- Subscription tier (FREE/MONTHLY/YEARLY)
- Credits (Int)
- Stripe customer ID

### Plant
- Status (PENDING/APPROVED/REJECTED)
- Species, description, health score
- Metadata (difficulty, sunlight, water needs)

### SwapRequest
- Status (PENDING/ACCEPTED/REJECTED)
- Links requester, owner, and plant

### CreditTransaction
- Tracks all credit movements
- Links to Stripe payment intents

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

### Environment Variables on Production
- Set `NEXTAUTH_URL` to your domain
- Use production Stripe keys
- Configure webhook endpoint in Stripe Dashboard

## 🔒 Security Checklist

- ✅ All server actions use Zod validation
- ✅ RBAC enforced at proxy.ts level
- ✅ Stripe webhooks verify signature
- ✅ Passwords hashed with bcrypt
- ✅ JWT sessions with secure cookies
- ✅ CSRF protection enabled

## 📈 Performance

- ✅ 'use cache' on marketplace for optimal performance
- ✅ Turbopack for fast builds
- ✅ Image optimization with Next.js Image
- ✅ Database queries optimized with Prisma

## 🤝 Contributing

This is a production template. Customize as needed:
- Add email notifications
- Implement chat system
- Add image upload to Cloudinary
- Create mobile app with React Native

## 📄 License

MIT License - Feel free to use for your projects!

## 🙏 Acknowledgments

- Next.js team for App Router
- Auth.js for authentication
- Prisma for database toolkit
- Stripe for payment processing
- Shadcn for UI components

## 📞 Support

For issues or questions:
1. Check the inline code comments
2. Review this README
3. Consult official documentation linked above

---

Built with ❤️ for the plant community 🌿
