# KeyCredential Chain Validation (K-8 Support)

## Overview

As of January 2026, the library now fully supports KeyCredential → KeyCredential chains for serialized items (GS1 spec section 6.2, rules K-8).

## What Was Added

### 1. Chain Rules Updated (`gs1-chain-rules.ts`)

KeyCredential now supports:
- Parent types: `GS1CompanyPrefixLicenseCredential`, `GS1IdentificationKeyLicenseCredential`, `KeyCredential`
- Child types: `KeyCredential`, `OrganizationDataCredential`, `ProductDataCredential`

This enables chains like: **SGTIN (with serial) → GTIN (without serial) → GCP → Prefix**

### 2. Validation Logic Enhanced (`validate-extended-company-prefix.ts`)

The `validateExtendedCompanyPrefixCredential` function now handles three scenarios:

#### K-8: KeyCredential → KeyCredential (with qualifiers)
```
Example: SGTIN(01/04270005112602/21/test) → GTIN(01/04270005112602)
```
- **K-8a**: Issuer of child matches issuer of parent
- **K-8b**: Parent is valid Key Credential (via recursive validation)
- **K-8c**: Primary keys match (GTIN parts are identical)

#### K-7: KeyCredential → GS1CompanyPrefixLicenseCredential (no qualifiers)
```
Example: GTIN(01/04270005112602) → GCP(42700051126)
```
- **K-7a**: Parent is valid License Credential
- **K-7b**: Issuer matches subject of parent
- **K-7c**: Primary key begins with parent's licenseValue

#### GCP → Prefix: Standard License Chain
```
Example: GCP(42700051126) → Prefix(427)
```
- Standard license hierarchy validation

### 3. Mock Schemas Added for Testing

Added JSON schemas to `mock-schema.ts`:
- `mock_gs1PrefixLicenseSchema` - For GS1 Prefix License validation
- `mock_gs1KeySchema` - For Key Credential validation

Updated `mock_jsonSchemaLoader` to return these schemas.

### 4. Type Handling Fix

Fixed credential type parameter handling in `validateExtendedCompanyPrefixCredential`:
- Now accepts both string type names and credential type objects
- Extracts `name` property when object is passed
- Maintains backwards compatibility

## Test Coverage

Added comprehensive test suite in `src/tests/example-chain.test.ts`:
- Validates 4-level chain: SGTIN → GTIN → GCP → Prefix
- Tests both individual credentials and complete presentation
- Verifies K-7 and K-8 rules are correctly applied

## GS1 Digital Link Parsing

The validation uses `parseGS1DigitalLink` from `check-credential-subject-Id-digital-link.ts`:
- Uses official `digital-link.js` library for grammar validation
- Performs check digit validation for GTIN (01), GLN (414), and partyGLN (417)
- Extracts primary key from GS1 Digital Link URI
- Identifies qualifiers (e.g., serial number in `21/test`)
- Handles leading zeros in GTINs correctly via `compareLicenseValue`

## Known Issues and Considerations

### Leading Zeros in GTINs
GTINs may have leading zeros (e.g., `04270005112602`) but company prefixes don't (e.g., `42700051126`). The `compareLicenseValue` function correctly handles this by using `indexOf` to find the prefix position within the GTIN.

### Test Environment Configuration
For test credentials using non-production DIDs, set:
```javascript
process.env.GS1_GLOBAL_DID = "did:web:your-test-gs1-global-did";
```

## References

- **GS1 Digital Licenses Spec**: https://gs1.github.io/GS1DigitalLicenses/#validating-keys
- **Section 6.2**: GS1 ID Key Validation Rules
- **Example Chain**: https://gs1.github.io/GS1DigitalLicenses/#gtin-serial-key-credential
