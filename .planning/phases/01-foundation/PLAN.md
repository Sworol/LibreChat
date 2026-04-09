---
phase: "01-foundation"
plan: "01"
type: "execute"
wave: "1"
depends_on: []
files_modified:
  - "packages/data-schemas/src/schema/user.ts"
  - "packages/data-schemas/src/schema/transaction.ts"
  - "packages/data-schemas/src/schema/membership.ts"
  - "packages/data-schemas/src/types/user.ts"
  - "packages/data-schemas/src/types/balance.ts"
  - "packages/data-schemas/src/models/index.ts"
autonomous: false
requirements:
  - "CREDIT-01"
  - "CREDIT-02"
  - "CREDIT-03"
  - "CREDIT-04"
  - "MEMBERSHIP-01"
  - "MEMBERSHIP-05"
  - "PAYMENT-06"
user_setup: []

must_haves:
  truths:
    - "User has visible credit/balance account in profile"
    - "All transactions (recharge, consumption, refund) recorded in history"
    - "API calls deduct credits based on token usage in real-time"
    - "AI calls blocked when balance insufficient"
    - "Free users can access with basic quota"
    - "Different tiers enforce different rate limits"
    - "Admins can manually add credits"
  artifacts:
    - path: "packages/data-schemas/src/schema/membership.ts"
      provides: "MembershipPlan schema for tier definitions"
      min_lines: 40
    - path: "packages/data-schemas/src/schema/user.ts"
      provides: "User schema with membership field"
      contains: "membership:"
    - path: "packages/data-schemas/src/schema/transaction.ts"
      provides: "Transaction schema with refund tokenType"
      contains: "refund"
    - path: "packages/api/src/services/membership/index.ts"
      provides: "MembershipService with tier checking and rate limits"
      min_lines: 80
    - path: "api/server/routes/balance.js"
      provides: "Balance routes with transaction history"
      exports: "GET /transactions, POST /add"
    - path: "packages/api/src/middleware/checkBalance.ts"
      provides: "Balance check with membership tier enforcement"
      min_lines: 50
  key_links:
    - from: "packages/api/src/middleware/checkBalance.ts"
      to: "packages/data-schemas/src/schema/user.ts"
      via: "reads membership.tier from user"
      pattern: "user.*membership"
    - from: "api/server/routes/balance.js"
      to: "packages/data-schemas/src/methods/transaction.ts"
      via: "getTransactions() query"
      pattern: "getTransactions"
    - from: "packages/api/src/services/membership/index.ts"
      to: "packages/data-schemas/src/schema/membership.ts"
      via: "MembershipPlan model"
      pattern: "MembershipPlan"
---

<objective>
Implement Phase 1 Foundation: credit accounts, transaction history, API call deduction, balance blocking, free user basics, membership tiers, and admin manual recharge.

Purpose: Establish the data model and core services for the monetization system.
Output: Extended user schema with membership, transaction types for recharge/refund, MembershipPlan schema, MembershipService, and admin manual recharge endpoint.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/research/SUMMARY.md
@.planning/research/ARCHITECTURE.md

# Existing patterns from codebase

From packages/data-schemas/src/schema/balance.ts:
- Balance schema uses tokenCredits (integer, 1000 = $0.001 USD)
- Auto-refill fields: autoRefillEnabled, refillIntervalValue, refillIntervalUnit, lastRefill, refillAmount

From packages/data-schemas/src/schema/transaction.ts:
- tokenType enum: 'prompt' | 'completion' | 'credits'
- Fields: user, conversationId, model, context, valueKey, rate, rawAmount, tokenValue, inputTokens, writeTokens, readTokens, messageId

From packages/data-schemas/src/methods/transaction.ts:
- updateBalance() with optimistic concurrency control (10 retries, jittered delay)
- getTransactions() for querying transaction history
- findBalanceByUser() for balance lookups

From packages/api/src/middleware/checkBalance.ts:
- checkBalanceRecord() checks if user can spend based on tokenCredits
- Throws error with ViolationTypes.TOKEN_BALANCE when insufficient
- Uses getMultiplier() from transaction methods

From packages/api/src/admin/users.ts:
- Admin handlers follow pattern: listUsers, searchUsers, deleteUser
- Uses FilterQuery from mongoose, parsePagination helper

From api/server/routes/balance.js:
- Express router with requireJwtAuth middleware
- Controller pattern: async function(req, res)

From packages/data-provider/src/types.ts:
- TBalanceResponse: tokenCredits, autoRefillEnabled, refillIntervalValue, refillIntervalUnit, lastRefill, refillAmount
</context>

<tasks>

<task type="auto">
  <name>Task CREDIT-01: Extend user schema with membership fields</name>
  <files>
    - packages/data-schemas/src/schema/user.ts
    - packages/data-schemas/src/schema/membership.ts
    - packages/data-schemas/src/types/user.ts
  </files>
  <action>
    1. Add membership field to userSchema in packages/data-schemas/src/schema/user.ts:
       - membership: { type: Object, default: { tier: 'free', expiryDate: null, features: [] } }
       - Fields: tier (enum: 'free', 'basic', 'pro', 'enterprise'), expiryDate (Date), features ([String])

    2. Create new file packages/data-schemas/src/schema/membership.ts:
       - MembershipPlan schema with: tier, name, price, billingPeriod, benefits, creditAllowance, discountMultiplier, enabled, tenantId
       - This defines membership tier benefits

    3. Add membership field to IUser interface in packages/data-schemas/src/types/user.ts

    IMPORTANT: Follow existing schema patterns. Use applyTenantIsolation plugin for MembershipPlan.
  </action>
  <verify>
    <automated>cd packages/data-schemas && npx tsc --noEmit --skipLibCheck 2>&1 | head -30</automated>
  </verify>
  <done>
    User schema includes membership.tier, membership.expiryDate, membership.features fields. MembershipPlan schema exists with tier definitions.
  </done>
</task>

<task type="auto">
  <name>Task CREDIT-02: Extend transaction schema with recharge/refund types</name>
  <files>
    - packages/data-schemas/src/schema/transaction.ts
    - packages/data-schemas/src/types/balance.ts
  </files>
  <action>
    1. Extend tokenType enum in packages/data-schemas/src/schema/transaction.ts:
       - Change from: 'prompt' | 'completion' | 'credits'
       - To: 'prompt' | 'completion' | 'credits' | 'recharge' | 'refund'

    2. Add new optional fields to ITransaction interface:
       - context: extended to include 'manual_recharge', 'refund', 'ad_reward'
       - paymentId: String (external payment reference for recharge)
       - adminId: String (admin who manually added credits for manual recharge)

    3. Add IBalanceUpdate fields for manual recharge tracking:
       - lastRecharge: Date
       - rechargeCount: Number

    IMPORTANT: Use existing schema patterns. Keep backward compatibility with existing tokenTypes.
  </action>
  <verify>
    <automated>cd packages/data-schemas && npx tsc --noEmit --skipLibCheck 2>&1 | head -30</automated>
  </verify>
  <done>
    Transaction schema supports 'recharge' and 'refund' tokenTypes. IBalanceUpdate includes recharge tracking fields.
  </done>
</task>

<task type="auto">
  <name>Task CREDIT-03: Implement real-time API call credit deduction</name>
  <files>
    - packages/api/src/agents/transactions.ts
    - packages/api/src/agents/usage.ts
    - packages/api/src/middleware/checkBalance.ts
  </files>
  <action>
    1. In packages/api/src/agents/usage.ts, ensure spendTokens/spendStructuredTokens are called after token usage is calculated:
       - Verify the existing flow: token usage calculated -> spendTokens() called -> transaction created -> balance updated

    2. In packages/api/src/agents/transactions.ts, verify the transaction flow:
       - createTransaction() is called with token usage data
       - Balance is deducted atomically via updateBalance()

    3. Ensure checkBalance.ts middleware uses the existing checkBalanceRecord():
       - It already checks balance before allowing API calls
       - Ensure it reads user.membership.tier for tier-based rate limits (MEMBERSHIP-05)

    IMPORTANT: Do NOT modify the existing atomic balance update pattern in transaction methods. Credit deduction already works via existing spendTokens flow.
  </action>
  <verify>
    <automated>cd packages/api && npx jest --testPathPattern="transactions.spec|usage.spec" --passWithNoTests 2>&1 | tail -20</automated>
  </verify>
  <done>
    API calls deduct credits based on token usage. Transaction created with negative rawAmount, balance updated atomically.
  </done>
</task>

<task type="auto">
  <name>Task CREDIT-04: Implement balance insufficient blocking</name>
  <files>
    - packages/api/src/middleware/checkBalance.ts
  </files>
  <action>
    1. In packages/api/src/middleware/checkBalance.ts, ensure checkBalance() throws when insufficient:
       - Already implemented: throws error with ViolationTypes.TOKEN_BALANCE when canSpend is false
       - Verify the error is properly caught and returns 403 response

    2. Add test coverage for insufficient balance scenario:
       - Create test file packages/api/src/middleware/checkBalance.spec.ts
       - Test: user with 0 balance attempting API call -> error thrown
       - Test: user with balance < tokenCost -> error thrown

    3. Verify error response format includes: { error: { type: 'TOKEN_BALANCE', balance: number, tokenCost: number } }

    IMPORTANT: Follow existing test patterns in packages/api/src/middleware/*.spec.ts
  </action>
  <verify>
    <automated>cd packages/api && npx jest checkBalance.spec.ts --passWithNoTests 2>&1 | tail -30</automated>
  </verify>
  <done>
    AI calls blocked with 403 response when balance insufficient. Error includes balance and tokenCost for frontend display.
  </done>
</task>

<task type="auto">
  <name>Task MEMBERSHIP-01: Implement free user basic quota</name>
  <files>
    - packages/api/src/services/membership/index.ts
    - packages/data-schemas/src/schema/membership.ts
  </files>
  <action>
    1. Create packages/api/src/services/membership/index.ts:
       - getMembershipStatus(userId): returns { tier, expiryDate, benefits, isActive }
       - getMembershipTier(userId): returns 'free' | 'basic' | 'pro' | 'enterprise'
       - isMembershipActive(userId): checks if tier has not expired
       - getRateLimitForTier(tier): returns rate limit multiplier

    2. Seed default free tier in MembershipPlan collection:
       - tier: 'free', name: 'Free User', price: 0, benefits: ['basic_api'], creditAllowance: 0, discountMultiplier: 1.0, enabled: true

    3. Ensure new users get membership.tier = 'free' on creation:
       - This should happen in user creation flow or be defaulted

    IMPORTANT: Use existing service patterns. Follow single-word directory/file naming from CLAUDE.md.
  </action>
  <verify>
    <automated>cd packages/api && npx tsc --noEmit --skipLibCheck 2>&1 | head -30</automated>
  </verify>
  <done>
    Free users have basic tier. getMembershipStatus() returns tier: 'free' for new users. Service exists for tier checking.
  </done>
</task>

<task type="auto">
  <name>Task MEMBERSHIP-05: Implement tier-based rate limit enforcement</name>
  <files>
    - packages/api/src/services/membership/index.ts
    - packages/api/src/middleware/checkBalance.ts
    - packages/data-schemas/src/methods/transaction.ts
  </files>
  <action>
    1. In packages/api/src/services/membership/index.ts, add:
       - RATE_LIMITS constant: { free: 1.0, basic: 1.5, pro: 2.0, enterprise: 3.0 }
       - getRateLimitMultiplier(tier): returns multiplier for API rate limits

    2. Modify packages/api/src/middleware/checkBalance.ts:
       - Pass user membership tier to getMultiplier()
       - getMultiplier() should apply discountMultiplier from membership

    3. In packages/data-schemas/src/methods/transaction.ts:
       - Modify getMultiplier() to accept membership discountMultiplier
       - Apply: finalMultiplier = baseMultiplier * discountMultiplier

    IMPORTANT: Store credits as integers. All calculations must be integer-only. Round only at display time.
  </action>
  <verify>
    <automated>cd packages/api && npx jest --testPathPattern="checkBalance|middleware" --passWithNoTests 2>&1 | tail -20</automated>
  </verify>
  <done>
    Different tiers get different rate limits. Pro users pay less per token. Rate limit multiplier applied at checkBalance.
  </done>
</task>

<task type="checkpoint:human-verify">
  <name>Task PAYMENT-06: Admin manual recharge endpoint</name>
  <files>
    - api/server/routes/balance.js
    - api/server/controllers/Balance.js
    - api/server/routes/admin/users.js
  </files>
  <action>
    1. Extend api/server/routes/balance.js to add admin routes:
       - POST /add - admin manual credit addition
       - GET /transactions - list user transaction history

    2. Create api/server/controllers/balanceController.js (or extend Balance.js):
       - addCreditsAdmin(req, res): accepts { userId, amount, reason }, requires admin role
       - getTransactionHistory(req, res): returns paginated transaction list for user

    3. Add admin manual recharge logic using existing transaction methods:
       - Use createTransaction() with tokenType: 'recharge', context: 'manual_recharge', adminId
       - Use updateBalance() for atomic credit addition

    4. Add endpoint to packages/data-provider/src/data-service.ts:
       - addCreditsAdmin(userId, amount, reason)
       - getTransactionHistory(userId, cursor, limit)

    5. Add endpoint to packages/data-provider/src/api-endpoints.ts:
       - balanceAdd: () => `${BASE_URL}/api/balance/add`
       - balanceTransactions: () => `${BASE_URL}/api/balance/transactions`

    6. Add query key and data-provider exports

    IMPORTANT: Admin routes must check for ADMIN role. Manual recharge should be recorded with adminId for audit trail.
  </action>
  <verify>
    <automated>Manual verification: Check that admin user can add credits to another user via POST /api/balance/add</automated>
  </verify>
  <done>
    Admins can manually add credits to any user. Transaction recorded with context 'manual_recharge'. Transaction history endpoint returns paginated list.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client -> API | Untrusted input (userId, amount) crosses here |
| API -> MongoDB | Internal data operations |
| Admin -> User balance | Elevated privilege operations |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Tamper | Manual recharge | mitigate | Require admin role check on POST /api/balance/add, validate userId is valid ObjectId |
| T-01-02 | Denial | Transaction history | accept | Pagination prevents DoS, no sensitive data exposed |
| T-01-03 | Info | Balance display | mitigate | Only authenticated user can view own balance, admin can view any |
| T-01-04 | Elevation | Rate limits | mitigate | getRateLimitMultiplier() enforced server-side, not client-provided |
</threat_model>

<verification>
## Phase 1 Verification

1. Run type checks:
   ```bash
   cd packages/data-schemas && npx tsc --noEmit --skipLibCheck
   cd packages/api && npx tsc --noEmit --skipLibCheck
   ```

2. Run tests:
   ```bash
   cd packages/api && npx jest --testPathPattern="checkBalance|balance" --passWithNoTests
   ```

3. Manual verification steps:
   - Create user -> verify membership.tier = 'free'
   - Admin adds credits -> verify balance increases, transaction created with context 'manual_recharge'
   - User makes API call -> verify credits deducted
   - User with 0 balance -> verify 403 response with TOKEN_BALANCE error
   - Check different tiers -> verify rate limits applied correctly
</verification>

<success_criteria>
1. User schema includes membership.tier, membership.expiryDate, membership.features
2. Transaction schema supports 'recharge' and 'refund' tokenTypes
3. MembershipPlan schema exists with tier definitions
4. MembershipService has getMembershipStatus(), getRateLimitMultiplier()
5. checkBalance middleware blocks when insufficient and enforces tier rate limits
6. Admin can manually add credits via POST /api/balance/add
7. Transaction history available via GET /api/balance/transactions
8. All type checks pass
9. Tests pass or are created
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-SUMMARY.md` with:
- What was implemented
- File changes summary
- Test results
- Verification checklist completion
</output>
