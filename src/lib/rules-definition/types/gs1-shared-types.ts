export type gs1Organization = {
    "gs1:partyGLN": string;
    "gs1:organizationName": string;
}

export type gs1Product = {
    "gs1:brand"?: {
        "gs1:brandName": string;
    };
    "gs1:productDescription": string;
    [key: string]: unknown; // Allow additional GS1 product fields
}
