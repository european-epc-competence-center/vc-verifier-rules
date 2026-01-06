import { invalidExtendedCredentialMissing, invalidIssuer, invalidLicenseValueFormat } from "../../engine/gs1-credential-errors.js";
import { credentialChainMetaData } from "../../engine/validate-extended-credential";
import { gs1RulesResult, gs1CredentialTypes } from "../../types.js";
import { parseGS1DigitalLink } from "../subject/check-credential-subject-Id-digital-link.js";
import { gs1CompanyPrefixCredentialType } from "../types/gs1-company-prefix-type";
import { gs1KeyCredentialType } from "../types/gs1-key-type";
import { checkCredentialIssuers, checkIssuerToSubjectId, compareLicenseValue } from "./shared-extended.js";
import { normalizeCredential } from "../../utility/jwt-utils.js";
import { getCredentialType, KEY_CREDENTIAL } from "../../get-credential-type.js";

// Validates KeyCredential extending from GS1CompanyPrefixLicenseCredential or another KeyCredential
// Implements GS1 spec rules K-7 (no qualifiers) and K-8 (with qualifiers like serial number)
export async function validateExtendedCompanyPrefixCredential(credentialType: string | gs1CredentialTypes, 
    credentialChain: credentialChainMetaData): Promise<gs1RulesResult> {

    // Handle both string and object credential types (for backwards compatibility)
    const credentialTypeName = typeof credentialType === 'string' ? credentialType : credentialType.name;
    
    const gs1CredentialCheck: gs1RulesResult = { credentialId: normalizeCredential(credentialChain.credential).id, credentialName: credentialTypeName, verified: true, errors: []};
    const credential = normalizeCredential(credentialChain.credential);
    const credentialSubject = credential.credentialSubject as gs1KeyCredentialType;
    const extendedCredential = credentialChain.extendedCredentialChain?.credential ? normalizeCredential(credentialChain.extendedCredentialChain?.credential) : undefined;

    if (!extendedCredential) {
        gs1CredentialCheck.verified = false;
        gs1CredentialCheck.errors.push(invalidExtendedCredentialMissing);
        return gs1CredentialCheck;
    }

    // Check if the credential is a KeyCredential (for proper routing)
    const isKeyCredential = credentialTypeName === KEY_CREDENTIAL;
    const extendedCredentialType = getCredentialType(extendedCredential.type);
    const isParentKeyCredential = extendedCredentialType.name === KEY_CREDENTIAL;


    // Parse the digital link from the key credential subject
    const keyValue = parseGS1DigitalLink(credentialSubject.id);

    // K-8: KeyCredential → KeyCredential (with qualifiers like serial number)
    if (isKeyCredential && isParentKeyCredential) {
        const extendedKeySubject = extendedCredential.credentialSubject as gs1KeyCredentialType;
        const parentKeyValue = parseGS1DigitalLink(extendedKeySubject.id);

        // K-8a: Issuer of K must match issuer of P
        if (!checkCredentialIssuers(credential, extendedCredential)) {
            gs1CredentialCheck.verified = false;
            gs1CredentialCheck.errors.push(invalidIssuer);
        }

        // K-8c: Primary key of P must equal PK (the base identifier without qualifiers)
        if (!parentKeyValue.parsedValue || !keyValue.parsedValue || 
            parentKeyValue.parsedValue !== keyValue.parsedValue) {
            gs1CredentialCheck.verified = false;
            gs1CredentialCheck.errors.push(invalidLicenseValueFormat);
        }
    } 
    // K-7: KeyCredential → GS1CompanyPrefixLicenseCredential (no qualifiers)
    else if (isKeyCredential) {
        const extendedCredentialSubject = extendedCredential.credentialSubject as gs1CompanyPrefixCredentialType;

        // K-7b: Issuer of K must match subject of P
        const issuerResult = await checkIssuerToSubjectId(credential, extendedCredentialSubject);
        
        // If issuer doesn't match subject, check if they're the same issuer (fallback)
        if (!issuerResult.verified) {
            if (!checkCredentialIssuers(credential, extendedCredential)) {
                gs1CredentialCheck.verified = false;
                gs1CredentialCheck.errors.push(invalidIssuer);
            }
        }

        // K-7c: PK must begin with licenseValue from P
        const companyPrefixLicenseValue = extendedCredentialSubject.licenseValue;
        if (!keyValue.parsedValue || !compareLicenseValue(keyValue.parsedValue, companyPrefixLicenseValue)) {
            gs1CredentialCheck.verified = false;
            gs1CredentialCheck.errors.push(invalidLicenseValueFormat);
        }
    }
    // GS1CompanyPrefixLicenseCredential → GS1PrefixLicenseCredential
    else {
        const extendedCredentialSubject = extendedCredential.credentialSubject as gs1CompanyPrefixCredentialType;
        const currentCredentialSubject = credentialSubject as unknown as gs1CompanyPrefixCredentialType;

        // Verify Credential Issuer between credential and extended credential
        const issuerResult = await checkIssuerToSubjectId(credential, extendedCredentialSubject);

        // Check Issuer when credential issuer does not match extended credential subject id
        if (!issuerResult.verified) {
            if (!checkCredentialIssuers(credential, extendedCredential)) {
                gs1CredentialCheck.verified = false;
                gs1CredentialCheck.errors.push(invalidIssuer);
            }
        }

        // Verify license value starts with parent license value
        const companyPrefixLicenseValue = currentCredentialSubject.licenseValue;
        const prefixLicenseValue = extendedCredentialSubject.licenseValue;
        
        if (!companyPrefixLicenseValue || !prefixLicenseValue || 
            !compareLicenseValue(companyPrefixLicenseValue, prefixLicenseValue)) {
            gs1CredentialCheck.verified = false;
            gs1CredentialCheck.errors.push(invalidLicenseValueFormat);
        }
    }

    return gs1CredentialCheck;
}

