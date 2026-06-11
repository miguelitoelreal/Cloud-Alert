export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  roles: string[];
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type AuthApiResponse = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  user: AuthUser;
};

export type UpdateProfilePayload = {
  name: string;
  email: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};
