# API and Public Interface

## Main Entry Point

**File**: `src/index.ts`

Exports:
- `checkGS1CredentialWithoutPresentation` - Validate single credential
- `checkGS1CredentialPresentationValidation` - Validate presentation
- `verificationErrorCode` - Error code constants
- All types from `types.ts`
- `getCredentialType` - Utility for getting credential type

## Primary API Functions

### `checkGS1CredentialWithoutPresentation()`

**Location**: `src/lib/gs1-verification-service.ts`

**Signature**:
```typescript
async function checkGS1CredentialWithoutPresentation(
  validatorRequest: gs1ValidatorRequest, 
  verifiableCredential: VerifiableCredential | verifiableJwt | string
): Promise<gs1RulesResult>
```

**Purpose**: Validates a single GS1 credential including its entire chain to root of trust.

**Behavior**:
- Creates a minimal presentation wrapper around the credential
- Resolves and validates the entire credential chain
- Returns validation result for the credential and its chain

**Parameters**:
- `validatorRequest` - Configuration with callbacks (see gs1ValidatorRequest below)
- `verifiableCredential` - Credential to validate (supports JWT, plain JSON, or string)

**Returns**: `gs1RulesResult` with verification status, errors, and resolved chain

---

### `checkGS1CredentialPresentationValidation()`

**Location**: `src/lib/gs1-verification-service.ts`

**Signature**:
```typescript
async function checkGS1CredentialPresentationValidation(
  validatorRequest: gs1ValidatorRequest, 
  verifiablePresentation: VerifiablePresentation | string
): Promise<gs1RulesResultContainer>
```

**Purpose**: Validates all GS1 credentials in a presentation.

**Behavior**:
- Iterates through all credentials in presentation
- Resolves missing extended credentials using external loader
- Validates each credential's chain independently
- Aggregates results into container

**Parameters**:
- `validatorRequest` - Configuration with callbacks
- `verifiablePresentation` - Presentation containing one or more credentials

**Returns**: `gs1RulesResultContainer` with array of individual credential results

---

## Required Configuration Types

### `gs1ValidatorRequest`

**Location**: `src/lib/types.ts`

```typescript
type gs1ValidatorRequest = {
  fullJsonSchemaValidationOn: boolean;
  gs1DocumentResolver: gs1ValidatorDocumentResolver;
}
```

**Fields**:
- `fullJsonSchemaValidationOn`: 
  - `true`: Full JSON Schema validation (all fields)
  - `false`: Only GS1 custom rules (digital links, alternative licenses) and chain validation
- `gs1DocumentResolver`: Callback functions for resolving external dependencies

---

### `gs1ValidatorDocumentResolver`

**Location**: `src/lib/types.ts`

```typescript
type gs1ValidatorDocumentResolver = {
  externalCredentialLoader: externalCredential;
  externalCredentialVerification: verifyExternalCredential;
  externalJsonSchemaLoader: jsonSchemaLoader;
}
```

**Required Callbacks**:

1. **`externalCredentialLoader`**
   ```typescript
   (url: string) => Promise<VerifiableCredential>
   ```
   - Called when a credential in the chain is not found in the presentation
   - Must resolve the credential from external source (e.g., HTTP fetch)
   - Example: Fetching GS1 Prefix License Credential from `https://id.gs1.org/vc/license/gs1_prefix/08`

2. **`externalCredentialVerification`**
   ```typescript
   (credential: VerifiableCredential | verifiableJwt | string) => Promise<gs1RulesResult>
   ```
   - Called to verify externally loaded credentials
   - Must perform proof verification and revocation checks
   - Should return `verified: true` if proof and revocation checks pass

3. **`externalJsonSchemaLoader`**
   ```typescript
   (schemaId: string) => Uint8Array
   ```
   - Called to load JSON Schema files for credential validation
   - Must return schema as Uint8Array/Buffer
   - Return empty buffer for unsupported schemas
   - Example schema IDs:
     - `https://id.gs1.org/vc/schema/v1/companyprefix`
     - `https://id.gs1.org/vc/schema/v1/productdata`
     - `https://id.gs1.org/vc/schema/v1/key`

---

## Result Types

### `gs1RulesResult`

**Location**: `src/lib/types.ts`

```typescript
type gs1RulesResult = {
  credential?: VerifiableCredential;
  credentialId: string;
  credentialName: string;
  verified: boolean;
  errors: gs1CredentialValidationRule[];
  resolvedCredential?: gs1RulesResult;
}
```

**Fields**:
- `verified`: Overall pass/fail status
- `errors`: Array of validation errors with codes and rules
- `resolvedCredential`: Nested result for externally resolved credential in chain

---

### `gs1RulesResultContainer`

**Location**: `src/lib/types.ts`

```typescript
type gs1RulesResultContainer = {
  verified: boolean;
  result: gs1RulesResult[];
}
```

**Fields**:
- `verified`: Overall pass/fail for entire presentation
- `result`: Array of individual credential results

---

### `gs1CredentialValidationRule`

**Location**: `src/lib/types.ts`

```typescript
type gs1CredentialValidationRule = {
  code: string;
  rule: string;
}
```

**Fields**:
- `code`: Error code (e.g., "GS1-100", "GS1-200") - see business_rules.md for full list
- `rule`: Human-readable error message

---

## Example Usage Pattern

See `src/getting-started/getting-started-test.ts` for complete example.

**Basic Pattern**:
```typescript
// 1. Implement callbacks
const loadExternal: externalCredential = async (url: string) => {
  // Fetch credential from url
  return credential;
}

const verifyExternal: verifyExternalCredential = async (credential) => {
  // Verify proof and revocation
  return { credentialId, credentialName, verified: true, errors: [] };
}

const loadSchema: jsonSchemaLoader = (schemaId: string) => {
  // Return schema as Buffer
  return Buffer.from(JSON.stringify(schema));
}

// 2. Configure validator request
const validatorRequest: gs1ValidatorRequest = {
  fullJsonSchemaValidationOn: true,
  gs1DocumentResolver: {
    externalCredentialLoader: loadExternal,
    externalCredentialVerification: verifyExternal,
    externalJsonSchemaLoader: loadSchema
  }
}

// 3. Validate
const result = await checkGS1CredentialPresentationValidation(
  validatorRequest, 
  presentation
);

// 4. Check results
if (result.verified) {
  console.log("All credentials valid");
} else {
  result.result.forEach(r => {
    if (!r.verified) {
      console.log(`${r.credentialName} failed:`, r.errors);
    }
  });
}
```

---

## Integration Notes

- Library supports both JWT-enveloped credentials (JOSE) and plain JSON-LD credentials
- JWT credentials are automatically decoded via `normalizeCredential()` utility
- Non-GS1 credentials in presentations are skipped (return verified: true)
- Chain validation always performed regardless of `fullJsonSchemaValidationOn` setting
- Root credential must always be `GS1PrefixLicenseCredential` issued by GS1 Global
