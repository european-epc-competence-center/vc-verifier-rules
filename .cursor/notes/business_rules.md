# Business Rules and Error Codes

## Error Code System

**File**: `src/lib/engine/gs1-credential-errors.ts`

All GS1 validation errors use format: `GS1-XXX`

### Error Categories

- **GS1-0XX**: Generic errors (resolution failures)
- **GS1-1XX**: Credential type and issuer errors
- **GS1-2XX**: License value and format errors  
- **GS1-3XX**: Credential chain and data errors
- **GS1-4XX**: Extended credential validation failures
- **GS1-5XX**: Required field errors

---

## Complete Error Code Reference

### GS1-010: Error Resolving Credential
**Code**: `errorResolveCredentialCode`  
**Rule**: Generic credential resolution error  
**Trigger**: External credential loader throws error or returns invalid credential

---

### GS1-100: Invalid Credential Types
**Code**: `invalidGS1CredentialTypes`  
**Rule**: "The type of this license credential is not in the list of valid license credential types."  
**Trigger**: 
- Parent credential type not in allowed parent types for child
- Child credential type not in allowed child types for parent  
**File**: `validate-extended-credential.ts`

---

### GS1-110: Invalid Extended Credential
**Code**: `invalidExtendedGS1Credential`  
**Rule**: "The extended credential must be a GS1 License credential."  
**Trigger**: Extended credential is not a recognized GS1 credential type

---

### GS1-120: Extended Credential Missing
**Code**: `invalidExtendedCredentialMissing`  
**Rule**: "Required extended license credential is missing to validate GS1 Extended Credentials Chain."  
**Trigger**: 
- extendsCredential or keyAuthorization field present but credential cannot be resolved
- External loader fails to return credential

---

### GS1-130: Invalid Root Credential
**Code**: `invalidRootCredentialType`  
**Rule**: "The root credential type must be a GS1PrefixLicenseCredential."  
**Trigger**: Final credential in chain is not GS1PrefixLicenseCredential  
**File**: `validate-extended-credential.ts` (at root validation)

---

### GS1-140: Invalid Prefix License Issuer
**Code**: `invalidIssueForPrefixLicense`  
**Rule**: "The issuer of prefix license credential does not match the expected value."  
**Trigger**: GS1PrefixLicenseCredential not issued by GS1 Global DID  
**File**: `validate-extended-license-prefix.ts`

---

### GS1-150: Invalid Issuer
**Code**: `invalidIssuer`  
**Rule**: "The issuer of this license credential does not match the expected value."  
**Trigger**: Credential issuer doesn't match expected issuer for chain relationship

---

### GS1-200: Invalid License Value Start
**Code**: `invalidLicenseValueStart`  
**Rule**: "The license value doesn't start with the expected value."  
**Trigger**: Child license value does not start with parent license value prefix  
**Example**: Company prefix "0860123" must start with GS1 prefix "08"  
**Files**: Chain validation rules

---

### GS1-201: Invalid License Value Start Prefix
**Code**: `invalidLicenseValueStartPrefix`  
**Rule**: "License value does not start with the correct prefix value."  
**Trigger**: Similar to GS1-200, used in specific chain validation contexts

---

### GS1-202: Invalid License Value Format
**Code**: `invalidLicenseValueFormat`  
**Rule**: "The license value format is not valid."  
**Trigger**: 
- License value has invalid characters
- License value length outside allowed range  
**File**: `check-credential-license.ts`

---

### GS1-203: Alternative License Value Missing
**Code**: `invalidAlternativeLicenseValue`  
**Rule**: "The alternative license value has not been specified."  
**Trigger**: Alternative license required but not present  
**File**: `check-credential-alternative-license.ts`

---

### GS1-204: Alternative License Not Compatible
**Code**: `invalidAlternativeLicenseNotCompatible`  
**Rule**: "The alternative license value is not compatible with the license value."  
**Trigger**: Alternative license value doesn't match format or pattern of primary license  
**File**: `check-credential-alternative-license.ts`

---

### GS1-205: Alternative License Not Supported
**Code**: `invalidAlternativeLicenseNotSupported`  
**Rule**: "An alternative license value is not supported."  
**Trigger**: Alternative license present but not allowed for this credential type  
**File**: `check-credential-alternative-license.ts`

---

### GS1-206: Invalid Identification Key Type
**Code**: `invalidIdentificationKeyType`  
**Rule**: "The identification key type of this license credential does not match the expected value."  
**Trigger**: KeyCredential identificationKeyType not recognized (e.g., not "GTIN", "GLN", etc.)  
**File**: Type validation rules

---

### GS1-207: Product Data Missing
**Code**: `dataMissingProduct`  
**Rule**: "Required Field for GS1 product are missing."  
**Trigger**: ProductDataCredential missing required product fields  
**File**: Product validation rules

---

### GS1-208: Organization Data Missing
**Code**: `invalidOrganization`  
**Rule**: "Required Field for GS1 organization are missing."  
**Trigger**: OrganizationDataCredential missing required organization fields  
**File**: Organization validation rules

---

### GS1-209: Missing Subject ID
**Code**: `missingSubjectId`  
**Rule**: "Credential Subject Id is required."  
**Trigger**: credentialSubject.id field missing when required  
**File**: Subject validation rules

---

### GS1-210: Invalid Subject ID
**Code**: `invalidSubjectId`  
**Rule**: "Credential Subject Id is not a valid URI or DID."  
**Trigger**: 
- credentialSubject.id is not a valid URI or DID
- Not properly formatted  
**File**: Subject validation rules

---

### GS1-211: Invalid Key Type Value
**Code**: `invalidIdentityKeyTypeValue`  
**Rule**: "The specified identity key type value is not supported."  
**Trigger**: identificationKeyType value not in supported list  
**File**: Key type validation

---

### GS1-212: Invalid Issuer Subject
**Code**: `invalidIssueSubject`  
**Rule**: "License value does not start with the correct prefix value."  
**Trigger**: Extended issuer subject validation failure  
**Note**: Code prefixed with "GS1EX" in source

---

### GS1-213: Invalid GS1 Digital Link (ID)
**Code**: `invalidGS1DigitalLink`  
**Rule**: "Credential Subject Id must be a GS1 Digital Link."  
**Trigger**: 
- credentialSubject.id is not a valid GS1 Digital Link
- Not HTTPS or wrong domain or invalid structure  
**File**: `check-credential-subject-Id-digital-link.ts`  
**Applies to**: KeyCredential

---

### GS1-214: Invalid GS1 Digital Link (sameAs)
**Code**: `invalidGS1DigitalLink_sameAs`  
**Rule**: "Credential Subject sameAs must be a GS1 Digital Link."  
**Trigger**: 
- credentialSubject.sameAs is not a valid GS1 Digital Link  
**File**: `check-credential-subject-Id-digital-link.ts`  
**Applies to**: ProductDataCredential, OrganizationDataCredential

---

### GS1-300: Missing Data for Chain Validation
**Code**: `dataMissingToValidateCredentialChain`  
**Rule**: "One or more subject fields are missing or invalid. Can not validate credential chain."  
**Trigger**: 
- Required subject fields missing for chain validation
- Cannot extract necessary data to validate parent-child relationship  
**File**: Chain validation rules

---

### GS1-310: Party Data Key Mismatch
**Code**: `dataMismatchBetweenPartyDataKeyCredential`  
**Rule**: "The partyGLN does not match the GLN in the Key Credential."  
**Trigger**: 
- OrganizationDataCredential.organization.partyGLN ≠ KeyCredential GLN  
**File**: `validate-extended-data-key.ts`

---

### GS1-320: Data Key Mismatch
**Code**: `dataMismatchBetweenDataKeyCredential`  
**Rule**: "The data credential GS1 Digital Link does not match the Id in the Key Credential."  
**Trigger**: 
- ProductDataCredential.sameAs ≠ KeyCredential.id
- OrganizationDataCredential.sameAs ≠ KeyCredential.id  
**File**: `validate-extended-data-key.ts`

---

### GS1-330: Unsupported Credential Chain
**Code**: `unsupportedCredentialChain`  
**Rule**: "The credential chain is not supported."  
**Trigger**: 
- No validation rule function found in rulesEngineManager for credential type
- Chain relationship not defined  
**File**: `validate-extended-credential.ts`

---

### GS1-400: Validation Chain Failure
**Code**: `validationChainFailure`  
**Rule**: "Extended Credential must verify as well."  
**Trigger**: 
- Parent credential in chain failed validation
- Error propagated down to child credential  
**Purpose**: Indicates failure came from extended credential, not current credential  
**File**: `validate-extended-credential.ts`

---

### GS1-500: Required Field Missing
**Code**: `requiredFieldMissing`  
**Rule**: "Required field --requiredField-- is missing."  
**Note**: Template error - `--requiredField--` must be replaced with actual field name  
**Trigger**: Generic required field missing  
**File**: `gs1-credential-errors.ts`

---

### VC-100: General Verification Error
**Code**: `verificationErrorCode`  
**Purpose**: Generic verification error code (not GS1-specific)  
**Exported**: Available as export from index.ts

---

### GS1-600: Invalid validFrom Date  
**Code**: `invalidValidFromFuture`  
**Rule**: "The validFrom date must not be in the future."  
**Trigger**: Credential's validFrom date is after current time  
**Spec**: GS1 Digital Licenses Spec Section 4.2 L-4  
**File**: `check-credential-dates.ts`  
**Added**: 2026-01-06

---

### GS1-601: Invalid validUntil Date
**Code**: `invalidValidUntilPast`  
**Rule**: "The validUntil date must not be in the past."  
**Trigger**: Credential's validUntil date is before current time  
**File**: `check-credential-dates.ts`  
**Added**: 2026-01-06

---

### GS1-602: Invalid Date Format
**Code**: `invalidDateFormat`  
**Rule**: "The date format is invalid."  
**Trigger**: Date string cannot be parsed as valid ISO 8601 date  
**File**: `check-credential-dates.ts`  
**Added**: 2026-01-06

---

## Business Rules Implementation

### Chain Validation Rules

**Location**: `src/lib/rules-definition/chain/`

#### Company Prefix → Prefix License
**File**: `validate-extended-license-prefix.ts`  
**Function**: `validateExtendedLicensePrefix()`

**Rules**:
1. Parent must be GS1PrefixLicenseCredential
2. Parent issuer must be GS1 Global DID (configurable)
3. Child license value must start with parent prefix value
4. Alternative license values must be compatible

**Errors**: GS1-140, GS1-200, GS1-204

---

#### Key → Company Prefix  
**File**: `validate-extended-company-prefix.ts`  
**Function**: `validateExtendedCompanyPrefixCredential()`

**Rules**:
1. Parent must be GS1CompanyPrefixLicenseCredential
2. Child license value must start with company prefix
3. Alternative license values must be compatible
4. Issuer relationship validated

**Errors**: GS1-200, GS1-204, GS1-300

---

#### Data → Key
**File**: `validate-extended-data-key.ts`  
**Functions**: 
- `validateExtendedKeyCredential()` - Data → Key
- `validateExtendedKeyDataCredential()` - Key → CompanyPrefix

**Rules (Data → Key)**:
1. Parent must be KeyCredential
2. Data credential sameAs must match Key credential id
3. For OrganizationData: partyGLN must match Key GLN
4. Digital links must be valid

**Errors**: GS1-310, GS1-320, GS1-300

**Rules (Key → CompanyPrefix)**:
1. Same as "Key → Company Prefix" above

---

### Subject Field Validation

**Location**: `src/lib/rules-definition/subject/`

#### License Value Validation
**File**: `check-credential-license.ts`  
**Function**: `checkPrefixCredentialLicenseValue()`

**Rules**:
1. License value must be present
2. License value must be correct length
3. License value must contain only valid characters

**Errors**: GS1-202

---

#### Alternative License Validation
**File**: `check-credential-alternative-license.ts`  
**Functions**: Various alternative license checks

**Rules**:
1. Alternative license must match primary license pattern
2. Alternative must be compatible format
3. Alternative must be supported for credential type

**Errors**: GS1-203, GS1-204, GS1-205

---

#### Digital Link Validation
**File**: `check-credential-subject-Id-digital-link.ts`  
**Functions**: Digital link validation for id and sameAs  
**Library**: Uses `digital-link.js` for official GS1 Digital Link grammar validation

**Rules**:
1. Must be HTTPS URI
2. Must use GS1 domain (id.gs1.org)
3. Must have valid application identifier per GS1 Digital Link spec
4. Must have valid key value structure
5. Must have correct check digit for supported identifiers (GTIN, GLN, partyGLN)

**Errors**: GS1-213, GS1-214

**Also Validated By**: Custom Ajv keywords in `ajv-gs1-extension.ts`

---

## Custom Ajv Validation

**File**: `src/lib/schema/ajv-gs1-extension.ts`

### Custom Keywords

**gs1DigitalLinkId**: Validates credential.id is GS1 Digital Link  
**gs1DigitalLinkSameAs**: Validates sameAs is GS1 Digital Link  
**gs1AlternativeLicense**: Validates alternative license compatibility

These run during JSON Schema validation phase in `checkSchema()`.

---

## Validation Order

Validation occurs in this order:

1. **External Credential Verification** (if not in presentation)
   - Proof verification
   - Revocation check
   - Done by external callback

2. **JSON Schema Validation**
   - Structure validation
   - Type validation
   - Custom Ajv keyword validation
   - Errors: Various based on schema

3. **Chain Type Validation**
   - Parent type check
   - Child type check
   - Errors: GS1-100

4. **Business Rule Validation**
   - License value relationships
   - Digital link matching
   - Required field presence
   - Errors: GS1-2XX, GS1-3XX

5. **Recursive Chain Validation**
   - Walk up credential chain
   - Validate each link
   - Propagate failures down

6. **Root Validation**
   - Must be GS1PrefixLicenseCredential
   - Must be issued by GS1 Global
   - Errors: GS1-130, GS1-140

---

## Debugging Validation Failures

### Reading Error Results

**Type**: `gs1RulesResult`

```typescript
{
  verified: false,
  credentialId: "https://example.com/credential/123",
  credentialName: "KeyCredential",
  errors: [
    { code: "GS1-200", rule: "The license value doesn't start with the expected value." },
    { code: "GS1-213", rule: "Credential Subject Id must be a GS1 Digital Link." }
  ],
  resolvedCredential: {
    // nested result for parent credential
  }
}
```

### Error Location

- **Top-level errors**: Issue with current credential
- **resolvedCredential errors**: Issue with parent credential in chain
- **GS1-400 error**: Failure propagated from parent, check resolvedCredential for details

### Common Issues

**GS1-130**: Chain doesn't end with GS1PrefixLicenseCredential
- Check: Is final credential in chain the correct type?
- Fix: Ensure chain resolves to GS1 Global root credential

**GS1-200**: License value prefix mismatch
- Check: Does child license start with parent prefix?
- Fix: Verify license value hierarchy (prefix → company prefix → key)

**GS1-213/214**: Invalid Digital Link
- Check: Is URL HTTPS with id.gs1.org domain?
- Fix: Use proper GS1 Digital Link format

**GS1-320**: Data credential doesn't match key
- Check: Does sameAs exactly match KeyCredential.id?
- Fix: Ensure exact string match between sameAs and key id
