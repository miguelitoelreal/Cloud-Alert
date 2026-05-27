import type { AuthSession } from "../src/types/auth";

export const authSession: AuthSession = {
  user: {
    id: "user-1",
    name: "Equipo Cloud",
    email: "equipo@empresa.com",
    createdAt: "2026-01-01T00:00:00.000Z",
    tenantId: "tenant-1",
    tenantSlug: "equipo-cloud",
    tenantName: "Equipo Cloud Workspace",
    roles: ["User"],
  },
  accessToken: "access-token",
  refreshToken: "refresh-token",
  accessTokenExpiresAt: "2026-01-01T01:00:00.000Z",
};
