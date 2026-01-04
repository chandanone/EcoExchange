# EcoExchange - Technical Architecture Documentation

## System Overview

EcoExchange is a production-ready, secure P2P marketplace for plant cuttings built on Next.js 16 with a comprehensive tech stack optimized for performance, security, and scalability.

## Architecture Decisions

### 1. Next.js 16 with App Router
**Why:** Server Components by default reduce client-side JavaScript, improving performance and SEO.

**Key Features Used:**
- **Turbopack (Stable)**: Faster builds and HMR
- **Server Actions**: Type-safe server mutations without API routes
- **'use cache' directive**: Explicit caching for marketplace queries
- **Dynamic rendering**: Default behavior with selective caching

### 2. Auth.js v5 (Beta)
**Why:** Modern authentication with native Edge runtime support.

**Configuration:**
```typescript
- JWT Strategy for sessions
- Google OAuth provider
- Credentials provider with bcrypt
- Extended session with user metadata
```

### 3. Prisma 7 with engineType="client"
**Why:** Rust-free Query Compiler reduces bundle size and improves cold starts.

**Schema Highlights:**
- ENUM types for status fields
- Cascade deletes for data integrity
- Indexed foreign keys for query performance
- Transaction tracking for audit trails

### 4. proxy.ts Pattern
**Why:** Next.js 16 recommends lightweight proxies over heavy middleware.

**Benefits:**
- Granular route protection
- Better tree-shaking
- Reduced edge function size
- Explicit RBAC enforcement

## Data Flow

### Plant Approval Workflow
```
1. User creates plant → Status: PENDING
2. Admin reviews in /admin/approval
3. Admin approves/rejects
   - APPROVED: Visible in marketplace
   - REJECTED: User notified with admin notes
4. Users can request swaps on APPROVED plants
```

### Payment Flow
```
Subscription:
User → Stripe Checkout → Success → Webhook → Update DB → Add Credits

Credits:
User → Payment Intent → Success → Webhook → Update DB → Add Credits

Swap:
User → Request Swap → Owner Accepts → Deduct Credit → Update Status
```

## Security Measures

### 1. Input Validation
- **All server actions** use Zod schemas
- **Double validation**: Client + Server
- **Type-safe**: TypeScript + Zod inference

### 2. Authentication
- **JWT sessions** stored in HTTP-only cookies
- **CSRF protection** via Auth.js
- **Password hashing** with bcrypt (10 rounds)

### 3. Authorization
- **RBAC** enforced at proxy.ts level
- **Ownership checks** in all mutations
- **Admin-only routes** protected

### 4. Stripe Security
- **Webhook signature verification**
- **Idempotency handling**
- **Metadata validation**

## Performance Optimizations

### 1. Caching Strategy
```typescript
// Marketplace - Static with revalidation
'use cache'
export const revalidate = 3600; // 1 hour

// User data - Dynamic
// No caching, always fresh

// Admin panel - Real-time
// No caching for approval queue
```

### 2. Database Queries
- **Select only needed fields**
- **Batch queries with Promise.all**
- **Indexed foreign keys**
- **Connection pooling via Prisma**

### 3. Bundle Size
- **Tree-shaking**: Import only used components
- **Code splitting**: Automatic with App Router
- **Prisma Client engine**: Reduced size with engineType="client"

## Scalability Considerations

### Current Architecture
- **Vertical scaling**: Increase database resources
- **Horizontal scaling**: Vercel handles automatically
- **Edge functions**: Auth and routing

### Future Enhancements
- Redis for session storage
- S3/Cloudinary for image uploads
- ElasticSearch for advanced plant search
- WebSocket for real-time notifications
- GraphQL for flexible queries

## Deployment Architecture

### Production Stack
```
Vercel (Frontend + API Routes)
    ↓
PostgreSQL (Supabase/Neon)
    ↓
Stripe (Payments)
    ↓
Google OAuth (Authentication)
```

### Environment Separation
- **Development**: Local PostgreSQL, Stripe test mode
- **Staging**: Cloud database, Stripe test mode
- **Production**: Managed database, Stripe live mode

## Monitoring & Observability

### Recommended Tools
- **Error tracking**: Sentry
- **Analytics**: Vercel Analytics
- **Database monitoring**: Prisma Pulse
- **APM**: New Relic or Datadog

### Key Metrics
- Response time for server actions
- Database query performance
- Stripe webhook success rate
- User conversion funnel
- Cache hit rates

## Testing Strategy

### Unit Tests
```bash
# Server Actions
npm test src/actions/*.test.ts

# Utilities
npm test src/lib/*.test.ts
```

### Integration Tests
```bash
# API routes
npm test src/app/api/**/*.test.ts

# Webhook handlers
npm test src/app/api/webhooks/**/*.test.ts
```

### E2E Tests
```bash
# Playwright for critical flows
npm run test:e2e
```

## Database Migrations

### Development
```bash
npx prisma db push  # Quick schema sync
```

### Production
```bash
npx prisma migrate deploy  # Use migrations
```

### Best Practices
1. Always test migrations in staging
2. Backup database before migration
3. Use transactions for data migrations
4. Monitor query performance after deployment

## API Rate Limiting

### Recommended Implementation
```typescript
// Rate limit by user ID
const limiter = {
  'plants:create': { max: 10, window: '1h' },
  'swap:request': { max: 20, window: '1h' },
  'admin:approve': { max: 100, window: '1h' },
};
```

## Error Handling

### Server Actions
```typescript
try {
  // Action logic
  return { success: true, data };
} catch (error) {
  console.error('Action error:', error);
  return { 
    success: false, 
    error: error instanceof Error ? error.message : 'Unknown error'
  };
}
```

### API Routes
```typescript
try {
  // Route logic
  return NextResponse.json({ data });
} catch (error) {
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

## Backup & Disaster Recovery

### Database Backups
- **Automated daily backups** (provider-managed)
- **Point-in-time recovery** available
- **Manual backup** before major migrations

### Code Repository
- **GitHub** for version control
- **Protected main branch** with PR reviews
- **Tag releases** for rollback capability

## Compliance & Legal

### Data Privacy
- GDPR-compliant user data handling
- User data export capability
- Account deletion with cascade

### Payment Processing
- PCI-DSS compliant via Stripe
- No card data stored in database
- Stripe handles all sensitive data

## Development Workflow

### 1. Feature Development
```bash
git checkout -b feature/new-feature
# Develop locally
npm run dev
# Test thoroughly
npm run build
# Create PR
```

### 2. Code Review Checklist
- [ ] TypeScript strict mode compliant
- [ ] Zod validation on server actions
- [ ] Error handling implemented
- [ ] Loading states for async operations
- [ ] Responsive design tested
- [ ] Accessibility checked

### 3. Deployment
```bash
git checkout main
git merge feature/new-feature
git push origin main
# Vercel auto-deploys
```

## Troubleshooting Guide

### Common Issues

#### 1. Prisma Client Not Generated
```bash
npx prisma generate
```

#### 2. Authentication Errors
- Check NEXTAUTH_SECRET is set
- Verify NEXTAUTH_URL matches deployment URL
- Ensure Google OAuth redirect URI is correct

#### 3. Stripe Webhooks Not Working
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy webhook secret to .env.local
```

#### 4. Database Connection Issues
- Verify DATABASE_URL format
- Check database is running
- Ensure network allows connections

## Future Roadmap

### Phase 2 Features
- [ ] Email notifications (SendGrid/Resend)
- [ ] Image upload (Cloudinary)
- [ ] Advanced search with filters
- [ ] User ratings and reviews
- [ ] Chat system (Socket.io/Pusher)

### Phase 3 Features
- [ ] Mobile app (React Native)
- [ ] Plant care reminders
- [ ] Community forums
- [ ] Referral program
- [ ] Analytics dashboard for users

## Contributing Guidelines

### Code Style
- Use Prettier for formatting
- Follow ESLint rules
- Write descriptive commit messages
- Add JSDoc comments for complex functions

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] No console errors

## Screenshots (if applicable)
```

## License

MIT License - See LICENSE file for details

---

**Last Updated:** January 2026
**Version:** 1.0.0
**Maintainer:** EcoExchange Team
