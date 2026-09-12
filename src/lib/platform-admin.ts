// Server-only deployment configuration. Never trust a display name or client input.
export function isPlatformAdmin(userId: string) {
  return (process.env.PLATFORM_ADMIN_USER_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean).includes(userId);
}
