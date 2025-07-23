import { z } from "zod";

export const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        val.trim() === "" ||
        /^(\+?\d{10,15})$/.test(val.trim()),
      {
        message: "Invalid phone number",
      }
    ),
  email: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        val.trim() === "" ||
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()),
      {
        message: "Invalid email address",
      }
    ),
  address: z.string().optional(),
  notes: z.string().optional(),
  loyaltyStatus: z.enum(["regular", "vip"]).default("regular"),
});