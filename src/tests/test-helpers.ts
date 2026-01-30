/**
 * Test helpers that provide access to real production code and schemas.
 * These helpers ensure tests validate against actual implementation behavior.
 */

import { readFileSync } from 'fs';

/**
 * Real JSON schema loader that reads actual schema files from disk.
 * Use this in tests to validate against production schemas, not mocks.
 * 
 * For unknown schema IDs, returns an empty schema, which causes the validation
 * system to fall back to generic credential validation (matching production behavior).
 */
export const realJsonSchemaLoader = (schemaId: string): Uint8Array => {
  const schemaFiles: Record<string, string> = {
    'https://id.gs1.org/vc/schema/v1/productdata': 'gs1-product-data-schema.json',
    'https://id.gs1.org/vc/schema/v1/key': 'gs1-key-schema.json',
    'https://id.gs1.org/vc/schema/v1/companyprefix': 'gs1-company-prefix-schema.json',
    'https://id.gs1.org/vc/schema/v1/prefix': 'gs1-prefix-schema.json',
    'https://id.gs1.org/vc/schema/v1/organizationdata': 'gs1-organization-data-schema.json',
    'https://id.gs1.org/vc/schema/v1/productkey': 'gs1-product-key-schema.json',
  };

  const filename = schemaFiles[schemaId];
  if (!filename) {
    // Return empty schema for unsupported schema types (matches production behavior)
    return new Uint8Array(Buffer.from(''));
  }

  const schemaPath = new URL(`../getting-started/json-schema/${filename}`, import.meta.url);
  return new Uint8Array(readFileSync(schemaPath));
};
