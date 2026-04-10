---
status: fixed
files_reviewed: 3
critical: 1 (fixed)
warning: 2
info: 5
total: 8
fixed_by: 8074678d0
---

### CRITICAL (FIXED)

~~**1. Path Traversal Vulnerability in `revokeUserKey`**~~ ✅ Fixed
- **File**: `packages/data-provider/src/api-endpoints.ts`
- **Line**: 102
- **Issue**: The `revokeUserKey(name)` function interpolates `name` directly into the URL path without encoding:
  ```typescript
  export const revokeUserKey = (name: string) => `${keysEndpoint}/${name}`;
  ```
  If a malicious actor can control `name` (e.g., `../../etc/passwd`), this could enable path traversal attacks.
- **Recommendation**: Use `encodeURIComponent(name)` to safely encode the parameter.

---

### WARNING

**1. Dead Code: Unused `cursor` Variable in `getSharedLinks`**
- **File**: `packages/data-provider/src/data-service.ts`
- **Lines**: 46-54
- **Issue**: The function destructures `cursor` from params but never uses it:
  ```typescript
  export const listSharedLinks = async (
    params: q.SharedLinksListParams,
  ): Promise<q.SharedLinksResponse> => {
    const { pageSize, isPublic, sortBy, sortDirection, search, cursor } = params;
    // cursor is never used
  ```
- **Recommendation**: Remove `cursor` from destructuring if not needed, or wire it to the endpoint.

**2. Unencoded URL Parameters in `getSharedLinks`**
- **File**: `packages/data-provider/src/api-endpoints.ts`
- **Lines**: 90-92
- **Issue**: When building the URL manually, numeric and enum values are interpolated without encoding:
  ```typescript
  `${shareRoot}?pageSize=${pageSize}&isPublic=${isPublic}&sortBy=${sortBy}&sortDirection=${sortDirection}`
  ```
  While `pageSize` is numeric and enums are controlled, this is inconsistent with `buildQuery()` which properly encodes all values.
- **Recommendation**: Use `buildQuery()` for consistency, or encode values explicitly.

---

### INFO

**1. Deprecated `React.FC` Typing**
- **File**: `client/src/components/Nav/SettingsTabs/Balance/MembershipStatus.tsx`
- **Line**: 25
- **Issue**: Uses `React.FC<MembershipStatusProps>` which is discouraged in modern React. Prefer function component signature:
  ```typescript
  const MembershipStatus: React.FC<MembershipStatusProps> = ({ tier, onUpgrade, onRecharge }) => {
  ```
- **Recommendation**: Change to `const MembershipStatus = ({ tier, onUpgrade, onRecharge }: MembershipStatusProps) => {`

**2. Missing Accessibility Labels**
- **File**: `client/src/components/Nav/SettingsTabs/Balance/MembershipStatus.tsx`
- **Lines**: 39-51
- **Issue**: Buttons lack `aria-label` for screen readers. The button text ("Buy Credits", "Upgrade") may not be descriptive enough for visually impaired users.
- **Recommendation**: Add `aria-label` attributes to buttons for better accessibility.

**3. No Function Type Validation for Callbacks**
- **File**: `client/src/components/Nav/SettingsTabs/Balance/MembershipStatus.tsx`
- **Lines**: 7-8
- **Issue**: Props `onUpgrade` and `onRecharge` are typed as `() => void` but callers could pass `undefined` or non-function values, causing runtime errors.
- **Recommendation**: Add validation or use `onClick?: () => void` with proper handling.

**4. Inconsistent Return Type Annotations**
- **File**: `packages/data-provider/src/data-service.ts`
- **Lines**: 126-131
- **Issue**: Functions like `getPaymentPackages()` and `createPaymentCheckout()` lack explicit return type annotations, while similar functions in the same file have them.
- **Recommendation**: Add explicit return types for consistency: `export function getPaymentPackages(): Promise<...>`

**5. Tier Value Not Validated Against Known Keys**
- **File**: `client/src/components/Nav/SettingsTabs/Balance/MembershipStatus.tsx`
- **Lines**: 11-23
- **Issue**: The `tierColors` and `tierNames` objects use string indexing with arbitrary string keys. While fallbacks exist, passing an unexpected tier value silently falls back to "Free" which could mask bugs.
- **Recommendation**: Consider using a union type for valid tiers: `type Tier = 'free' | 'basic' | 'pro' | 'enterprise'`
