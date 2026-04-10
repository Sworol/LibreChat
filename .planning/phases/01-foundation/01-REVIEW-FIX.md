---
status: issues
critical: 1
warning: 4
info: 3
---

# Security Review: Fixed Files

## Summary

Reviewed 5 files after security fixes were applied. Most fixes are correct and well-implemented. However, **1 critical issue** was found in the ad reward system related to race conditions, plus several warnings and informational findings.

---

## Critical Issues

### 1. Race Condition in Ad Reward System (`packages/api/src/services/ads/reward.ts`)

**Severity:** Critical
**File:** `packages/api/src/services/ads/reward.ts`
**Lines:** 95-100, 126

**Issue:** The `grantAdCredits` function has a TOCTOU (Time-of-Check-Time-of-Use) race condition:

```typescript
// Line 89-93: First validation outside transaction
const adValidation = validateAdId(adId, userId);
if (!adValidation.valid) {
  return { success: false, ... };
}

// Line 95-100: Rate limit check outside transaction
const { canWatch, reason } = await canWatchAd(userId);
if (!canWatch) {
  return { success: false, ... };
}

// Transaction starts here (line 103)
mongoSession.startTransaction();
// ... but by now another request could have already recorded this ad watch
```

An attacker can bypass rate limits and duplicate ad rewards by sending concurrent requests.

**Recommendation:** Move all validation checks inside the MongoDB transaction with `findOneAndUpdate` operations that are atomic.

---

## Warning Issues

### 2. Predictable Ad ID Generation (`api/server/routes/ads.js`)

**Severity:** Warning
**File:** `api/server/routes/ads.js`
**Line:** 31

**Issue:**
```javascript
adId: `ad_${Date.now()}`,
```

`Date.now()` is predictable. An attacker who monitors the `/reward` endpoint can predict valid `adId` values and potentially forge requests to `/complete`.

**Recommendation:** Use cryptographically random IDs (e.g., `crypto.randomUUID()`) or generate ad IDs server-side only after actual ad verification.

---

### 3. In-Memory Ad Watch History (`packages/api/src/services/ads/reward.ts`)

**Severity:** Warning
**File:** `packages/api/src/services/ads/reward.ts`
**Line:** 21

**Issue:**
```typescript
const adWatchHistory: AdWatchRecord[] = [];
```

This in-memory array has several problems:
1. **Memory leak:** Never cleaned, grows indefinitely
2. **No persistence:** Server restart wipes all history, allowing users to earn unlimited credits
3. **No horizontal scaling:** Multiple server instances have separate histories

**Recommendation:** Store ad watch records in MongoDB (similar to how `Transaction` is used) with TTL indexes for automatic cleanup.

---

### 4. Undefined Variable Reference (`api/server/routes/ads.js`)

**Severity:** Warning
**File:** `api/server/routes/ads.js`
**Line:** 52

**Issue:**
```javascript
const statusCode = result.error === 'Ad already redeemed' ? 409 : 429;
```

The `result` object from `grantAdCredits` returns `error` as a string, but the function returns `{ success, credits, newBalance, error }` where `error` is only present when `success: false`. This works but is fragile. More importantly, the 429 status code is incorrect for "Ad already redeemed" (should be 409 Conflict).

**Recommendation:** Return explicit status codes from `grantAdCredits` or use a result object with explicit `statusCode` field.

---

### 5. No Input Sanitization for `reason` Field (`api/server/routes/balance.js`)

**Severity:** Warning
**File:** `api/server/routes/balance.js`
**Line:** 39

**Issue:**
```javascript
context: reason || 'manual_recharge',
```

The `reason` field from user input is stored directly without sanitization. While not a direct injection vector (Mongoose handles this), it's poor practice to store unsanitized user input.

**Recommendation:** Sanitize or validate the `reason` field (e.g., max length, allowed characters).

---

## Informational Issues

### 6. Stale Comment in `api-endpoints.ts`

**Severity:** Info
**File:** `packages/data-provider/src/api-endpoints.ts`
**Line:** 23

**Issue:** Comment says "// Testing this buildQuery function" which suggests debug code was left behind.

---

### 7. Minor: Redundant Validation Check

**Severity:** Info
**File:** `api/server/routes/ads.js`
**Lines:** 21-25, 43-47

The `/reward` endpoint checks `canWatchAd` before returning an ad ID, but `grantAdCredits` checks it again. This is redundant but not harmful (defense in depth).

---

### 8. `amount <= 0` vs `amount < 0`

**Severity:** Info
**File:** `api/server/routes/balance.js`
**Line:** 17

The validation allows `amount === 0` which would create a zero-value transaction. This is likely intentional but verify if zero-credit transactions should be allowed.

---

## Positive Findings

### Correctly Implemented Fixes

1. **Stripe Webhook (`stripe-webhook.js`):**
   - Correct use of `express.raw()` for signature verification
   - Proper `parseCredits` validation preventing NaN corruption
   - Good idempotency check with `paymentId`
   - Correct transaction handling with proper abort/throw on error

2. **Balance Admin Routes (`balance.js`):**
   - Proper capability check with `requireAdminAccess`
   - Good input validation on amount
   - Correct MongoDB transaction usage

3. **API Endpoints (`api-endpoints.ts`):**
   - Proper `encodeURIComponent` usage throughout
   - Good query parameter filtering in `buildQuery`
   - Login redirect URL properly prevents open redirect

---

## Files Reviewed

| File | Status |
|------|--------|
| `api/server/routes/stripe-webhook.js` | Secure |
| `api/server/routes/balance.js` | Minor issues |
| `api/server/routes/ads.js` | Race condition concerns |
| `packages/api/src/services/ads/reward.ts` | Race condition critical |
| `packages/data-provider/src/api-endpoints.ts` | Minor cleanup needed |

---

## Recommended Actions

1. **Immediate:** Fix race condition in `reward.ts` by moving all validation inside the transaction
2. **High:** Replace `Date.now()` ad ID with cryptographically random ID
3. **Medium:** Move `adWatchHistory` to MongoDB with TTL indexes
4. **Low:** Clean up debug comments and sanitize `reason` field
