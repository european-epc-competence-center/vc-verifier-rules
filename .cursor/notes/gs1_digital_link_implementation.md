# GS1 Digital Link Implementation

## Overview

The project uses the official `digital-link.js` library for parsing and validating GS1 Digital Links, with custom extensions for complete check digit validation.

**File**: `src/lib/rules-definition/subject/check-credential-subject-Id-digital-link.ts`

## Library Integration

### digital-link.js Library

- **Version**: 1.4.3
- **Purpose**: Official GS1 Digital Link grammar validation
- **Grammar**: Validates against GS1 Digital Link specification v1.4
- **Limitations**: Missing check digit validation for some identifiers (notably partyGLN/417)

### Custom Extensions

We supplement the library with:
1. **Complete check digit validation** for all GS1 identification keys
2. **Type detection** for all primary identifiers
3. **Parsing utilities** that extract identifier values and qualifiers

## GS1 Application Identifiers (Primary Keys)

### Identifiers with Check Digits

| AI | Name | Check Digit Position | Notes |
|----|------|---------------------|-------|
| 01 | GTIN | End of string | Global Trade Item Number |
| 8006 | ITIP | End of string | Individual Trade Item Piece |
| 414 | GLN | Position 13 | Global Location Number |
| 417 | partyGLN | Position 13 | Party GLN (missing from library) |
| 00 | SSCC | End of string | Serial Shipping Container Code |
| 8003 | GRAI | Position 14 | Global Returnable Asset Identifier |
| 8018 | GSRN | End of string | Global Service Relation Number |
| 253 | GDTI | Position 13 | Global Document Type Identifier |
| 402 | GSIN | End of string | Global Shipment Identification Number |
| 255 | GCN | Position 13 | Global Coupon Number |

### Identifiers WITHOUT Check Digits

| AI | Name | Notes |
|----|------|-------|
| 8004 | GIAI | Global Individual Asset Identifier |
| 8017 | GSRNP | Global Service Relation Number Provider |
| 401 | GINC | Global Identification Number for Consignment |
| 8010 | CPID | Component/Part Identifier |
| 8013 | GMN | Global Model Number |

### Key Qualifiers (Not Primary Identifiers)

| AI | Name | Notes |
|----|------|-------|
| 254 | GLN Extension | Qualifier for GLN (414), not a primary key, no check digit |
| 21 | Serial Number | Qualifier for GTIN/ITIP |
| 10 | Lot/Batch Number | Qualifier for GTIN/ITIP |
| 22 | CPV | Consumer Product Variant |

## Check Digit Algorithm

Uses standard GS1 check digit calculation (Mod 10):

```typescript
function calculateCheckDigit(value: string): string {
  let sum = 0;
  const reversed = value.split('').reverse();
  
  for (let i = 0; i < reversed.length; i++) {
    const digit = parseInt(reversed[i], 10);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}
```

## Validation Flow

1. **Grammar Validation**: Use `digital-link.js` library's `getValidationTrace().success`
2. **Check Digit Validation**: Custom implementation for all identifiers
3. **Type Detection**: Map AI code to identifier type
4. **Value Extraction**: Extract primary identifier value and qualifiers

## Usage Example

```typescript
import { parseGS1DigitalLink } from './check-credential-subject-Id-digital-link';

const result = parseGS1DigitalLink('https://id.gs1.org/417/0860005769407');
// result.isValid: true
// result.type: "GLN"
// result.parsedValue: "0860005769407"
```

## References

- [GS1 Digital Link Specification](https://www.gs1.org/standards/gs1-digital-link)
- [GS1 Application Identifiers](https://www.gs1.org/gs1-application-identifiers)
- [GS1 Check Digit Calculator](https://www.gs1.org/services/check-digit-calculator)
- [digital-link.js GitHub](https://github.com/gs1/digital-link.js)

## Known Issues

### Library Limitations

1. **Missing partyGLN (417) check digit validation** - We added custom validation
2. **Returns false for identifiers without check digits** - We handle this gracefully

### Design Decisions

- Use `getValidationTrace().success` instead of `isValid()` for grammar validation
- Supplement library's check digit validation with our own complete implementation
- Support all GS1 primary identifiers, not just GTIN and GLN
