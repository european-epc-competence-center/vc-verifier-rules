# Validation Architecture

## Overview

The library implements a multi-layered validation approach for GS1 credentials:
1. **Credential Chain Building** - Resolves hierarchical credential dependencies
2. **Chain Validation** - Validates each link in chain with business rules
3. **JSON Schema Validation** - Validates credential structure and data types
4. **Custom GS1 Rules** - Validates GS1-specific constraints (digital links, license values)

## High-Level Flow

### Entry: `checkGS1CredentialPresentationValidation()`

**File**: `src/lib/gs1-verification-service.ts`

**Flow**:
```
1. Normalize presentation (decode JWT if needed)
2. For each credential in presentation:
   a. Resolve missing extended credentials
   b. Build credential chain
   c. Validate credential chain
   d. Collect results
3. Return aggregated results
```

**Key Logic**:
- Iterates through `verifiableCredential` array
- Uses `resolveExternalCredential()` to find missing chain links
- Adds resolved credentials to presentation for validation
- Each credential validated independently via `checkGS1Credentials()`

---

### Entry: `checkGS1CredentialWithoutPresentation()`

**File**: `src/lib/gs1-verification-service.ts`

**Flow**:
```
1. Wrap credential in minimal presentation
2. Call checkGS1Credentials()
```

**Purpose**: Convenience method for single-credential validation.

---

### Core: `checkGS1Credentials()`

**File**: `src/lib/gs1-verification-service.ts` (private function)

**Flow**:
```
1. Normalize credential (decode JWT)
2. Extract callbacks from validatorRequest
3. Get credential schema
4. Build credential chain → buildCredentialChain()
5. Validate credential chain → validateCredentialChain()
6. Return result with errors
```

**Key Decisions**:
- Non-GS1 credentials return `verified: true` immediately
- Uses `getCredentialRuleSchema()` to determine credential type and schema
- Delegates chain operations to engine layer

---

## Credential Chain Building

### `buildCredentialChain()`

**File**: `src/lib/engine/validate-extended-credential.ts`

**Purpose**: Recursively builds metadata tree representing credential hierarchy.

**Algorithm**:
```
1. Get credential schema and rules
2. Check if credential has extendsCredential or keyAuthorization field
3. If extended credential exists:
   a. Resolve credential (from presentation or external)
   b. Recursively call buildCredentialChain() on extended credential
   c. Attach as extendedCredentialChain
4. Return credentialChainMetaData
```

**Type**: `credentialChainMetaData`
```typescript
{
  credential: VerifiableCredential | verifiableJwt | string;
  inPresentation: boolean;  // false if externally resolved
  schema: gs1CredentialSchemaChain;
  credentialSubjectSchema: CredentialSubjectSchema;
  extendedCredentialChain?: credentialChainMetaData;  // recursive
  error?: string;
}
```

**Key Details**:
- `inPresentation` flag determines if external verification needed
- Chain terminates at root credential (GS1PrefixLicenseCredential)
- Errors during resolution stored in `error` field

---

### `resolveExternalCredential()`

**File**: `src/lib/engine/resolve-external-credential.ts`

**Purpose**: Finds credential in presentation or loads externally.

**Logic**:
```
1. Check if credential URL exists in presentation
2. If found: return { credential, inPresentation: true }
3. If not found: call externalCredentialLoader callback
4. Return { credential, inPresentation: false }
```

**Used By**: Both `buildCredentialChain()` and presentation validation loop.

---

## Chain Validation

### `validateCredentialChain()`

**File**: `src/lib/engine/validate-extended-credential.ts`

**Purpose**: Validates entire credential chain including business rules and schema.

**Algorithm**:
```
1. If credential not in presentation:
   - Call externalCredentialVerification callback
   - Accumulate errors if verification fails

2. Validate JSON Schema:
   - Get schema via getCredentialRuleSchema()
   - Call checkSchema() with Ajv
   - Accumulate schema errors

3. If no extended credential: return result

4. Validate chain relationships:
   - Check parent credential type is valid for child
   - Check child credential type is valid for parent
   - Get validation rule function from rulesEngineManager
   - Execute business rule validation
   - Accumulate business rule errors

5. Recursively validate extendedCredentialChain:
   - Walk up the chain
   - Propagate verification failures down
   - Attach resolved credentials to result

6. At root: verify credential is GS1PrefixLicenseCredential

7. Return gs1RulesResult with all errors
```

**Key Features**:
- **Recursive**: Walks entire chain from leaf to root
- **Error Isolation**: Errors stay with source credential but verification status propagates
- **Schema Validation**: Every credential in chain validated against schema
- **Business Rules**: Parent-child relationships validated with specific rule functions

**Error Propagation**:
- Each credential has own error array
- Failed child credential sets parent `verified: false` but adds only `validationChainFailure` error
- Allows pinpointing exact credential causing failure

---

## JSON Schema Validation

### `getCredentialRuleSchema()`

**File**: `src/lib/get-credential-type.ts`

**Purpose**: Determines appropriate JSON Schema for credential type.

**Logic**:
```
1. Get GS1 credential type from credential.type array
2. Call externalJsonSchemaLoader callback
3. Check for V1 vs V2 credential (by @context and proof)
4. Apply GS1 custom rules based on type:
   - Prefix/CompanyPrefix: Alternative license rules
   - KeyCredential: Digital link rules for id
   - OrganizationData/ProductData: Digital link rules for sameAs
5. If fullJsonSchemaValidationOn is false:
   - Keep only custom rules, remove standard schema properties
6. Return combined schema
```

**V1 Compatibility**: 
- Credentials with V1 context and `proof` field use simplified schema
- Only `credentialSubject` validated (not top-level fields)

---

### `checkSchema()`

**File**: `src/lib/schema/validate-schema.ts`

**Purpose**: Executes Ajv JSON Schema validation.

**Setup**:
- Uses Ajv with custom GS1 extensions (via `ajv-gs1-extension.ts`)
- Supports `ajv-formats` for format validation
- Supports `ajv-errors` for custom error messages

**Custom Keywords**:
- Defined in `src/lib/schema/ajv-gs1-extension.ts`
- Validate GS1 Digital Links (HTTPS URIs with GS1 patterns)
- Validate alternative license values

**Returns**: `gs1RulesResult` with errors array

---

## Business Rules Validation

### `rulesEngineManager`

**File**: `src/lib/rules-definition/rules-manager.ts`

**Purpose**: Registry mapping credential types to validation functions.

**Mappings**:
```typescript
rulesEngineManager.GS1PrefixLicenseCredential = validateExtendedLicensePrefix;
rulesEngineManager.GS1CompanyPrefixLicenseCredential = validateExtendedCompanyPrefixCredential;
rulesEngineManager.KeyCredential = validateExtendedKeyCredential;
rulesEngineManager.KeyDataCredential = validateExtendedKeyDataCredential;
```

**Called By**: `validateCredentialChain()` when validating parent-child relationships.

---

### Chain Validation Rules

**Location**: `src/lib/rules-definition/chain/`

**validate-extended-license-prefix.ts**:
- Validates GS1CompanyPrefixLicenseCredential → GS1PrefixLicenseCredential
- Checks issuer matches GS1 Global (did:web:id.gs1.org or configurable)
- Validates company prefix starts with GS1 prefix license value

**validate-extended-company-prefix.ts**:
- Validates KeyCredential → GS1CompanyPrefixLicenseCredential
- Validates OrganizationData → GS1CompanyPrefixLicenseCredential  
- Checks key license value starts with company prefix
- Validates alternative license values if present

**validate-extended-data-key.ts**:
- `validateExtendedKeyCredential`: ProductData/OrganizationData → KeyCredential
  - Validates digital link in data credential matches key credential
  - Checks organization.partyGLN matches key GLN
- `validateExtendedKeyDataCredential`: KeyCredential → GS1CompanyPrefixLicenseCredential
  - Validates key license value starts with company prefix

**shared-extended.ts**:
- Common utilities for chain validation
- License value comparison logic
- Prefix matching utilities

---

### Subject Validation Rules

**Location**: `src/lib/rules-definition/subject/`

**check-credential-license.ts**:
- Validates license value format and length
- Validates prefix license values

**check-credential-alternative-license.ts**:
- Validates alternative license value presence and compatibility
- Ensures alternative matches primary license format

**check-credential-subject-Id-digital-link.ts**:
- Validates credential.id is GS1 Digital Link
- Validates sameAs field is GS1 Digital Link
- Pattern: HTTPS URI with GS1 domains

---

## Credential Type Detection

### `getCredentialType()`

**File**: `src/lib/get-credential-type.ts`

**Purpose**: Extracts GS1 credential type from credential.type array.

**Logic**:
```
1. Filter credential.type array for known GS1 types
2. Return first match with name and schemaId
3. Return "unknown" if no GS1 type found or multiple found
```

**Supported Types**:
- GS1PrefixLicenseCredential
- GS1CompanyPrefixLicenseCredential
- KeyCredential
- OrganizationDataCredential
- ProductDataCredential
- GS1IdentificationKeyLicenseCredential

---

## Configuration and Extension Points

### Adding New Credential Type

1. Add type constant to `get-credential-type.ts`
2. Add to GS1CredentialTypes array
3. Add schema mapping to GS1CredentialSchema array
4. Define chain rules in `src/lib/rules-schema/gs1-chain-rules.ts`
5. Implement validation function in `src/lib/rules-definition/chain/`
6. Register in `rulesEngineManager` in `rules-manager.ts`
7. Add JSON schema loading logic in `getCredentialRuleSchema()`

### Custom Validation Rules

Custom rules implemented as Ajv keywords in `src/lib/schema/ajv-gs1-extension.ts`.

**Pattern**:
```typescript
ajv.addKeyword({
  keyword: "customRule",
  validate: (schema, data, parentSchema, dataCxt) => {
    // validation logic
    return true/false;
  }
});
```
