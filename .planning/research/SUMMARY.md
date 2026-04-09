# Project Research Summary

**Project:** LibreChat Monetization (积分+支付+广告+会员)
**Domain:** Freemium AI API Platform with Chinese Market Monetization
**Researched:** 2026-04-09
**Confidence:** MEDIUM (web search had errors; verified via official docs where possible)

## Executive Summary

LibreChat is adding monetization features (credits, payment, ads, membership) to an existing token credit system. The existing balance/transaction infrastructure provides a solid foundation that new features must extend without breaking. Experts recommend building in order: (1) schema extensions for membership and transaction types, (2) payment gateway integration with WeChat Pay and Alipay using their official SDKs, (3) ad reward system with frontend SDK + backend validation, then (4) membership UI and subscription management. The critical risks are financial: non-atomic balance updates can cause double-spending, webhook idempotency failures can grant free credits, and race conditions on concurrent requests can drain balances. MongoDB transactions and idempotency keys are non-negotiable for payment features.

## Key Findings

### Recommended Stack

Payment processing requires Chinese-specific SDKs since Stripe/PayPal do not integrate with WeChat/Alipay. The `alipay-sdk` ^5.0.0 and `@wechatpay/node-sdk` ^1.0.0 are the official Node.js SDKs for these providers. Membership and points systems require no new dependencies - MongoDB/Mongoose already handle this well with proper transaction support. Ad integration uses frontend SDK only (AdMob for international, Pangle/Tencent Ads for China); the backend validates completion before granting credits.

**Core technologies:**
- `alipay-sdk` ^5.0.0 - Alipay API v3 integration for payment processing
- `@wechatpay/node-sdk` ^1.0.0 - WeChat Pay API v3 integration for payment processing
- MongoDB transactions - Atomic balance updates to prevent double-spending
- Redis (existing) - Rate limiting on payment endpoints, ad frequency caps

### Expected Features

**Must have (table stakes):**
- Points balance per user with transaction history
- Atomic deduction on API call completion (existing spendTokens flow)
- Recharge packages with fixed credit amounts
- Balance check before API calls

**Should have (competitive):**
- WeChat Pay and Alipay integration for automatic recharge
- Membership tiers (Free/Basic/Premium) with entitlement enforcement
- Rewarded video ads for free tier user retention
- Rate discounts for higher membership tiers

**Defer (v2+):**
- Enterprise tier - Low volume, high complexity, per-customer customization
- Automatic point expiry - Chinese regulatory complexity
- Referral system - Additional fraud attack surface
- Points gifting/transfers - Complexity and fraud potential

### Architecture Approach

The architecture extends existing Balance and Transaction models with new schemas and services. New schemas include `MembershipPlan` and `AdConfig`/`AdView`. Services layer includes `PaymentService` for WeChat/Alipay, `MembershipService` for tier management, and `AdRewardService` for credit grants. The frontend adds `BalanceContext`, `RechargeModal`, `AdViewer`, and `MembershipBadge` components. All balance-modifying operations must flow through `updateBalance` with MongoDB transactions to prevent race conditions. Tenant isolation via `tenantId` must be maintained across all new collections.

**Major components:**
1. **PaymentService** - WeChat/Alipay order creation, webhook verification, idempotency handling
2. **MembershipService** - Tier checking, benefit enforcement, monthly allowance grants
3. **AdRewardService** - Frequency cap enforcement, completion verification, credit awarding
4. **checkBalance middleware** - Extended to check membership tier before premium API access

### Critical Pitfalls

1. **Non-Atomic Payment + Balance Updates** - Transaction saves before balance update; if balance update fails, orphan transaction exists. Use MongoDB session/transaction wrapper for both operations.

2. **Race Condition on Balance Check** - Concurrent requests both read same balance, both proceed, both deduct. Add `tokenCredits: { $gte: requiredAmount }` guard and retry logic with distributed locks.

3. **Payment Webhook Idempotency Failures** - WeChat/Alipay retry webhooks; without idempotency keys, each retry credits account. Store processed webhook IDs with TTL, check before crediting.

4. **Insufficient Pre-Spend Validation** - `spendTokens` creates transaction first, then deducts; if balance exhausted mid-stream, AI API called for free. Implement credit reservation pattern: pre-check, reserve, confirm/cancel.

5. **Float Precision in Currency** - JavaScript Number for currency causes `0.1 + 0.2 = 0.30000000000000004`. Store credits as integers; all calculations integer-only; round only at display.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation (Schema Extensions + Membership Core)
**Rationale:** No external dependencies; establishes data model needed by all other phases.
**Delivers:** Extended user schema with membership fields, extended transaction types (recharge, ad_reward), membership service with basic tier checking.
**Addresses:** Points System (schema only), Membership System (core), Feature toggles centralization
**Avoids:** Pitfall 9 (scattered feature toggles) by building centralized permission system from start

### Phase 2: Payment Integration (WeChat Pay + Alipay)
**Rationale:** External SDK integration with highest risk (financial); requires idempotency, rate limiting, timeout handling.
**Delivers:** PaymentService, order management, webhook handlers, recharge frontend modal.
**Uses:** `alipay-sdk`, `@wechatpay/node-sdk`
**Implements:** Payment flow architecture from ARCHITECTURE.md
**Avoids:** Pitfalls 1 (atomicity), 3 (idempotency), 6 (rate limiting), 7 (timeout handling)

### Phase 3: Ad Reward System
**Rationale:** Retention mechanism for free tier; depends on payment working but has lower financial risk per interaction.
**Delivers:** Ad schemas, AdRewardService with frequency caps, AdViewer component, ad eligibility endpoints.
**Avoids:** Pitfall 11 (timing attacks) by verifying completion before crediting

### Phase 4: Membership UI + Polish
**Rationale:** Depends on payment and ad systems working; adds user-facing membership features.
**Delivers:** Membership plans page, upgrade prompts, VIP badge, subscribe/cancel flows.
**Avoids:** Pitfall 12 (expiry edge cases) with grace period implementation

### Phase Ordering Rationale

- **Schema before payment** because payment creates transactions that must fit the extended schema
- **Payment before ads** because ads award credits that come from platform (not purchased), but the credit awarding mechanism depends on existing transaction patterns
- **Foundation first** because all phases need membership fields and centralized permission checking
- **Low risk before high risk** because payment has direct financial risk; ad rewards have limited damage per abuse

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Payment):** Payment provider documentation (WeChat Pay API v3) had fetch errors during research; Chinese SDK docs may need validation
- **Phase 3 (Ads):** Ad provider selection (Pangle vs Tencent Ads) depends on target geography; SDK verification needed

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** MongoDB schema extensions follow existing patterns in codebase
- **Phase 4 (Membership UI):** Standard React component patterns, well-understood

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Alipay SDK verified; WeChat Pay SDK had multiple options, exact package needs confirmation |
| Features | MEDIUM | Training knowledge of Chinese payment ecosystems; could not verify with live sources |
| Architecture | HIGH | Based on existing codebase analysis; balance/transaction system is well-established |
| Pitfalls | HIGH | Critical pitfalls verified against Stripe/MongoDB best practices; identified from domain expertise |

**Overall confidence:** MEDIUM

### Gaps to Address

- **WeChat Pay SDK exact package:** Multiple options exist (`wechatpay-native`, `@wechatpay/node-sdk`, `wechatpay-axios`); needs verification during Phase 2 planning
- **Ad provider selection:** Pangle vs Tencent Ads depends on whether primary audience is China or international; clarify before Phase 3
- **Membership tier definitions:** Specific benefits per tier not yet defined; needs product decision before Phase 4
- **Payment provider accounts:** WeChat Pay and Alipay merchant accounts required; outside scope but blocker for Phase 2

## Sources

### Primary (HIGH confidence)
- MongoDB Transaction Documentation - Atomic operations pattern
- LibreChat codebase analysis - Existing balance/transaction system (packages/data-schemas/src/methods/transaction.ts)
- Stripe Webhook Best Practices - Idempotency patterns

### Secondary (MEDIUM confidence)
- Alipay SDK for Node.js (GitHub) - SDK API surface
- WeChat Pay API v3 (wiki doc) - API structure (fetch had errors)
- Training knowledge - Chinese payment ecosystem patterns

### Tertiary (LOW confidence)
- WeChat Pay direct documentation - Could not fetch during research; needs verification
- Tencent Ad / ByteDance Pangle integration guides - Not reviewed

---
*Research completed: 2026-04-09*
*Ready for roadmap: yes*
