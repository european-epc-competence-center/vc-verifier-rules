import { checkCredentialChainIssuers, checkCredentialIssuers, checkIssuerToSubjectId, getCredentialIssuer, getDidWebTwin, isDidWebvhTwinAllowed, issuerActsFor } from "../lib/rules-definition/chain/shared-extended";
import { CredentialSubject } from "../lib/types";
import { mockCompanyPrefixCredential, mockPresentationParty } from "./mock-credential";

describe('Tests for Rules Engine Subject Field Validation', () => {

    it('should return issuer from (Company Prefix) credential', async () => {
        const result = await getCredentialIssuer(mockCompanyPrefixCredential);
        expect(result).toBe(mockCompanyPrefixCredential.issuer);
    })

    it('should return issuer id from (Company Prefix) credential', async () => {

        // In line update credential for mocking out issuer id
        const testIssuerId = "did:web:www.test.url";
        const mockCredential  = {...mockCompanyPrefixCredential, issuer: { id: testIssuerId }};
        const result = await getCredentialIssuer(mockCredential);

        expect(result).toBe(testIssuerId);
    })

    it('should return valid when checking credential issuer id vs subject', async () => {

        // In line update credential for mocking out issuer id
        const testIssuerId = "did:web:www.test.url";
        const mockCredential  = {...mockCompanyPrefixCredential, issuer: { id: testIssuerId }};
        const mockSubject: CredentialSubject  = {...mockCompanyPrefixCredential.credentialSubject, id: testIssuerId };
        const result = await checkIssuerToSubjectId(mockCredential, mockSubject);

        expect(result.verified).toBe(true);
    })

    it('should return invalid when checking credential issuer id vs subject', async () => {

        // In line update credential for mocking out issuer id
        const testIssuerId = "did:web:www.test.url";
        const testSubjectIssuerId = "did:web:www.test.com";
        const mockCredential  = {...mockCompanyPrefixCredential, issuer: { id: testIssuerId }};
        const mockSubject: CredentialSubject  = {...mockCompanyPrefixCredential.credentialSubject, id: testSubjectIssuerId };
        const result = await checkIssuerToSubjectId(mockCredential, mockSubject);

        expect(result.verified).toBe(false);
    })

    it('should return invalid when checking credential issuer id vs undefined subject', async () => {

        // In line update credential for mocking out issuer id
        const testIssuerId = "did:web:www.test.url";
        const mockCredential  = {...mockCompanyPrefixCredential, issuer: { id: testIssuerId }};
        const result = await checkIssuerToSubjectId(mockCredential, undefined);

        expect(result.verified).toBe(false);
    })

    it('should return valid when checking credential issuer id between different credentials', async () => {

        // In line update credential for mocking out issuer id
        const testIssuerId = "did:web:www.test.url";
        const mockCredential  = {...mockCompanyPrefixCredential, issuer: { id: testIssuerId }};
        const credentialToCompare  = {...mockCredential };
        const result = await checkCredentialIssuers(mockCredential, credentialToCompare);

        expect(result).toBe(true);
    })

    it('should return invalid when checking credential issuer id between different credentials', async () => {

        // In line update credential for mocking out issuer id
        const testIssuerId = "did:web:www.test.url";
        const mockCredential  = {...mockCompanyPrefixCredential, issuer: { id: testIssuerId }};
        const testIssuerId_compare = "did:web:www.test.com";
        const credentialToCompare  = {...mockCompanyPrefixCredential, issuer: { id: testIssuerId_compare }};
        const result = await checkCredentialIssuers(mockCredential, credentialToCompare);

        expect(result).toBe(false);
    })
    
    it('should return valid when checking credential issuer id between different credentials', async () => {

        const credentialChainIssuers = {
            dataCredential: mockPresentationParty.verifiableCredential[2],
            keyCredential: mockPresentationParty.verifiableCredential[1],
            companyPrefix: mockPresentationParty.verifiableCredential[0]
        }

        const result = await checkCredentialChainIssuers(credentialChainIssuers);
        expect(result).toBe(true);
    })

    it('should return invalid when checking credential issuer id between different credentials and one of the credentials is undefined', async () => {

        const credentialChainIssuers = {
            dataCredential: mockPresentationParty.verifiableCredential[2],
            keyCredential: undefined,
            companyPrefix: mockPresentationParty.verifiableCredential[0]
        }

        const result = await checkCredentialChainIssuers(credentialChainIssuers);
        expect(result).toBe(false);
    })

    it('should return invalid when checking credential issuer id between different credentials and one of the credentials is issued by a different DID', async () => {

        // Mock Test issuer for Key Credential 
        const mockKeyCredential = {...mockPresentationParty.verifiableCredential[1], issuer: { id: "did:web:www.test.com" }};

        const credentialChainIssuers = {
            dataCredential: mockPresentationParty.verifiableCredential[2],
            keyCredential: mockKeyCredential,
            companyPrefix: mockPresentationParty.verifiableCredential[0]
        }

        const result = await checkCredentialChainIssuers(credentialChainIssuers);
        expect(result).toBe(false);
    })

})

describe('Tests for did:webvh twin of a did:web', () => {

    const scid = "QmfGEUAcMpzo25kF2Rhn8L5FAXysfGnkzjwdKoNPi615XQ";
    const didWeb = "did:web:example.com";
    const didWebvh = `did:webvh:${scid}:example.com`;
    const originalFlag = process.env.GS1_ALLOW_DID_WEBVH_TWIN;

    afterEach(() => {
        if (originalFlag === undefined) {
            delete process.env.GS1_ALLOW_DID_WEBVH_TWIN;
        } else {
            process.env.GS1_ALLOW_DID_WEBVH_TWIN = originalFlag;
        }
    })

    describe('getDidWebTwin', () => {

        it('should return the did:web twin for a host only did:webvh', () => {
            expect(getDidWebTwin(didWebvh)).toBe(didWeb);
        })

        it('should keep path segments', () => {
            expect(getDidWebTwin(`did:webvh:${scid}:example.com:api:registry:acme`)).toBe("did:web:example.com:api:registry:acme");
        })

        it('should keep an encoded port', () => {
            expect(getDidWebTwin(`did:webvh:${scid}:example.com%3A8443`)).toBe("did:web:example.com%3A8443");
        })

        it('should return undefined for DIDs that are not did:webvh', () => {
            expect(getDidWebTwin(didWeb)).toBeUndefined();
            expect(getDidWebTwin("did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK")).toBeUndefined();
            expect(getDidWebTwin(`did:webvhx:${scid}:example.com`)).toBeUndefined();
            expect(getDidWebTwin("")).toBeUndefined();
        })

        it('should return undefined for malformed did:webvh', () => {
            expect(getDidWebTwin("did:webvh:example.com")).toBeUndefined();
            expect(getDidWebTwin("did:webvh::example.com")).toBeUndefined();
            expect(getDidWebTwin(`did:webvh:${scid}:`)).toBeUndefined();
            expect(getDidWebTwin(`did:webvh:${scid}:example.com:`)).toBeUndefined();
            expect(getDidWebTwin(`did:webvh:${scid}:example.com::acme`)).toBeUndefined();
        })
    })

    describe('isDidWebvhTwinAllowed', () => {

        it('should be disabled when the flag is unset', () => {
            delete process.env.GS1_ALLOW_DID_WEBVH_TWIN;
            expect(isDidWebvhTwinAllowed()).toBe(false);
        })

        it.each(["false", "1", "yes", ""])('should be disabled when the flag is "%s"', (value) => {
            process.env.GS1_ALLOW_DID_WEBVH_TWIN = value;
            expect(isDidWebvhTwinAllowed()).toBe(false);
        })

        it.each(["true", "TRUE", "True"])('should be enabled when the flag is "%s"', (value) => {
            process.env.GS1_ALLOW_DID_WEBVH_TWIN = value;
            expect(isDidWebvhTwinAllowed()).toBe(true);
        })
    })

    describe('issuerActsFor with the flag enabled', () => {

        beforeEach(() => {
            process.env.GS1_ALLOW_DID_WEBVH_TWIN = "true";
        })

        it('should accept an exact match', () => {
            expect(issuerActsFor(didWeb, didWeb)).toBe(true);
            expect(issuerActsFor(didWebvh, didWebvh)).toBe(true);
        })

        it('should accept a did:webvh issuer for its did:web twin', () => {
            expect(issuerActsFor(didWebvh, didWeb)).toBe(true);
        })

        it('should reject a did:web issuer for a did:webvh', () => {
            expect(issuerActsFor(didWeb, didWebvh)).toBe(false);
        })

        it('should reject a did:webvh issuer for a did:webvh with a different SCID', () => {
            expect(issuerActsFor(`did:webvh:QmOtherScid:example.com`, didWebvh)).toBe(false);
        })

        it('should reject a did:webvh issuer for a did:web with a different host or path', () => {
            expect(issuerActsFor(didWebvh, "did:web:example.org")).toBe(false);
            expect(issuerActsFor(didWebvh, "did:web:example.com:acme")).toBe(false);
            expect(issuerActsFor(`did:webvh:${scid}:example.com:acme`, didWeb)).toBe(false);
        })

        it('should reject a missing issuer or expected DID', () => {
            expect(issuerActsFor("", didWeb)).toBe(false);
            expect(issuerActsFor(didWebvh, undefined)).toBe(false);
            expect(issuerActsFor("", "")).toBe(false);
        })

        it('should reject an expected DID that is a URL object', () => {
            expect(issuerActsFor(didWeb, new URL(didWeb))).toBe(false);
        })
    })

    describe('issuerActsFor with the flag disabled', () => {

        it.each([undefined, "false", "1"])('should reject a did:webvh issuer for its did:web twin when the flag is %s', (value) => {
            if (value === undefined) {
                delete process.env.GS1_ALLOW_DID_WEBVH_TWIN;
            } else {
                process.env.GS1_ALLOW_DID_WEBVH_TWIN = value;
            }
            expect(issuerActsFor(didWebvh, didWeb)).toBe(false);
        })

        it('should still accept an exact match', () => {
            delete process.env.GS1_ALLOW_DID_WEBVH_TWIN;
            expect(issuerActsFor(didWebvh, didWebvh)).toBe(true);
        })
    })

    describe('checkIssuerToSubjectId', () => {

        const credentialIssuedBy = (issuer: string) => ({...mockCompanyPrefixCredential, issuer: { id: issuer }});
        const subjectWithId = (id: string): CredentialSubject => ({...mockCompanyPrefixCredential.credentialSubject, id });

        it('should accept a did:webvh issuer for a did:web subject when the flag is enabled', async () => {
            process.env.GS1_ALLOW_DID_WEBVH_TWIN = "true";
            const result = await checkIssuerToSubjectId(credentialIssuedBy(didWebvh), subjectWithId(didWeb));
            expect(result.verified).toBe(true);
        })

        it('should reject a did:webvh issuer for a did:web subject when the flag is disabled', async () => {
            delete process.env.GS1_ALLOW_DID_WEBVH_TWIN;
            const result = await checkIssuerToSubjectId(credentialIssuedBy(didWebvh), subjectWithId(didWeb));
            expect(result.verified).toBe(false);
            expect(result.rule?.code).toBe("GS1EX-212");
        })

        it('should reject a did:web issuer for a did:webvh subject when the flag is enabled', async () => {
            process.env.GS1_ALLOW_DID_WEBVH_TWIN = "true";
            const result = await checkIssuerToSubjectId(credentialIssuedBy(didWeb), subjectWithId(didWebvh));
            expect(result.verified).toBe(false);
        })
    })

    describe('checkCredentialChainIssuers', () => {

        const [companyPrefixCredential, keyCredential, dataCredential] = mockPresentationParty.verifiableCredential;
        const memberOrganizationTwin = `did:webvh:${scid}:cbpvsvip-vc.gs1us.org`;

        const chainIssuers = (dataIssuer: string, keyIssuer: string, companyPrefixSubject: string) => ({
            dataCredential: {...dataCredential, issuer: { id: dataIssuer }},
            keyCredential: {...keyCredential, issuer: { id: keyIssuer }},
            companyPrefix: {...companyPrefixCredential, credentialSubject: {...companyPrefixCredential.credentialSubject, id: companyPrefixSubject}}
        });

        describe('with the flag enabled', () => {

            beforeEach(() => {
                process.env.GS1_ALLOW_DID_WEBVH_TWIN = "true";
            })

            it('should accept data and key credentials signed by the did:webvh twin of the license subject', () => {
                expect(checkCredentialChainIssuers(chainIssuers(didWebvh, didWebvh, didWeb))).toBe(true);
            })

            it('should accept a mix of the did:web and its did:webvh twin', () => {
                expect(checkCredentialChainIssuers(chainIssuers(didWebvh, didWeb, didWeb))).toBe(true);
                expect(checkCredentialChainIssuers(chainIssuers(didWeb, didWebvh, didWeb))).toBe(true);
            })

            it('should accept data and key credentials signed by the did:webvh twin of the parent issuer', () => {
                expect(checkCredentialChainIssuers(chainIssuers(memberOrganizationTwin, memberOrganizationTwin, didWeb))).toBe(true);
            })

            it('should reject a did:web signer when the license subject is the did:webvh', () => {
                expect(checkCredentialChainIssuers(chainIssuers(didWeb, didWeb, didWebvh))).toBe(false);
                expect(checkCredentialChainIssuers(chainIssuers(didWebvh, didWeb, didWebvh))).toBe(false);
            })

            it('should reject a did:webvh signer for a different host', () => {
                expect(checkCredentialChainIssuers(chainIssuers(`did:webvh:${scid}:example.org`, didWeb, didWeb))).toBe(false);
            })
        })

        describe('with the flag disabled', () => {

            beforeEach(() => {
                delete process.env.GS1_ALLOW_DID_WEBVH_TWIN;
            })

            it('should reject data and key credentials signed by the did:webvh twin of the license subject', () => {
                expect(checkCredentialChainIssuers(chainIssuers(didWebvh, didWebvh, didWeb))).toBe(false);
            })

            it('should reject a mix of the did:web and its did:webvh twin', () => {
                expect(checkCredentialChainIssuers(chainIssuers(didWebvh, didWeb, didWeb))).toBe(false);
            })

            it('should still accept data and key credentials signed by the license subject', () => {
                expect(checkCredentialChainIssuers(chainIssuers(didWeb, didWeb, didWeb))).toBe(true);
            })
        })
    })
})
