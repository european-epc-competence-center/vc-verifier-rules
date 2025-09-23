import { getCredentialRuleSchema } from '../lib/get-credential-type';
import { checkGS1CredentialPresentationValidation } from '../lib/gs1-verification-service';
import { checkSchema } from '../lib/schema/validate-schema';
import { normalizePresentation } from '../lib/utility/jwt-utils';
import { mock_checkExternalCredential, mock_getExternalCredential, mock_jsonSchemaLoader } from './mock-data';
import { mockJoseCredentialPresentationProductJwt } from './mock-jose-credential';

const getMockCredentialFromPresentation = function(presentation: string, indexValue: number) { 
    const presentationToVerify = normalizePresentation(presentation);
    const credentials = presentationToVerify.verifiableCredential;
    if (Array.isArray(credentials)) {
        return credentials[indexValue];
    }
    return credentials; // Return single credential if not array
  };
  

describe('Getting Started Tests for Validing JOSE (JWT) Verifiable Credentials', () => {

    it('should return verified for 4 character license value', async () => {
      const mockCompanyPrefixCredential = getMockCredentialFromPresentation(mockJoseCredentialPresentationProductJwt, 0);
      mockCompanyPrefixCredential.credentialSubject.licenseValue = "0562";
      mockCompanyPrefixCredential.credentialSubject.alternativeLicenseValue = "562";
   
      const credentialSchema = getCredentialRuleSchema(mock_jsonSchemaLoader, mockCompanyPrefixCredential, false);
      const result = await checkSchema(credentialSchema, mockCompanyPrefixCredential);
      expect(result.verified).toBe(true);
      expect(result.errors.length).toBe(0);
    })

    it('should validate presentation as a whole', async () => {
      const result = await checkGS1CredentialPresentationValidation({
        fullJsonSchemaValidationOn: true,  
        gs1DocumentResolver: {
            externalCredentialLoader: mock_getExternalCredential,
            externalCredentialVerification: mock_checkExternalCredential,
            externalJsonSchemaLoader: mock_jsonSchemaLoader
        }
    }, mockJoseCredentialPresentationProductJwt);

    expect(result.verified).toBe(true);
    expect(result.result[0].errors.length).toBe(0);
    })

  })