const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function verificationEmail(name: string, link: string) {
  return {
    subject: 'Verify your email address',
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>Welcome to LaTeX Collab. Please confirm your email address:</p>
<p><a href="${link}">Verify email</a></p>
<p>The link is valid for 24 hours. If you did not sign up, ignore this message.</p>`,
  };
}

export function passwordResetEmail(name: string, link: string) {
  return {
    subject: 'Reset your password',
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>We received a request to reset your password:</p>
<p><a href="${link}">Choose a new password</a></p>
<p>The link is valid for 1 hour. If you did not ask for this, ignore this message.</p>`,
  };
}
