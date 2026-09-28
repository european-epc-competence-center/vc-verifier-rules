# Plan: accept the did:webvh twin of a did:web license subject

Branch: `feat/also-known-as-equivalence`

## Problem

The company wallet can sign with either `did:web:example.com` or its twin
`did:webvh:<SCID>:example.com`. License credentials (prefix / company prefix) name the licensee in
`credentialSubject.id`, usually as the `did:web`. All issuer checks in the rules are plain string
comparisons, so a credential signed with the did:webvh twin breaks chain validation:

- Key and data credentials fail with `GS1-150` (`invalidIssuer`).
- A company prefix license signed by the member organization's twin fails with `GS1EX-212`
  (`invalidIssueSubject`). Its message ("License value does not start with the correct prefix
  value.") is wrong for an issuer mismatch; fix the text as part of this change.

## Decision: syntactic twin rule, opt-in, no DID resolution

A `did:webvh` issuer may act for the `did:web` DID derived by the did:webvh spec's own rule
("Publishing a Parallel did:web DID"): replace `did:webvh:<SCID>:` with `did:web:`.

```
did:webvh:<SCID>:<host>[:<path>]  ->  did:web:<host>[:<path>]
```

Why this is safe:

- Both DIDs use the same DID-to-HTTPS transformation (`did.jsonl` and `did.json` at the same
  location). Whoever can publish the did:webvh log there controls the domain, which is exactly the
  trust a `did:web` subject already relies on. No trust is added.
- The signature itself is verified by the external verifier (`externalCredentialVerification`),
  which resolves the did:webvh from its own domain. The rules only decide *which* DID may sign.
- A moved (portable) did:webvh carries the new domain in its DID string, so it no longer maps to
  the old `did:web` and fails closed.

Direction (important):

| Issuer | License subject | Result |
| --- | --- | --- |
| `did:webvh:<SCID>:example.com` | `did:web:example.com` | allowed (with flag) |
| `did:web:example.com` | `did:webvh:<SCID>:example.com` | rejected: would downgrade the SCID binding |
| `did:webvh:<A>:example.com` | `did:webvh:<B>:example.com` | rejected: same reason |

## Opt-in flag: `GS1_ALLOW_DID_WEBVH_TWIN`

- Environment variable, following the existing `GS1_GLOBAL_DID` precedent. It avoids threading an
  option through `validateCredentialChain` and every `rulesEngineManager` function.
- Only the value `true` (case-insensitive) enables it. Anything else, or unset, keeps today's
  strict matching.
- Read at call time via a getter (like `getGS1GlobalDID()`), not at module load, so tests can
  toggle it. Guard with `typeof process !== "undefined"` so bundles without `process` fall back to
  off instead of throwing.
- Default **off**. This keeps the literal GS1 "MUST match" semantics for upstream and third-party
  users. EECC deployments (vc-verifier) set it to `true`.
- Naming: not `acceptWebvh`. did:webvh DIDs are already accepted wherever they match exactly. The
  flag only controls substituting the did:webvh twin for a did:web, and the name should say that.
- A request option (next to `fullJsonSchemaValidationOn`) can be added later if per-request
  control is ever needed. Not needed now.

## Why not the `alsoKnownAs` resolver approach (previous sketch)

- It would need DID resolution inside this library: a new async callback, caching, timeouts and
  fail-closed handling. The library has no network I/O today.
- For same-domain twins it adds no security. The `did:web` document's `alsoKnownAs` is controlled
  by the same domain holder, and the did:webvh spec requires a parallel `did:web` to list its twin
  anyway.
- It only pays off for cross-domain aliases (portability moves, other DID methods). Not needed
  now; it could be added later inside the same helper without touching call sites.

Kept from the sketch: cover all chain paths, anchor on the license subject, and keep behavior
byte-for-byte unchanged when the twin rule doesn't apply.

## Change

1. `rules-definition/chain/shared-extended.ts`
   - `isDidWebvhTwinAllowed()`: reads `GS1_ALLOW_DID_WEBVH_TWIN`.
   - `getDidWebTwin(did): string | undefined`: parses `did:webvh:<scid>:<rest>` and returns
     `did:web:<rest>`, otherwise `undefined`. Strict parsing: non-empty SCID and host.
   - `issuerActsFor(issuer, expectedDid): boolean`: `issuer === expectedDid`, or (flag on and
     `expectedDid` starts with `did:web:` and `getDidWebTwin(issuer) === expectedDid`).
2. `checkIssuerToSubjectId`: use `issuerActsFor(issuer, subject.id)`.
   Covers GL-3 (company prefix license signed by the member organization's twin) and K-7b
   (KeyCredential signed by the licensee's twin).
3. `checkCredentialChainIssuers` (data -> key -> company prefix): anchor on the license subject
   instead of requiring identical issuers. Accept if either holds:
   - `data === key && key === cpIssuer`: keeps the existing strict path where the member
     organization issued on the licensee's behalf.
   - `issuerActsFor(data, cpSubject) && issuerActsFor(key, cpSubject)`.

   Without the twin rule this is equivalent to the current logic. It also fixes the most likely
   real-world break: old KeyCredentials signed with the did:web and new data credentials signed
   with the did:webvh (or the reverse, as long as the subject is the did:web).
4. K-8a (`KeyCredential` -> parent `KeyCredential` in `validate-extended-company-prefix.ts`):
   replace the `checkCredentialIssuers` call with `issuerActsFor(childIssuer, parentIssuer)`.
   Change the call site only: `checkCredentialIssuers` is also used by the "same issuer"
   fallbacks, which stay strict. Known limitation: a parent signed with the did:webvh and a child
   signed with the did:web still fails; fixing that would need the anchor two hops up.
5. Unchanged: the GS1 Global root check (`GS1_GLOBAL_DID` exact match) and the "same issuer"
   fallbacks against the parent's issuer.
6. Dead code (`checkIssuerToSubjectId_schema`, `validateExtendedLicensePrefix_JsonSchema`) is not
   registered anywhere and not exported from `src/index.ts`. Remove it rather than keeping a
   second, diverging copy.
7. `gs1-credential-errors.ts`: change the `GS1EX-212` message to describe an issuer/subject
   mismatch. Keep the code.

## Tests

`src/tests/rules-issuer.test.ts`:

- `getDidWebTwin`: host only, host and path, port (`%3A`), non-webvh input, malformed webvh
  (missing SCID or host).
- `issuerActsFor` with flag on: exact match; webvh -> web match; web -> webvh no match;
  webvh A -> webvh B no match; different host or path no match.
- `issuerActsFor` with flag off (unset, `false`, `1`): webvh -> web no match.
- `checkCredentialChainIssuers`: mixed web/webvh combinations above, plus the MO-issued path.

`src/tests/rules-chain.test.ts`:

- KeyCredential signed by the did:webvh twin under a did:web company prefix license: verifies with
  the flag, fails `GS1-150` without it.
- ProductData signed by did:webvh -> KeyCredential signed by did:web -> company prefix subject
  did:web: verifies with the flag.
- Company prefix subject did:webvh, KeyCredential signed by the did:web twin: fails `GS1-150` even
  with the flag.

Reset `process.env.GS1_ALLOW_DID_WEBVH_TWIN` in `afterEach`.

## Docs / upstream

- `CHANGELOG.md` `[Unreleased]` entry: new opt-in flag (default off, no behavior change
  otherwise), corrected `GS1EX-212` message, removed unused `_schema` helpers.
- README: new "Environment variables" section documenting `GS1_GLOBAL_DID` (currently
  undocumented) and `GS1_ALLOW_DID_WEBVH_TWIN` (what it allows, the one-way rule, default off).
- vc-verifier: set `GS1_ALLOW_DID_WEBVH_TWIN=true` in its deployment config.
- Propose to GS1 (GS1DigitalLicenses): define "MUST match" for issuer/subject DIDs to include the
  did:webvh -> did:web twin. The spec already names did:webvh for GS1 GO (PL-2).
- Wallet (separate from this repo, independent quick win): when issuing a credential that extends
  a license, prefer the DID that equals the license subject.
