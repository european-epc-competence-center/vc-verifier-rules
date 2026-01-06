import { DigitalLink } from "digital-link.js";
import { invalidGS1DigitalLink, invalidGS1DigitalLink_sameAs } from "../../engine/gs1-credential-errors.js";
import { gs1CredentialValidationRuleResult, subjectId, subjectSameAs } from "../../gs1-rules-types.js";
import { gs1CredentialValidationRule } from "../../types.js";

export type gs1DigitalLinkValue = {
  isValid: boolean;
  type: "GLN" | "GTIN" | "SSCC" | "GRAI" | "GIAI" | "GSRN" | "GDTI" | "GCN" | "GSIN" | "ITIP" | "GMN" | "CPID" | "GSRNP" | "GINC" | "Unknown";
  originalValue: string;
  parsedValue?: string;
  otherUriElements?: string[];
}

// GS1 Digital Link Application Identifiers (Primary Keys)
const GS1_DIGITAL_LINK_GTIN = "01";
const GS1_DIGITAL_LINK_ITIP = "8006";
const GS1_DIGITAL_LINK_GLN = "414";
const GS1_DIGITAL_LINK_PARTYGLN = "417";
const GS1_DIGITAL_LINK_SSCC = "00";
const GS1_DIGITAL_LINK_GRAI = "8003";
const GS1_DIGITAL_LINK_GIAI = "8004";
const GS1_DIGITAL_LINK_GSRN = "8018";
const GS1_DIGITAL_LINK_GSRNP = "8017";
const GS1_DIGITAL_LINK_GDTI = "253";
const GS1_DIGITAL_LINK_GCN = "255";
const GS1_DIGITAL_LINK_GSIN = "402";
const GS1_DIGITAL_LINK_GMN = "8013";
const GS1_DIGITAL_LINK_CPID = "8010";
const GS1_DIGITAL_LINK_GINC = "401";

// Check digit positions for GS1 identification keys
// Based on digital-link.js library + additions for missing identifiers
// Note: -1 means the check digit is at the end of the string
const CHECK_DIGIT_POSITIONS: Record<string, number> = {
  "01": -1,     // GTIN - check digit at end
  "8006": -1,   // ITIP - check digit at end
  "414": 13,    // GLN - check digit at position 13
  "417": 13,    // partyGLN - check digit at position 13 (missing from digital-link.js library)
  "00": -1,     // SSCC - check digit at end
  "8003": 14,   // GRAI - check digit at position 14
  "8018": -1,   // GSRN - check digit at end
  "253": 13,    // GDTI - check digit at position 13
  "402": -1,    // GSIN - check digit at end
  "255": 13,    // GCN - check digit at position 13
  // Note: The following do NOT have check digits in their structure:
  // "8004" (GIAI), "8017" (GSRNP), "401" (GINC), "8010" (CPID), "8013" (GMN)
  // "254" (GLN Extension) is a key qualifier, not a primary identifier
};

// Calculate GS1 check digit using the standard algorithm
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

// Validate check digit for a given identifier
function validateCheckDigit(identifierCode: string, identifierValue: string): boolean {
  const position = CHECK_DIGIT_POSITIONS[identifierCode];
  
  if (position === undefined) {
    // No check digit validation defined for this identifier type
    return true;
  }
  
  const checkDigitPosition = position === -1 ? identifierValue.length : position;
  
  if (identifierValue.length < checkDigitPosition) {
    return false;
  }
  
  const valueWithoutCheckDigit = identifierValue.substring(0, checkDigitPosition - 1);
  const expectedCheckDigit = calculateCheckDigit(valueWithoutCheckDigit);
  const actualCheckDigit = identifierValue.charAt(checkDigitPosition - 1);
  
  return expectedCheckDigit === actualCheckDigit;
}

// Determine the type of GS1 Digital Link based on Application Identifier
function gs1DigitalLinkType(typeValue: string): "GLN" | "GTIN" | "SSCC" | "GRAI" | "GIAI" | "GSRN" | "GDTI" | "GCN" | "GSIN" | "ITIP" | "GMN" | "CPID" | "GSRNP" | "GINC" | "Unknown" {
  switch (typeValue) {
    case GS1_DIGITAL_LINK_GTIN:
      return "GTIN";
    case GS1_DIGITAL_LINK_ITIP:
      return "ITIP";
    case GS1_DIGITAL_LINK_GLN:
    case GS1_DIGITAL_LINK_PARTYGLN:
      return "GLN";
    case GS1_DIGITAL_LINK_SSCC:
      return "SSCC";
    case GS1_DIGITAL_LINK_GRAI:
      return "GRAI";
    case GS1_DIGITAL_LINK_GIAI:
      return "GIAI";
    case GS1_DIGITAL_LINK_GSRN:
      return "GSRN";
    case GS1_DIGITAL_LINK_GSRNP:
      return "GSRNP";
    case GS1_DIGITAL_LINK_GDTI:
      return "GDTI";
    case GS1_DIGITAL_LINK_GCN:
      return "GCN";
    case GS1_DIGITAL_LINK_GSIN:
      return "GSIN";
    case GS1_DIGITAL_LINK_GMN:
      return "GMN";
    case GS1_DIGITAL_LINK_CPID:
      return "CPID";
    case GS1_DIGITAL_LINK_GINC:
      return "GINC";
    default:
      return "Unknown";
  }
}

// parse value into GS1 Digital Link URI elements using digital-link.js library
export function parseGS1DigitalLink(value?: string | URL) : gs1DigitalLinkValue {
  const urlValue = value instanceof URL ? value.toString() : value ? value : '';
  
  if (!value) {
    return {
      isValid: false,
      originalValue: urlValue,
      type: "Unknown"
    };
  }

  try {
    // Create a DigitalLink object from the URL string
    const dl = DigitalLink(urlValue);
    
    // Validate the digital link grammar using validation trace
    const validationTrace = dl.getValidationTrace();
    if (!validationTrace.success) {
      return {
        isValid: false,
        originalValue: urlValue,
        type: "Unknown"
      };
    }

    // Get the identifier (first key-value pair in the path)
    const identifierObj = dl.getIdentifier();
    const identifierKeys = Object.keys(identifierObj);
    
    if (identifierKeys.length === 0) {
      return {
        isValid: false,
        originalValue: urlValue,
        type: "Unknown"
      };
    }

    // Get the first identifier key and value
    const identifierKey = identifierKeys[0];
    const identifierValue = identifierObj[identifierKey];
    
    // Validate check digit (using our own implementation since digital-link.js is incomplete)
    if (!validateCheckDigit(identifierKey, identifierValue)) {
      return {
        isValid: false,
        originalValue: urlValue,
        type: "Unknown"
      };
    }
    
    // Determine the type based on the identifier key
    const type = gs1DigitalLinkType(identifierKey);
    
    // Get key qualifiers (additional path segments after identifier)
    const keyQualifiers = dl.getKeyQualifiers();
    const otherUriElements: string[] = [];
    
    // Convert key qualifiers to array format
    Object.entries(keyQualifiers).forEach(([key, val]) => {
      otherUriElements.push(key, val as string);
    });

    return {
      isValid: true,
      type,
      originalValue: urlValue,
      parsedValue: identifierValue,
      otherUriElements: otherUriElements.length > 0 ? otherUriElements : undefined
    };
  } catch {
    // If parsing fails, return invalid result
    return {
      isValid: false,
      originalValue: urlValue,
      type: "Unknown"
    };
  }
}

function checkForGS1DigitalLink(value: string  | undefined, validationRule: gs1CredentialValidationRule, ignoreNull: boolean) : gs1CredentialValidationRuleResult {
  if (!value) {
    if (ignoreNull) {
      return {verified: true};
    }
    return {verified: false, rule: validationRule};
  }

  const gs1DigitalLinkResult = parseGS1DigitalLink(value);
  return gs1DigitalLinkResult.isValid ? {verified: true} : {verified: false, rule: validationRule};
}

// Verify the Credential Subject sameAs is a valid GS1 Digital Link
export function checkCredentialSameAsDigitalLink(credentialSubject?: subjectSameAs): gs1CredentialValidationRuleResult {
  return checkForGS1DigitalLink(credentialSubject?.sameAs, invalidGS1DigitalLink_sameAs, true);
}

export function checkCredentialSubjectIdDigitalLink(credentialSubject?: subjectId): gs1CredentialValidationRuleResult {
  return checkForGS1DigitalLink(credentialSubject?.id, invalidGS1DigitalLink, false);
}