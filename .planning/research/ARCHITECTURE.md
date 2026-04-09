# Architecture: 积分系统 + 支付 + 广告 + 会员 Integration

**Project:** LibreChat Monetization Layer
**Researched:** 2026-04-09
**Confidence:** HIGH (existing balance/transaction system is well-established)

## Executive Summary

LibreChat already has a token credit system with `Balance` and `Transaction` models. The new monetization features extend this foundation:

- **积分 (Points/Credits)**: Leverages existing `tokenCredits` field; add recharge packages and purchase flow
- **支付 (Payment)**: External gateway integration (WeChat Pay, Alipay) via server-side payment handlers
- **广告 (Ads)**: New ad viewing service + credit reward mechanism; frontend ad display component
- **会员 (Membership)**: Extend user model with subscription tiers; new benefits enforcement middleware

## Existing Foundation

### Balance System (Already Implemented)

```
packages/data-schemas/src/schema/balance.ts
packages/data-schemas/src/schema/transaction.ts
packages/data-schemas/src/methods/transaction.ts
packages/data-schemas/src/methods/spendTokens.ts
```

| Model | Purpose |
|-------|---------|
| `Balance` | user + tokenCredits + autoRefill config |
| `Transaction` | user + tokenType (prompt/completion/credits) + tokenValue |

### API Endpoint (Already Implemented)

```
GET /api/balance  →  getUserBalance() in data-service.ts
```

### Key Behavior

- `tokenCredits` is the core currency unit (1000 tokens = $0.001 USD)
- Transactions deduct from balance on every API call
- Auto-refill triggers when balance hits zero

---

## Integration Architecture

### Component Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (client/)                       │
├─────────────────────────────────────────────────────────────────┤
│  BalanceContext        → Display tokenCredits, trigger recharge  │
│  AdViewerComponent     → Show ads, trigger credit reward         │
│  MembershipBadge       → Display VIP tier                       │
│  RechargeModal         → Package selection + payment            │
└───────────────────────────────┬─────────────────────────────────┘
                                │ API calls
┌───────────────────────────────▼─────────────────────────────────┐
│                    DATA-PROVIDER (packages/data-provider/)       │
├─────────────────────────────────────────────────────────────────┤
│  api-endpoints.ts     → New endpoints for:                      │
│                           /api/balance/recharge                  │
│                           /api/balance/ad-reward                 │
│                           /api/membership/status                 │
│                           /api/membership/plans                  │
│  data-service.ts      → New functions:                          │
│                           rechargeBalance()                     │
│                           claimAdReward()                        │
│                           getMembershipStatus()                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Type definitions, schemas
┌───────────────────────────────▼─────────────────────────────────┐
│               DATA-SCHEMAS (packages/data-schemas/)              │
├─────────────────────────────────────────────────────────────────┤
│  schema/balance.ts       → ADD: rechargeHistory, adRewards      │
│  schema/transaction.ts   → ADD: transactionType 'recharge'|'ad' │
│  schema/user.ts         → ADD: membershipTier, membershipExpiry │
│  schema/membership.ts   → NEW: MembershipPlan schema           │
│  schema/ad.ts           → NEW: AdConfig, AdView schema          │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Business logic
┌───────────────────────────────▼─────────────────────────────────┐
│                    PACKAGES/API (packages/api/)                  │
├─────────────────────────────────────────────────────────────────┤
│  routes/balance.ts        → Extend with recharge endpoint       │
│  routes/membership.ts     → NEW: membership routes              │
│  routes/payment.ts        → NEW: payment webhook handlers      │
│  middleware/checkBalance.ts → ADD: VIP tier checks              │
│  services/payment/        → NEW: PaymentService (WeChat/Alipay)│
│  services/membership/     → NEW: MembershipService             │
│  services/ad/             → NEW: AdRewardService                │
└─────────────────────────────────────────────────────────────────┘
```

---

## New Components by Feature

### 1. 积分充值 (Points Recharge)

#### Data Schema Additions

**Transaction type extension** (`packages/data-schemas/src/schema/transaction.ts`):

```typescript
// Add to tokenType enum and interface
tokenType: 'prompt' | 'completion' | 'credits' | 'recharge' | 'ad_reward';
```

**Recharge history** (`packages/data-schemas/src/schema/balance.ts`):

```typescript
// Add to balanceSchema
rechargeHistory: [{
  amount: Number,        // Credits purchased
  packageId: String,    // Recharge package ID
  paymentId: String,    // External payment reference
  method: String,       // 'wechat' | 'alipay'
  createdAt: Date,
}],
```

#### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/balance/recharge` | Initiate recharge (returns payment QR) |
| GET | `/api/balance/transactions` | List transaction history |
| POST | `/api/payment/webhook` | Payment gateway callback |

#### Data-Provider Functions

```typescript
// packages/data-provider/src/data-service.ts
export function rechargeBalance(payload: {
  packageId: string;
  paymentMethod: 'wechat' | 'alipay';
}): Promise<{ paymentQR: string; orderId: string }>;

export function getRechargePackages(): Promise<RechargePackage[]>;

export function getTransactionHistory(params: {
  cursor?: string;
  limit?: number;
}): Promise<TransactionListResponse>;
```

---

### 2. 广告 (Advertising)

#### Data Schema Additions

**New schemas** (`packages/data-schemas/src/schema/ad.ts`):

```typescript
interface IAdConfig extends Document {
  adUnitId: String,
  rewardCredits: Number,      // Credits awarded for viewing
  frequencyCap: Number,       // Max views per user per day
  frequencyWindow: 'day' | 'hour',
  enabled: Boolean,
  tenantId?: String,
}

interface IAdView extends Document {
  user: ObjectId,
  adUnitId: String,
  viewedAt: Date,
  rewardGranted: Boolean,
  conversationId?: String,   // Context where ad was shown
}
```

#### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/ads/config` | Get available ads for user |
| POST | `/api/ads/view` | Record ad view, grant reward |
| GET | `/api/ads/eligible` | Check if user can view ads |

#### Data-Provider Functions

```typescript
// packages/data-provider/src/data-service.ts
export function getAdConfig(): Promise<{ ads: AdConfig[]; canView: boolean }>;

export function claimAdReward(payload: {
  adUnitId: string;
  conversationId?: string;
}): Promise<{ granted: boolean; creditsAwarded: number; newBalance: number }>;
```

#### Frontend Component

```typescript
// client/src/components/Ads/AdViewer.tsx
interface AdViewerProps {
  conversationId?: string;
  onRewardClaimed?: (credits: number) => void;
  triggerCondition?: 'low_balance' | 'on_demand' | 'interval';
}
```

---

### 3. 会员 (Membership/VIP)

#### Data Schema Additions

**User model extension** (`packages/data-schemas/src/schema/user.ts`):

```typescript
// Add to userSchema
membership: {
  tier: {
    type: String,
    enum: ['free', 'basic', 'pro', 'enterprise'],
    default: 'free',
  },
  expiryDate: { type: Date },
  features: [{ type: String }],     // Enabled feature flags
  autoRenew: { type: Boolean, default: false },
},
```

**New MembershipPlan schema** (`packages/data-schemas/src/schema/membership.ts`):

```typescript
interface IMembershipPlan extends Document {
  tier: String,
  name: String,                      // e.g., "Pro VIP"
  price: Number,                     // In credits or CNY
  billingPeriod: 'monthly' | 'yearly',
  benefits: [String],                 // Feature flags
  creditAllowance: Number,           // Monthly free credits
  discountMultiplier: Number,        // e.g., 0.8 for 20% off
  enabled: Boolean,
  tenantId?: String,
}
```

#### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/membership/plans` | List available plans |
| GET | `/api/membership/status` | Get current user's membership |
| POST | `/api/membership/subscribe` | Subscribe to a plan |
| POST | `/api/membership/cancel` | Cancel auto-renew |

#### Data-Provider Functions

```typescript
// packages/data-provider/src/data-service.ts
export function getMembershipPlans(): Promise<MembershipPlan[]>;

export function getMembershipStatus(): Promise<{
  tier: string;
  expiryDate: Date;
  benefits: string[];
  isActive: boolean;
}>;

export function subscribeToPlan(payload: {
  planId: string;
  paymentMethod?: 'wechat' | 'alipay' | 'credits';
}): Promise<{ success: boolean; newTier?: string }>;
```

---

## Modified vs New Files

### New Files

| File | Purpose |
|------|---------|
| `packages/data-schemas/src/schema/membership.ts` | MembershipPlan schema |
| `packages/data-schemas/src/schema/ad.ts` | AdConfig, AdView schemas |
| `packages/api/src/routes/payment.ts` | Payment webhook handlers |
| `packages/api/src/services/payment/index.ts` | WeChat/Alipay integration |
| `packages/api/src/services/membership/index.ts` | Membership business logic |
| `packages/api/src/services/ad/index.ts` | Ad reward logic |
| `packages/api/src/routes/membership.ts` | Membership endpoints |
| `packages/api/src/routes/ads.ts` | Ad endpoints |
| `client/src/components/Ads/AdViewer.tsx` | Ad display component |
| `client/src/components/Recharge/RechargeModal.tsx` | Purchase modal |
| `client/src/components/Membership/MembershipBadge.tsx` | VIP badge display |

### Modified Files

| File | Change |
|------|--------|
| `packages/data-schemas/src/schema/balance.ts` | Add rechargeHistory, adRewards fields |
| `packages/data-schemas/src/schema/transaction.ts` | Add 'recharge', 'ad_reward' tokenTypes |
| `packages/data-schemas/src/schema/user.ts` | Add membership field |
| `packages/data-provider/src/api-endpoints.ts` | Add new endpoint URLs |
| `packages/data-provider/src/data-service.ts` | Add new API functions |
| `packages/data-provider/src/types.ts` | Add TBalanceResponse fields, new types |
| `packages/api/src/middleware/checkBalance.ts` | Add VIP tier rate discounts |

---

## Data Flow: Recharge

```
1. User clicks "Recharge" in BalanceContext
2. Frontend opens RechargeModal, fetches packages via getRechargePackages()
3. User selects package, chooses payment method (WeChat/Alipay)
4. Frontend calls rechargeBalance({ packageId, paymentMethod })
5. Backend:
   a. PaymentService.createOrder() → calls WeChat/Alipay API → returns QR code
   b. Creates pending Transaction with status='pending'
   c. Returns { paymentQR, orderId }
6. Frontend displays QR code
7. User scans QR with WeChat/Alipay app
8. Payment gateway sends webhook to POST /api/payment/webhook
9. Backend:
   a. PaymentService.verifyWebhook() validates signature
   b. Updates Transaction status='completed'
   c. Calls upsertBalanceFields() to add credits
   d. Returns success
10. Frontend polls or receives push, shows success, updates balance display
```

---

## Data Flow: Ad Reward

```
1. Frontend checks ad eligibility via getAdConfig()
2. If eligible, displays AdViewer component (or auto-plays based on trigger)
3. User watches ad (component tracks view duration)
4. On completion, Frontend calls claimAdReward({ adUnitId, conversationId })
5. Backend:
   a. Checks IAdView frequency cap for user
   b. If within limit:
      - Creates IAdView record
      - Calls upsertBalanceFields() to add reward credits
      - Creates Transaction with tokenType='ad_reward'
6. Returns { granted: true, creditsAwarded: X, newBalance: Y }
7. Frontend shows reward notification, updates balance
```

---

## Data Flow: Membership Check

```
1. User makes API request requiring membership (e.g., premium model)
2. checkBalance middleware:
   a. Reads user.membership.tier
   b. Checks if tier includes required feature
   c. If not, returns 403 with upgrade prompt
3. For rate discounts:
   a. getMultiplier() in transactions.ts reads user.membership.discountMultiplier
   b. Applies discount to token rate calculation
```

---

## Membership Benefits Implementation

| Benefit | Implementation |
|---------|----------------|
| Discounted API rates | `getMultiplier()` reads `user.membership.discountMultiplier` |
| Monthly free credits | `MembershipService.grantMonthlyAllowance()` on login |
| Priority access | Rate limiter reads `user.membership.tier` |
| Extended context | Check `user.membership.features` includes 'extended_context' |
| Higher frequency cap | `IAdView` frequency cap multiplied by tier multiplier |

---

## Suggested Build Order (Dependency Aware)

### Phase 1: Foundation (No external dependencies)
1. **Extend schemas** - Add membership fields to user, rechargeHistory to balance
2. **Create membership service** - Basic tier checking, benefits enforcement
3. **Extend transaction types** - Add 'recharge', 'ad_reward' tokenTypes

### Phase 2: Recharge (External payment SDK)
4. **Payment service** - WeChat/Alipay integration
5. **Recharge endpoints** - Create order, webhook handler
6. **Recharge frontend** - Modal, QR display, polling

### Phase 3: Ads (Internal logic)
7. **Ad schemas** - AdConfig, AdView
8. **Ad reward service** - Frequency cap, reward granting
9. **Ad endpoints** - Config, claim, eligibility
10. **Ad frontend** - AdViewer component, trigger logic

### Phase 4: Membership UI
11. **Membership endpoints** - Plans, subscribe, cancel
12. **Membership frontend** - Badge, upgrade prompts, plan display

---

## Scalability Considerations

| Concern | At 100 Users | At 10K Users | At 1M Users |
|---------|--------------|--------------|-------------|
| Balance updates | Optimistic locking sufficient | Redis pub/sub for real-time | Sharded balance records |
| Transaction history | Simple query | Cursor pagination, TTL on old records | Archive to separate collection |
| Ad frequency cap | In-memory Set per user | Redis Set with expiry | Distributed counter in Redis |
| Payment webhooks | Sequential processing | Queue with workers | Message queue (SQS/RabbitMQ) |
| Membership checks | DB read per request | Cache tier in JWT/session | Edge caching, short TTL |

---

## Key Files Reference

### Backend (packages/api/)

| Path | Purpose |
|------|---------|
| `src/middleware/checkBalance.ts` | Balance enforcement + auto-refill |
| `src/middleware/balance.ts` | Balance config initialization |
| `src/agents/transactions.ts` | Token spending transaction creation |
| `src/agents/usage.ts` | Token usage calculation |

### Data Schemas (packages/data-schemas/)

| Path | Purpose |
|------|---------|
| `src/schema/balance.ts` | Balance document schema |
| `src/schema/transaction.ts` | Transaction document schema |
| `src/methods/transaction.ts` | Balance update + transaction creation |
| `src/types/balance.ts` | IBalance, IBalanceUpdate interfaces |

### Data Provider (packages/data-provider/)

| Path | Purpose |
|------|---------|
| `src/api-endpoints.ts` | Endpoint URL builders (add new here) |
| `src/data-service.ts` | API call functions (add new here) |
| `src/types.ts` | TBalanceResponse, other shared types |

---

## Sources

- Existing balance system: `packages/data-schemas/src/schema/balance.ts`
- Existing transaction system: `packages/data-schemas/src/schema/transaction.ts`
- Transaction methods: `packages/data-schemas/src/methods/transaction.ts`
- Balance middleware: `packages/api/src/middleware/balance.ts`
- Check balance: `packages/api/src/middleware/checkBalance.ts`
- Data-provider balance: `packages/data-provider/src/data-service.ts` line 122-124
- API endpoints: `packages/data-provider/src/api-endpoints.ts` line 45
