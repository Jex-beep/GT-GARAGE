import { z } from 'zod';

export const bookingSchema = z.object({
  customer_name:   z.string().trim().min(2,  'Name must be at least 2 characters'),
  phone:           z.string().trim().regex(/^(\+?63|0)9\d{9}$/, 'Enter a valid PH mobile number (e.g. 09XXXXXXXXX)'),
  email:           z.string().trim().email('Enter a valid email address'),
  problem:         z.string().trim().min(10, 'Please describe the problem in a bit more detail'),
  preferred_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  time_slot:       z.enum(['08:00-10:00', '10:00-12:00', '13:00-15:00', '15:00-17:00'], {
                     errorMap: () => ({ message: 'Choose a valid time slot' }),
                   }),
  recaptcha_token: z.string().optional(),
});

export const statusSchema = z.object({
  status: z.enum(['new', 'confirmed', 'done']),
  // Optional note the admin can include in the customer's confirmation email
  message: z.string().trim().max(1000).optional().nullable(),
});

export const serviceSchema = z.object({
  name:        z.string().trim().min(1),
  description: z.string().trim().min(1),
  price_from:  z.string().trim().min(1),
  sort_order:  z.number().int().optional().default(0),
  image_url:   z.string().trim().optional().nullable(),
  category:    z.enum(['standard', 'free', 'package']).optional(),
});

export const postSchema = z.object({
  title:        z.string().trim().min(1),
  slug:         z.string().trim().min(1).regex(/^[a-z0-9-]+$/),
  excerpt:      z.string().trim().min(1),
  body:         z.string().trim().min(1),
  cover_url:    z.string().trim().optional().nullable(),
  published_at: z.string().datetime({ offset: true }).optional().nullable(),
});

export const taskSchema = z.object({
  title:    z.string().trim().min(1),
  notes:    z.string().trim().optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  done:     z.boolean().optional().default(false),
});
