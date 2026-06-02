export type UserListItem = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
};

export type UpdateUserPayload = {
  name?: string;
  email?: string;
  isAdmin?: boolean;
};

export type TenantEmailConfig = {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  senderEmail: string;
  senderName: string;
  useSsl: boolean;
  emailEnabled: boolean;
  emailProvider: "Smtp" | "Brevo";
  brevoApiKey: string;
};
