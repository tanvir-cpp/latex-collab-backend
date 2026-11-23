import { escapeHtml } from '../../common/utils/html.util.js';

export function invitationEmail(inviterName: string, projectName: string, role: string, link: string) {
  return {
    subject: `${inviterName} invited you to "${projectName}"`,
    html: `<p>${escapeHtml(inviterName)} invited you to collaborate on <strong>${escapeHtml(projectName)}</strong> as ${escapeHtml(role)}.</p>
<p><a href="${link}">Accept the invitation</a></p>
<p>Sign in (or create an account) with this email address first. The link is valid for 7 days.</p>`,
  };
}
