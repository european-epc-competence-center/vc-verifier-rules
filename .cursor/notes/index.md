# Project Index

## Project Overview

**vc-verifier-rules** (@eecc/vc-verifier-rules) is a TypeScript/Node.js library for validating GS1-based Verifiable Credentials according to W3C standards and GS1 Data Model Level 4 business rules.

**Purpose**: Validates credential chains for the GS1 Digital License ecosystem, ensuring authenticity of product, location, and asset assertions by verifying the chain from data credentials up to the GS1 Global root of trust.

**Repository**: Forked from `@gs1us/vc-verifier-rules`, now maintained by EECC (European EPC Competence Center)

**Related Project**: Works in conjunction with [vc-verifier](https://github.com/european-epc-competence-center/vc-verifier) for general-purpose VC verification.

## Quick Navigation

### By Topic
- [Project Structure](./project_structure.md) - Detailed folder and module organization
- [API and Public Interface](./api.md) - Main entry points and how to use the library
- [Validation Architecture](./validation_architecture.md) - How credential validation works
- [GS1 Credential Types](./gs1_credentials.md) - Supported credential types and chain hierarchy
- [Business Rules](./business_rules.md) - GS1 validation rules and error codes
- [GS1 Spec Validation Rules](./gs1_spec_validation_rules.md) - GS1 Digital Licenses spec compliance and gaps
- [GS1 Digital Link Implementation](./gs1_digital_link_implementation.md) - Digital Link parsing, validation, and check digits
- [KeyCredential Chains (K-8)](./key_credential_chains.md) - Serialized item support (SGTIN → GTIN)
- [Testing](./testing.md) - Test structure and mock data

### By Use Case
- **First-time setup**: Read [API and Public Interface](./api.md) and [GS1 Credential Types](./gs1_credentials.md)
- **Understanding validation flow**: Read [Validation Architecture](./validation_architecture.md)
- **Debugging validation errors**: Check [Business Rules](./business_rules.md) for error codes
- **Adding new credential types**: Review [Validation Architecture](./validation_architecture.md) and [Business Rules](./business_rules.md)

## Key Technical Details

**Runtime**: Node.js v22.0.0+, TypeScript, ES Modules  
**Main Dependencies**: 
- Ajv (JSON Schema validation)
- jose (JWT handling)
- digital-link.js (GS1 Digital Link parsing and validation)

**Build**: tsup for bundling, jest for testing  
**W3C Standards**: Supports VC Data Model 1.1 and 2.0, JOSE enveloping proofs

## Repository Structure Summary

```
src/
├── index.ts                      # Public API exports
├── lib/
│   ├── gs1-verification-service.ts    # Main verification orchestration
│   ├── engine/                        # Credential chain resolution & validation
│   ├── rules-definition/              # Business rules implementation
│   │   ├── chain/                     # Chain validation rules
│   │   ├── subject/                   # Subject field validation
│   │   └── types/                     # Type definitions for rules
│   ├── rules-schema/                  # JSON Schema metadata for GS1 credentials
│   ├── schema/                        # Custom Ajv extensions for GS1
│   ├── utility/                       # JWT/JOSE helpers, console logging
│   └── types.ts                       # Core type definitions
├── getting-started/                   # Tutorial with JSON schemas
└── tests/                            # Jest test suite
```

See [Project Structure](./project_structure.md) for detailed breakdown.

## Main Entry Points

- `checkGS1CredentialWithoutPresentation()` - Validate a single credential
- `checkGS1CredentialPresentationValidation()` - Validate a presentation with multiple credentials

See [API and Public Interface](./api.md) for full details.

## Changelog Conventions

The project maintains a `CHANGELOG.md` at the root following this format:
```
## [VERSION] - YYYY-MM-DD
- change description
```

**Important**: CHANGELOG.md serves as the historical record. Notes should only describe the current state, not historical changes.
