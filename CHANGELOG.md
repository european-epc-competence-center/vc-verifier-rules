## [Unreleased]

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

