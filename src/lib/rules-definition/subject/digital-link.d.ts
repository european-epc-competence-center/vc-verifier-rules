declare module "digital-link.js" {
  export interface DigitalLinkOptions {
    domain?: string;
    identifier?: Record<string, string>;
    keyQualifiers?: Record<string, string>;
    attributes?: Record<string, string>;
    sortKeyQualifiers?: boolean;
    keyQualifiersOrder?: string[];
    linkType?: string;
  }

  export interface ValidationTraceEntry {
    rule: string;
    match: string;
    remainder: string;
  }

  export interface ValidationTrace {
    trace: ValidationTraceEntry[];
    success: boolean;
  }

  export interface DigitalLinkInstance {
    /**
     * Validates the Digital Link against the GS1 grammar AND check digit validation.
     * For grammar-only validation, use getValidationTrace().success instead.
     */
    isValid(): boolean;
    
    /**
     * Gets the validation trace showing how the Digital Link was parsed.
     * Use trace.success to check if the Digital Link matches the GS1 grammar.
     */
    getValidationTrace(): ValidationTrace;
    
    /**
     * Gets the primary identifier (e.g., GTIN, GLN) as a key-value object.
     */
    getIdentifier(): Record<string, string>;
    
    /**
     * Gets key qualifiers (e.g., serial number, lot number) as key-value pairs.
     */
    getKeyQualifiers(): Record<string, string | string[]>;
    
    /**
     * Gets data attributes from query parameters.
     */
    getAttributes(): Record<string, string | string[]>;
    
    /**
     * Gets the domain portion of the Digital Link.
     */
    getDomain(): string;
    
    /**
     * Converts the Digital Link to a Web URI string.
     */
    toWebUriString(): string;
    
    /**
     * Converts the Digital Link to a JSON string representation.
     */
    toJsonString(): string;
    
    setDomain(domain: string): DigitalLinkInstance;
    setIdentifier(key: string, value: string): DigitalLinkInstance;
    setKeyQualifier(key: string, value: string): DigitalLinkInstance;
    setAttribute(key: string, value: string): DigitalLinkInstance;
    setKeyQualifiersOrder(order: string[]): DigitalLinkInstance;
    setLinkType(linkType: string): DigitalLinkInstance;
    getLinkType(): string;
  }

  export function DigitalLink(input?: string | DigitalLinkOptions): DigitalLinkInstance;

  export interface UtilsInterface {
    compressWebUri(uri: string): string;
    decompressWebUri(uri: string): string;
    isCompressedWebUri(uri: string): boolean;
  }

  export const Utils: UtilsInterface;

  export const webVoc: {
    linkType: Record<string, string>;
  };
}
