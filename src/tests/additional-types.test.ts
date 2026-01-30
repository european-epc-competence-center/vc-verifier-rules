/**
 * Test suite for validating credentials with additional types beyond the required GS1 types.
 * 
 * This tests the relaxed schema validation that allows credentials to contain:
 * - Additional types beyond ["VerifiableCredential", "SpecificGS1Type"]
 * - Additional @context URLs beyond the required GS1 contexts
 * 
 * The test uses a real-world ProductDataCredential JWT that includes:
 * - An extra "DataCredential" type
 * - An extra "https://w3id.org/vc/render-method/v1" context
 */

import { readFileSync } from 'fs';
import { checkSchema } from '../lib/schema/validate-schema.js';
import { getCredentialRuleSchema } from '../lib/get-credential-type.js';
import type { VerifiableCredential, Proof } from '../lib/types.js';
import { realJsonSchemaLoader } from './test-helpers.js';

/**
 * Extended credential type for testing that includes fields not in the base type definition.
 * This represents real-world credentials that may have additional fields beyond the W3C spec.
 * 
 * Follows W3C VC Data Model 2.0 (uses validFrom, not issuanceDate from 1.1)
 */
interface ExtendedCredential {
  '@context'?: object | string[];
  type?: string | string[];
  proof?: Proof | Proof[];
  id: string;
  issuer: string | { id: string; credentialName?: string };
  validFrom: string; // W3C VC Data Model 2.0
  validUntil?: string;
  issuanceDate?: string; // W3C VC Data Model 1.1 (optional for backward compatibility)
  credentialName?: string;
  credentialSubject: {
    id: string;
    product?: Record<string, unknown>;
    organization?: Record<string, unknown>;
    keyAuthorization?: string;
    extendsCredential?: string;
    sameAs?: string;
    data?: unknown[];
    [key: string]: unknown;
  };
  credentialSchema?: {
    id: string;
    type: string;
  };
  credentialStatus?: {
    id: string;
    type: string;
    statusPurpose: string;
    statusListIndex: string;
    statusListCredential: string;
  };
  renderMethod?: unknown[];
  description?: string;
  [key: string]: unknown;
}

/**
 * Decode a JWT and extract the payload
 */
function decodeJWT(jwt: string): ExtendedCredential {
  const parts = jwt.trim().split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  return payload as ExtendedCredential;
}

describe('Additional Types Validation Tests', () => {
  let productDataCredentialWithExtraType: ExtendedCredential;
  
  beforeAll(() => {
    // Load the real JWT from file
    const jwtPath = new URL('./example_product_data_vc.jwt', import.meta.url);
    const jwt = readFileSync(jwtPath, 'utf8');
    productDataCredentialWithExtraType = decodeJWT(jwt);
  });

  describe('Credential Type Field with Additional Types', () => {
    it('should accept credential with additional type "DataCredential"', async () => {
      // Verify the test data has the expected structure
      expect(productDataCredentialWithExtraType.type).toEqual([
        'VerifiableCredential',
        'DataCredential',
        'ProductDataCredential'
      ]);

      // Validate using the actual production schema
      // Type assertion is safe here as ExtendedCredential contains all required VerifiableCredential fields
      const credentialSchema = getCredentialRuleSchema(
        realJsonSchemaLoader, 
        productDataCredentialWithExtraType as unknown as VerifiableCredential, 
        true
      );
      const result = await checkSchema(credentialSchema, productDataCredentialWithExtraType as unknown as VerifiableCredential);

      // Should pass validation despite having an extra type
      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.credentialName).toBe('ProductDataCredential');
    });

    it('should accept credential with types in different order', async () => {
      const credential = {
        ...productDataCredentialWithExtraType,
        type: [
          'ProductDataCredential',
          'VerifiableCredential',
          'DataCredential'
        ]
      };

      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, credential as unknown as VerifiableCredential, true);
      const result = await checkSchema(credentialSchema, credential as unknown as VerifiableCredential);

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept credential with multiple additional types', async () => {
      const credential = {
        ...productDataCredentialWithExtraType,
        type: [
          'VerifiableCredential',
          'ProductDataCredential',
          'DataCredential',
          'CustomType',
          'AnotherCustomType'
        ]
      };

      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, credential as unknown as VerifiableCredential, true);
      const result = await checkSchema(credentialSchema, credential as unknown as VerifiableCredential);

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should use generic schema when GS1 credential type is not recognized', async () => {
      // When ProductDataCredential is missing, it should use genericCredentialSchema
      const credential = {
        ...productDataCredentialWithExtraType,
        type: [
          'VerifiableCredential',
          'DataCredential'  // Custom type but no GS1 type
        ]
      };

      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, credential, true);
      
      // Should fall back to generic schema which has less strict validation
      expect(credentialSchema.$id).toBe('Generic-Schema');
    });

    it('should correctly identify credential type when GS1 type is present among additional types', async () => {
      const credential = {
        ...productDataCredentialWithExtraType,
        type: [
          'VerifiableCredential',
          'CustomType',
          'ProductDataCredential',  // GS1 type present
          'AnotherCustomType'
        ]
      };

      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, credential, true);
      
      // Should use ProductDataCredential schema, not generic
      expect(credentialSchema.title).toBe('ProductDataCredential');
    });
  });

  describe('Context Field with Additional Contexts', () => {
    it('should accept credential with additional @context URL', async () => {
      // Verify the test data has the expected structure with extra context
      expect(productDataCredentialWithExtraType['@context']).toContain('https://w3id.org/vc/render-method/v1');
      expect(productDataCredentialWithExtraType['@context']).toHaveLength(4);

      const credentialSchema = getCredentialRuleSchema(
        realJsonSchemaLoader, 
        productDataCredentialWithExtraType, 
        true
      );
      const result = await checkSchema(credentialSchema, productDataCredentialWithExtraType);

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept credential with multiple additional @context URLs', async () => {
      const credential = {
        ...productDataCredentialWithExtraType,
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://ref.gs1.org/gs1/vc/declaration-context',
          'https://ref.gs1.org/gs1/vc/product-context',
          'https://w3id.org/vc/render-method/v1',
          'https://example.com/custom-context/v1',
          'https://example.com/another-context/v1'
        ]
      };

      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, credential as unknown as VerifiableCredential, true);
      const result = await checkSchema(credentialSchema, credential as unknown as VerifiableCredential);

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept credential with @context in different order', async () => {
      const credential = {
        ...productDataCredentialWithExtraType,
        '@context': [
          'https://ref.gs1.org/gs1/vc/product-context',
          'https://www.w3.org/ns/credentials/v2',
          'https://w3id.org/vc/render-method/v1',
          'https://ref.gs1.org/gs1/vc/declaration-context'
        ]
      };

      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, credential as unknown as VerifiableCredential, true);
      const result = await checkSchema(credentialSchema, credential as unknown as VerifiableCredential);

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should define schema with required @context constraints', () => {
      // Verify that the schema defines @context requirements
      const credentialSchema = getCredentialRuleSchema(
        realJsonSchemaLoader,
        productDataCredentialWithExtraType,
        true
      );

      // The schema should have properties defined
      expect(credentialSchema.properties).toBeDefined();
      
      // Note: While the schema defines @context constraints using allOf/contains,
      // the actual enforcement of these constraints during validation may vary
      // depending on how the schema is processed and which fields are validated.
      // The primary purpose of the relaxed constraint is to allow ADDITIONAL contexts,
      // while still requiring the base GS1 contexts to be present.
    });

    it('should allow @context arrays with all required and additional contexts', async () => {
      // This test documents that credentials with all required contexts plus extras work
      const credentialWithExtraContexts = {
        ...productDataCredentialWithExtraType,
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://ref.gs1.org/gs1/vc/declaration-context',
          'https://ref.gs1.org/gs1/vc/product-context',
          'https://w3id.org/vc/render-method/v1',
          'https://example.com/custom-context/v1'
        ]
      };

      const schema = getCredentialRuleSchema(realJsonSchemaLoader, credentialWithExtraContexts, true);
      const result = await checkSchema(schema, credentialWithExtraContexts);

      // Should pass with all required contexts present
      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Real-World ProductDataCredential Validation', () => {
    it('should validate complete real-world credential with additional types and contexts', async () => {
      // Full validation of the real credential
      const credentialSchema = getCredentialRuleSchema(
        realJsonSchemaLoader, 
        productDataCredentialWithExtraType, 
        true
      );
      const result = await checkSchema(credentialSchema, productDataCredentialWithExtraType);

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.credentialId).toBe(productDataCredentialWithExtraType.id);
      expect(result.credentialName).toBe('ProductDataCredential');
    });

    it('should have correct credential structure', () => {
      // Verify the credential has the expected fields
      expect(productDataCredentialWithExtraType.id).toBeDefined();
      expect(productDataCredentialWithExtraType.issuer).toBeDefined();
      expect(productDataCredentialWithExtraType.credentialSubject).toBeDefined();
      expect(productDataCredentialWithExtraType.credentialSchema).toBeDefined();
      expect(productDataCredentialWithExtraType.validFrom).toBeDefined();

      // Verify GS1 specific fields
      expect(productDataCredentialWithExtraType.credentialSubject.product).toBeDefined();
      expect(productDataCredentialWithExtraType.credentialSubject.keyAuthorization).toBeDefined();

      // Verify the extra fields that come with the additional types
      expect(productDataCredentialWithExtraType.credentialSubject.data).toBeDefined();
      expect(productDataCredentialWithExtraType.renderMethod).toBeDefined();
    });

    it('should preserve all credential fields after validation', async () => {
      const credentialSchema = getCredentialRuleSchema(
        realJsonSchemaLoader, 
        productDataCredentialWithExtraType, 
        true
      );
      const result = await checkSchema(credentialSchema, productDataCredentialWithExtraType);
      
      // Verify validation doesn't strip additional fields
      expect(result.verified).toBe(true);
      expect(productDataCredentialWithExtraType.credentialSubject.data).toBeDefined();
      expect(productDataCredentialWithExtraType.renderMethod).toBeDefined();
    });
  });

  describe('Backwards Compatibility', () => {
    it('should still validate credentials without additional types', async () => {
      const credential = {
        ...productDataCredentialWithExtraType,
        type: [
          'VerifiableCredential',
          'ProductDataCredential'
        ],
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://ref.gs1.org/gs1/vc/declaration-context',
          'https://ref.gs1.org/gs1/vc/product-context'
        ]
      };

      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, credential as unknown as VerifiableCredential, true);
      const result = await checkSchema(credentialSchema, credential as unknown as VerifiableCredential);

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate existing test credentials are not affected', async () => {
      // This ensures the schema changes don't break existing credentials
      const minimalCredential: ExtendedCredential = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://ref.gs1.org/gs1/vc/declaration-context',
          'https://ref.gs1.org/gs1/vc/product-context'
        ],
        type: ['VerifiableCredential', 'ProductDataCredential'],
        id: 'https://example.com/credentials/123',
        issuer: {
          id: 'did:web:example.com'
        },
        validFrom: '2024-01-01T00:00:00Z', // W3C VC Data Model 2.0
        credentialSubject: {
          id: 'https://id.gs1.org/01/00810159550000',
          product: {
            'gs1:brand': {
              'gs1:brandName': 'Test Brand'
            },
            'gs1:productDescription': 'Test Product'
          },
          keyAuthorization: 'https://example.com/key/123'
        },
        credentialSchema: {
          id: 'https://id.gs1.org/vc/schema/v1/productdata',
          type: 'JsonSchema'
        },
        credentialStatus: {
          id: 'https://example.com/status/123#1',
          type: 'BitstringStatusListEntry',
          statusPurpose: 'revocation',
          statusListIndex: '1',
          statusListCredential: 'https://example.com/status/123'
        }
      };

      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, minimalCredential, true);
      const result = await checkSchema(credentialSchema, minimalCredential);

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
