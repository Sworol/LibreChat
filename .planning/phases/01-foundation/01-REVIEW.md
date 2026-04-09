---
status: issues
files_reviewed: 11
critical: 1
warning: 5
info: 5
total: 11
---

### CRITICAL

**`api/server/controllers/Balance.js` (lines 24-43)**
Race condition: Transaction creation and balance update are not atomic. If `transaction.save()` succeeds but `db.updateBalance()` fails, the transaction record exists without corresponding balance change, leading to data inconsistency. These operations should be wrapped in a MongoDB session/transaction.

**`api/server/routes/balance.js` (lines 24-43)**
Same race condition as above - transaction and balance update are separate operations without atomicity guarantees.

---

### WARNING

**`packages/api/src/services/membership/index.ts` (lines 43-59)**
`getMembershipStatus()` returns hardcoded values: `expiryDate: null` and `isActive: true` regardless of actual membership state. The function calls `isMembershipActive()` (line 64) but ignores its result. This function provides misleading data.

**`packages/api/src/services/membership/index.ts` (lines 32-38, 50-51, 85-89)**
`getMembershipTier()` and `getDiscountMultiplier()` each make two sequential database queries (`getMembershipTier` calls `User.findById` then `getMembershipPlan` calls `MembershipPlan.findOne`). Consider combining into single queries or adding caching.

**`packages/api/src/services/membership/index.ts` (lines 64-73)**
`isMembershipActive()` is defined but its result is never used by `getMembershipStatus()`. Dead code that may confuse developers.

**`packages/data-schemas/src/schema/transaction.ts` (line 3)**
`// @ts-ignore` suppresses TypeScript errors without addressing the underlying type issue. This hides potential type safety problems.

**`packages/data-schemas/src/types/user.ts` (lines 60-61)**
`federatedTokens` and `openidTokens` properties are declared but lack documentation. Unclear if these are intentionally exposed or遗留 (leftover) from another implementation.

---

### INFO

**`packages/data-schemas/src/models/membership.ts` (lines 5-10)**
Model creation pattern checks `mongoose.models.MembershipPlan` before `mongoose.model()` - this is correct but if the model was previously registered with a different schema, it would not be replaced. Consider adding schema version or validation.

**`packages/data-schemas/src/schema/membership.ts` (line 66)**
Compound index `{ tier: 1, tenantId: 1 }` with `unique: true` - if `tenantId` is optional (undefined), unique constraint may not work as expected for multi-tenant scenarios with null tenantId values.

**`packages/api/src/admin/balance.ts` (lines 100-109)**
`limit` and `offset` query parameters default to strings ('50', '0') but are passed through `parseInt`. This works but is inconsistent - either type coerce explicitly or ensure the query params are always strings.

**`api/server/routes/balance.js` (lines 77, 81)**
`parseInt(limit, 10)` and `parseInt(offset, 10)` - if limit/offset are already numbers (from some middleware), `parseInt` will still work but the code flow suggests they should be strings based on default values. Minor inconsistency.

**`packages/data-schemas/src/types/user.ts` (lines 71-78)**
`BalanceConfig` interface has all optional fields with no validation constraints. Could benefit from stricter typing (e.g., `refillIntervalUnit` could be a union type of specific units).
