export function hasAdminClaim(claims: Record<string, unknown>): boolean {
  return claims.admin === true;
}
