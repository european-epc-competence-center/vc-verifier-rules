import { checkValidFromDate, checkValidUntilDate } from '../lib/rules-definition/subject/check-credential-dates';
import { getDecodedPresentation } from '../lib/utility/jwt-utils';
import { mockJoseCredentialPresentationProductJwt } from './mock-jose-credential';

const getMockCredentialFromPresentation = function(presentation: string, indexValue: number) { 
  const presentationToVerify = getDecodedPresentation(presentation);
  const credentials = presentationToVerify.verifiableCredential;
  if (Array.isArray(credentials)) {
      return credentials[indexValue];
  }
  return credentials; // Return single credential if not array
};

describe('Tests for Credential Date Validation (L-4: validFrom must not be in future)', () => {

  it('should return verified for validFrom in the past', async () => {
    const mockCredential = getMockCredentialFromPresentation(mockJoseCredentialPresentationProductJwt, 0);
    mockCredential.validFrom = "2020-01-01T00:00:00.000Z"; // Past date
 
    const result = await checkValidFromDate(mockCredential);
    expect(result.verified).toBe(true);
    expect(result.rule).toBeUndefined();
  })

  it('should return verified for validFrom being the current time', async () => {
    const mockCredential = getMockCredentialFromPresentation(mockJoseCredentialPresentationProductJwt, 0);
    mockCredential.validFrom = new Date().toISOString(); // Current time
 
    const result = await checkValidFromDate(mockCredential);
    expect(result.verified).toBe(true);
    expect(result.rule).toBeUndefined();
  })

  it('should return not verified for validFrom in the future', async () => {
    const mockCredential = getMockCredentialFromPresentation(mockJoseCredentialPresentationProductJwt, 0);
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year in future
    mockCredential.validFrom = futureDate.toISOString();
 
    const result = await checkValidFromDate(mockCredential);
    expect(result.verified).toBe(false);
    expect(result.rule).toBeDefined();
    expect(result.rule?.code).toBe("GS1-600");
  })

  it('should return not verified for validFrom 1 day in the future', async () => {
    const mockCredential = getMockCredentialFromPresentation(mockJoseCredentialPresentationProductJwt, 0);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1); // 1 day in future
    mockCredential.validFrom = futureDate.toISOString();
 
    const result = await checkValidFromDate(mockCredential);
    expect(result.verified).toBe(false);
    expect(result.rule).toBeDefined();
  })

  it('should return not verified for validFrom 1 second in the future', async () => {
    const mockCredential = getMockCredentialFromPresentation(mockJoseCredentialPresentationProductJwt, 0);
    const futureDate = new Date();
    futureDate.setSeconds(futureDate.getSeconds() + 2); // 2 seconds in future to avoid timing issues
    mockCredential.validFrom = futureDate.toISOString();
 
    const result = await checkValidFromDate(mockCredential);
    expect(result.verified).toBe(false);
    expect(result.rule).toBeDefined();
  })

  it('should return verified for validFrom undefined (defensive check - schema validation should catch this first)', async () => {
    const mockCredential = getMockCredentialFromPresentation(mockJoseCredentialPresentationProductJwt, 0);
    // @ts-expect-error - Testing defensive behavior when validFrom is missing (invalid per schema)
    mockCredential.validFrom = undefined;
 
    const result = await checkValidFromDate(mockCredential);
    expect(result.verified).toBe(true);
    expect(result.rule).toBeUndefined();
  })

  it('should return not verified for invalid validFrom format', async () => {
    const mockCredential = getMockCredentialFromPresentation(mockJoseCredentialPresentationProductJwt, 0);
    mockCredential.validFrom = "invalid-date";
 
    const result = await checkValidFromDate(mockCredential);
    expect(result.verified).toBe(false);
    expect(result.rule).toBeDefined();
  })

  // Tests for validUntil (complementary validation)
  it('should return verified for validUntil in the future', async () => {
    const mockCredential = getMockCredentialFromPresentation(mockJoseCredentialPresentationProductJwt, 0);
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    mockCredential.validUntil = futureDate.toISOString();
 
    const result = await checkValidUntilDate(mockCredential);
    expect(result.verified).toBe(true);
    expect(result.rule).toBeUndefined();
  })

  it('should return not verified for validUntil in the past', async () => {
    const mockCredential = getMockCredentialFromPresentation(mockJoseCredentialPresentationProductJwt, 0);
    mockCredential.validUntil = "2020-01-01T00:00:00.000Z";
 
    const result = await checkValidUntilDate(mockCredential);
    expect(result.verified).toBe(false);
    expect(result.rule).toBeDefined();
    expect(result.rule?.code).toBe("GS1-601");
  })

  it('should return verified for validUntil undefined (optional field)', async () => {
    const mockCredential = getMockCredentialFromPresentation(mockJoseCredentialPresentationProductJwt, 0);
    mockCredential.validUntil = undefined;
 
    const result = await checkValidUntilDate(mockCredential);
    expect(result.verified).toBe(true);
    expect(result.rule).toBeUndefined();
  })

})
