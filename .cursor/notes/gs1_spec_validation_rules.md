# GS1 Digital Licenses Specification - Validation Rules

**Source**: [GS1 Digital Licenses Specification](https://gs1.github.io/GS1DigitalLicenses/)
**Last Reviewed**: 2026-01-06
**Spec Version**: 02 December 2025

## Overview

The GS1 Digital Licenses specification defines validation rules for GS1 License Credentials, ID Key Credentials, and Data Credentials. The validation ensures the integrity of the credential chain from specific data credentials back to the GS1 Global root of trust.

## Validation Philosophy (Section 4.1)

- Validation confirms licenses are current, authentic, and relevant
- Validates chain of licenses back to GS1 Global (GO) root of trust
- Documents must link using `extendsCredential` property
- Each `licenseValue` must stem from its previous license value
- Validates assertions from licensee are authentic and attributable

## Section 4.2: License Validation Rules

### General License Validation (L)

All GS1 License Credentials MUST pass these rules:

- **L-1**: L MUST be a valid VCDM 2.0 credential document
- **L-2**: The signature of L MUST be valid and MUST be from a signing key referenced in the issuer DID
- **L-3**: `credentialStatus` of L MUST be valid (see Section 9)
- **L-4**: L `validFrom` MUST NOT be in the future

### Section 4.2.1: Prefix License Validation Rules (PL)

GS1 Prefix License Credentials MUST pass:

- **PL-1**: PL MUST conform to the JSON schema `https://id.gs1.org/vc/schema/v1/prefix`
- **PL-2**: PL `issuer` property MUST be a GS1 GO did:web or did:webvh
- **PL-3**: If PL `alternativeLicenseValue` is present, `licenseValue` must end with `alternativeLicenseValue`

### Section 4.2.2: GCP Validation Rules (GL)

GS1 Company Prefix License Credentials (where GL's `extendsCredential` references EL):

- **GL-1**: GL MUST conform to the JSON schema `https://id.gs1.org/vc/schema/v1/companyprefix`
- **GL-2**: EL MUST be a valid GS1 License Credential
- **GL-3**: EL `credentialSubject.id` MUST match GL `issuer`
- **GL-4**: GL `licenseValue` MUST begin with and MUST be at least one digit longer than the EL `licenseValue`
- **GL-5**: If PL `alternativeLicenseValue` is present, `licenseValue` must end with `alternativeLicenseValue`

### Section 4.2.3: Identification Key License Validation Rules (IL)

GS1 Identification Key License Credentials (where IL's `extendsCredential` references EL):

- **IL-1**: IL MUST conform to the JSON schema `https://id.gs1.org/vc/schema/v1/identificationkey`
- **IL-2**: EL MUST be a valid GS1 License Credential
- **IL-3**: EL `credentialSubject.id` MUST match IL `issuer`
- **IL-4**: IL `licenseValue` MUST begin with and MUST be at least one digit longer than the EL `licenseValue`
- **IL-5**: If PL `alternativeLicenseValue` is present, `licenseValue` must end with `alternativeLicenseValue`

## Section 6: Validating GS1 ID Key Credentials

**Note**: Need to extract detailed rules from Section 6.2

Key points from section 5/6:
- ID Key Credentials use W3C VCDM 2.0
- VCDM credential format uses JSON-LD for enveloping
- Required properties:
  - `@context`: MUST include GS1 Declaration Credential Context
  - `id`: Optional in VCDM but MUST be present
  - `type`: MUST contain `VerifiableCredential` and MUST also include `KeyCredential`
  - `issuer:id`: MUST be a DID
  - `credentialSubject:id`: Optional in VCDM but MUST be present and MUST be a GS1 Digital Link URI

## Section 8: Validating GS1 Data Credentials

**Note**: Need to extract detailed rules from Section 8.3

## Section 9: Validating Credential Status

**Note**: Need to extract detailed rules from Section 9.1

## Mapping to Implementation Error Codes

The implementation uses error codes GS1-XXX. Here's how spec rules map to implementation:

### Prefix License Rules
- PL-2 (issuer MUST be GS1 GO) → GS1-140 (invalidIssueForPrefixLicense)
- PL-3 (alternateLicenseValue compatibility) → GS1-204 (invalidAlternativeLicenseNotCompatible)

### GCP/IL License Rules
- GL-3/IL-3 (credentialSubject.id MUST match issuer) → GS1-150 (invalidIssuer)
- GL-4/IL-4 (licenseValue MUST begin with parent) → GS1-200 (invalidLicenseValueStart)
- GL-5/IL-5 (alternateLicenseValue compatibility) → GS1-204

### General Rules
- L-1 (valid VCDM 2.0) → Handled by external verifier
- L-2 (valid signature) → Handled by external verifier
- L-3 (credentialStatus valid) → Handled by external verifier
- L-4 (validFrom not future) → **NOT FOUND IN IMPLEMENTATION**

## Implementation Status Review

### ✅ IMPLEMENTED Validations

1. **PL-2**: Prefix license issuer must be GS1 Global
   - File: `validate-extended-license-prefix.ts` lines 71-76
   - Uses configurable env var GS1_GLOBAL_DID (default: did:web:id.gs1.org)

2. **PL-3, GL-5, IL-5**: Alternative license value compatibility
   - File: `check-credential-alternative-license.ts` lines 19-31
   - Validates that licenseValue ending matches alternativeLicenseValue
   - When licenseValue starts with '0', alternativeLicenseValue required
   - alternativeLicenseValue must equal licenseValue without leading '0'

3. **GL-3, IL-3**: Extended credential subject ID must match issuer
   - File: `validate-extended-license-prefix.ts` line 78
   - Uses `checkIssuerToSubjectId()` function

4. **GL-4, IL-4**: License value must begin with parent license value and be longer
   - File: `validate-extended-license-prefix.ts` lines 83-86
   - Uses `compareLicenseLengthsToExtended()` function
   - Handles leading zeros correctly

5. **Digital Link Validation**: GS1 Digital Links for subject.id and sameAs
   - File: `check-credential-subject-Id-digital-link.ts`
   - Validates HTTPS, domain, AI format

6. **Data Field Validation**: Product and Organization data
   - Validates required fields (brand, productDescription, partyGLN, organizationName)
   - Integrated with JSON Schema validation

7. **JSON Schema Validation**: All credential types
   - File: `validate-schema.ts`
   - Uses Ajv with custom GS1 extensions

### ⚠️ DELEGATED to External Verifier (OK)

1. **L-1**: VCDM 2.0 credential document validation
2. **L-2**: Signature validation
3. **L-3**: Credential status validation

### ❌ MISSING Validations

1. **L-4**: `validFrom` MUST NOT be in the future
   - **CRITICAL GAP**: No validation exists
   - Field exists in schemas and mock data
   - No code checks if validFrom > current time
   - **ACTION REQUIRED**: Implement validation and tests

2. **PL-2 DID Format**: Issuer must be did:web or did:webvh
   - Current implementation checks exact DID match
   - Does not validate DID format (did:web vs did:webvh vs other)
   - **MINOR GAP**: Spec says "MUST be a GS1 GO did:web or did:webvh"
   - Current implementation only checks if issuer === GS1_GLOBAL_DID
   - **ACTION**: Consider if format validation needed

### Test Coverage Gaps

1. **CRITICAL**: No tests for `validFrom` date validation (L-4)
2. **MINOR**: No specific tests for issuer DID format (did:web/did:webvh)
3. **VERIFY**: Check if KeyCredential-specific validations from Section 6.2 are tested
4. **VERIFY**: Check if DataCredential-specific validations from Section 8.3 are tested

## Next Steps

1. Extract full validation rules from Sections 6.2, 8.3, and 9.1
2. Map all spec rules to implementation code
3. Identify all missing tests
4. Implement missing validation logic
5. Add comprehensive tests for all spec requirements
