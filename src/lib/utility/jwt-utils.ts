import { CredentialPresentation, VerifiableCredential, verifiableJwt } from "../types.js";
import { decodeJwt } from "jose";

// Utility Function to Decode a JWT Token into a verifiablePresentation
export const getDecodedPresentation = function getDecodedJwt(token: string): CredentialPresentation { 

    const jwtPresentation = decodeJwt(token);
    const verifiableCredential: VerifiableCredential[] = [];

    (jwtPresentation.verifiableCredential as (verifiableJwt | VerifiableCredential)[]).forEach((vc) => {
        if (typeof vc === 'object' && vc.id && typeof vc.id === 'string' && !('credentialSubject' in vc && vc.id.split(';')[0] === 'data:application/vc+jwt')) {
            const parseOutToken = vc.id.split(';')[1];
            verifiableCredential.push(decodeJwt(parseOutToken) as VerifiableCredential);
        } else {
            verifiableCredential.push(vc as VerifiableCredential);
        }
        
    });

    return {...jwtPresentation, verifiableCredential} as CredentialPresentation;
}

export const getDecodedCredential = function getDecodedJwt(token: string): VerifiableCredential { 

    return decodeJwt(token) as VerifiableCredential;
}

// Utility function to determine if a credential is a JWT string
export const isJwtString = function(credential: unknown): credential is string {
    return typeof credential === 'string' && credential.includes('.') && credential.split('.').length === 3;
}

// Utility function to normalize any credential input to VerifiableCredential
export const normalizeCredential = function(credential: VerifiableCredential | verifiableJwt | string): VerifiableCredential {
    if (typeof credential === 'string') {
        return getDecodedCredential(credential);
    }
    
    // Handle verifiableJwt that might have JWT in id field
    if (typeof credential === 'object' && credential.id && typeof credential.id === 'string' && credential.id.startsWith('data:application/vc+jwt')) {
        const jwtPart = credential.id.split(';')[1];
        if (jwtPart) {
            return getDecodedCredential(jwtPart);
        }
    }
    
    return credential as VerifiableCredential;
}

// Utility function to normalize any presentation input to CredentialPresentation
export const normalizePresentation = function(presentation: CredentialPresentation | verifiableJwt | string): CredentialPresentation {
    if (typeof presentation === 'string') {
        return getDecodedPresentation(presentation);
    }
    
    return presentation as CredentialPresentation;
}