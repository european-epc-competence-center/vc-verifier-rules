import { resolveExternalCredential } from '../lib/engine/resolve-external-credential';
import { buildCredentialChain, credentialChainMetaData, validateCredentialChain } from '../lib/engine/validate-extended-credential';
import { CredentialSubjectSchema } from '../lib/rules-schema/rules-schema-types';
import { externalCredential, gs1CredentialValidationRule, gs1RulesResult, VerifiableCredential, verifyExternalCredential, verifiableJwt } from '../lib/types';
import { mockCompanyPrefixCredential, mockEpcisCredentialStandalone, mockEpcisCredentialWithKey, mockGenericCredential, mockPrefixLicenseCredential, mockPresentationParty } from './mock-credential';
import { realJsonSchemaLoader } from './test-helpers.js';
import { validateExtendedCompanyPrefixCredential } from '../lib/rules-definition/chain/validate-extended-company-prefix';
import { validateExtendedKeyDataCredential } from '../lib/rules-definition/chain/validate-extended-data-key';
import { compareLicenseValue } from '../lib/rules-definition/chain/shared-extended';
import { normalizeCredential } from '../lib/utility/jwt-utils';

// Test function to resolve mock credentials
const mock_getExternalCredential: externalCredential = async (url: string) : Promise<VerifiableCredential> => {

    if (url === "https://id.gs1.org/vc/license/gs1_prefix/08") {
        return mockPrefixLicenseCredential;
    }

    throw new Error(`External Credential "${url}" can not be resolved.`);
}

// Test function to verify mock credentials
const mock_checkExternalCredential: verifyExternalCredential = async (credential: VerifiableCredential | verifiableJwt | string) : Promise<gs1RulesResult> => {
    // Normalize the credential to handle JWT strings and verifiableJwt types
    const normalizedCredential = normalizeCredential(credential);

    const verifyStatus = normalizedCredential.id === "mockCredentialId_Fail" ? false : true;
    const errors: gs1CredentialValidationRule[] = [];
    if (!verifyStatus) {
        errors.push({code: "MOCK173", rule: "Mock Rule"})
    }

    const gs1RulesResultMock = { credentialId: "MockCredentialId", credentialName: "MockCredentialName", verified: verifyStatus, errors: errors};
    return gs1RulesResultMock;
}

describe('Tests for Rules Engine Subject Field Validation', () => {

    it('should return externally resolved credential (Company Prefix)', async () => {
        // In line update presentation to only include the company prefix credential
        const mockPresentation  = {...mockPresentationParty, verifiableCredential: [mockCompanyPrefixCredential]};

        const urlToResolve = "https://id.gs1.org/vc/license/gs1_prefix/08";
        const result = await resolveExternalCredential(mock_getExternalCredential, mockPresentation, urlToResolve);

        expect(result.inPresentation).toBe(false);
        expect(result.credential).toBeDefined();
    })

    it('should return externally resolved credential (Organization)', async () => {
        const urlToResolve = "http://did-vc.gs1us.org/vc/license/08600057694";
        const result = await resolveExternalCredential(mock_getExternalCredential, mockPresentationParty, urlToResolve);

        expect(result.inPresentation).toBe(true);
        expect(result.credential).toBeDefined();
    })

    it('should throw error for externally credential that can not be resolved', async () => {
          const urlToResolve = "https://mock-credential";

          const result = await resolveExternalCredential(mock_getExternalCredential, mockPresentationParty, urlToResolve);
          expect(result.credential).toBeUndefined();
          expect(result.error?.length).toBeGreaterThan(0);
          // Check that error message contains the URL and explains it couldn't be resolved
          expect(result.error).toContain(urlToResolve);
          expect(result.error).toContain("can not be resolved");
    })
  
    it('should throw error for externally credential (undefined) that can not be resolved', async () => {
        const urlToResolve = undefined;
        
        const result = await resolveExternalCredential(mock_getExternalCredential, mockPresentationParty, urlToResolve);
        expect(result.credential).toBeUndefined();
        expect(result.error?.length).toBeGreaterThan(0);
        // Check for more descriptive error message
        expect(result.error).toContain("missing or undefined");
    })

    it('should build credential chain for Company Prefix', async () => {
        // In line update presentation to only include the company prefix credential
        const mockPresentation  = {...mockPresentationParty, verifiableCredential: [mockCompanyPrefixCredential]};
        const result = await buildCredentialChain(mock_getExternalCredential, mockPresentation, mockCompanyPrefixCredential);
        expect(result.schema).toBeDefined();
    })

    it('should build credential chain for Company Prefix and extended License Prefix Credential', async () => {
        // In line update presentation to only include the company prefix credential
        const mockPresentation  = {...mockPresentationParty, verifiableCredential: [mockCompanyPrefixCredential]};
        const result = await buildCredentialChain(mock_getExternalCredential, mockPresentation, mockCompanyPrefixCredential);

        expect(result.extendedCredentialChain).toBeDefined();
        expect(result.extendedCredentialChain?.inPresentation).toBe(false);
    })

    it('should build credential chain for Organization Party with extended credentials', async () => {
        const mockOrganizationCredential = mockPresentationParty.verifiableCredential[2];
        const result = await buildCredentialChain(mock_getExternalCredential, mockPresentationParty, mockOrganizationCredential);

        expect(result.extendedCredentialChain).toBeDefined();
        expect(result.extendedCredentialChain?.inPresentation).toBe(true);
    })

    it('should not build credential chain for Generic Non GS1 Credential', async () => {
        const mockCredentialNotGS1  = mockGenericCredential.verifiableCredential[0];
        const result = await buildCredentialChain(mock_getExternalCredential, mockGenericCredential, mockCredentialNotGS1);
        const resultSchema = result.schema;

        expect(resultSchema).toBeDefined();
        expect(resultSchema.title).toBe("genericCredentialSchema");
    })

    it('should validate standalone Prefix License Credential root of trust', async () => {
        const mockPresentation = { ...mockPresentationParty, verifiableCredential: [mockPrefixLicenseCredential] };
        const resultBuildChain = await buildCredentialChain(mock_getExternalCredential, mockPresentation, mockPrefixLicenseCredential);

        const result = await validateCredentialChain(mock_checkExternalCredential, resultBuildChain, true, realJsonSchemaLoader, true);
        expect(result.verified).toBe(true);
    })

    it('should reject standalone Prefix License Credential with wrong issuer', async () => {
        const invalidPrefixLicense = { ...mockPrefixLicenseCredential, issuer: "did:web:fake.gs1.org" };
        const mockPresentation = { ...mockPresentationParty, verifiableCredential: [invalidPrefixLicense] };
        const resultBuildChain = await buildCredentialChain(mock_getExternalCredential, mockPresentation, invalidPrefixLicense);

        const result = await validateCredentialChain(mock_checkExternalCredential, resultBuildChain, true, realJsonSchemaLoader, true);
        expect(result.verified).toBe(false);
        expect(result.errors.some(error => error.code === "GS1-140")).toBe(true);
    })

    it('should validate credential chain for Company Prefix and extended License Prefix Credential', async () => {
        // In line update presentation to only include the company prefix credential
        const mockPresentation  = {...mockPresentationParty, verifiableCredential: [mockCompanyPrefixCredential]};
        const resultBuildChain = await buildCredentialChain(mock_getExternalCredential, mockPresentation, mockCompanyPrefixCredential);

        const result = await validateCredentialChain(mock_checkExternalCredential, resultBuildChain, true, realJsonSchemaLoader, true);
        expect(result.verified).toBe(true);
    })
    
    it('should not validate credential chain for Company Prefix because credential can not be verified', async () => {
        // In line update presentation to only include the company prefix credential
        const mockCompanyPrefixCredentialFail = {...mockCompanyPrefixCredential, id: "mockCredentialId_Fail"};
        const mockPresentation  = {...mockPresentationParty, verifiableCredential: [mockCompanyPrefixCredentialFail]};
        const resultBuildChain = await buildCredentialChain(mock_getExternalCredential, mockPresentation, mockCompanyPrefixCredentialFail);

        // Mock Overrides for Testing Different Scenarios
        resultBuildChain.inPresentation = false;

        const result = await validateCredentialChain(mock_checkExternalCredential, resultBuildChain, true, realJsonSchemaLoader, true);
        expect(result.verified).toBe(false);
    })

    it('should not validate credential chain for Company Prefix because parent type is invalid', async () => {
        // In line update presentation to only include the company prefix credential
        const mockPresentation  = {...mockPresentationParty, verifiableCredential: [mockCompanyPrefixCredential]};
        const resultBuildChain = await buildCredentialChain(mock_getExternalCredential, mockPresentation, mockCompanyPrefixCredential);

        // Clone schema before mutating so shared gs1CredentialChainRules are not polluted
        const schemaSubject = structuredClone(resultBuildChain.credentialSubjectSchema) as CredentialSubjectSchema;
        if (schemaSubject && schemaSubject.extendsCredentialType) {
            schemaSubject.extendsCredentialType.type = ["mock"];
        }
        resultBuildChain.credentialSubjectSchema = schemaSubject;
        resultBuildChain.schema = { ...resultBuildChain.schema, extendsCredentialType: schemaSubject.extendsCredentialType };

        const result = await validateCredentialChain(mock_checkExternalCredential, resultBuildChain, true, realJsonSchemaLoader, true);
        expect(result.verified).toBe(false);
    })

    it('should not validate credential chain for Company Prefix because child type is invalid', async () => {
        // Clone credential so shared mockCompanyPrefixCredential.type is not mutated
        const mockCompanyPrefix = structuredClone(mockCompanyPrefixCredential);
        mockCompanyPrefix.type = ["mock"];
        const mockPresentation  = {...mockPresentationParty, verifiableCredential: [mockCompanyPrefix]};

        const resultBuildChain = await buildCredentialChain(mock_getExternalCredential, mockPresentation, mockCompanyPrefix);
        const result = await validateCredentialChain(mock_checkExternalCredential, resultBuildChain, true, realJsonSchemaLoader, true);
        expect(result.verified).toBe(false);
    })
    
    it('should return valid when checking organization (party) Credential chain', async () => {
        const mockKeyCredential = mockPresentationParty.verifiableCredential[1];
        const resultBuildChain = await buildCredentialChain(mock_getExternalCredential, mockPresentationParty, mockKeyCredential);

        const result = await validateExtendedCompanyPrefixCredential("KeyCredential", resultBuildChain);
        expect(result.verified).toBe(true);
    })

    it('should return invalid when checking organization (party) Credential chain and extended credential is undefined', async () => {
        const mockKeyCredential = mockPresentationParty.verifiableCredential[1];
        const resultBuildChain = await buildCredentialChain(mock_getExternalCredential, mockPresentationParty, mockKeyCredential);
        resultBuildChain.extendedCredentialChain = undefined;

        const result = await validateExtendedCompanyPrefixCredential("KeyCredential", resultBuildChain);
        expect(result.verified).toBe(false);
    })

    it('should return invalid when checking organization (party) Credential chain with different issuer', async () => {
        const mockKeyCredential = {...mockPresentationParty.verifiableCredential[1], issuer: { id: "did:web:www.test.com" }};
        const resultBuildChain = await buildCredentialChain(mock_getExternalCredential, mockPresentationParty, mockKeyCredential);
        resultBuildChain.extendedCredentialChain = undefined;

        const result = await validateExtendedCompanyPrefixCredential("KeyCredential", resultBuildChain);
        expect(result.verified).toBe(false);
    })

    it('should return invalid when checking organization (party) Credential chain with different subject id', async () => {
        // Override the subject id to be different locally to the test
        const jsonKeyCredential = JSON.stringify(mockPresentationParty.verifiableCredential[1]);
        const mockKeyCredential = JSON.parse(jsonKeyCredential);
        mockKeyCredential.credentialSubject.id = "https://id.gs1.org/417/7360005769407";

        const resultBuildChain = await buildCredentialChain(mock_getExternalCredential, mockPresentationParty, mockKeyCredential);

        const result = await validateExtendedCompanyPrefixCredential("KeyCredential", resultBuildChain);
        expect(result.verified).toBe(false);
    })

    it('should return valid when checking organization (party) Credential against data credential', async () => {
        const mockDataCredential = mockPresentationParty.verifiableCredential[2];
        const resultBuildChain: credentialChainMetaData = await buildCredentialChain(mock_getExternalCredential, mockPresentationParty, mockDataCredential);

        const result = await validateExtendedKeyDataCredential("KeyCredential", resultBuildChain);
        expect(result.verified).toBe(true);
    })

    it('should allow standalone EpcisCredential without keyAuthorization', async () => {
        const mockPresentation = { ...mockPresentationParty, verifiableCredential: [mockEpcisCredentialStandalone] };
        const resultBuildChain = await buildCredentialChain(mock_getExternalCredential, mockPresentation, mockEpcisCredentialStandalone);

        expect(resultBuildChain.error).toBeUndefined();
        expect(resultBuildChain.extendedCredentialChain).toBeUndefined();

        const result = await validateCredentialChain(mock_checkExternalCredential, resultBuildChain, true, realJsonSchemaLoader, true);
        expect(result.verified).toBe(true);
        expect(result.credentialName).toBe("EpcisCredential");
    })

    it('should still fail EpcisCredential when keyAuthorization is present but cannot be resolved', async () => {
        const epcisWithMissingKey = {
            ...mockEpcisCredentialStandalone,
            credentialSubject: {
                ...mockEpcisCredentialStandalone.credentialSubject,
                keyAuthorization: "https://example.com/missing-key-credential"
            }
        };
        const mockPresentation = { ...mockPresentationParty, verifiableCredential: [epcisWithMissingKey] };
        const resultBuildChain = await buildCredentialChain(mock_getExternalCredential, mockPresentation, epcisWithMissingKey);

        expect(resultBuildChain.error).toBeDefined();
        expect(resultBuildChain.error).toContain("can not be resolved");
    })

    it('should build and validate EpcisCredential chain when keyAuthorization is present', async () => {
        const mockPresentation = {
            ...mockPresentationParty,
            verifiableCredential: [...mockPresentationParty.verifiableCredential, mockEpcisCredentialWithKey]
        };
        const resultBuildChain = await buildCredentialChain(mock_getExternalCredential, mockPresentation, mockEpcisCredentialWithKey);

        expect(resultBuildChain.error).toBeUndefined();
        expect(resultBuildChain.extendedCredentialChain).toBeDefined();

        const result = await validateCredentialChain(mock_checkExternalCredential, resultBuildChain, true, realJsonSchemaLoader, true);
        expect(result.verified).toBe(true);
    })

    it('should return true when comparing company prefix in key credential license value', async () => {
        const keyCredentialValue = "0860005769407";
        const companyPrefixValue = "08600057694";

        const result = compareLicenseValue(keyCredentialValue, companyPrefixValue);
        expect(result).toBe(true);
    })

    it('should return true when comparing company prefix in key credential license value with one padded zeros', async () => {
        const keyCredentialValue = "00860005769407";
        const companyPrefixValue = "08600057694";

        const result = compareLicenseValue(keyCredentialValue, companyPrefixValue);
        expect(result).toBe(true);
    })

    it('should return true when comparing company prefix in key credential license value with several padded zeros', async () => {
        const keyCredentialValue = "00000860005769407";
        const companyPrefixValue = "08600057694";

        const result = compareLicenseValue(keyCredentialValue, companyPrefixValue);
        expect(result).toBe(true);
    })

    it('should return false when comparing company prefix in key credential license value with incorrect key credential', async () => {
        const keyCredentialValue = "007600057694";
        const companyPrefixValue = "08600057694";

        const result = compareLicenseValue(keyCredentialValue, companyPrefixValue);
        expect(result).toBe(false);
    })

})

describe('Tests for did:webvh twin issuers in the credential chain', () => {

    const scid = "QmfGEUAcMpzo25kF2Rhn8L5FAXysfGnkzjwdKoNPi615XQ";
    const originalFlag = process.env.GS1_ALLOW_DID_WEBVH_TWIN;

    afterEach(() => {
        if (originalFlag === undefined) {
            delete process.env.GS1_ALLOW_DID_WEBVH_TWIN;
        } else {
            process.env.GS1_ALLOW_DID_WEBVH_TWIN = originalFlag;
        }
    })

    // Company Prefix License signed by the did:webvh twin of the Prefix License subject (GL-3)
    const validateCompanyPrefixSignedByTwin = async () => {
        const companyPrefixCredential = {...mockCompanyPrefixCredential, issuer: `did:webvh:${scid}:cbpvsvip-vc.gs1us.org`};
        const mockPresentation = {...mockPresentationParty, verifiableCredential: [companyPrefixCredential]};
        const resultBuildChain = await buildCredentialChain(mock_getExternalCredential, mockPresentation, companyPrefixCredential);
        return validateCredentialChain(mock_checkExternalCredential, resultBuildChain, true, realJsonSchemaLoader, true);
    }

    // KeyCredential signed by keyIssuer under a Company Prefix License whose subject is companyPrefixSubject (K-7b)
    const validateKeyCredential = async (keyIssuer: string, companyPrefixSubject: string) => {
        const presentation = JSON.parse(JSON.stringify(mockPresentationParty));
        presentation.verifiableCredential[0].credentialSubject.id = companyPrefixSubject;
        presentation.verifiableCredential[1].issuer = { id: keyIssuer };

        const resultBuildChain = await buildCredentialChain(mock_getExternalCredential, presentation, presentation.verifiableCredential[1]);
        return validateExtendedCompanyPrefixCredential("KeyCredential", resultBuildChain);
    }

    it('should validate a Company Prefix License signed by the did:webvh twin when the flag is enabled', async () => {
        process.env.GS1_ALLOW_DID_WEBVH_TWIN = "true";
        const result = await validateCompanyPrefixSignedByTwin();
        expect(result.verified).toBe(true);
    })

    it('should reject a Company Prefix License signed by the did:webvh twin when the flag is disabled', async () => {
        delete process.env.GS1_ALLOW_DID_WEBVH_TWIN;
        const result = await validateCompanyPrefixSignedByTwin();
        expect(result.verified).toBe(false);
        expect(result.errors.some(error => error.code === "GS1EX-212")).toBe(true);
    })

    it('should validate a KeyCredential signed by the did:webvh twin of the license subject when the flag is enabled', async () => {
        process.env.GS1_ALLOW_DID_WEBVH_TWIN = "true";
        const result = await validateKeyCredential(`did:webvh:${scid}:acme.example`, "did:web:acme.example");
        expect(result.verified).toBe(true);
    })

    it('should reject a KeyCredential signed by the did:webvh twin of the license subject when the flag is disabled', async () => {
        delete process.env.GS1_ALLOW_DID_WEBVH_TWIN;
        const result = await validateKeyCredential(`did:webvh:${scid}:acme.example`, "did:web:acme.example");
        expect(result.verified).toBe(false);
        expect(result.errors.some(error => error.code === "GS1-150")).toBe(true);
    })

    it('should reject a KeyCredential signed by the did:web when the license subject is the did:webvh', async () => {
        process.env.GS1_ALLOW_DID_WEBVH_TWIN = "true";
        const result = await validateKeyCredential("did:web:acme.example", `did:webvh:${scid}:acme.example`);
        expect(result.verified).toBe(false);
        expect(result.errors.some(error => error.code === "GS1-150")).toBe(true);
    })
})

