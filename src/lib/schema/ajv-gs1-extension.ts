import Ajv from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import ajvErrors from 'ajv-errors'

import { AnySchemaObject, DataValidationCxt, ValidateFunction, ErrorObject } from "ajv/dist/types";
import { gs1CredentialValidationRuleResult, subjectId, subjectLicenseValue, subjectSameAs } from '../gs1-rules-types';
import { checkCredentialAlternativeLicenseValue } from '../rules-definition/subject/check-credential-alternative-license.js';
import { checkCredentialSameAsDigitalLink, checkCredentialSubjectIdDigitalLink } from '../rules-definition/subject/check-credential-subject-Id-digital-link.js';
import { gs1RulesSchemaMetaModel, JsonSchemaMetaModel } from '../types';

// Type for custom validation function with mutable errors property
// Ajv allows setting errors on validation functions, but TypeScript types mark it as readonly
type CustomValidateFunction = ((
  schema: gs1RulesSchemaMetaModel, 
  data: unknown, 
  parentSchema?: AnySchemaObject, 
  dataCxt?: DataValidationCxt
) => boolean) & { errors?: ErrorObject[] | null };

// Setup Ajv JSON Schema Validator
const ajv = new Ajv({
  strict: false,
  allErrors: true
})

addFormats(ajv)
ajvErrors(ajv)

// Utility Function to Compile JSON Schema
export const compileSchema = function (schemaToValidate: Record<string, unknown>) : ValidateFunction<unknown> {
    const maybeExistingSchema = ajv.getSchema((schemaToValidate as JsonSchemaMetaModel).$id);
    let compiledSchemaValidator = maybeExistingSchema;
    if (compiledSchemaValidator === undefined) {
      compiledSchemaValidator = ajv.compile(schemaToValidate);
    }
    return compiledSchemaValidator;
}
    
// GS1 Ajv JSON Schema Extension for Comparing License and Alternative License Value
  ajv.addKeyword({
    keyword: "altLicenseValidation",
    type: 'object',
    errors: true,
    async: false,
    validate: function customRuleValidation(schema: gs1RulesSchemaMetaModel, data: subjectLicenseValue, parentSchema?: AnySchemaObject, dataCxt?: DataValidationCxt) {
      const validateFn = customRuleValidation as CustomValidateFunction;
      const gs1RuleCheckResult = checkCredentialAlternativeLicenseValue(data);
      if (!gs1RuleCheckResult.verified) { 
        validateFn.errors = createJsonSchemaError("altLicenseValidation", gs1RuleCheckResult, dataCxt);
     }
  
      return gs1RuleCheckResult.verified;
    }
  });
  
  // GS1 Ajv JSON Schema Extension for checking gs1 digital link format
  ajv.addKeyword({
    keyword: "digitalLink",
    type: 'object',
    errors: true,
    async: false,
    validate: function customRuleValidation(schema: gs1RulesSchemaMetaModel, data: subjectId, parentSchema?: AnySchemaObject, dataCxt?: DataValidationCxt) {
      const validateFn = customRuleValidation as CustomValidateFunction;
      const gs1RuleCheckResult = checkCredentialSubjectIdDigitalLink(data);
      if (!gs1RuleCheckResult.verified) { 
          validateFn.errors = createJsonSchemaError("digitalLink", gs1RuleCheckResult, dataCxt);
      }
  
      return gs1RuleCheckResult.verified;
    }
  });
  
    // GS1 Ajv JSON Schema Extension for checking gs1 digital link format for the sameAs Credential Subject Field
  ajv.addKeyword({
    keyword: "digitalLinkSameAs",
    type: 'object',
    errors: true,
    async: false,
    validate: function customRuleValidation(schema: gs1RulesSchemaMetaModel, data: subjectSameAs, parentSchema?: AnySchemaObject, dataCxt?: DataValidationCxt) {
      const validateFn = customRuleValidation as CustomValidateFunction;
      const gs1RuleCheckResult = checkCredentialSameAsDigitalLink(data);
      if (!gs1RuleCheckResult.verified) { 
          validateFn.errors = createJsonSchemaError("digitalLink", gs1RuleCheckResult, dataCxt);
      }
  
      return gs1RuleCheckResult.verified;
    }
  });

  // Create Error to Return to Ajv Schema Validation Engine
  const createJsonSchemaError = function(keyword: string, gs1RuleCheckResult: gs1CredentialValidationRuleResult, dataCxt?: DataValidationCxt): ErrorObject[] {
  
    const errors: ErrorObject[] = [];
    
    errors.push({
      instancePath: dataCxt?.instancePath ?? "",
      schemaPath: "",
      keyword: keyword,
      params: { 
          keyword: keyword,
          isGS1Error: true,
          gs1Rule: gs1RuleCheckResult.rule
      },
      message: gs1RuleCheckResult.rule?.rule
    });
    
    return errors;
  }
  