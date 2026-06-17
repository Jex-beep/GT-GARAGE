import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { supabase, verifyToken } from './supabase.js';
import { bookingSchema, statusSchema, serviceSchema, postSchema, taskSchema } from './schema.js';
import { notifyShopNewBooking, notifyCustomerConfirmed } from './notify.js';

const app  = express();
const PORT = process.env.PORT || 3000;

// ── SECURITY MIDDLEWARE ────────────────────────────────────────────────
app.use(helmet());
// FRONTEND_ORIGIN may be a comma-separated list (e.g. localhost + deployed site)
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:4200')
  .split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '32kb' }));

// Rate-limit booking submissions: 50 per 15 minutes per IP (relaxed for dev/testing)
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many booking requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Image uploads — held in memory, 5 MB cap, images only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(Object.assign(new Error('Only image files are allowed'), { status: 422 }));
  },
});

// ── HELPERS ────────────────────────────────────────────────────────────
function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join('; ');
    throw Object.assign(new Error(message), { status: 422 });
  }
  return result.data;
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ── SERVICES CACHE (10 min) ────────────────────────────────────────────
let servicesCache = null;
let servicesCacheAt = 0;
const CACHE_TTL = 10 * 60 * 1000;

async function fetchServices() {
  if (servicesCache && Date.now() - servicesCacheAt < CACHE_TTL) {
    return servicesCache;
  }
  const { data, error } = await supabase
    .from('services')
    .select('name, description, price_from, image_url')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  servicesCache  = data;
  servicesCacheAt = Date.now();
  return data;
}

function clearServicesCache() { servicesCache = null; }

// ── HEALTH ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── DYNAMIC SITEMAP (includes published blog posts) ────────────────────
// Serve this at your site root (e.g. proxy /sitemap.xml → this) for full coverage.
app.get('/sitemap.xml', asyncHandler(async (_req, res) => {
  const site = (process.env.SITE_URL || 'https://gtgarage.ph').replace(/\/$/, '');
  const staticUrls = [
    { loc: `${site}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${site}/services`, priority: '0.9', changefreq: 'monthly' },
    { loc: `${site}/about`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${site}/book`, priority: '0.9', changefreq: 'monthly' },
    { loc: `${site}/blogs`, priority: '0.8', changefreq: 'weekly' },
  ];
  const { data: posts } = await supabase
    .from('posts').select('slug, published_at').not('published_at', 'is', null);
  const postUrls = (posts || []).map((p) => ({
    loc: `${site}/blogs/${p.slug}`,
    lastmod: p.published_at ? String(p.published_at).split('T')[0] : undefined,
    priority: '0.6',
  }));

  const body = [...staticUrls, ...postUrls].map((u) =>
    `  <url><loc>${u.loc}</loc>` +
    (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : '') +
    (u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : '') +
    (u.priority ? `<priority>${u.priority}</priority>` : '') +
    `</url>`,
  ).join('\n');

  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`,
  );
}));

// ── SERVICES (public read) ─────────────────────────────────────────────
app.get('/api/services', asyncHandler(async (_req, res) => {
  res.json(await fetchServices());
}));

// ── BOOKINGS ───────────────────────────────────────────────────────────

// POST /api/bookings — public: create a booking
app.post('/api/bookings', bookingLimiter, asyncHandler(async (req, res) => {
  const payload = validate(bookingSchema, req.body);

  // Save BEFORE sending email so a booking is never lost due to email failure
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      customer_name:  payload.customer_name,
      phone:          payload.phone,
      email:          payload.email,
      problem:        payload.problem,
      preferred_date: payload.preferred_date,
      time_slot:      payload.time_slot,
      status:         'new',
    })
    .select('id')
    .single();

  if (error) throw error;

  // Fire shop notification — don't block the response on email success
  notifyShopNewBooking(payload).catch((err) =>
    console.error('[notify] shop email failed:', err.message)
  );

  res.status(201).json({ id: data.id });
}));

// ── PUBLIC BOOKING TRACKING ────────────────────────────────────────────
// Safe subset of fields a customer is allowed to see about their booking
const TRACK_FIELDS = 'id, customer_name, preferred_date, time_slot, status, admin_note, created_at';

// GET /api/bookings/track/:id — public: look up one booking by its (unguessable) id
app.get('/api/bookings/track/:id', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select(TRACK_FIELDS)
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Booking not found' });
  res.json(data);
}));

// POST /api/bookings/lookup — public: find a customer's latest booking by email + phone
app.post('/api/bookings/lookup', asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const phone = String(req.body?.phone || '').trim();
  if (!email || !phone) {
    return res.status(422).json({ error: 'Enter both your email and phone number.' });
  }
  const { data, error } = await supabase
    .from('bookings')
    .select(TRACK_FIELDS)
    .ilike('email', email)
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'No booking found with that email and phone.' });
  res.json(data);
}));

// GET /api/bookings — admin: list all bookings
app.get('/api/bookings', asyncHandler(async (req, res) => {
  await verifyToken(req.headers.authorization);
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  res.json(data);
}));

// PATCH /api/bookings/:id — admin: update status
app.patch('/api/bookings/:id', asyncHandler(async (req, res) => {
  await verifyToken(req.headers.authorization);
  const { status, message } = validate(statusSchema, req.body);

  // On confirm, also persist the admin's note so it shows on the customer's tracking page
  const patch = { status };
  if (status === 'confirmed' && message != null) patch.admin_note = message.trim() || null;

  const { data, error } = await supabase
    .from('bookings')
    .update(patch)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Booking not found' });

  // When confirmed → the customer sees it on their tracking page.
  // Also attempt the email (works once a domain is verified) + create a calendar task.
  if (status === 'confirmed') {
    // Fire-and-forget — don't block or surface failures; tracking page is the source of truth
    notifyCustomerConfirmed(data, message).then((r) => {
      if (!r.ok) console.error('[notify] customer email skipped/failed:', r.error);
    }).catch((err) => console.error('[notify] customer email error:', err.message));

    supabase.from('tasks').insert({
      title:    `${data.customer_name} — ${data.time_slot}`,
      notes:    data.problem,
      due_date: data.preferred_date,
    }).then(({ error: te }) => {
      if (te) console.error('[tasks] auto-create failed:', te.message);
    });
  }

  res.json(data);
}));

// ── IMAGE UPLOAD (admin) ───────────────────────────────────────────────
// Uploads an image to Supabase Storage (public "assets" bucket) and returns its URL
app.post('/api/upload', upload.single('file'), asyncHandler(async (req, res) => {
  await verifyToken(req.headers.authorization);
  if (!req.file) return res.status(422).json({ error: 'No file provided' });

  const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from('assets').upload(path, req.file.buffer, {
    contentType: req.file.mimetype,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('assets').getPublicUrl(path);
  res.status(201).json({ url: data.publicUrl });
}));

// ── SERVICES CMS (admin) ───────────────────────────────────────────────
// Full rows (incl. id, sort_order, image_url) for the admin editor
app.get('/api/services/all', asyncHandler(async (req, res) => {
  await verifyToken(req.headers.authorization);
  const { data, error } = await supabase
    .from('services')
    .select('id, name, description, price_from, sort_order, image_url')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  res.json(data);
}));

app.post('/api/services', asyncHandler(async (req, res) => {
  await verifyToken(req.headers.authorization);
  const payload = validate(serviceSchema, req.body);
  const { data, error } = await supabase.from('services').insert(payload).select().single();
  if (error) throw error;
  clearServicesCache();
  res.status(201).json(data);
}));

app.patch('/api/services/:id', asyncHandler(async (req, res) => {
  await verifyToken(req.headers.authorization);
  const payload = validate(serviceSchema.partial(), req.body);
  const { data, error } = await supabase.from('services').update(payload).eq('id', req.params.id).select().single();
  if (error) throw error;
  clearServicesCache();
  res.json(data);
}));

app.delete('/api/services/:id', asyncHandler(async (req, res) => {
  await verifyToken(req.headers.authorization);
  const { error } = await supabase.from('services').delete().eq('id', req.params.id);
  if (error) throw error;
  clearServicesCache();
  res.status(204).end();
}));

// ── POSTS CMS (admin write / public read of published) ─────────────────
app.get('/api/posts', asyncHandler(async (req, res) => {
  // Public: only published. Admin (with token): all including drafts.
  let query = supabase.from('posts').select('*').order('published_at', { ascending: false });
  try {
    await verifyToken(req.headers.authorization);
    // authenticated — return all
  } catch {
    // unauthenticated — published only
    query = query.not('published_at', 'is', null);
  }
  const { data, error } = await query;
  if (error) throw error;
  res.json(data);
}));

app.post('/api/posts', asyncHandler(async (req, res) => {
  await verifyToken(req.headers.authorization);
  const payload = validate(postSchema, req.body);
  const { data, error } = await supabase.from('posts').insert(payload).select().single();
  if (error) throw error;
  res.status(201).json(data);
}));

app.patch('/api/posts/:id', asyncHandler(async (req, res) => {
  await verifyToken(req.headers.authorization);
  const payload = validate(postSchema.partial(), req.body);
  const { data, error } = await supabase.from('posts').update(payload).eq('id', req.params.id).select().single();
  if (error) throw error;
  res.json(data);
}));

app.delete('/api/posts/:id', asyncHandler(async (req, res) => {
  await verifyToken(req.headers.authorization);
  const { error } = await supabase.from('posts').delete().eq('id', req.params.id);
  if (error) throw error;
  res.status(204).end();
}));

// ── TASKS (admin calendar) ─────────────────────────────────────────────
app.get('/api/tasks', asyncHandler(async (req, res) => {
  await verifyToken(req.headers.authorization);
  const { data, error } = await supabase.from('tasks').select('*').order('due_date');
  if (error) throw error;
  res.json(data);
}));

app.post('/api/tasks', asyncHandler(async (req, res) => {
  await verifyToken(req.headers.authorization);
  const payload = validate(taskSchema, req.body);
  const { data, error } = await supabase.from('tasks').insert(payload).select().single();
  if (error) throw error;
  res.status(201).json(data);
}));

app.patch('/api/tasks/:id', asyncHandler(async (req, res) => {
  await verifyToken(req.headers.authorization);
  const payload = validate(taskSchema.partial(), req.body);
  const { data, error } = await supabase.from('tasks').update(payload).eq('id', req.params.id).select().single();
  if (error) throw error;
  res.json(data);
}));

app.delete('/api/tasks/:id', asyncHandler(async (req, res) => {
  await verifyToken(req.headers.authorization);
  const { error } = await supabase.from('tasks').delete().eq('id', req.params.id);
  if (error) throw error;
  res.status(204).end();
}));

// ── GLOBAL ERROR HANDLER ───────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`GT Garage API running on http://localhost:${PORT}`);
});
