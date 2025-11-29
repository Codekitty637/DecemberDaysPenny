import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function notifySolved(puzzleId: string, userAnswer: string) {
  const to = process.env.NOTIFY_EMAIL!;
  if (!to) return;
  await resend.emails.send({
    from: 'Penny Quest <notifications@yourdomain.com>', // or a resend domain
    to,
    subject: `✅ Penny solved puzzle ${puzzleId}`,
    text: `Puzzle ${puzzleId} solved with answer: "${userAnswer}" at ${new Date().toLocaleString()}`
  });
}
