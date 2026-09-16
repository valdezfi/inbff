export function getAuthenticatedHomePath(role: string): string {
  return role === "brand" ? "/dashboard" : "/affiliate/dashboard";
}
