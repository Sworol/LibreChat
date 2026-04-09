---
status: issues
files_reviewed: 3
critical: 5
warning: 4
info: 3
total: 12
---

## Phase 2 Payment Integration Review

### CRITICAL

**1. Race Condition in Idempotency Check**
- **File**: `api/server/routes/stripe-webhook.js`
- **Lines**: 36-40
- **Description**: The idempotency check (`getTransactions` followed by `save`) is non-atomic. Two concurrent webhooks with the same `paymentId` can both pass the check and execute, resulting in duplicate credits. A database-level unique constraint on `paymentId` is needed.

**2. Non-Atomic Transaction Operations**
- **File**: `api/server/routes/stripe-webhook.js`
- **Lines**: 43-59
- **Description**: `transaction.save()` and `db.updateBalance()` are separate operations without a transaction wrapper. If balance update fails after transaction save, data inconsistency occurs (transaction exists but balance not updated, or vice versa). These must be wrapped in a database transaction.

**3. No User Existence Validation**
- **File**: `api/server/routes/stripe-webhook.js`
- **Lines**: 28-33, 55-59
- **Description**: The webhook trusts `userId` from Stripe metadata without verifying the user exists in the database. Malicious or erroneous metadata could credit non-existent users or cause integrity issues.

**4. Webhook Returns Success Before Processing Completes**
- **File**: `api/server/routes/stripe-webhook.js`
- **Line**: 75
- **Description**: `res.json({ received: true })` is sent after queuing async operations but before they complete. Stripe may retry the webhook while prior execution is still in progress, causing duplicate processing.

**5. Type Coercion Without Validation**
- **File**: `api/server/routes/stripe-webhook.js`
- **Lines**: 48, 51, 58
- **Description**: `parseInt(credits, 10)` is called 3 times on the same value without checking for `NaN`. If Stripe metadata is tampered with or malformed, `NaN` values could be saved to the database, corrupting credit balances.

### WARNING

**1. Empty String Fallback for Stripe API Keys**
- **File**: `packages/api/src/services/payment/stripe.ts`
- **Lines**: 4, 73
- **Description**: `process.env.STRIPE_SECRET_KEY || ''` and `process.env.STRIPE_WEBHOOK_SECRET || ''` will initialize Stripe with empty strings if env vars are missing, causing cryptic runtime errors instead of fast-failing at startup.

**2. Payment Failure Events Not Actioned**
- **File**: `api/server/routes/stripe-webhook.js`
- **Lines**: 65-69
- **Description**: `payment_intent.payment_failed` events are only logged. Users should be notified of failed payments and given guidance to retry.

**3. Hardcoded Currency Symbol**
- **File**: `api/server/routes/payment.js`
- **Line**: 15
- **Description**: `¥${pkg.price / 100}` assumes CNY currency for all users regardless of locale. Should use proper localization.

**4. Missing Transaction Rollback on Partial Failure**
- **File**: `api/server/routes/stripe-webhook.js`
- **Lines**: 43-59
- **Description**: If `transaction.save()` succeeds but `db.updateBalance()` fails, there is no rollback mechanism. The partial operation leaves the database in an inconsistent state.

### INFO

**1. Redundant parseInt Calls**
- **File**: `api/server/routes/stripe-webhook.js`
- **Lines**: 48, 51, 58
- **Description**: `parseInt(credits, 10)` is called 3 times. Should parse once and reuse the result.

**2. TypeScript Function Uses Any Type in Error Path**
- **File**: `packages/api/src/services/payment/stripe.ts`
- **Line**: 34
- **Description**: `throw new Error(`Unknown package: ${packageId}`)` is acceptable but calling code in `payment.js` catches generic `Error` types. Consider using a custom error class for better error handling.

**3. No Webhook Retry/Delivery Logic**
- **File**: `api/server/routes/stripe-webhook.js`
- **Description**: No handling for Stripe's `retry` behavior or checking `event.previous_attributes` for refund scenarios. Future payment states (refunds, disputes) are not handled.
