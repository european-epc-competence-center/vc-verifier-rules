# Plan: `alsoKnownAs` equivalence in chain issuer↔subject checks

Branch: `feat/also-known-as-equivalence`

## Problem

A KeyCredential issued by `did:webvh:<scid>:example.com` extending a license whose subject is
`did:web:example.com` fails chain validation, because issuer and subject are compared as plain
strings — even though the two DIDs are twins of the same organization, mutually linked via
`alsoKnownAs` (the `did:web` document lists the twin; the did:webvh log state lists the `did:web`).

Two independent code paths do this strict comparison; **both** must be covered, otherwise a
did:webvh-issued KeyCredential verifies but any data credential on top of it still fails:

1. `checkIssuerToSubjectId` (`rules-definition/chain/shared-extended.ts`) — used by
   `validateExtendedLicensePrefix` and `validateExtendedCompanyPrefixCredential` (two call sites)
   for the license hops. Error: `invalidIssueSubject`.
2. `checkCredentialChainIssuers` (same file) — used by `validateExtendedKeyCredential` and
   `validateExtendedKeyDataCredential` (`chain/validate-extended-data-key.ts`) for the data
   credential chain. The `keyCredentialIssuer !== companyPrefixSubjectID` comparison is the
   affected link. Error: `invalidIssuer`.

Note: `checkIssuerToSubjectId_schema` / `validateExtendedLicensePrefix_JsonSchema` are defined but
neither registered in `rulesEngineManager` nor called from the engine — dead code, no change needed
(confirm before implementing; do not convert them to async).

## Change

1. `src/lib/types.ts`: optional callback on `gs1ValidatorDocumentResolver`:
   `externalAlsoKnownAsLoader?: (did: string) => Promise<string[]>` — returns the `alsoKnownAs`
   entries of the resolved DID document, `[]` when the DID is not resolvable.
2. Pass the loader through: `gs1-verification-service.ts` → `validateCredentialChain`
   (`engine/validate-extended-credential.ts`, incl. the recursive calls) → rule functions
   (`validationFn(credentialType, credentialChain, loader)`) → `checkIssuerToSubjectId` and
   `checkCredentialChainIssuers`.
3. Shared helper `didsAreEquivalent(issuerDid, subjectDid, loader)` in `shared-extended.ts`:
   exact match, or — with a loader — `loader(subjectDid)` contains `issuerDid`.
   - **Trust direction matters:** only the *subject's own* document may authorize an alias, since
     only the license holder controls it. The reverse direction (issuer's document claiming the
     subject) must NOT be accepted — anyone can put a foreign DID into their own `alsoKnownAs`.
     Unidirectional is sufficient; document this reasoning in a code comment.
   - **Fail closed:** loader throws / times out → treat as `[]` and emit the existing error;
     never let a loader failure escape the validation.
   - **Cache per validation run:** the same DID is looked up multiple times when a full chain is
     validated; memoize loader results (simple `Map` scoped to the run).
4. `checkIssuerToSubjectId`: replace the strict comparison with the helper. Same error
   (`invalidIssueSubject`) when it does not match.
5. `checkCredentialChainIssuers`: apply the helper to the `keyCredentialIssuer` ↔
   `companyPrefixSubjectID` link only. Keep `organizationCredentialIssuer === keyCredentialIssuer`
   strict: those are one party's own credentials, which must use one identity consistently.

Without the loader, behavior is byte-for-byte unchanged (backward compatible).

## Tests

`src/tests/rules-issuer.test.ts`:

- subject's `alsoKnownAs` contains issuer → match
- `alsoKnownAs` does not contain issuer / DID not resolvable / loader throws → no match
- no loader → strict comparison as before
- reverse direction only (issuer's doc claims subject, subject's doc silent) → no match

`src/tests/rules-chain.test.ts`:

- `did:webvh` KeyCredential under `did:web` CompanyPrefixLicense verifies with loader
- full data chain: OrganizationDataCredential → KeyCredential (`did:webvh` issuer) →
  CompanyPrefixLicense (`did:web` subject) verifies with loader — this is the case that fails if
  `checkCredentialChainIssuers` is not covered
- same chain without loader → fails with the existing errors

## Docs

`CHANGELOG.md` `[Unreleased]` entry + short README note on the new callback (what it must return,
fail-closed semantics, and that omitting it preserves strict matching).
