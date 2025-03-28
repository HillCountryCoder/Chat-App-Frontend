import { z } from "zod";
export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters long")
    .max(30, "Username ust be at most 30 characters long")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  firstName: z.string().min(3, "First name is required"),
  lastName: z.string().optional(),
});

export const loginSchema = z
  .object({
    // Allow either email or username, but at least one must be provided
    email: z.string().email("Invalid email address").optional(),
    username: z.string().optional(),
    password: z.string().min(8, "Password is required"),
  })
  .refine((data) => data.email || data.username, {
    message: "Either email or username must be provided",
    path: ["email", "username"],
  });
export const messageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message is too long"),
  channelId: z.string().optional(),
  directMessageId: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

// Export types from schemas
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type MessageFormData = z.infer<typeof messageSchema>;
