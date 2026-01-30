import { checkGS1CredentialWithoutPresentation, checkGS1CredentialPresentationValidation } from '../lib/gs1-verification-service';
import { externalCredential, gs1RulesResult, gs1ValidatorRequest, VerifiableCredential, verifiableJwt, verifyExternalCredential } from '../lib/types';
import { realJsonSchemaLoader } from './test-helpers.js';
import { normalizeCredential } from '../lib/utility/jwt-utils';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Set the GS1 Global DID for test environment
process.env.GS1_GLOBAL_DID = "did:web:company-wallet-dev.prod-k8s.eecc.de:api:registry:did:gs1_global";

// Load the example credentials from files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const exampleChainPath = path.join(__dirname, 'example_chain');

const prefixLicenseCredential: VerifiableCredential = JSON.parse(
  fs.readFileSync(path.join(exampleChainPath, 'prefix_license_credential.json'), 'utf-8')
);

const gcpLicenseCredential: VerifiableCredential = JSON.parse(
  fs.readFileSync(path.join(exampleChainPath, 'gcp_license_credential.json'), 'utf-8')
);

const gtinKeyCredential: VerifiableCredential = JSON.parse(
  fs.readFileSync(path.join(exampleChainPath, 'gtin_key_credential.json'), 'utf-8')
);

const sgtinKeyCredential: VerifiableCredential = JSON.parse(
  fs.readFileSync(path.join(exampleChainPath, 'sgtin_key_credential.json'), 'utf-8')
);

// Mock external credential loader for the example chain
const mock_getExampleChainCredential: externalCredential = async (url: string): Promise<VerifiableCredential> => {
  console.log(`Resolving external credential: ${url}`);
  
  // Map URLs to the appropriate credentials
  if (url === "https://company-wallet-dev.prod-k8s.eecc.de/api/registry/vc/license/gs1_prefix/427") {
    return prefixLicenseCredential;
  }
  
  if (url === "https://company-wallet-dev.prod-k8s.eecc.de/api/registry/vc/license/gs1_prefix/42700051126") {
    return gcpLicenseCredential;
  }
  
  if (url === "https://wallet.tortugadeoro.com/api/registry/vc/license/gs1_key/01/04270005112602") {
    return gtinKeyCredential;
  }

  throw new Error(`External Credential "${url}" can not be resolved.`);
};

// Mock external credential verification for the example chain
const mock_checkExampleChainCredential: verifyExternalCredential = async (
  credential: VerifiableCredential | verifiableJwt | string
): Promise<gs1RulesResult> => {
  const normalizedCredential = normalizeCredential(credential);
  
  console.log(`Verifying credential: ${normalizedCredential.id}`);
  
  // For testing purposes, assume all credentials are verified
  // In a real scenario, this would verify the cryptographic proof
  const gs1RulesResultMock = {
    credentialId: normalizedCredential.id || "unknown",
    credentialName: Array.isArray(normalizedCredential.type) ? normalizedCredential.type[1] || normalizedCredential.type[0] : "unknown",
    verified: true,
    errors: []
  };
  
  return gs1RulesResultMock;
};

describe('Example Chain Validation Tests', () => {
  const validatorRequest: gs1ValidatorRequest = {
    fullJsonSchemaValidationOn: true,
    gs1DocumentResolver: {
      externalCredentialLoader: mock_getExampleChainCredential,
      externalCredentialVerification: mock_checkExampleChainCredential,
      externalJsonSchemaLoader: realJsonSchemaLoader
    }
  };

  it('should validate the Prefix License Credential', async () => {
    const result = await checkGS1CredentialWithoutPresentation(validatorRequest, prefixLicenseCredential);
    
    console.log('Prefix License Result:', JSON.stringify(result, null, 2));
    
    expect(result.verified).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should validate the GCP License Credential extending from Prefix', async () => {
    const result = await checkGS1CredentialWithoutPresentation(validatorRequest, gcpLicenseCredential);
    
    console.log('GCP License Result:', JSON.stringify(result, null, 2));
    
    expect(result.verified).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should validate the GTIN Key Credential extending from GCP', async () => {
    const result = await checkGS1CredentialWithoutPresentation(validatorRequest, gtinKeyCredential);
    
    console.log('GTIN Key Result:', JSON.stringify(result, null, 2));
    
    expect(result.verified).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should validate the SGTIN Key Credential extending from GTIN', async () => {
    const result = await checkGS1CredentialWithoutPresentation(validatorRequest, sgtinKeyCredential);
    
    console.log('SGTIN Key Result:', JSON.stringify(result, null, 2));
    
    if (!result.verified) {
      console.log('Validation errors:', JSON.stringify(result.errors, null, 2));
    }
    
    expect(result.verified).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should validate the complete chain in a presentation', async () => {
    const presentation = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiablePresentation"],
      holder: "did:web:id.tortugadeoro.com",
      verifiableCredential: [
        sgtinKeyCredential,
        gtinKeyCredential,
        gcpLicenseCredential,
        prefixLicenseCredential
      ]
    };

    const result = await checkGS1CredentialPresentationValidation(validatorRequest, presentation);
    
    console.log('Complete Chain Result:', JSON.stringify(result, null, 2));
    
    if (!result.verified) {
      console.log('Failed credentials:');
      result.result.forEach((credResult, index) => {
        if (!credResult.verified) {
          console.log(`  ${index}: ${credResult.credentialName} - ${JSON.stringify(credResult.errors, null, 2)}`);
        }
      });
    }
    
    expect(result.verified).toBe(true);
    expect(result.result.length).toBeGreaterThan(0);
    result.result.forEach(credResult => {
      expect(credResult.verified).toBe(true);
    });
  });
});
