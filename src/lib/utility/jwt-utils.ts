import { CredentialPresentation, VerifiableCredential, verifiableJwt } from "../types.js";

// Utility Function to Decode a JWT Token into a verifiablePresentation
export const getDecodedPresentation = function getDecodedJwt(token: string): CredentialPresentation { 

    const jwt = atob(token.split('.')[1]);
    const jwtPresentation = JSON.parse(jwt);

    const decodedPresentation = {...jwtPresentation};
    decodedPresentation.verifiableCredential = [];

    jwtPresentation.verifiableCredential.forEach((vc: verifiableJwt | VerifiableCredential) => {
        if (typeof vc === 'object' && vc.id && typeof vc.id === 'string' && !('credentialSubject' in vc && vc.id.split(';')[0] === 'data:application/vc+jwt')) {
            const parseOutToken = vc.id.split(';')[1];
            const jwt = atob(parseOutToken.split('.')[1]);
            const jsonJwt = JSON.parse(jwt);
            decodedPresentation.verifiableCredential.push(jsonJwt);
        } else {
            decodedPresentation.verifiableCredential.push(vc);
        }
        
    });

    return decodedPresentation;
}

export const getDecodedCredential = function getDecodedJwt(token: string): VerifiableCredential { 

    const jwt = atob(token.split('.')[1]);
    const jwtCredential = JSON.parse(jwt);

    return jwtCredential;
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