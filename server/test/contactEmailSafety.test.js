const test = require('node:test');
const assert = require('node:assert/strict');

test('contact emails render submitted HTML as inert text', async () => {
  const nodemailer = require('nodemailer');
  const originalCreateTransport = nodemailer.createTransport;
  const sent = [];
  nodemailer.createTransport = () => ({
    sendMail: async options => {
      sent.push(options);
      return { messageId: `test-${sent.length}` };
    },
  });

  const modulePath = require.resolve('../src/utils/emailService');
  delete require.cache[modulePath];

  try {
    const { sendContactEmail } = require('../src/utils/emailService');
    await sendContactEmail({
      name: '<b>Attacker</b>',
      email: 'attacker@example.com',
      subject: '<img src=x onerror=alert(1)>',
      message: '<script>alert("owned")</script>',
    });

    assert.equal(sent.length, 2);
    for (const mail of sent) {
      assert.doesNotMatch(mail.html, /<script>|<img src=x|<b>Attacker<\/b>/);
      assert.match(mail.html, /&lt;script&gt;|&lt;img|&lt;b&gt;/);
      assert.ok(mail.text);
    }
  } finally {
    nodemailer.createTransport = originalCreateTransport;
    delete require.cache[modulePath];
  }
});
