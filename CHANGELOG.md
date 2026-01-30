## [Unreleased]

- **BREAKING: Prioritize W3C VC Data Model 2.0 over 1.1**
  - Changed `extVerifiableCredential` type to require `validFrom` (Data Model 2.0) instead of `issuanceDate` (Data Model 1.1)
  - `issuanceDate` is now optional for backward compatibility
  - Updated all mock credentials to use `validFrom`
  - All JSON schemas already use `validFrom` - types now match the schemas
  - Tests updated to use Data Model 2.0 conventions
  - Focus is on Data Model 2.0; Data Model 1.1 support is secondary
- Relax JSON Schema validation for credential `type` and `@context` fields
  - Changed from strict `const` constraint to flexible `contains` pattern
  - Credentials can now include additional types beyond the required ones (e.g., `["VerifiableCredential", "KeyCredential", "CustomType"]`)
  - Credentials can now include additional context URLs beyond the required ones
  - Still enforces that all required types and context URLs are present
  - Updated all schema files: `gs1-key-schema.json`, `gs1-company-prefix-schema.json`, `gs1-prefix-schema.json`, `gs1-product-data-schema.json`, `gs1-organization-data-schema.json`, `gs1-product-key-schema.json`
  - Fixes GS1-010 error: "/type must be equal to constant" and "/@context must be equal to constant" when credentials have additional types or context URLs
- Add comprehensive test suite for additional credential types
  - New test file: `additional-types.test.ts` with 15 tests
  - Tests validation of real-world ProductDataCredential with additional "DataCredential" type
  - Tests validation with additional @context URLs (e.g., render-method context)
  - Tests type order independence and multiple additional types
  - Tests backwards compatibility with existing credentials
  - Includes example JWT credential: `example_product_data_vc.jwt`
- Add @context validation test suite using real schemas
  - New test file: `context-validation.test.ts` with 10 tests
  - Uses actual JSON schema files instead of mocks to test real validation behavior
  - Tests that credentials with all required contexts pass validation
  - Tests that credentials with additional contexts are accepted
  - Tests that credentials missing required contexts are rejected (GS1-010 error)
  - Validates ProductDataCredential and KeyCredential context requirements
  - Includes real-world credential validation from Tortuga de Oro production system
- **Replace all mock schemas with actual production schemas in all tests**
  - Created `src/tests/test-helpers.ts` with `realJsonSchemaLoader` that loads actual JSON schema files from disk
  - Updated 7 test files to use real schemas instead of mocks: `additional-types.test.ts`, `context-validation.test.ts`, `rules-api.test.ts`, `rules-chain.test.ts`, `rules-subject.test.ts`, `getting-started.test.ts`, `example-chain.test.ts`
  - All tests now validate against actual production behavior, not simplified mocks
  - All 126 tests pass with real production schemas
  - Ensures test coverage accurately reflects production validation

## [2.6.2] - 2026-01-21

- Improve type safety (partial - see notes)
  - Replace `any` types with `Record<string, unknown>` for organization and product fields in CredentialSubject
  - Replace `any` with `Record<string, unknown>` for JSON Schema properties (inherently dynamic)
  - Remove three `@ts-ignore` comments in Ajv extensions by using proper type assertions
  - Fix unsafe double type assertion in validate-extended-company-prefix.ts
  - Add proper types for GS1 product data structure
  - Note: `rulesEngineManager` remains dynamically typed due to complex union type constraints


## [2.6.1] - 2026-01-21

- **CRITICAL FIX**: Fix `credentialTypesSource.filter is not a function` error
  - Updated type definitions to support both `string` and `string[]` for credential `type` field per W3C VC specification
  - Fixed `getCredentialType()` to normalize type input to array before filtering
  - Removed unsafe type casting in credential chain validation
- Improve error handling and error messages throughout the library
  - Replace generic thrown exceptions with structured error codes and descriptive messages
  - Added new error codes: `GS1-011` (invalid credential structure), `GS1-012` (invalid type), `GS1-013` (missing resolver)
  - Enhanced error messages to explain what failed and why (e.g., "Credential type field is missing or null - cannot determine validation schema")
  - Changed `checkGS1CredentialPresentationValidation()` to return structured errors instead of throwing
  - Improved error messages in `resolveExternalCredential()` with more context
  - Added comprehensive try-catch in main validation function to prevent uncaught exceptions
- Add comprehensive test coverage for error handling
  - Tests for string vs array credential types
  - Tests for malformed credentials returning structured errors
  - Tests for missing validator request handling
  - Updated existing tests to validate improved error messages
- Fix linter errors
  - Remove unused import `errorInvalidCredentialType`
  - Fix type assertion in test to avoid `@typescript-eslint/no-explicit-any` error


## [2.6.0] - 2026-01-14

- add chain validation for EpcisCredentials


## [2.5.1] - 2026-01-06

- Replace hand-written GS1 Digital Link parsing with `digital-link.js` library
  - Improved validation using official GS1 Digital Link grammar (v1.4)
  - Added comprehensive check digit validation for all GS1 identification keys:
    - GTIN (01), ITIP (8006), GLN (414), partyGLN (417), SSCC (00)
    - GRAI (8003), GSRN (8018), GDTI (253), GSIN (402), GCN (255)
  - Support for all GS1 primary identifiers (GIAI, GSRNP, GINC, CPID, GMN)
  - Fixed incorrect inclusion of GLN Extension (254) as primary identifier
  - Enhanced TypeScript type definitions for Digital Link operations
- Add `digital-link.js` as a dependency
- Upgrade all dependencies to latest versions
  - Updated TypeScript to 5.9.3 (from 5.0.2)
  - Updated ESLint to 9.39.2 (from 8.57.0) with typescript-eslint 8.52.0 (from 5.61.0)
  - Updated Jest to 30.2.0 (from 29.7.0) with ts-jest 29.4.6
  - Updated tsup to 8.5.1 (from 6.7.0)
  - Updated all type definitions and dev tools
  - Moved build tools (jest, ts-node, tsup, typescript) from dependencies to devDependencies
  - Removed unnecessary packages (i, npm) from dependencies
  - Fixed security vulnerability in brace-expansion
- Fix linting error in check-credential-subject-Id-digital-link.ts (unused error variable)


## [2.5.0] - 2026-01-06

- Support Key Credentials with Key Qualifiers according to https://gs1.github.io/GS1DigitalLicenses/#key-validation-rules
  - Test for complete SGTIN Chain added
- Bugfix in credential type recognition


## [2.4.3] - 2025-11-21

- do full schema validation for v2 data integrity credentials
- backwards compatible with old v1 solution


## [2.4.2] - 2025-11-10

- update repository URL to EECC


## [2.4.0] - 2025-10-28

- improve credential chain validation output and error reporting


## [2.3.1] - 2025-10-20

- fix env var read for gs1 root of trust


## [2.3.0] - 2025-10-20

- make gs1 root of trust configurable with default


## [2.2.1] - 2025-10-01

- apply business rule validation on entire chain


## [2.2.0] - 2025-10-01

- ensure full schema validation on entire chain


## [2.1.7] - 2025-09-25

- mv normaize within cred chain build


## [2.1.6] - 2025-09-25

- move build chain cred loader normalization


## [2.1.5] - 2025-09-24

- fix: apply credential normalization to external credentials


## [2.1.4] - 2025-09-24

- fix build script to suite package


## [2.1.3] - 2025-09-24

- fix action trigger
- set package public


## [2.1.0] - 2025-09-24

- full jwt support on verification
- adapt types to support jwt
- add credential normalization supporting jwt decoding

2.0.0 (2024-10-25)
---
BREAKING: Major Upgrade to Library to support WC3 Verifiable Credentials 2.0 enveloping proof [JOSE](https://www.w3.org/TR/vc-jose-cose/) securing mechanisms. 

- Updated rules validation to use Json Schema validation with custom GS1 rules cross field validation and GS1 Digital Links
- Updated Simplified API to make it easier to consumer Rules Library
- Getting Start Integration Test to help developers use the Rules Library

1.0.0 (2023-08-30)
---

Initial version of GS1 US Credential Rules Engine library for validating GS1 Credentials based on the [GS1 Verifiable Credentials Data Model](https://ref.gs1.org/gs1/vc/data-model/).

List of Support GS1 credentials:
- GS1PrefixLicenseCredential
- GS1CompanyPrefixLicenseCredential
- KeyCredential
- OrganizationDataCredential
- ProductDataCredential
- GS1IdentificationKeyLicenseCredential

