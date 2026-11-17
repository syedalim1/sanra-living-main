import { z } from "zod";
import { LEAD_STATUSES } from "@/lib/b2b/leads";

export const LeadStatusInputSchema = z
  .object({
    lead_id: z.string().uuid(),
    status: z.enum(LEAD_STATUSES),
  })
  .strict();

export const LeadArchiveInputSchema = z
  .object({
    lead_id: z.string().uuid(),
    archived: z.boolean(),
  })
  .strict();
