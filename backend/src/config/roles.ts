import { RoleName } from "../types";

export const INITIAL_ROLES: ReadonlyArray<{ name: RoleName; description: string }> = [
  { name: "student", description: "Regular student with basic access to courses and materials" },
  { name: "member", description: "Member with additional access to community features" },
  { name: "mentor", description: "Mentor who can support innovation hub users" },
  { name: "system_admin", description: "Administrator with full system access" },
  { name: "innovation_hub_admin", description: "Innovation Hub administrator who manages hub operations" },
];
