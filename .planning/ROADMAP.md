# Roadmap: LibreChat Monetization

## Milestones

- **v1.1** - Complete monetization system (Phases 1-4)

## Phases

- [ ] **Phase 1: Foundation** - Credit accounts, basic membership, manual recharge
- [ ] **Phase 2: Payment Integration** - Stripe, WeChat, Alipay integration
- [ ] **Phase 3: Ad Reward System** - Video ad rewards with rate limiting
- [ ] **Phase 4: Membership UI** - Paid membership pages and upgrades

## Phase Details

### Phase 1: Foundation
**Goal**: Users have working credit accounts, basic membership tiers, and manual recharge available
**Depends on**: Nothing (first phase)
**Requirements**: CREDIT-01, CREDIT-02, CREDIT-03, CREDIT-04, MEMBERSHIP-01, MEMBERSHIP-05, PAYMENT-06
**Success Criteria** (what must be TRUE):
  1. User has a visible credit/balance account in their profile
  2. All credit transactions (recharge, consumption, refund) are recorded in transaction history
  3. API calls deduct credits based on actual token usage in real-time
  4. AI calls are blocked when user balance is insufficient
  5. Free users can access the platform with basic API quota and ad-supported credit earning
  6. Different membership tiers enforce different API rate limits
  7. Admins can manually add credits to any user account
**Plans**: 1 plan
- [ ] 01-01-PLAN.md -- Foundation: schema extensions, membership service, admin recharge

### Phase 2: Payment Integration
**Goal**: Users can purchase credits via Stripe, WeChat Pay, and Alipay
**Depends on**: Phase 1
**Requirements**: PAYMENT-01, PAYMENT-02, PAYMENT-03, PAYMENT-04, PAYMENT-05
**Success Criteria** (what must be TRUE):
  1. User can select from predefined credit packages and initiate payment
  2. User can pay via Stripe (WeChat, Alipay, credit card)
  3. User can pay via WeChat Pay direct integration for domestic users
  4. User can pay via Alipay direct integration for domestic users
  5. User receives credits after successful payment with idempotent callback processing preventing duplicate charges
**Plans**: TBD

### Phase 3: Ad Reward System
**Goal**: Users can earn credits by watching reward-based video ads
**Depends on**: Phase 1
**Requirements**: ADS-01, ADS-02, ADS-03, ADS-04
**Success Criteria** (what must be TRUE):
  1. User can watch a reward video and receive credits upon completion
  2. System enforces daily ad watch limits per user to prevent abuse
  3. Server-side verification confirms ad watch completion before crediting
  4. Credits are immediately added to user balance after verified ad watch
**Plans**: TBD

### Phase 4: Membership UI
**Goal**: Paid membership pages display correctly and membership upgrades work
**Depends on**: Phase 2
**Requirements**: MEMBERSHIP-02, MEMBERSHIP-03, MEMBERSHIP-04
**Success Criteria** (what must be TRUE):
  1. Bronze, Silver, and Gold membership tiers are displayed with distinct benefits and pricing
  2. User can successfully upgrade from free to a paid tier
  3. User can switch between paid tiers (upgrade/downgrade)
  4. Membership benefits are applied immediately upon upgrade
  5. Paid members can access their tier-specific API quotas
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/1 | Not started | - |
| 2. Payment Integration | 0/5 | Not started | - |
| 3. Ad Reward System | 0/4 | Not started | - |
| 4. Membership UI | 0/5 | Not started | - |

## Coverage

**Total requirements:** 19
**Phase 1:** CREDIT-01, CREDIT-02, CREDIT-03, CREDIT-04, MEMBERSHIP-01, MEMBERSHIP-05, PAYMENT-06 (7)
**Phase 2:** PAYMENT-01, PAYMENT-02, PAYMENT-03, PAYMENT-04, PAYMENT-05 (5)
**Phase 3:** ADS-01, ADS-02, ADS-03, ADS-04 (4)
**Phase 4:** MEMBERSHIP-02, MEMBERSHIP-03, MEMBERSHIP-04 (3)
