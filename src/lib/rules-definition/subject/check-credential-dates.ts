import { invalidValidFromFuture, invalidValidUntilPast, invalidDateFormat } from "../../engine/gs1-credential-errors.js";
import { gs1CredentialValidationRuleResult } from "../../gs1-rules-types.js";
import { VerifiableCredential } from "../../types.js";

/**
 * Check that validFrom date is not in the future (L-4 rule from GS1 Digital Licenses spec)
 * Spec requirement: L validFrom MUST NOT be in the future
 * 
 * @param credential - The credential to validate
 * @returns Validation result
 */
export function checkValidFromDate(credential: VerifiableCredential): gs1CredentialValidationRuleResult {
    const validFrom = credential.validFrom;

    // Defensive check: validFrom is required by schema, but handle gracefully if missing
    // (Schema validation should catch missing validFrom before this business rule check)
    if (!validFrom) {
        return { verified: true };
    }

    // Parse the date
    const validFromDate = new Date(validFrom);
    
    // Check if date is valid
    if (isNaN(validFromDate.getTime())) {
        return { verified: false, rule: invalidDateFormat };
    }

    // Get current time
    const now = new Date();

    // Check if validFrom is in the future
    if (validFromDate > now) {
        return { verified: false, rule: invalidValidFromFuture };
    }

    return { verified: true };
}

/**
 * Check that validUntil date is not in the past
 * Complementary validation to ensure credential is currently valid
 * 
 * @param credential - The credential to validate
 * @returns Validation result
 */
export function checkValidUntilDate(credential: VerifiableCredential): gs1CredentialValidationRuleResult {
    const validUntil = credential.validUntil;

    // validUntil is optional in W3C VC Data Model 2.0, so undefined is valid
    if (!validUntil) {
        return { verified: true };
    }

    // Parse the date
    const validUntilDate = new Date(validUntil);
    
    // Check if date is valid
    if (isNaN(validUntilDate.getTime())) {
        return { verified: false, rule: invalidDateFormat };
    }

    // Get current time
    const now = new Date();

    // Check if validUntil is in the past
    if (validUntilDate < now) {
        return { verified: false, rule: invalidValidUntilPast };
    }

    return { verified: true };
}
