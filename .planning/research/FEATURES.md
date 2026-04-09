# Feature Landscape: Monetization System (积分+支付+广告+会员)

**Domain:** Freemium AI API platform with Chinese market monetization
**Researched:** 2026-04-09
**Confidence:** MEDIUM (training knowledge, could not verify with live sources)

---

## Table of Contents

1. [积分系统 (Points System)](#1-积分系统-points-system)
2. [支付系统 (Payment System)](#2-支付系统-payment-system)
3. [广告系统 (Advertising System)](#3-广告系统-advertising-system)
4. [会员体系 (Membership System)](#4-会员体系-membership-system)
5. [API计费 (API Billing)](#5-api计费-api-billing)
6. [Feature Dependencies](#6-feature-dependencies)
7. [MVP Recommendation](#7-mvp-recommendation)

---

## 1. 积分系统 (Points System)

### What It Is

Virtual currency balance tracking user credits for API usage. Users purchase points (积分) with real money, earn them through ads, or receive as promotions.

### Expected Behavior

| Behavior | Description |
|----------|-------------|
| **Balance tracking** | Real-time point balance per user, persisted in database |
| **Deduction on use** | Points subtracted when API call completes (not at request time) |
| **Recharge** | Purchase points via WeChat/Alipay in predefined packages |
| **Award from ads** | Grant fixed points after watching ad video completes |
| **Expiry handling** | Optional: points expire after X days (check regulations) |
| **Refund policy** | Generally none for points; some platforms allow "cashout" |

### Points Package Tiers (Common in China)

| Package | Points | Price (CNY) | Value Ratio |
|---------|--------|-------------|-------------|
|  Starter | 100 | 10 | 1元=10积分 |
|  Basic | 1,000 | 90 | 1元=11积分 |
|  Standard | 5,000 | 400 | 1元=12.5积分 |
|  Pro | 10,000 | 750 | 1元=13.3积分 |
|  Enterprise | 100,000 | 6,000 | 1元=16.7积分 |

### Complexity

**Medium** — Requires:
- Database schema for balance + transaction history
- Atomic deduction (prevent overspending in concurrent requests)
- Idempotency keys for payment callbacks
- cron job or event-driven expiry处理

### Integration Points

- User entity: add `pointsBalance` field
- Transaction log: `userId`, `amount` (+/-), `type` (recharge/ad/billing/promo), `createdAt`, `orderId`
- API interceptor: check balance before call, deduct after success

---

## 2. 支付系统 (Payment System)

### What It Is

Integration with Chinese payment providers to convert real money to platform points.

### Supported Payment Methods

| Provider | Type | Integration Complexity | Notes |
|----------|------|----------------------|-------|
| **微信支付 (WeChat Pay)** | In-app QR / H5 | Medium | Requires WeChat merchant account |
| **支付宝 (Alipay)** | In-app QR / H5 | Medium | Requires Alipay merchant account |
| **手动充值** | Peer-to-peer | Low | Admin manually adds points (backup) |

### Payment Flow

```
User selects package
       ↓
Create pending order (status: pending)
       ↓
Generate payment QR code (WeChat/Alipay)
       ↓
User scans and pays
       ↓
Payment provider sends async callback (webhook)
       ↓
Verify signature + amount + idempotency
       ↓
Update order status: completed
       ↓
Credit user's points balance
       ↓
Record transaction log
```

### Critical Implementation Details

| Detail | Why Important |
|--------|---------------|
| **Idempotency** | Payment provider may retry callback multiple times |
| **Signature verification** | Prevent fake payment notifications |
| **Amount verification** | Ensure paid amount matches order amount |
| **Atomic balance update** | Use database transaction for points credit |
| **Order timeout** | Pending orders expire (e.g., 30 min), release inventory |

### Complexity

**High** — Requires:
- Payment provider SDK integration
- Webhook endpoint with signature verification
- Order state machine (pending → paid → completed/failed/expired)
- Merchant account setup with payment providers
- Security hardening against payment fraud

---

## 3. 广告系统 (Advertising System)

### What It Is

Reward-based video ads that grant users free points. Common in freemium mobile games and apps.

### Ad Types

| Type | Duration | Points Granted | Complexity |
|------|----------|----------------|------------|
| **Rewarded Video** | 15-30 sec | 5-20 pts | Medium |
| **Interstitial** | 5-15 sec | 2-5 pts | Medium |
| **Banner** | Ongoing | 1 pt/min | Low (low revenue) |

### Expected Behavior

| Behavior | Description |
|----------|-------------|
| **Ad display** | Show ad video to user, cannot skip |
| **Completion tracking** | Only credit points if video plays to end (>90%) |
| **Cooldown period** | Prevent abuse: max 1 ad per 5 minutes or 10 ads/day |
| **No auto-play** | User explicitly initiates ad viewing |
| **Ad provider integration** | Tencent Ad / ByteDance Pangle / normal web ads |

### Ad Provider Options for China Market

| Provider | Type | Integration |
|----------|------|-------------|
| **腾讯广告 (Tencent Ad)** | Video, Interstitial | Requires Tencent Ad merchant account |
| **巨量引擎 (ByteDance Pangle)** | Video, Interstitial | Requires ByteDance ad account |
| **Google AdSense** | Banner, Display | Blocked in China |
| **手动广告** | Static images | Fallback, low revenue |

### Complexity

**Medium** — Requires:
- Ad SDK integration (rewarded video API)
- Frontend ad player component
- Server-side verification of ad completion (prevent cheating)
- Rate limiting logic (per-user, per-day)
- Ad slot management (when/where ads appear)

### Anti-Features

| Avoid | Why |
|-------|-----|
| **Auto-play ads without user initiation** | Poor UX, violates ad provider policies |
| **Ads before every API call** | Destroys user experience, users will leave |
| **Fake/ad-filled "free" tier** | Makes product unusable, not sustainable |

---

## 4. 会员体系 (Membership System)

### What It Is

Tiered subscription model offering perks based on membership level. Common in Chinese SaaS and AI platforms.

### Membership Tiers (Typical)

| Tier | Monthly Fee | Benefits |
|------|-------------|----------|
| **Free** | 0 | Limited points, basic API access, ads |
| **基础 (Basic)** | 29-99 CNY | More points, no ads, priority support |
| **高级 (Premium)** | 99-299 CNY | Even more points, faster API, exclusive models |
| **企业 (Enterprise)** | 999+ CNY | Unlimited points, custom API, SLA, dedicated support |

### Membership Benefits by Category

| Benefit Category | Free | Basic | Premium | Enterprise |
|------------------|------|-------|---------|------------|
| Points included | 100/mo | 1,000/mo | 5,000/mo | 50,000/mo |
| Ads shown | Yes | No | No | No |
| API rate limit | 10/min | 50/min | 200/min | Unlimited |
| Model access | Basic | Standard | All | All + Custom |
| Priority support | No | Email | Chat | Dedicated |
| Data export | No | Yes | Yes | Yes |
| Custom prompts | No | No | Yes | Yes |

### Implementation Approaches

| Approach | Complexity | Notes |
|----------|------------|-------|
| **Feature flags per tier** | Medium | Simple boolean/bitset on user record |
| **Entitlements service** | High | Separate microservice for complex permissions |
| **Points + membership hybrid** | Medium | Membership gives bonuses, points still required |

### Complexity

**Medium** — Requires:
- Subscription billing (monthly/annual)
- Tier management (upgrade/downgrade/cancel)
- Entitlement checks before API calls
- Grace period for expired subscriptions
- Payment provider subscription integration (WeChat/Alipay recurring)

---

## 5. API计费 (API Billing)

### What It Is

Charging users based on actual API usage. Core monetization for an AI API platform.

### Billing Models

| Model | Description | Use Case |
|-------|-------------|----------|
| **Per-token** | Charge per input/output token | Most LLM APIs (OpenAI-style) |
| **Per-call** | Fixed price per API request | Simple, predictable |
| **Per-second** | Charge for real-time streaming duration | Voice/Video APIs |
| **混合 (Hybrid)** | Base fee + per-token overage | Tiers with included usage |

### Points Cost by Operation Type

| Operation | Points Cost | Calculation |
|-----------|-------------|-------------|
| Text chat (GPT-4) | 100 pts/message | Based on token count |
| Text chat (GPT-3.5) | 10 pts/message | Lower cost model |
| Image generation | 500 pts/image | High compute cost |
| Whisper transcription | 50 pts/minute | Audio processing |

### Cost Tracking Requirements

| Requirement | Description |
|-------------|-------------|
| **Token counting** | Accurate input + output token tracking |
| **Real-time balance check** | Block requests when balance < cost estimate |
| **Deduction on completion** | Atomic deduction after successful response |
| **Refund on failure** | If API fails, refund the points |
| **Batch error handling** | Partial success in batch: charge only successful |

### Complexity

**High** — Requires:
- Accurate token计量 (use model provider's token count)
- Pre-call balance reservation (optimistic locking)
- Async deduction with failure recovery
- Rate limiting per user/tier
- Usage dashboard for users

---

## 6. Feature Dependencies

```
Payment System
       ↓
   [Creates dependency]
       ↓
Points System ←→ Membership System
       ↑                    ↑
       |                    |
   [Enables]            [Requires]
       |                    |
       ↓                    ↓
   Ad System          API Billing
```

### Dependency Graph

| Feature | Depends On | Enables |
|---------|-----------|---------|
| Points System | User identity | API Billing, Ad System, Membership bonuses |
| Payment System | Points System (order creation) | Points recharge |
| Ad System | Points System (credit awarding) | User retention, free tier |
| Membership System | Payment System (subscriptions) | Premium revenue, entitlement checks |
| API Billing | Points System (deduction) | Core monetization |

### Implementation Order Rationale

1. **User identity** → Already exists in LibreChat
2. **Points System** → Foundation for everything else
3. **API Billing** → Core value proposition, deducts points
4. **Payment System** → Allows recharge (needed for sustainability)
5. **Ad System** → Retention tool for free tier (do after billing works)
6. **Membership System** → Subscription revenue (do after basic flow works)

---

## 7. MVP Recommendation

### Prioritize (In Order)

1. **Points System** — Foundation, low risk, enables everything else
   - User balance field
   - Transaction log
   - Basic CRUD operations

2. **API Billing** — Core value, how platform makes money
   - Token counting per request
   - Atomic deduction on completion
   - Balance check before call
   - Rate limiting

3. **Payment System (Manual first)** — Simplest path to revenue
   - Admin adds points manually (backup)
   - Then integrate WeChat/Alipay

4. **Payment System (WeChat/Alipay)** — Full automation
   - Order management
   - Webhook handling
   - Idempotency protection

5. **Ad System** — User retention for free tier
   - Rewarded video integration
   - Point granting on completion

6. **Membership System** — Premium revenue
   - Tier definitions
   - Entitlement checks
   - Subscription billing

### Defer

| Feature | Reason to Defer |
|---------|-----------------|
| Enterprise tier | Low volume, high complexity, customize per customer |
| Automatic point expiry | Regulatory complexity in China |
| Referral system | Additional attack surface, fraud risk |
| Points gifting/transfers | Complexity, fraud potential |

### MVP Feature Set

```
MVP Scope:
├── Points balance per user
├── Transaction history
├── API call metering (per-token)
├── Points deduction on API completion
├── Balance check before API call
├── Manual points recharge (admin)
├── WeChat/Alipay recharge (post-MVP)
├── Rewarded video ads (post-MVP)
└── Basic membership tiers (post-MVP)
```

---

## Sources

**Confidence: MEDIUM**

This analysis is based on:
- General knowledge of Chinese payment ecosystems (WeChat Pay, Alipay merchant integration patterns)
- Standard freemium monetization patterns used in Asia markets
- Typical API billing models (OpenAI-style per-token, per-request)
- Training data through 2024-06

**Could not verify with live sources** due to search API limitations. Recommend validation against:
- WeChat Pay merchant documentation
- Alipay open platform docs
- Tencent Ad / ByteDance Pangle integration guides
- Chinese regulations on virtual currency (points) systems

---

## Appendix: Database Schema Suggestions

### User Points Extension

```typescript
interface UserPoints {
  userId: string;
  balance: number;           // Current points balance
  lifetimeEarned: number;     // Total points ever earned
  lifetimeSpent: number;      // Total points ever spent
  updatedAt: Date;
}
```

### Transaction Log

```typescript
interface PointTransaction {
  id: string;
  userId: string;
  amount: number;             // Positive = credit, Negative = debit
  type: 'recharge' | 'ad' | 'billing' | 'promo' | 'refund';
  orderId?: string;           // For recharges
  description: string;
  balanceAfter: number;       // Snapshot of balance after transaction
  createdAt: Date;
}
```

### Order (Payment)

```typescript
interface PointOrder {
  id: string;
  userId: string;
  points: number;            // Points to credit
  amount: number;            // Real money amount (CNY)
  status: 'pending' | 'paid' | 'completed' | 'expired' | 'failed';
  paymentMethod: 'wechat' | 'alipay' | 'manual';
  paidAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  expiresAt: Date;           // Order expiry
}
```
