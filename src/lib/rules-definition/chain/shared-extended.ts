import { invalidIssueSubject } from "../../engine/gs1-credential-errors.js";
import { gs1CredentialValidationRuleResult } from "../../gs1-rules-types.js";
import { CredentialSubject, VerifiableCredential, verifiableJwt } from "../../types.js";
import { normalizeCredential } from "../../utility/jwt-utils.js";

export type credentialChainIssuers = {
    dataCredential?: VerifiableCredential | verifiableJwt | string;
    keyCredential?: VerifiableCredential | verifiableJwt | string;
    companyPrefix?: VerifiableCredential | verifiableJwt | string;
}

// Return Issue ID (DID) for a verifiable credential.
// Will Return the Issuer if it is a string or the Issuer ID if it is an object
export function getCredentialIssuer(credential: VerifiableCredential) : string {

    // When credential is not defined return empty string for issuer
    if (!credential) {
        return "";
    }

    return typeof credential.issuer === "string" ? credential.issuer : credential.issuer.id;
 }

// Enabled by default; opt-out via GS1_ALLOW_DID_WEBVH_TWIN=false.
export function isDidWebvhTwinAllowed(): boolean {
    if (typeof process === "undefined" || !process.env) {
        return true;
    }

    return process.env.GS1_ALLOW_DID_WEBVH_TWIN?.toLowerCase() !== "false";
}

// did:webvh:<SCID>:<host>[:<path>] -> did:web:<host>[:<path>]
// Returns undefined for anything that is not a well-formed did:webvh.
export function getDidWebTwin(did: string): string | undefined {
    const [scheme, method, scid, ...hostAndPath] = did.split(":");

    if (scheme !== "did" ||
        method !== "webvh" ||
        !scid ||
        hostAndPath.length === 0 ||
        hostAndPath.includes("")) {
        return undefined;
    }

    return `did:web:${hostAndPath.join(":")}`;
}

// Check if the issuer may act for the expected DID: either an exact match or, when enabled,
// a did:webvh issuer whose parallel did:web is the expected DID.
// One-way only: a did:web never acts for a did:webvh, which would drop the SCID binding.
export function issuerActsFor(issuer: string, expectedDid: string | URL | undefined): boolean {
    // Reject missing input up front: getDidWebTwin() returns undefined for invalid DIDs,
    // so a missing expectedDid would otherwise match an invalid issuer (undefined === undefined).
    // A URL object (allowed by the CredentialSubject type) never matches, as with a plain !== compare.
    if (!issuer || typeof expectedDid !== "string" || !expectedDid) {
        return false;
    }

    return (
        issuer === expectedDid ||
        (isDidWebvhTwinAllowed() && getDidWebTwin(issuer) === expectedDid)
    );
}

// Extended Credential Validation Rules
// Rules:
// - Validate Issuer of credential matches (or acts for, see issuerActsFor) the Subject ID of Extended Credential
export async function checkIssuerToSubjectId(credential: VerifiableCredential, extendedCredentialSubject: CredentialSubject | undefined): Promise<gs1CredentialValidationRuleResult> {

    // Compare Issuer and Subject ID
    const credentialIssuer = getCredentialIssuer(credential);
    if (!issuerActsFor(credentialIssuer, extendedCredentialSubject?.id)) {
        return {verified: false, rule: invalidIssueSubject};
    }  

    return {verified: true};
}


export function checkIssuerToSubjectId_schema(credential: VerifiableCredential, extendedCredentialSubject: CredentialSubject | undefined): gs1CredentialValidationRuleResult {

    // Compare Issuer and Subject ID
    const credentialIssuer = getCredentialIssuer(credential);
    if (credentialIssuer !== extendedCredentialSubject?.id) {
        return {verified: false, rule: invalidIssueSubject};
    }  

    return {verified: true};
}

// Check the Issuers of the credentials in the chain to ensure they are valid
// Compare Issuers of Organization Data Credential and it's chain.
// Note: companyPrefix is the Key Credential's parent, which is a parent Key Credential for serialized keys.
export function checkCredentialChainIssuers(credentialToCheck: credentialChainIssuers) : boolean {

    if (!credentialToCheck) {
        throw new Error("Credential Chain Issuers are not defined.");
    }

    if (!credentialToCheck.dataCredential || !credentialToCheck.keyCredential || !credentialToCheck.companyPrefix) {
        return false;
    }

    const organizationCredentialIssuer = getCredentialIssuer(normalizeCredential(credentialToCheck.dataCredential));
    const keyCredentialIssuer = getCredentialIssuer(normalizeCredential(credentialToCheck.keyCredential));
    const companyPrefixCredentialIssuer = getCredentialIssuer(normalizeCredential(credentialToCheck.companyPrefix));
    const companyPrefixSubjectID = normalizeCredential(credentialToCheck.companyPrefix)?.credentialSubject.id;

    if (!organizationCredentialIssuer || !keyCredentialIssuer || !companyPrefixCredentialIssuer || !companyPrefixSubjectID) {
        return false;
    }

    // Data and Key Credential must both act for the same anchor (the parent's issuer or subject).
    // Same anchor means same party, so no separate data === key check is needed.
    return [companyPrefixCredentialIssuer, companyPrefixSubjectID].some(anchor =>
        issuerActsFor(organizationCredentialIssuer, anchor) &&
        issuerActsFor(keyCredentialIssuer, anchor)
    );
}

// Check that the issuer of credential matches (or acts for, see issuerActsFor) the issuer of credentialToCompare
export function checkCredentialIssuers(credential: VerifiableCredential, credentialToCompare: VerifiableCredential): boolean {
    return issuerActsFor(getCredentialIssuer(credential), getCredentialIssuer(credentialToCompare));
}


// Compare license value between credentials by padding zeros to the start and comparing the values
export function compareLicenseValue(licenseValue: string, prefixValue: string) : boolean {
    const  prefixPosition = licenseValue.indexOf(prefixValue);
    return licenseValue?.startsWith(prefixValue, prefixPosition);
}