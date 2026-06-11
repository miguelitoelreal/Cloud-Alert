export type CustomerType = 0 | 1 | 2 | 3;

export type CloudProviderSummary = {
  id: string;
  name: string;
  slug: string;
};

export type Customer = {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  customerType: CustomerType;
  industry?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  cloudProviders: CloudProviderSummary[];
};

export type CreateCustomerPayload = {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  customerType: CustomerType;
  industry?: string;
  notes?: string;
  cloudProviderIds: string[];
};

export type UpdateCustomerPayload = {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  customerType: CustomerType;
  industry?: string;
  notes?: string;
  isActive: boolean;
  cloudProviderIds: string[];
};
