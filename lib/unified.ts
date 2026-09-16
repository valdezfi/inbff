export function getUnifiedRedirectUrls(requestUrl: string, state: string) {
  const origin = new URL(requestUrl).origin;
  return {
    callbackUrl: `${origin}/api/shopify/unified/callback?state=${encodeURIComponent(state)}`,
    errorRedirectUrl: `${origin}/dashboard/connect-shopify?error=unified-integration-disabled`,
  };
}
