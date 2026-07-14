const nodemailer = require('nodemailer');
const { formatPhoneForDisplay } = require('../utils/phone');

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).
  replace(/&/g, '&amp;').
  replace(/</g, '&lt;').
  replace(/>/g, '&gt;').
  replace(/"/g, '&quot;');
}

function getTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true';

  const options = {
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER?.trim(),
      pass: process.env.SMTP_PASS?.trim()
    },
    requireTLS: !secure,
    tls: { minVersion: 'TLSv1.2' }
  };

  if (host === 'smtp.gmail.com') {
    options.service = 'gmail';
  }

  return nodemailer.createTransport(options);
}

function govHtmlWrapper(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.10);">

        <!-- Tricolor top stripe -->
        <tr>
          <td style="padding:0;line-height:0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#FF9933;height:5px;width:33.33%;"></td>
                <td style="background:#FFFFFF;height:5px;width:33.33%;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;"></td>
                <td style="background:#138808;height:5px;width:33.33%;"></td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Header -->
        <tr>
          <td style="background:#1B2A50;padding:24px 32px;text-align:center;">
            <p style="margin:0 0 2px 0;font-size:11px;color:#a0aec0;letter-spacing:2px;text-transform:uppercase;">Government of India &nbsp;·&nbsp; Ministry of Defence</p>
            <h1 style="margin:6px 0 2px 0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:1px;">DAPD</h1>
            <p style="margin:0;font-size:11px;color:#90a4c4;letter-spacing:1px;">Defence Articles Pricing Depository</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px 24px 40px;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f7f8fa;padding:16px 40px;border-top:1px solid #e8eaf0;text-align:center;">
            <p style="margin:0 0 4px 0;font-size:11px;color:#9aa3b2;">This is an automated message from DAPD. Do not reply to this email.</p>
            <p style="margin:0;font-size:11px;color:#9aa3b2;">Government of India &nbsp;·&nbsp; Ministry of Defence</p>
          </td>
        </tr>

        <!-- Tricolor bottom stripe -->
        <tr>
          <td style="padding:0;line-height:0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#FF9933;height:4px;width:33.33%;"></td>
                <td style="background:#FFFFFF;height:4px;width:33.33%;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;"></td>
                <td style="background:#138808;height:4px;width:33.33%;"></td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendAdminSignupNotification(toAddress, adminName) {
  const transport = getTransport();
  const name = adminName || 'A new office';

  const bodyHtml = `
    <p style="margin:0 0 8px 0;font-size:15px;color:#374151;">Dear Superadmin,</p>
    <p style="margin:0 0 20px 0;font-size:15px;color:#374151;line-height:1.6;">
      A new admin registration is <strong>pending your approval</strong> on DAPD.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;border:1px solid #e8eaf0;border-radius:4px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6b7280;width:140px;">Office / Name</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${name}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6b7280;">Status</td>
              <td style="padding:6px 0;">
                <span style="background:#fff3cd;color:#856404;font-size:12px;font-weight:700;padding:3px 10px;border-radius:12px;letter-spacing:0.5px;">PENDING APPROVAL</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px 0;font-size:14px;color:#374151;">
      Please log in to DAPD to review and approve or reject this registration.
    </p>
    <p style="margin:0;font-size:13px;color:#9aa3b2;">
      Login → Admin Approvals tab → Review request
    </p>
  `;

  await transport.sendMail({
    from: `"DAPD — Govt. of India" <${process.env.SMTP_USER}>`,
    to: toAddress,
    subject: `[DAPD] New admin registration pending approval — ${name}`,
    text: `DAPD — Government of India, Ministry of Defence\n\nNew admin registration pending approval:\nOffice: ${name}\n\nPlease log in to DAPD to review and approve this registration.`,
    html: govHtmlWrapper('DAPD — New Admin Registration', bodyHtml)
  });
}

async function sendAdminApprovedEmail(toAddress) {
  const transport = getTransport();

  const bodyHtml = `
    <p style="margin:0 0 8px 0;font-size:15px;color:#374151;">Dear Admin,</p>
    <p style="margin:0 0 24px 0;font-size:15px;color:#374151;line-height:1.6;">
      Your <strong>DAPD</strong> admin account has been <strong>approved</strong> by the superadmin.
      You may now log in to the application and begin managing your unit's article records in DAPD.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#138808;border-radius:6px;padding:14px 40px;text-align:center;">
                <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">&#10003;&nbsp; Account Approved</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-left:4px solid #138808;border-radius:2px;margin-bottom:20px;">
      <tr>
        <td style="padding:12px 16px;">
          <p style="margin:0;font-size:13px;color:#166534;line-height:1.5;">
            Open the DAPD app on your mobile and sign in with your registered email and password.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#9aa3b2;">
      Sent to: ${toAddress}
    </p>
  `;

  await transport.sendMail({
    from: `"DAPD — Govt. of India" <${process.env.SMTP_USER}>`,
    to: toAddress,
    subject: '[DAPD] Your admin account has been approved',
    text: `DAPD — Government of India, Ministry of Defence\n\nYour DAPD admin account has been approved.\nYou can now log in to the app with your registered email and password.`,
    html: govHtmlWrapper('DAPD — Account Approved', bodyHtml)
  });
}

async function sendProvisionedAccountCredentialsEmail(toAddress, { email, phone, password, roleLabel }) {
  const label = roleLabel || 'User';
  const e = escapeHtml(email);
  const pw = escapeHtml(password);
  const phoneDisplay = formatPhoneForDisplay(phone) || String(phone || '').trim() || '—';
  const phoneHtml = escapeHtml(phoneDisplay);

  const bodyHtml = `
    <p style="margin:0 0 8px 0;font-size:15px;color:#374151;">Dear User,</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.6;">
      Your <strong>DAPD</strong> account has been created as <strong>${escapeHtml(label)}</strong>.
      Sign in with your <strong>mobile number</strong> and the temporary password below. On your <strong>first login only</strong>, you will be asked to <strong>change your password</strong> once for security.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;border:1px solid #e8eaf0;border-radius:4px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6b7280;width:140px;">Mobile</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${phoneHtml}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6b7280;width:140px;">Email</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${e}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6b7280;vertical-align:top;">Temporary password</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;font-family:monospace;">${pw}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border-left:4px solid #FF9933;border-radius:2px;margin-bottom:16px;">
      <tr>
        <td style="padding:12px 16px;">
          <p style="margin:0;font-size:13px;color:#7b5c00;line-height:1.5;">
            <strong>Security:</strong> Do not share these credentials. You must change your password on <strong>first login only</strong> (one time).
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#9aa3b2;">Sent to: ${e}</p>
  `;

  const text =
    `DAPD — Government of India, Ministry of Defence\n\n` +
    `Your DAPD account (${label}) has been created.\n\n` +
    `Mobile: ${phoneDisplay}\nEmail: ${email}\nTemporary password: ${password}\n\n` +
    `Sign in with your mobile number and this password. You must change your password on first login only (one time). Do not share these credentials.`;

  const mailPayload = {
    from: `"DAPD — Govt. of India" <${process.env.SMTP_USER}>`,
    to: toAddress,
    subject: `[DAPD] Your ${label} account — sign-in details`,
    text,
    html: govHtmlWrapper(`DAPD — ${label} account`, bodyHtml)
  };

  const tryConsoleFallback = (reason) => {
    if (process.env.NODE_ENV === 'production') return null;
    logProvisionedCredentialsToConsole({ email, phone: phoneDisplay, password, roleLabel: label, reason });
    return { channel: 'console', warning: reason };
  };

  if (!isSmtpConfigured()) {
    const fallback = tryConsoleFallback('SMTP is not configured');
    if (fallback) return fallback;
    throw new Error('SMTP is not configured');
  }

  const transport = getTransport();
  try {
    await transport.sendMail(mailPayload);
    return { channel: 'email' };
  } catch (err) {
    console.error(`[email] Provisioned credentials email failed for ${toAddress}:`, err?.message || err);
    const fallback = tryConsoleFallback(err?.message || 'SMTP send failed');
    if (fallback) return fallback;
    throw err;
  }
}

function logProvisionedCredentialsToConsole({ email, phone, password, roleLabel, reason }) {
  const appName = process.env.TWILIO_APP_NAME?.trim() || 'DAPD';
  const lines = [
    '',
    `──────── ${appName} provisioned account (console — email not sent) ────────`,
    reason ? `  reason: ${reason}` : null,
    `  role:     ${roleLabel || 'User'}`,
    `  mobile:   ${phone || '—'}`,
    `  email:    ${email || '—'}`,
    `  password: ${password}`,
    '  User must change this password on first sign-in.',
    '──────────────────────────────────────────────────────────────────────────',
    ''
  ].filter(Boolean);
  console.info(lines.join('\n'));
}

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASS?.trim()
  );
}

async function verifySmtpConnection() {
  if (!isSmtpConfigured()) {
    return { ok: false, reason: 'SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)' };
  }
  const transport = getTransport();
  try {
    await transport.verify();
    return { ok: true };
  } catch (err) {
    const message = err?.message || String(err);
    return { ok: false, reason: message };
  }
}

function otpEmailBody(kind, otp) {
  const appName = process.env.TWILIO_APP_NAME?.trim() || 'DAPD';
  const label = kind === 'reset' ? 'password reset' : 'login';
  return {
    subject: `[DAPD] Your ${label} code`,
    text:
      `DAPD — Government of India, Ministry of Defence\n\n` +
      `Your ${appName} ${label} code is ${otp}.\n` +
      `It expires in 10 minutes. Do not share this code.`,
    bodyHtml: `
    <p style="margin:0 0 8px 0;font-size:15px;color:#374151;">Dear User,</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.6;">
      Your <strong>${escapeHtml(appName)}</strong> ${label} code is:
    </p>
    <p style="margin:0 0 16px 0;font-size:28px;font-weight:700;letter-spacing:6px;color:#1A3A6B;font-family:monospace;">${escapeHtml(otp)}</p>
    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">
      This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
    </p>`
  };
}

async function sendLoginOtpEmail(toAddress, otp) {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP is not configured');
  }
  const transport = getTransport();
  const { subject, text, bodyHtml } = otpEmailBody('login', otp);
  await transport.sendMail({
    from: `"DAPD — Govt. of India" <${process.env.SMTP_USER}>`,
    to: toAddress,
    subject,
    text,
    html: govHtmlWrapper('DAPD — Login code', bodyHtml)
  });
}

async function sendResetPasswordOtpEmail(toAddress, otp) {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP is not configured');
  }
  const transport = getTransport();
  const { subject, text, bodyHtml } = otpEmailBody('reset', otp);
  await transport.sendMail({
    from: `"DAPD — Govt. of India" <${process.env.SMTP_USER}>`,
    to: toAddress,
    subject,
    text,
    html: govHtmlWrapper('DAPD — Password reset code', bodyHtml)
  });
}

module.exports = {
  isSmtpConfigured,
  verifySmtpConnection,
  sendAdminSignupNotification,
  sendAdminApprovedEmail,
  sendProvisionedAccountCredentialsEmail,
  sendLoginOtpEmail,
  sendResetPasswordOtpEmail
};
