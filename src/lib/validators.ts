import { z } from "zod";

export const ALLOWED_STAGES = [
  "DRAFT",
  "APPLIED",
  "RECRUITER_SCREEN",
  "TECH_SCREEN",
  "ONSITE",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;

export const CreateCompanySchema = z.object({
  name: z.string().min(2).max(120),
  website: z.string().url().optional().or(z.literal("")),
  location: z.string().max(120).optional().or(z.literal("")),
  industry: z.string().max(120).optional().or(z.literal("")),
});

export const CreateRoleSchema = z.object({
  companyId: z.string().uuid(),
  title: z.string().min(2).max(160),
  url: z.string().url().optional().or(z.literal("")),
  location: z.string().max(120).optional().or(z.literal("")),
  workType: z.string().max(40).optional().or(z.literal("")),
  description: z.string().max(20000).optional().or(z.literal("")),
});

export const CreateApplicationSchema = z.object({
  companyName: z.string().min(1).max(120),
  roleTitle: z.string().min(1).max(160),
  source: z.string().max(120).optional().nullable(),
  stage: z.enum(ALLOWED_STAGES).optional().default("DRAFT"),
});

export const UpdateApplicationStageSchema = z.object({
  stage: z.enum(ALLOWED_STAGES),
});
