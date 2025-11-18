import { z } from 'zod';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;

export const fileSchema = z.object({
  name: z.string()
    .max(255, 'Filename must be less than 255 characters')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Filename contains invalid characters'),
  size: z.number()
    .max(MAX_FILE_SIZE, 'File size must be less than 10MB')
    .positive('File size must be positive'),
  type: z.enum(ALLOWED_FILE_TYPES, {
    errorMap: () => ({ message: 'File type must be PDF, PNG, or JPEG' })
  })
});

export type ValidatedFile = z.infer<typeof fileSchema>;

export const validateFile = (file: File): { success: boolean; error?: string; data?: ValidatedFile } => {
  try {
    const validated = fileSchema.parse({
      name: sanitizeFilename(file.name),
      size: file.size,
      type: file.type
    });
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Invalid file' };
  }
};

export const sanitizeFilename = (filename: string): string => {
  // Remove path separators and dangerous characters
  return filename
    .replace(/[/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
};
