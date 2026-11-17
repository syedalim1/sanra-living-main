import type { LeadKind, LeadStatus } from "@/lib/b2b/leads";

export interface AdminLead {
  id: string;
  kind: LeadKind;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  city: string | null;
  details_json: unknown;
  status: LeadStatus;
  archived: boolean;
  created_at: string;
}

export interface LeadActionResult {
  ok?: boolean;
  error?: string;
}
