const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean)
  .filter(file => !file.endsWith('package-lock.json') && !file.includes('/migrations/') && file !== 'scripts/scan-secrets.js');
const patterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['Google OAuth secret', /GOCSPX-[A-Za-z0-9_-]{20,}/],
  ['Stripe/Paystack secret', /\bsk_(?:live|test)_[A-Za-z0-9]{16,}/],
  ['database credentials', /postgres(?:ql)?:\/\/(?!postgres:postgres@localhost)[^\s:'"]+:[^\s@'"]+@/],
  ['committed environment secret', /^[ \t]*(?:JWT_SECRET|EMAIL_PASS|PAYSTACK_SECRET_KEY|DATABASE_URL)[ \t]*=[ \t]*(?!your-|example|placeholder|\r?$)[^\r\n]+/m],
];
const findings = [];
for (const file of files) {
  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
  for (const [name, pattern] of patterns) if (pattern.test(content)) findings.push(`${file}: possible ${name}`);
}
if (findings.length) { console.error(findings.join('\n')); process.exit(1); }
console.log(`Secret scan passed (${files.length} tracked files checked).`);
