# Testing

## Test Framework

**Framework**: Jest with TypeScript support (ts-jest)  
**Config**: `jest.config.ts`  
**Location**: `src/tests/`  
**Command**: `npm test`

## Test Structure

### Test Files

**src/tests/getting-started.test.ts**:
- Integration test demonstrating library usage
- Mirrors the getting-started tutorial
- Tests full credential chain validation with callbacks

**src/tests/rules-api.test.ts**:
- Tests main API functions
- Tests `checkGS1CredentialWithoutPresentation()`
- Tests `checkGS1CredentialPresentationValidation()`

**src/tests/rules-chain.test.ts**:
- Tests credential chain building and validation
- Tests chain traversal logic
- Tests parent-child relationship validation

**src/tests/rules-issuer.test.ts**:
- Tests issuer validation rules
- Tests GS1 Global DID verification
- Tests issuer field handling

**src/tests/rules-subject.test.ts**:
- Tests credential subject field validation
- Tests license value validation
- Tests digital link validation
- Tests required field checking

---

## Mock Data

### mock-credential.ts

**Purpose**: Mock verifiable credentials for testing

**Contains**:
- `mockPrefixLicenseCredential` - GS1PrefixLicenseCredential
- `mockCompanyPrefixCredential` - GS1CompanyPrefixLicenseCredential
- `mockKeyCredential` - KeyCredential
- `mockProductDataCredential` - ProductDataCredential
- `mockOrganizationDataCredential` - OrganizationDataCredential

**Format**: Plain JSON-LD verifiable credentials

**Usage**: Testing credential validation without external dependencies

---

### mock-jose-credential.ts

**Purpose**: JWT-encoded credentials for testing JOSE support

**Contains**:
- `mockJoseCredentialPresentationProductJwt` - JWT presentation with product data
- JWT-encoded versions of various credential types

**Format**: JWT strings (compact serialization)

**Usage**: 
- Testing JWT credential decoding
- Testing `normalizeCredential()` and `normalizePresentation()`
- Ensuring V2 JOSE proof support

---

### mock-schema.ts

**Purpose**: Mock JSON Schemas for credential validation

**Contains**:
- `mock_gs1CompanyPrefixSchema` - Company prefix credential schema
- `mock_gs1ProductDataSchema` - Product data credential schema
- `mock_gs1KeySchema` - Key credential schema
- `mock_gs1OrganizationDataSchema` - Organization data credential schema
- `mock_gs1PrefixSchema` - Prefix license credential schema

**Format**: JSON Schema objects matching GS1 schema structure

**Usage**: Provided to `externalJsonSchemaLoader` callback in tests

---

### mock-data.ts

**Purpose**: Test data fragments and utilities

**Contains**:
- License value test data
- Invalid credential examples
- Utility functions for test data generation

---

## Test Patterns

### Callback Implementation

Tests implement the three required callbacks:

```typescript
// External credential loader
const loadExternalCredential: externalCredential = async (url: string) => {
  if (url === "https://id.gs1.org/vc/license/gs1_prefix/08") {
    return mockPrefixLicenseCredential;
  }
  throw new Error(`External Credential "${url}" can not be resolved.`);
}

// External credential verification
const validateExternalCredential: verifyExternalCredential = async (credential) => {
  return { 
    credentialId: credential.id, 
    credentialName: credential.name || "unknown", 
    verified: true, 
    errors: [] 
  };
}

// JSON Schema loader
const getJsonSchema: jsonSchemaLoader = (schemaId: string) => {
  if (schemaId === "https://id.gs1.org/vc/schema/v1/companyprefix") {
    return Buffer.from(JSON.stringify(mock_gs1CompanyPrefixSchema));
  }
  return Buffer.from(''); // Empty for unsupported schemas
}
```

---

### Validation Testing Pattern

```typescript
const validatorRequest: gs1ValidatorRequest = {
  fullJsonSchemaValidationOn: true,
  gs1DocumentResolver: {
    externalCredentialLoader: loadExternalCredential,
    externalCredentialVerification: validateExternalCredential,
    externalJsonSchemaLoader: getJsonSchema
  }
}

test('should validate product credential', async () => {
  const result = await checkGS1CredentialWithoutPresentation(
    validatorRequest, 
    mockProductDataCredential
  );
  
  expect(result.verified).toBe(true);
  expect(result.errors).toHaveLength(0);
});

test('should fail with invalid credential', async () => {
  const result = await checkGS1CredentialWithoutPresentation(
    validatorRequest, 
    invalidCredential
  );
  
  expect(result.verified).toBe(false);
  expect(result.errors).toContainEqual(
    expect.objectContaining({ code: 'GS1-200' })
  );
});
```

---

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test File
```bash
npm test -- rules-chain.test.ts
```

### With Coverage
Jest config should be updated to add coverage if needed.

### Watch Mode
```bash
npm test -- --watch
```

---

## Getting Started Test

**File**: `src/getting-started/getting-started-test.ts`

**Purpose**: Complete integration example showing how to use the library

**Flow**:
1. Define mock credentials
2. Implement three required callbacks
3. Create validator request
4. Validate presentation
5. Check results

**Note**: This is executable code, not just a test. Can be run directly for demonstration.

---

## Test Data Relationships

Mock credentials form complete valid chains:

```
mockPrefixLicenseCredential (GS1 Global)
  ↑
mockCompanyPrefixCredential (GS1 US)
  ↑
mockKeyCredential
  ↑
mockProductDataCredential
```

**Important**: 
- License values are consistent across chain
- Digital links match between data and key credentials
- Issuers are set correctly
- All required fields present

---

## Testing Custom Rules

### JSON Schema Validation

Tests use mock schemas that include custom Ajv keywords:
- `gs1DigitalLinkId` - Tests digital link validation for id field
- `gs1DigitalLinkSameAs` - Tests digital link validation for sameAs field
- `gs1AlternativeLicense` - Tests alternative license compatibility

### Business Rules

Tests call validation functions directly:
- Import from `src/lib/rules-definition/chain/`
- Import from `src/lib/rules-definition/subject/`
- Test with valid and invalid data
- Check error codes returned

---

## Adding New Tests

### For New Credential Type

1. Add mock credential to `mock-credential.ts`
2. Add mock schema to `mock-schema.ts`
3. Add schema loading case to test callbacks
4. Create test cases for:
   - Valid credential passes
   - Invalid license value fails
   - Invalid chain relationship fails
   - Missing required fields fail

### For New Business Rule

1. Add test cases in `rules-subject.test.ts` or `rules-chain.test.ts`
2. Test valid data passes
3. Test each error condition individually
4. Verify correct error code returned
5. Test rule in isolation and in full chain context

---

## CI/CD

**Script**: `npm test` runs in CI pipeline

**Requirements**:
- Node.js 22.0.0+
- All dependencies installed
- No external network calls (mocked)

**Output**: Jest standard output with pass/fail and coverage

---

## Debugging Tests

### Enable Console Logging

In credential chain validation:
```typescript
const LOG_CREDENTIAL_CHAIN = true; // in validate-extended-credential.ts
```

This prints credential chain as it's built and validated.

### Inspect Results

Add detailed logging:
```typescript
console.log(JSON.stringify(result, null, 2));
```

### Check Individual Credentials

Test credential in isolation:
```typescript
const result = await checkGS1CredentialWithoutPresentation(
  validatorRequest,
  singleCredential
);
```

Then test in chain:
```typescript
const result = await checkGS1CredentialPresentationValidation(
  validatorRequest,
  presentationWithChain
);
```
