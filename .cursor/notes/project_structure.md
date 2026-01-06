# Project Structure

## Top-Level Directories

### `/src` - Main Source Code
All TypeScript source code for the library.

### `/src/getting-started` 
Tutorial and example integration with sample JSON schemas.
- `getting-started-test.ts` - Example implementation
- `json-schema/` - Sample GS1 JSON schemas (prefix, company prefix, key, organization data, product data)

### `/src/tests`
Jest test suite with mock data and credentials.
- `getting-started.test.ts` - Integration test
- `rules-*.test.ts` - Unit tests for API, chain, issuer, subject validation
- `mock-*.ts` - Mock credentials, data, schemas, JWT credentials

### `/scripts`
Build and release automation.
- `release.cjs` - Version bumping and release workflow

## Core Library Structure (`/src/lib`)

### Main Files

- **`index.ts`** (root) - Public API exports, re-exports from lib modules
- **`gs1-verification-service.ts`** - Main orchestration layer
  - Entry points: `checkGS1CredentialWithoutPresentation()`, `checkGS1CredentialPresentationValidation()`
  - Coordinates credential chain building and validation
  - Handles JSON schema resolution and validation

- **`types.ts`** - Core TypeScript type definitions
  - VerifiableCredential, VerifiablePresentation, CredentialSubject
  - Result types: gs1RulesResult, gs1RulesResultContainer
  - Callback interfaces: externalCredential, verifyExternalCredential, jsonSchemaLoader

- **`gs1-rules-types.ts`** - Rule-specific type definitions
  - Subject field types (licenseValue, organization, product)
  - Validation result types

- **`get-credential-type.ts`** - Credential type resolution
  - Maps credential types to schemas and validation rules
  - Handles V1/V2 compatibility
  - Constants: GS1_PREFIX_LICENSE_CREDENTIAL, GS1_COMPANY_PREFIX_LICENSE_CREDENTIAL, etc.

## Subdirectories

### `/src/lib/engine` - Credential Chain Engine

Core validation engine for building and validating credential chains.

- **`validate-extended-credential.ts`** - Main chain validation logic
  - `buildCredentialChain()` - Recursively builds credential hierarchy
  - `validateCredentialChain()` - Validates chain including schema checks and business rules
  - Type: `credentialChainMetaData` - Metadata for chain nodes

- **`resolve-external-credential.ts`** - External credential resolution
  - Resolves credentials not in presentation using external loader callback
  - Checks if credential already exists in presentation

- **`gs1-credential-errors.ts`** - Error codes and messages
  - GS1-100 series: Type errors
  - GS1-200 series: License value format errors
  - GS1-300 series: Chain validation errors
  - GS1-400 series: Extended credential failures

### `/src/lib/rules-definition` - Business Rules

Implementation of GS1-specific validation rules.

**Structure:**
- `rules-manager.ts` - Registry mapping credential types to validation functions
- `chain/` - Extended credential chain validation rules
- `subject/` - Credential subject field validation rules
- `types/` - Type definitions used by rules

**Key files:**
- `chain/validate-extended-company-prefix.ts` - Company prefix → License prefix validation
- `chain/validate-extended-license-prefix.ts` - License prefix validation (root)
- `chain/validate-extended-data-key.ts` - Key credential and data credential validation
- `chain/shared-extended.ts` - Common chain validation utilities
- `subject/check-credential-license.ts` - License value validation
- `subject/check-credential-alternative-license.ts` - Alternative license value handling
- `subject/check-credential-subject-Id-digital-link.ts` - GS1 Digital Link URI validation

### `/src/lib/rules-schema` - JSON Schema Metadata

JSON Schema definitions for GS1 credential structure and chain rules.

- **`rules-schema-types.ts`** - Type definitions for schema metadata
  - `gs1CredentialSchema` - JSON Schema structure
  - `gs1CredentialSchemaChain` - Chain relationship metadata
  - `propertyMetaData` - Extended credential metadata

- **`gs1-chain-rules.ts`** - Chain relationship definitions
  - Defines parent-child relationships between credential types
  - Specifies validation rules for each credential type

- **`genericCredentialSchema.ts`** - Fallback schema for non-GS1 credentials

### `/src/lib/schema` - Custom JSON Schema Validation

Custom Ajv extensions for GS1-specific validation.

- **`validate-schema.ts`** - Schema validation orchestration
  - `checkSchema()` - Validates credential against JSON schema
  - Uses Ajv with custom extensions

- **`ajv-gs1-extension.ts`** - Custom Ajv keywords
  - Custom validation rules for GS1 Digital Links and alternative licenses
  - Extends Ajv validator with GS1-specific validation logic

- **`gs1-schema-extention-types.ts`** - Schema extension definitions
  - `gs1AltLicenseValidationRules` - Alternative license validation
  - `gs1DigitalLinkRules` - Digital Link validation for credential.id
  - `gs1DigitalLinkSameAsRules` - Digital Link validation for sameAs field

### `/src/lib/utility` - Utility Functions

Helper functions used across the library.

- **`jwt-utils.ts`** - JWT/JOSE credential handling
  - `normalizeCredential()` - Decodes JWT credentials to VC format
  - `normalizePresentation()` - Decodes JWT presentations
  - Handles both JWT and plain JSON credentials

- **`text-util.ts`** - Text encoding/decoding utilities
  - TextDecoder wrapper for cross-platform compatibility

- **`console-logger.ts`** - Debug logging utilities
  - Formatted console output for credential chain debugging

## Configuration Files

- **`tsconfig.json`** - TypeScript compiler configuration
- **`tsup.config.js`** - Build configuration (ESM output)
- **`jest.config.ts`** - Jest test configuration
- **`eslint.config.js`** - ESLint configuration
- **`nodemon.json`** - Dev mode watch configuration
- **`package.json`** - Dependencies and scripts

## Build Output

- **`/dist`** - Compiled JavaScript and type definitions (not in repo, generated on build)
  - ES Modules format
  - Includes index.js and index.d.ts
