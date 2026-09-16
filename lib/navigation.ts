export function getAuthenticatedHomePath(role: string): string {
  if (role === "platform_admin") return "/admin";
  return role === "brand" ? "/dashboard" : "/affiliate/dashboard";
}
