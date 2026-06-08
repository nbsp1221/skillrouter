import * as z from "zod";

export const SkillFrontmatterSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
});
