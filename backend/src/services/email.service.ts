import nodemailer, { Transporter } from 'nodemailer';
import env from '../config/env';

let transporter: Transporter | undefined;

// Real SMTP when configured; otherwise (and always in tests) a JSON
// transport that builds the email but never sends it.
function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (env.isTest || !env.smtp.host) {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  } else {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

export interface TaskAssignedEmail {
  to: string;
  assigneeName: string;
  taskTitle: string;
  projectName: string;
  taskId: string;
}

async function sendTaskAssignedEmail({ to, assigneeName, taskTitle, projectName, taskId }: TaskAssignedEmail) {
  const link = `${env.clientUrl}/tasks/${taskId}`;
  const info = await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject: `New task assigned: ${taskTitle}`,
    text: `Hi ${assigneeName},\n\nYou have been assigned "${taskTitle}" in project "${projectName}".\n\nView it here: ${link}\n`,
    html: `<p>Hi ${assigneeName},</p><p>You have been assigned <strong>${taskTitle}</strong> in project <strong>${projectName}</strong>.</p><p><a href="${link}">View task</a></p>`,
  });

  if (!env.smtp.host && !env.isTest) console.log(`[email] (not sent, no SMTP) to=${to} subject="New task assigned: ${taskTitle}"`);
  return info;
}

// Exported as an object so tests can jest.spyOn(emailService, '...').
export default { sendTaskAssignedEmail };
