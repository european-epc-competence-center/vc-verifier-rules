/**
 * Test suite for @context field validation using real JSON schemas.
 * 
 * This tests that the schema properly enforces required @context URLs
 * while allowing additional contexts. Uses actual schema files instead
 * of mocks to ensure real-world validation behavior.
 */

import { checkSchema } from '../lib/schema/validate-schema.js';
import { getCredentialRuleSchema } from '../lib/get-credential-type.js';
import type { Proof, VerifiableCredential } from '../lib/types.js';
import { realJsonSchemaLoader } from './test-helpers.js';

/**
 * Extended credential type for testing with real schemas.
 * Includes all W3C and GS1 required fields plus extensions.
 * 
 * Follows W3C VC Data Model 2.0 (uses validFrom, not issuanceDate from 1.1)
 */
interface TestCredential {
  '@context': string[] | object;
  type: string[];
  proof?: Proof | Proof[];
  id: string;
  issuer: {
    id: string;
    name?: string;
  };
  validFrom: string; // W3C VC Data Model 2.0
  issuanceDate?: string; // W3C VC Data Model 1.1 (optional for backward compatibility)
  credentialSubject: {
    id: string;
    product?: {
      'gs1:brand'?: {
        'gs1:brandName'?: string;
      };
      'gs1:productDescription'?: string;
      [key: string]: unknown;
    };
    organization?: {
      'gs1:partyGLN'?: string;
      'gs1:organizationName'?: string;
      [key: string]: unknown;
    };
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
  name?: string;
  description?: string;
  [key: string]: unknown;
}

describe('@context Validation with Real Schemas', () => {
  describe('ProductDataCredential @context validation', () => {
    const baseCredential: TestCredential = {
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

    it('should pass validation with all required @context URLs', async () => {
      // Type assertion is safe here as TestCredential contains all required VerifiableCredential fields
      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, baseCredential as unknown as VerifiableCredential, true);
      const result = await checkSchema(credentialSchema, baseCredential as unknown as VerifiableCredential);

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation with additional @context URLs', async () => {
      const credential = {
        ...baseCredential,
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://ref.gs1.org/gs1/vc/declaration-context',
          'https://ref.gs1.org/gs1/vc/product-context',
          'https://w3id.org/vc/render-method/v1', // Additional context
          'https://example.com/custom-context/v1' // Another additional context
        ]
      };

      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, credential as unknown as VerifiableCredential, true);
      const result = await checkSchema(credentialSchema, credential as unknown as VerifiableCredential);

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation with @context in different order', async () => {
      const credential = {
        ...baseCredential,
        '@context': [
          'https://ref.gs1.org/gs1/vc/product-context',
          'https://www.w3.org/ns/credentials/v2',
          'https://ref.gs1.org/gs1/vc/declaration-context'
        ]
      };

      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, credential as unknown as VerifiableCredential, true);
      const result = await checkSchema(credentialSchema, credential as unknown as VerifiableCredential);

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when missing W3C credentials context', async () => {
      const credential = {
        ...baseCredential,
        '@context': [
          // Missing 'https://www.w3.org/ns/credentials/v2'
          'https://ref.gs1.org/gs1/vc/declaration-context',
          'https://ref.gs1.org/gs1/vc/product-context'
        ]
      };

      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, credential as unknown as VerifiableCredential, true);
      const result = await checkSchema(credentialSchema, credential as unknown as VerifiableCredential);

      expect(result.verified).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].rule).toContain('@context');
      // The error message will vary depending on which constraint fails first
      expect(result.errors[0].code).toBe('GS1-010');
    });

    it('should fail validation when missing GS1 declaration context', async () => {
      const credential = {
        ...baseCredential,
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          // Missing 'https://ref.gs1.org/gs1/vc/declaration-context'
          'https://ref.gs1.org/gs1/vc/product-context'
        ]
      };

      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, credential as unknown as VerifiableCredential, true);
      const result = await checkSchema(credentialSchema, credential as unknown as VerifiableCredential);

      expect(result.verified).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].rule).toContain('@context');
      expect(result.errors[0].code).toBe('GS1-010');
    });

    it('should fail validation when missing GS1 product context', async () => {
      const credential = {
        ...baseCredential,
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://ref.gs1.org/gs1/vc/declaration-context'
          // Missing 'https://ref.gs1.org/gs1/vc/product-context'
        ]
      };

      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, credential as unknown as VerifiableCredential, true);
      const result = await checkSchema(credentialSchema, credential as unknown as VerifiableCredential);

      expect(result.verified).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].rule).toContain('@context');
      expect(result.errors[0].code).toBe('GS1-010');
    });

    it('should fail validation when @context is empty array', async () => {
      const credential = {
        ...baseCredential,
        '@context': []
      };

      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, credential as unknown as VerifiableCredential, true);
      const result = await checkSchema(credentialSchema, credential as unknown as VerifiableCredential);

      expect(result.verified).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('KeyCredential @context validation', () => {
    const baseKeyCredential: TestCredential = {
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
        'https://ref.gs1.org/gs1/vc/declaration-context'
      ],
      type: ['VerifiableCredential', 'KeyCredential'],
      id: 'https://example.com/credentials/key-123',
      issuer: {
        id: 'did:web:example.com'
      },
      validFrom: '2024-01-01T00:00:00Z', // W3C VC Data Model 2.0
      credentialSubject: {
        id: 'https://id.gs1.org/01/00810159550000',
        extendsCredential: 'https://example.com/license/123'
      },
      credentialSchema: {
        id: 'https://id.gs1.org/vc/schema/v1/key',
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

    it('should pass validation with all required @context URLs for KeyCredential', async () => {
      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, baseKeyCredential, true);
      const result = await checkSchema(credentialSchema, baseKeyCredential);

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when KeyCredential missing declaration context', async () => {
      const credential = {
        ...baseKeyCredential,
        '@context': [
          'https://www.w3.org/ns/credentials/v2'
          // Missing 'https://ref.gs1.org/gs1/vc/declaration-context'
        ]
      };

      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, credential as unknown as VerifiableCredential, true);
      const result = await checkSchema(credentialSchema, credential as unknown as VerifiableCredential);

      expect(result.verified).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].rule).toContain('@context');
    });
  });

  describe('Real-world credential from JWT', () => {
    it('should validate the example ProductData JWT with additional contexts', async () => {
      // This credential has additional "DataCredential" type and render-method context
      const credential: TestCredential = {
        type: [
          'VerifiableCredential',
          'DataCredential',
          'ProductDataCredential'
        ],
        issuer: {
          id: 'did:web:id.tortugadeoro.com',
          name: 'Tortuga de Oro'
        },
        credentialSubject: {
          id: 'https://id.tortugadeoro.com/01/04270005112602/21/test',
          product: {
            'gs1:brand': {
              'gs1:brandName': 'TDO / Goldring 585'
            },
            'gs1:productDescription': 'Ihr Ring'
          },
          keyAuthorization: 'https://wallet.tortugadeoro.com/api/registry/vc/license/gs1_key/01/04270005112602/21/test'
        },
        id: 'https://wallet.tortugadeoro.com/api/registry/vc/3bae6c4e-675d-4833-a3a6-235abad49d72',
        validFrom: '2026-01-30T14:28:05Z', // W3C VC Data Model 2.0
        credentialStatus: {
          id: 'https://wallet.tortugadeoro.com/api/registry/status/revocation/46a9ba5e-286b-4002-82af-d47ecfc545e2#104552',
          type: 'BitstringStatusListEntry',
          statusPurpose: 'revocation',
          statusListIndex: '104552',
          statusListCredential: 'https://wallet.tortugadeoro.com/api/registry/status/revocation/46a9ba5e-286b-4002-82af-d47ecfc545e2'
        },
        credentialSchema: {
          id: 'https://id.gs1.org/vc/schema/v1/productdata',
          type: 'JsonSchema'
        },
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://w3id.org/vc/render-method/v1', // Additional context
          'https://ref.gs1.org/gs1/vc/declaration-context',
          'https://ref.gs1.org/gs1/vc/product-context'
        ]
      };

      const credentialSchema = getCredentialRuleSchema(realJsonSchemaLoader, credential as unknown as VerifiableCredential, true);
      const result = await checkSchema(credentialSchema, credential as unknown as VerifiableCredential);

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
