declare module "openid" {
  interface RelyingPartyOptions {
    stateless?: boolean;
    strict?: boolean;
    extensions?: unknown[];
  }

  interface VerifyResult {
    authenticated: boolean;
    claimedIdentifier?: string;
  }

  class RelyingParty {
    constructor(
      returnUrl: string,
      realm: string,
      stateless: boolean,
      strict: boolean,
      extensions: unknown[]
    );
    authenticate(
      identifier: string,
      immediate: boolean,
      callback: (error: Error | null, authUrl: string | null) => void
    ): void;
    verifyAssertion(
      requestOrUrl: string,
      callback: (error: Error | null, result: VerifyResult | null) => void
    ): void;
  }
}
