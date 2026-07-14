const os = require('os');
require('dotenv').config();

const { assertRequiredEnv, connectDB } = require('./src/config');
const { verifySmtpConnection } = require('./src/services/email.service');
const { runAutoSeedOnStartup } = require('./src/services/seedSuperAdmin.service');
const app = require('./src/app');

const PORT = Number(process.env.PORT) || 5050;
const HOST = (process.env.HOST || '0.0.0.0').trim();

function isIPv4(net) {
  return net.family === 'IPv4' || net.family === 4;
}

function listLanIPv4() {
  const out = [];
  const interfaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (!isIPv4(addr) || addr.internal) continue;
      out.push({ name, address: addr.address });
    }
  }
  return out;
}

function printStartupUrls() {
  const localUrl = `http://127.0.0.1:${PORT}`;
  console.log(`  Local machine:  ${localUrl}`);

  if (HOST !== '0.0.0.0') {
    console.log(`  Bound address:  http://${HOST}:${PORT}`);
    return;
  }

  let lan = [];
  try {
    lan = listLanIPv4();
  } catch {
    console.log('  Phone / LAN:    could not detect IPs (run on your Mac to see Wi‑Fi addresses).');
    console.log(`                  Manual: http://<your-mac-ip>:${PORT} (Expo app auto-detects this in dev)`);
    console.log('  Use the base URL only (no /api on the end; the app adds paths as needed).');
    return;
  }

  if (lan.length === 0) {
    console.log('  Phone / LAN:    (no external IPv4 found — connect Wi‑Fi or check firewall)');
    console.log('                  If you know this Mac’s IP, use: http://<your-ip>:' + PORT);
  } else {
    console.log('  Phone on same Wi‑Fi — the Expo app auto-detects your machine in dev:');
    for (const { name, address } of lan) {
      console.log(`    http://${address}:${PORT}   (${name})`);
    }
    console.log('  Use the base URL only (no /api on the end; the app adds paths as needed).');
  }
}

async function start() {
  try {
    assertRequiredEnv();
    await connectDB();
    await runAutoSeedOnStartup();

    if (process.env.SMTP_HOST?.trim()) {
      const smtp = await verifySmtpConnection();
      if (smtp.ok) {
        console.log('  SMTP:           connected (' + process.env.SMTP_USER.trim() + ')');
      } else {
        console.warn('  SMTP:           NOT working — ' + smtp.reason);
        console.warn('                  Account emails and superadmin email OTP will fail until fixed.');
        console.warn('                  Gmail: use a 16-char App Password (Google Account → Security → App passwords).');
        console.warn('                  Test: npm run test:smtp');
      }
    }

    const server = app.listen(PORT, HOST, () => {
      console.log('');
      console.log('  Medicine API — server is running');
      console.log('  ─────────────────────────────────');
      printStartupUrls();
      console.log(`\n  Listening on   http://${HOST}:${PORT}  (HOST=${HOST}, PORT=${PORT})`);
      console.log('\n  Ready: HTTP server is up and DynamoDB is connected.');
      console.log('');
    });

    server.requestTimeout = 620_000;
    server.headersTimeout = 620_000;

    const shutdown = (signal) => {
      console.log(`\n${signal} received, closing server…`);
      server.close(() => {
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    const msg =
      err.message ||
      err.code ||
      (err.name === 'AggregateError' && err.errors?.[0]?.code) ||
      String(err);
    console.error('Failed to start server:', msg);
    if (err.code === 'ECONNREFUSED' || err.errors?.some((e) => e.code === 'ECONNREFUSED')) {
      console.error('');
      console.error('  DynamoDB not reachable. Start local DB first:');
      console.error('    cd backend && npm run db:local');
      console.error('  Then in another terminal: npm run dev');
    }
    process.exit(1);
  }
}

start();
