/**
 * Email service — sends emails via Gmail SMTP.
 * Dark Orichalcos theme, table-based layout, bilingual (DE/EN).
 */

import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

type Lang = 'de' | 'en';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

function emailTemplate(content: string, lang: Lang): string {
  const footerText = lang === 'de'
    ? 'Diese E-Mail wurde automatisch versendet.'
    : 'This email was sent automatically.';
  const projectText = 'Duel Monsters Classic &mdash; Ein Fan-Projekt';
  const greeting = lang === 'de' ? 'Viele Gr&uuml;&szlig;e,' : 'Best regards,';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0; padding:0;" bgcolor="#030508">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#030508" style="background-color:#030508;">
  <tr>
    <td align="center" style="padding:24px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#06080a" style="background-color:#06080a; border:1px solid #0d1a15; max-width:520px;">

        <!-- Header -->
        <tr>
          <td bgcolor="#06080a" style="background-color:#06080a; padding:28px 32px; border-bottom:1px solid #0d1a15; text-align:center;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <span style="font-family:Georgia,serif; font-size:12px; color:#c8a830; letter-spacing:4px;">DMC</span><br>
                  <span style="font-family:Georgia,serif; font-size:22px; font-weight:bold; color:#00dca8; letter-spacing:2px;">Duel Monsters Classic</span><br>
                  <span style="font-family:Georgia,serif; font-size:10px; color:#1a3028; letter-spacing:3px;">DM &mdash; GX ERA</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td bgcolor="#06080a" style="background-color:#06080a; padding:32px; font-family:Georgia,serif; font-size:15px; color:#b8c8b8; line-height:1.7;">
            ${content}
          </td>
        </tr>

        <!-- Signature -->
        <tr>
          <td bgcolor="#040608" style="background-color:#040608; padding:24px 32px; border-top:1px solid #0d1a15; font-family:Georgia,serif;">
            <span style="font-size:13px; color:#2a4038;">${greeting}</span><br>
            <span style="font-size:13px; color:#00dca8; font-weight:bold;">Das DMC Team</span>
          </td>
        </tr>

        <!-- Spacer -->
        <tr><td bgcolor="#040608" style="background-color:#040608; height:24px;"></td></tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="#030508" style="background-color:#030508; padding:20px 32px; border-top:1px solid #0a1510; text-align:center;">
            <span style="font-family:Arial,sans-serif; font-size:11px;">
              <a href="https://discord.gg/E7Rj7BXkD9" style="color:#00dca8; text-decoration:none;">Discord</a>
              <span style="color:#0d1a15;"> &middot; </span>
              <a href="https://github.com/affenmens7" style="color:#00dca8; text-decoration:none;">GitHub</a>
            </span><br>
            <span style="font-family:Arial,sans-serif; font-size:10px; color:#0d1a15;">
              ${projectText}<br>
              ${footerText}
            </span>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export async function sendMail({ to, subject, html }: SendMailOptions) {
  await transporter.sendMail({
    from: `"Duel Monsters Classic" <${env.smtp.user}>`,
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail(to: string, username: string, code: string, lang: Lang = 'de') {
  const verifyUrl = `${env.frontendUrl}/app/verify?code=${code}`;

  const content = lang === 'de' ? `
    <span style="font-size:18px; color:#00dca8; font-weight:bold;">E-Mail best&auml;tigen</span>
    <br><br>
    Hallo ${username}, bitte best&auml;tige deine E-Mail-Adresse &uuml;ber den folgenden Link:
    <br><br>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td bgcolor="#040608" style="background-color:#040608; padding:16px; border:1px solid #0d1a15; text-align:center;">
          <span style="font-size:10px; color:#2a4038; letter-spacing:1px;">VERIFIZIERUNGSLINK</span><br><br>
          <a href="${verifyUrl}" style="color:#00dca8; font-size:14px;">${verifyUrl}</a>
        </td>
      </tr>
    </table>
    <br>
    <span style="font-size:13px; color:#80a090;">
      Der Link ist <strong style="color:#b8c8b8;">15 Minuten</strong> g&uuml;ltig.
      Nach der Best&auml;tigung kannst du alle Features nutzen.
    </span>
    <br><br>
    <span style="font-size:11px; color:#1a2820;">
      Falls du dich nicht registriert hast, ignoriere diese E-Mail.
    </span>
  ` : `
    <span style="font-size:18px; color:#00dca8; font-weight:bold;">Verify Email</span>
    <br><br>
    Hello ${username}, please verify your email address using the following link:
    <br><br>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td bgcolor="#040608" style="background-color:#040608; padding:16px; border:1px solid #0d1a15; text-align:center;">
          <span style="font-size:10px; color:#2a4038; letter-spacing:1px;">VERIFICATION LINK</span><br><br>
          <a href="${verifyUrl}" style="color:#00dca8; font-size:14px;">${verifyUrl}</a>
        </td>
      </tr>
    </table>
    <br>
    <span style="font-size:13px; color:#80a090;">
      This link is valid for <strong style="color:#b8c8b8;">15 minutes</strong>.
      After verification you can use all features.
    </span>
    <br><br>
    <span style="font-size:11px; color:#1a2820;">
      If you didn't register, you can ignore this email.
    </span>
  `;

  const subject = lang === 'de'
    ? 'Dein Verifizierungslink - Duel Monsters Classic'
    : 'Your verification link - Duel Monsters Classic';

  await sendMail({ to, subject, html: emailTemplate(content, lang) });
}

export async function sendPasswordResetEmail(to: string, username: string, code: string, lang: Lang = 'de') {
  const resetUrl = `${env.frontendUrl}/app/reset-password?code=${code}&email=${encodeURIComponent(to)}`;

  const content = lang === 'de' ? `
    <span style="font-size:18px; color:#00dca8; font-weight:bold;">Passwort zur&uuml;cksetzen</span>
    <br><br>
    Hallo ${username}, du hast angefordert dein Passwort zur&uuml;ckzusetzen.
    Klicke auf den Button um ein neues Passwort zu w&auml;hlen:
    ${actionLink(resetUrl, lang === 'de' ? 'Passwort zur\u00fccksetzen' : 'Reset Password')}
    <span style="font-size:13px; color:#80a090;">
      Der Link ist <strong style="color:#b8c8b8;">15 Minuten</strong> g&uuml;ltig.
    </span>
    <br><br>
    <span style="font-size:11px; color:#2a4038;">
      Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
      <a href="${resetUrl}" style="color:#2a4038; word-break:break-all;">${resetUrl}</a>
    </span>
    <br><br>
    <span style="font-size:11px; color:#1a2820;">
      Falls du dies nicht angefordert hast, ignoriere diese E-Mail. Dein Passwort bleibt unver&auml;ndert.
    </span>
  ` : `
    <span style="font-size:18px; color:#00dca8; font-weight:bold;">Reset Password</span>
    <br><br>
    Hello ${username}, you requested to reset your password.
    Click the button below to choose a new password:
    ${actionLink(resetUrl, lang === 'de' ? 'Passwort zur\u00fccksetzen' : 'Reset Password')}
    <span style="font-size:13px; color:#80a090;">
      This link is valid for <strong style="color:#b8c8b8;">15 minutes</strong>.
    </span>
    <br><br>
    <span style="font-size:11px; color:#2a4038;">
      If the button doesn't work, copy this link into your browser:<br>
      <a href="${resetUrl}" style="color:#2a4038; word-break:break-all;">${resetUrl}</a>
    </span>
    <br><br>
    <span style="font-size:11px; color:#1a2820;">
      If you didn't request this, ignore this email. Your password remains unchanged.
    </span>
  `;

  const subject = lang === 'de'
    ? 'Duel Monsters Classic \u2014 Passwort zur\u00fccksetzen'
    : 'Duel Monsters Classic \u2014 Reset Password';

  await sendMail({ to, subject, html: emailTemplate(content, lang) });
}

export async function sendWelcomeEmail(to: string, username: string, displayName: string, lang: Lang = 'de') {
  const content = lang === 'de' ? `
    <span style="font-size:18px; color:#00dca8; font-weight:bold;">Willkommen bei Duel Monsters Classic!</span>
    <br><br>
    Hallo ${username}, dein Account wurde erfolgreich erstellt.
    <br><br>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td bgcolor="#040608" style="background-color:#040608; padding:16px; border:1px solid #0d1a15; text-align:center;">
          <span style="font-size:10px; color:#2a4038; letter-spacing:1px;">DEIN SPIELERNAME</span><br>
          <span style="font-size:20px; font-weight:bold; color:#00dca8;">${displayName}</span>
        </td>
      </tr>
    </table>
    <br>
    <span style="font-size:14px; color:#80a090;">
      Erkunde den Kartenbrowser mit &uuml;ber 1700 Karten, stelle dein erstes Deck zusammen
      und tauche ein in die Welt der DM-&Auml;ra.
    </span>
    <br><br>
    <span style="font-size:14px; color:#80a090;">
      Tritt unserer <a href="https://discord.gg/E7Rj7BXkD9" style="color:#00dca8;">Discord Community</a>
      bei f&uuml;r Updates und Mitspieler.
    </span>
  ` : `
    <span style="font-size:18px; color:#00dca8; font-weight:bold;">Welcome to Duel Monsters Classic!</span>
    <br><br>
    Hello ${username}, your account has been created successfully.
    <br><br>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td bgcolor="#040608" style="background-color:#040608; padding:16px; border:1px solid #0d1a15; text-align:center;">
          <span style="font-size:10px; color:#2a4038; letter-spacing:1px;">YOUR PLAYER NAME</span><br>
          <span style="font-size:20px; font-weight:bold; color:#00dca8;">${displayName}</span>
        </td>
      </tr>
    </table>
    <br>
    <span style="font-size:14px; color:#80a090;">
      Explore the card browser with over 1700 cards, build your first deck
      and dive into the world of the DM era.
    </span>
    <br><br>
    <span style="font-size:14px; color:#80a090;">
      Join our <a href="https://discord.gg/E7Rj7BXkD9" style="color:#00dca8;">Discord Community</a>
      for updates and fellow players.
    </span>
  `;

  const subject = lang === 'de'
    ? 'Willkommen bei Duel Monsters Classic!'
    : 'Welcome to Duel Monsters Classic!';

  await sendMail({ to, subject, html: emailTemplate(content, lang) });
}
