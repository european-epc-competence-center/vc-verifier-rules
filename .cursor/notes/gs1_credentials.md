# GS1 Credential Types and Chain Hierarchy

## Overview

GS1 credentials form a hierarchical chain from specific data credentials up to the GS1 Global root of trust. Each credential type has specific validation rules and relationships.

## Supported Credential Types

**File**: `src/lib/get-credential-type.ts`

### 1. GS1PrefixLicenseCredential (Root)

**Purpose**: Root credential issued by GS1 Global for prefix licenses.

**Issuer**: GS1 Global (`did:web:id.gs1.org` by default, configurable)

**Subject Fields**:
- `licenseValue`: GS1 prefix (e.g., "08")
- `alternativeLicenseValue`: Optional alternative format

**Schema**: `https://id.gs1.org/vc/schema/v1/prefix`

**Parent**: None (root of chain)
**Children**: GS1CompanyPrefixLicenseCredential

**Validation**: Must be issued by GS1 Global root DID.

---

### 2. GS1CompanyPrefixLicenseCredential

**Purpose**: Company prefix license issued by GS1 Member Organization (e.g., GS1 US).

**Issuer**: GS1 Member Organization DID

**Subject Fields**:
- `licenseValue`: Company prefix (e.g., "0860123")
- `alternativeLicenseValue`: Optional alternative format
- `extendsCredential`: URL to parent GS1PrefixLicenseCredential

**Schema**: `https://id.gs1.org/vc/schema/v1/companyprefix`

**Parent**: GS1PrefixLicenseCredential
**Children**: KeyCredential, OrganizationDataCredential

**Validation**:
- Must extend GS1PrefixLicenseCredential
- License value must start with parent prefix value
- Alternative license must be compatible with license value

**Example Credential URL**: `https://id.gs1.org/vc/license/gs1_prefix/08`

---

### 3. KeyCredential

**Purpose**: Links GS1 identification keys (GTIN, GLN, etc.) to company prefix.

**Issuer**: Company/license holder DID

**Subject Fields**:
- `id`: GS1 Digital Link URI (e.g., `https://id.gs1.org/01/08601234567890`)
- `licenseValue`: GS1 key value (e.g., "08601234567890")
- `alternativeLicenseValue`: Optional alternative format
- `identificationKeyType`: Type of key (e.g., "GTIN", "GLN")
- `extendsCredential`: URL to parent GS1CompanyPrefixLicenseCredential

**Schema**: `https://id.gs1.org/vc/schema/v1/key`

**Parent**: GS1CompanyPrefixLicenseCredential
**Children**: ProductDataCredential, OrganizationDataCredential

**Validation**:
- Subject.id must be valid GS1 Digital Link
- License value must start with company prefix
- Alternative license must be compatible

---

### 4. ProductDataCredential

**Purpose**: Product data/claims for specific GTIN.

**Issuer**: Product owner/license holder DID

**Subject Fields**:
- `sameAs`: GS1 Digital Link matching KeyCredential id
- `product`: Object with product data
  - `gs1:brand`: Brand name
  - `gs1:productDescription`: Product description
  - Other GS1 product attributes
- `keyAuthorization`: URL to KeyCredential (extends relationship)

**Schema**: `https://id.gs1.org/vc/schema/v1/productdata`

**Parent**: KeyCredential (via keyAuthorization)
**Children**: None

**Validation**:
- sameAs must be valid GS1 Digital Link
- sameAs must match KeyCredential id
- Required product fields must be present
- Must have valid key authorization chain

---

### 5. OrganizationDataCredential

**Purpose**: Organization data/claims for specific GLN.

**Issuer**: Organization/license holder DID

**Subject Fields**:
- `sameAs`: GS1 Digital Link matching KeyCredential id
- `organization`: Object with organization data
  - `gs1:partyGLN`: GLN value (must match KeyCredential)
  - `gs1:organizationName`: Organization name
  - Other GS1 organization attributes
- `keyAuthorization`: URL to KeyCredential

**Schema**: `https://id.gs1.org/vc/schema/v1/organizationdata`

**Parent**: KeyCredential (via keyAuthorization) OR GS1CompanyPrefixLicenseCredential (via extendsCredential)
**Children**: None

**Validation**:
- sameAs must be valid GS1 Digital Link
- sameAs must match KeyCredential id (if present)
- partyGLN must match KeyCredential GLN
- Required organization fields must be present

---

### 6. GS1IdentificationKeyLicenseCredential

**Purpose**: Legacy credential type for identification key licenses.

**Schema**: `https://id.gs1.org/vc/schema/v1/identificationkey`

**Status**: Supported but less commonly used than KeyCredential.

---

## Credential Chain Relationships

### Hierarchy Diagram

See `content/gs1_credential_chain.png` for visual diagram.

```
GS1PrefixLicenseCredential (Root - GS1 Global)
  ↑ extendsCredential
GS1CompanyPrefixLicenseCredential (GS1 Member Org)
  ↑ extendsCredential          ↑ keyAuthorization
KeyCredential ←────────────── OrganizationDataCredential
  ↑ keyAuthorization
ProductDataCredential
```

### Chain Validation Rules

**Defined in**: `src/lib/rules-schema/gs1-chain-rules.ts`

Each credential type has metadata:
- `title`: Human-readable name
- `extendsCredentialType`: Parent credential specification
  - `type`: Array of allowed parent types
  - `rule`: Validation function name in rulesEngineManager
- `childCredential`: Allowed child types

**Example for KeyCredential**:
```typescript
{
  title: "KeyCredential",
  extendsCredentialType: {
    type: ["GS1CompanyPrefixLicenseCredential"],
    rule: "KeyCredential"  // maps to validateExtendedKeyCredential
  },
  childCredential: {
    type: ["ProductDataCredential", "OrganizationDataCredential"]
  }
}
```

---

## License Value Relationships

### Prefix Hierarchy

GS1 uses hierarchical prefix structure:

1. **GS1 Prefix**: 2-3 digits (e.g., "08" or "123")
2. **Company Prefix**: GS1 prefix + additional digits (e.g., "0860123")
3. **Key Value**: Company prefix + item reference (e.g., "08601234567890")

### Validation Rules

**Company Prefix → GS1 Prefix**:
- Company prefix must START with GS1 prefix
- Example: "0860123" starts with "08" ✓

**Key → Company Prefix**:
- Key license value must START with company prefix
- Example: "08601234567890" starts with "0860123" ✓

**Alternative License Values**:
- If present, must be compatible with primary license value
- Validated by custom Ajv rules in `ajv-gs1-extension.ts`

---

## Field Naming Patterns

### extendsCredential vs keyAuthorization

**extendsCredential**:
- Used for license credential chains
- Points to parent license credential
- Used by: GS1CompanyPrefixLicenseCredential, KeyCredential

**keyAuthorization**:
- Used for data credentials linking to key credentials
- Points to KeyCredential
- Used by: ProductDataCredential, OrganizationDataCredential

### id vs sameAs

**credentialSubject.id**:
- Required for KeyCredential
- Must be GS1 Digital Link
- Uniquely identifies the key

**credentialSubject.sameAs**:
- Used by data credentials
- Must match KeyCredential.id
- Links data to specific GS1 key

---

## GS1 Digital Links

### Format

HTTPS URI with GS1 domain and key type:
```
https://id.gs1.org/{AI}/{KEY_VALUE}
```

**Application Identifiers (AI)**:
- `01`: GTIN (Global Trade Item Number)
- `414`: GLN (Global Location Number)
- Others defined by GS1 standards

**Examples**:
- GTIN: `https://id.gs1.org/01/08601234567890`
- GLN: `https://id.gs1.org/414/0860123000001`

### Validation

**File**: `src/lib/rules-definition/subject/check-credential-subject-Id-digital-link.ts`

**Rules**:
- Must be HTTPS
- Must use recognized GS1 domain
- Must have valid AI and value structure

**Custom Ajv Keywords**: Defined in `ajv-gs1-extension.ts`
- Validates during JSON Schema validation phase

---

## Root of Trust

### GS1 Global DID

**Default**: `did:web:id.gs1.org`

**Configuration**: Can be overridden via environment variable (see CHANGELOG 2.3.0)

**Validation**: 
- Final credential in chain MUST be GS1PrefixLicenseCredential
- GS1PrefixLicenseCredential MUST be issued by GS1 Global DID
- Checked in `validateCredentialChain()` when reaching root

**Failure**: Error code GS1-130 if root is not GS1PrefixLicenseCredential
