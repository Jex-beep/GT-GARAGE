import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM   = process.env.FROM_EMAIL  || 'GT Garage <onboarding@resend.dev>';
const TO_SHOP = process.env.SHOP_EMAIL || '';

// Public logo URL (Supabase Storage) — override with LOGO_URL in .env if needed
const LOGO_URL = process.env.LOGO_URL ||
  'https://osemfrjaywyrwcojimuf.supabase.co/storage/v1/object/public/assets/gt-logo.png';

const SLOT_LABELS = {
  '08:00-10:00': '8:00 – 10:00 AM',
  '10:00-12:00': '10:00 AM – 12:00 NN',
  '13:00-15:00': '1:00 – 3:00 PM',
  '15:00-17:00': '3:00 – 5:00 PM',
};

/** Notify the shop of a new booking request. */
export async function notifyShopNewBooking(booking) {
  if (!TO_SHOP) return; // skip if no shop email configured

  const slot = SLOT_LABELS[booking.time_slot] || booking.time_slot;

  await resend.emails.send({
    from: FROM,
    to:   TO_SHOP,
    subject: `New booking request — ${booking.customer_name}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;border:1px solid #e8edf1;border-radius:6px;overflow:hidden">
        <!-- Header -->
        <div style="background:#14181d;padding:24px 32px;border-bottom:4px solid #1e9bff">
          <table style="border-collapse:collapse"><tr>
            <td style="padding-right:14px;vertical-align:middle">
              <img src="${LOGO_URL}" alt="GT Garage" width="48" height="48" style="display:block;border-radius:6px">
            </td>
            <td style="vertical-align:middle">
              <h1 style="color:#ffffff;font-size:24px;margin:0;text-transform:uppercase;letter-spacing:.02em">GT Garage</h1>
              <p style="color:#8a97a4;margin:4px 0 0;font-size:13px">New Booking Request</p>
            </td>
          </tr></table>
        </div>
        <!-- Body -->
        <div style="padding:32px">
          <p style="color:#2a333c;line-height:1.6;margin:0 0 20px">A new booking just came in. Details below:</p>
          <table style="font-size:15px;border-collapse:collapse;width:100%">
            <tr><td style="padding:10px 0;color:#8a97a4;width:140px;border-bottom:1px solid #e8edf1">Name</td><td style="padding:10px 0;font-weight:600;color:#14181d;border-bottom:1px solid #e8edf1">${esc(booking.customer_name)}</td></tr>
            <tr><td style="padding:10px 0;color:#8a97a4;border-bottom:1px solid #e8edf1">Phone</td><td style="padding:10px 0;border-bottom:1px solid #e8edf1"><a href="tel:${esc(booking.phone)}" style="color:#1e9bff;text-decoration:none">${esc(booking.phone)}</a></td></tr>
            <tr><td style="padding:10px 0;color:#8a97a4;border-bottom:1px solid #e8edf1">Email</td><td style="padding:10px 0;border-bottom:1px solid #e8edf1"><a href="mailto:${esc(booking.email)}" style="color:#1e9bff;text-decoration:none">${esc(booking.email)}</a></td></tr>
            <tr><td style="padding:10px 0;color:#8a97a4;border-bottom:1px solid #e8edf1">Date</td><td style="padding:10px 0;font-weight:600;color:#14181d;border-bottom:1px solid #e8edf1">${esc(booking.preferred_date)}</td></tr>
            <tr><td style="padding:10px 0;color:#8a97a4;border-bottom:1px solid #e8edf1">Time slot</td><td style="padding:10px 0;font-weight:600;color:#14181d;border-bottom:1px solid #e8edf1">${esc(slot)}</td></tr>
            <tr><td style="padding:10px 0;color:#8a97a4;vertical-align:top">Problem</td><td style="padding:10px 0;color:#2a333c">${esc(booking.problem)}</td></tr>
          </table>
          <div style="background:#f4f6f8;border-left:4px solid #1e9bff;padding:16px 20px;margin:28px 0 0;border-radius:0 4px 4px 0">
            <p style="margin:0;color:#2a333c;font-size:14px">Log in to the <strong>admin panel</strong> to confirm or reschedule this booking.</p>
          </div>
        </div>
        <!-- Footer -->
        <div style="background:#f4f6f8;padding:16px 32px;font-size:12px;color:#8a97a4">
          © GT Garage · Built for the long haul.
        </div>
      </div>
    `,
  });
}

/** Email the customer when their booking is confirmed by the admin.
 *  `message` is an optional personal note typed by the admin. */
export async function notifyCustomerConfirmed(booking, message) {
  const slot = SLOT_LABELS[booking.time_slot] || booking.time_slot;

  // Render the admin's note only when one was provided
  const noteBlock = message && message.trim()
    ? `<div style="background:#eaf5ff;border-left:4px solid #1e9bff;padding:16px 20px;margin:24px 0;border-radius:0 4px 4px 0">
         <p style="margin:0 0 6px;font-family:sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#0a6fd1;font-weight:700">A note from GT Garage</p>
         <p style="margin:0;color:#2a333c;line-height:1.6;white-space:pre-wrap">${esc(message.trim())}</p>
       </div>`
    : '';

  try {
    const { error } = await resend.emails.send({
    from: FROM,
    to:   booking.email,
    subject: `Your GT Garage booking is confirmed ✓`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#14181d;padding:28px 32px 24px;border-bottom:4px solid #1e9bff">
          <table style="border-collapse:collapse"><tr>
            <td style="padding-right:14px;vertical-align:middle">
              <img src="${LOGO_URL}" alt="GT Garage" width="52" height="52" style="display:block;border-radius:6px">
            </td>
            <td style="vertical-align:middle">
              <h1 style="color:#ffffff;font-size:28px;margin:0;text-transform:uppercase;letter-spacing:.02em">GT Garage</h1>
              <p style="color:#8a97a4;margin:4px 0 0;font-size:13px">Auto Repair · Mabalacat, Pampanga</p>
            </td>
          </tr></table>
        </div>
        <div style="padding:32px">
          <h2 style="color:#14181d;margin:0 0 16px">Your booking is confirmed!</h2>
          <p style="color:#2a333c;line-height:1.6">Hi ${esc(booking.customer_name.split(' ')[0])}, your service appointment has been approved. Here are your details:</p>
          <div style="background:#f4f6f8;border-left:4px solid #1e9bff;padding:20px 24px;margin:24px 0;border-radius:0 4px 4px 0">
            <table style="font-size:15px;border-collapse:collapse;width:100%">
              <tr><td style="padding:6px 0;color:#8a97a4;width:130px">Date</td><td style="padding:6px 0;font-weight:600;color:#14181d">${esc(booking.preferred_date)}</td></tr>
              <tr><td style="padding:6px 0;color:#8a97a4">Time</td><td style="padding:6px 0;font-weight:600;color:#14181d">${esc(slot)}</td></tr>
            </table>
          </div>
          ${noteBlock}
          <h3 style="color:#14181d;margin:0 0 8px">Where to go</h3>
          <p style="color:#2a333c;line-height:1.6;margin:0">183 Orange Street, San Francisco<br>Mabalacat, Pampanga</p>
          <p style="color:#2a333c;line-height:1.6;margin:16px 0 0">You can pay via <strong>Maya</strong> — cashless and convenient.</p>
          <p style="color:#2a333c;line-height:1.6;margin:16px 0 0">If you need to reschedule or have questions, reply to this email or message us on <a href="https://www.facebook.com/teamgtgarage" style="color:#1e9bff">Facebook</a>.</p>
        </div>
        <div style="background:#f4f6f8;padding:16px 32px;font-size:12px;color:#8a97a4">
          © GT Garage · Built for the long haul.
        </div>
      </div>
    `,
    });
    // Resend returns { error } on failure (e.g. free-tier recipient restriction)
    if (error) return { ok: false, error: error.message || 'Email failed to send' };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'Email failed to send' };
  }
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
