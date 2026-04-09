# Technology Stack Additions: Monetization Features

**Project:** LibreChat Monetization (积分充值+广告+会员)
**Researched:** 2026-04-09
**Confidence:** MEDIUM (web search had errors; verified via official docs where possible)

---

## Executive Summary

The monetization features require stack additions in three areas: **Chinese payment integration** (Alipay/WeChat Pay), **membership/subscription management**, and **ad SDK integration**. MongoDB is already available and suitable for points/balance tracking. The backend is Node.js/Express with Mongoose.

---

## Recommended Stack Additions

### Payment Processing

#### Alipay Integration

| Package | Version | Purpose | Source |
|---------|---------|---------|--------|
| `alipay-sdk` | ^5.0.0 | Alipay API v3 SDK for Node.js | [alipay/alipay-sdk-nodejs](https://github.com/alipay/alipay-sdk-nodejs) |

**Why:** Official Alipay SDK, TypeScript support, API v3 compliance. Node.js >= 18.20.0 required (compatible with project).

**Use cases:**
- `pageExecute()` for web payment (H5/website payments)
- `sdkExecute()` for app payments
- `curl()` for direct API calls (native POS, etc.)

#### WeChat Pay Integration

| Package | Version | Purpose | Source |
|---------|---------|---------|--------|
| `wechatpay-native` or `@wechatpay/node-sdk` | ^1.0.0 | WeChat Pay API v3 SDK | [WeChatPay official](https://github.com/wechatpay-apiv3) |

**Why:** Official WeChat Pay API v3 packages. Supports native payments, H5, mini-program, etc.

**Alternative:** `wechatpay-axios` for HTTP-based integration.

**Use cases:**
- Native payments (QR code)
- H5 payments (mobile web)
- Callback signature verification

#### Payment Flow Architecture

```
User -> Backend: Create order (amount, subject, out_trade_no)
     -> Alipay/WeChat: Forward payment request
     -> Return payment URL/QR to frontend
User -> Complete payment on external app
     -> Alipay/WeChat: POST notify to backend callback
     -> Backend: Verify signature, update order status
     -> User: Webhook/polling confirms payment
```

---

### Membership & Subscription Management

**Recommendation:** Custom MongoDB-based membership with payment provider webhooks

| Approach | Pros | Cons |
|----------|------|------|
| **MongoDB + Webhooks (Recommended)** | Full control, no additional service, works with Chinese payments | More development work |
| Stripe Billing | Mature, feature-rich | Does not integrate natively with Alipay/WeChat Pay |
| Recurly/Padle | Chinese payment support | Limited Node.js SDK, complex setup |

**Why MongoDB-based:** Since Alipay and WeChat Pay do not have native subscription models (they are one-time payment focused), a custom membership tier system with MongoDB is recommended. Payment providers handle the actual payment; your system handles membership state.

**Membership schema approach:**
- Store `userId`, `tier` (free/bronze/silver/gold), `expiresAt`, `createdAt`
- Track entitlements in code (API rate limits, feature flags)
- Cron job or on-demand check for tier validation

---

### Points/Balance System

**No new dependencies required.** Use existing MongoDB/Mongoose stack.

**Recommended schema:**
- `UserBalance`: `userId`, `points`, `balance` (currency), `updatedAt`
- `Transaction`: `userId`, `type` (recharge/consume/refund), `amount`, `balanceAfter`, `referenceId`, `createdAt`

**Why:** Simple, MongoDB handles this well. Use MongoDB transactions for atomicity on balance updates.

---

### Ad Integration (Watch Ads for Points)

| Component | Recommendation | Notes |
|-----------|----------------|-------|
| **Frontend SDK** | AdMob (Google) or Pangle (ByteDance) | Depends on target audience. For Chinese users, Pangle or Tencent Ads may perform better. |
| **Backend** | No specific SDK needed | Track ad completion events via backend API, grant points manually |

**Why no backend SDK:** Rewarded ads are typically frontend-focused. The frontend SDK shows the ad, then notifies your backend upon completion. Your backend validates and credits points.

**Flow:**
```
Frontend: Request ad from SDK
       -> User watches ad
       -> SDK: 'onAdComplete' callback
Frontend -> Backend: POST /points/earn { type: 'ad', adId, completionTime }
Backend: Verify (rate limit per user), credit points
```

**SDK Options:**
| SDK | Pros | Cons |
|-----|------|------|
| AdMob | Universal, familiar, good docs | Limited in China |
| Pangle (ByteDance) | Dominant in China, good eCPM | More complex setup |
| Tencent Ads | WeChat ecosystem integration | Requires Tencent account |

---

### API Call Billing

**No new dependencies required.** Use existing MongoDB + Redis stack.

**Implementation approach:**
- Track per-user API usage in Redis (real-time counters)
- Aggregate to MongoDB periodically or on-demand
- Deduct from balance on each API call or batch

**Existing Redis usage:** Project already uses `ioredis` and `rate-limit-redis`. Leverage these for real-time usage tracking.

---

## What NOT to Add

| Package | Why Avoid |
|---------|-----------|
| `stripe` | Not compatible with Alipay/WeChat Pay natively. Would require workarounds. |
| `paypal` | Not relevant for Chinese market |
| `billing` libraries | Most assume Western payment ecosystem |
| Additional ORM layers | Mongoose is already in use |

---

## Integration Points

### Backend (`/packages/api`)

New endpoints needed:
- `POST /payments/alipay/create` - Initiate Alipay payment
- `POST /payments/wechat/create` - Initiate WeChat Pay
- `POST /payments/callback/alipay` - Alipay IPN callback
- `POST /payments/callback/wechat` - WeChat Pay callback
- `GET /user/balance` - Get user's points/balance
- `POST /user/points/earn` - Earn points (ads, promo)
- `POST /user/subscribe` - Create subscription
- `GET /user/membership` - Get membership status

### Data Schemas (`/packages/data-schemas`)

New schemas:
- `UserBalance` - Points and currency balance
- `Transaction` - All balance-affecting transactions
- `Membership` - User membership tier and status
- `PaymentOrder` - Payment tracking

### Frontend (`/client`)

New components:
- Payment modal (Alipay/WeChat QR codes)
- Membership upgrade UI
- Points history view
- Ad watching component (integrates SDK)

---

## Summary: New Dependencies

| Package | Workspace | Version | Purpose |
|---------|-----------|---------|---------|
| `alipay-sdk` | api | ^5.0.0 | Alipay payments |
| `wechatpay-node-sdk` or similar | api | ^1.0.0 | WeChat Pay payments |

**No new dependencies for:**
- Points/balance (MongoDB existing)
- Membership tiers (MongoDB existing)
- API billing (Redis/MongoDB existing)
- Ad integration (frontend SDK only)

---

## Verification Needed

- [ ] Confirm exact WeChat Pay SDK package name (multiple options exist)
- [ ] Verify Alipay SDK latest version on npm
- [ ] Check Ad SDK compatibility with your target markets
- [ ] Confirm Node.js version compatibility (project uses ^20.3.0)

---

## Sources

- [Alipay SDK for Node.js - GitHub](https://github.com/alipay/alipay-sdk-nodejs) (MEDIUM confidence)
- [Stripe Subscriptions Overview](https://docs.stripe.com/billing/subscriptions/overview) (MEDIUM confidence)
- [WeChat Pay API v3](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml) (LOW confidence - direct fetch failed)
