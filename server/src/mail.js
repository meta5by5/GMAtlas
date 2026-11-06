// mail.js — sends sign-in codes. One small interface, `send({to, subject,
// text})`, so the provider is a deployment choice (roadmap 2.1):
//   MAIL_MODE=log       development: prints the message instead of sending
//   RESEND_API_KEY      Resend's HTTP API (MAIL_FROM is the sender)
// Another provider is one more adapter here.

export function logMailer() {
  return { async send(message) { console.log(`[mail to ${message.to}] ${message.subject}`); } };
}

export function resendMailer(apiKey, from) {
  return {
    async send({ to, subject, text }) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from, to, subject, text }),
      });
      if (!res.ok) throw new Error(`mail send failed: ${res.status}`);
    },
  };
}

export function mailerFrom(env) {
  if (env.MAIL_MODE === 'log') return logMailer();
  if (env.RESEND_API_KEY) return resendMailer(env.RESEND_API_KEY, env.MAIL_FROM);
  return { async send() { throw new Error('No mail provider configured (set MAIL_MODE=log or RESEND_API_KEY).'); } };
}
