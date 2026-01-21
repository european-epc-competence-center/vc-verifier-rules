import { checkPrefixCredentialLicenseValue } from "./subject/check-credential-license.js";
import { validateExtendedCompanyPrefixCredential } from "./chain/validate-extended-company-prefix.js";
import { validateExtendedLicensePrefix } from "./chain/validate-extended-license-prefix.js";
import { validateExtendedKeyCredential, validateExtendedKeyDataCredential } from "./chain/validate-extended-data-key.js";

// Rules Engine Manager that handles GS1 Credential Rules validation
// Note: Intentionally using dynamic typing here due to heterogeneous function signatures
// - prefixLicense: (subjectLicenseValue) => Promise<gs1CredentialValidationRuleResult>
// - Chain validators: (string, credentialChainMetaData) => Promise<gs1RulesResult>
// TypeScript's type system cannot properly narrow union types from indexed access,
// so we use type assertions at call sites instead of forcing incompatible strict typing here.
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const rulesEngineManager: Record<string, Function> = {};

rulesEngineManager.prefixLicense = checkPrefixCredentialLicenseValue;
rulesEngineManager.GS1PrefixLicenseCredential = validateExtendedLicensePrefix;
rulesEngineManager.GS1CompanyPrefixLicenseCredential = validateExtendedCompanyPrefixCredential;
rulesEngineManager.KeyCredential  = validateExtendedKeyCredential;
rulesEngineManager.KeyDataCredential  = validateExtendedKeyDataCredential;
