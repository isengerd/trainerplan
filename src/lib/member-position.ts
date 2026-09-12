import { defaultPosition, positionOptions, type Role } from "@/data/club";

// A profile can belong to teams with different roles. Never infer permissions
// from this shared descriptive field; resolve it against the current team role.
export function positionForRole(role: Role, position: string): string {
  return positionOptions[role].includes(position) ? position : defaultPosition[role];
}
