---
status: issues
files_reviewed: 2
critical: 2
warning: 5
info: 5
total: 12
---

## Phase 3 (Ad Reward System) Code Review

### CRITICAL

1. **[reward.ts:65-80] Ad completion can be triggered without watching an ad (Ad Fraud)**
   - `grantAdCredits()` accepts no `adId` parameter and performs no verification that an ad was actually watched
   - The `/complete` endpoint in `ads.js` receives `adId` from the client but never passes it for verification
   - This allows users to spam the endpoint and earn unlimited credits without watching any ads
   - **Fix**: Require and validate `adId` in `grantAdCredits`, implement server-side ad verification

2. **[reward.ts:60-99] Race condition enables bypassing rate limits**
   - `canWatchAd()` check and `adWatchHistory.push()` in `grantAdCredits()` are not atomic
   - Multiple concurrent requests can pass `canWatchAd()` before any history entry is recorded
   - An attacker can exceed `maxWatchesPerDay` by sending parallel requests
   - **Fix**: Use atomic operations (Redis INCR with TTL) or database transactions with proper locking

### WARNING

3. **[reward.ts:19-20] In-memory storage does not scale across instances or persist**
   - `adWatchHistory` is a global in-memory array
   - Lost on server restart; different instances have separate histories
   - **Fix**: Use Redis with TTL-based keys for production deployment

4. **[reward.ts:89-90] Memory leak from unbounded array growth**
   - `adWatchHistory.push()` adds records but nothing ever removes old entries
   - Array grows indefinitely, causing memory exhaustion over time
   - **Fix**: Prune entries older than 24 hours or use Redis with TTL

5. **[ads.js:43-46] adId received but never used**
   - The `/complete` endpoint extracts `adId` from request body but never validates or uses it
   - This dead code indicates incomplete implementation
   - **Fix**: Validate and pass `adId` to `grantAdCredits` for verification

6. **[reward.ts:83-87] Silent failure when user has no balance record**
   - `findOneAndUpdate` with `lean()` returns `null` if user has no balance
   - Function returns `success: true` with `newBalance: 0` instead of handling this error
   - **Fix**: Check if `updated` is null and return an appropriate error

7. **[ads.js:8-16,19-38,41-64] No rate limiting middleware on endpoints**
   - All three routes (`/status`, `/reward`, `/complete`) lack rate limiting
   - Enables DoS attacks and brute-force attempts
   - **Fix**: Add appropriate rate limiting middleware (e.g., `express-rate-limit`)

### INFO

8. **[reward.ts:25-55] Inefficient array iteration for last watch lookup**
   - Sorting entire user history array to find most recent entry: O(n log n)
   - For large histories, this is inefficient
   - **Fix**: Store last watch time per user separately or use a Map for O(1) lookup

9. **[reward.ts:71-80] Untyped mongoose model access**
   - `mongoose.models.Transaction` accessed without type safety
   - Schema validation errors could occur silently
   - **Fix**: Import proper TypeScript types for Transaction and Balance models

10. **[reward.ts:72-79] Transaction creation with post-assignment**
    - `transaction.tokenValue = AD_CONFIG.creditsPerWatch` and `transaction.rate = 1` set after construction
    - These appear to be schema-required fields set outside the constructor
    - **Fix**: Pass all fields in constructor or document why post-assignment is needed

11. **[ads.js:1] Mixed module system**
    - Uses CommonJS `require()` in what should be a modern Express route
    - Inconsistent with TypeScript-first architecture in `/packages/api`
    - **Fix**: Convert to ESM imports

12. **[reward.ts:4-12] AD_CONFIG exported but used only internally**
    - `AD_CONFIG` is exported but only consumed within the ads module
    - If exported for external configuration, it lacks validation
    - **Fix**: Remove export if not needed externally, or add runtime validation

---

## Summary

The ad reward system has **2 critical security vulnerabilities** that allow ad fraud and rate limit bypass. The implementation appears incomplete - `adId` is received but never used, suggesting the actual ad SDK integration was not implemented. The in-memory storage is not production-ready and will fail in clustered deployments. Immediate fixes are needed before this code reaches production.
