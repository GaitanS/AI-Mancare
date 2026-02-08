import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const contactRateLimit = withRateLimit({ limit: 5, windowMs: 60 * 60 * 1000, keyPrefix: 'contact' });

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'contact@catalogsmart.ro';
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

function sanitize(str: string): string {
  return str.replace(/[<>]/g, '').trim().slice(0, 2000);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await contactRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Toate campurile sunt obligatorii.' },
        { status: 400 }
      );
    }

    const cleanName = sanitize(name);
    const cleanEmail = sanitize(email);
    const cleanSubject = sanitize(subject);
    const cleanMessage = sanitize(message);

    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json(
        { error: 'Adresa de email nu este valida.' },
        { status: 400 }
      );
    }

    if (cleanName.length < 2 || cleanMessage.length < 10) {
      return NextResponse.json(
        { error: 'Numele trebuie sa aiba minim 2 caractere si mesajul minim 10.' },
        { status: 400 }
      );
    }

    // Try to send email via SMTP if configured
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: `"CatalogSmart Contact" <${SMTP_USER}>`,
          replyTo: cleanEmail,
          to: CONTACT_EMAIL,
          subject: `[CatalogSmart] ${cleanSubject}`,
          text: `Nume: ${cleanName}\nEmail: ${cleanEmail}\nSubiect: ${cleanSubject}\n\nMesaj:\n${cleanMessage}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #e11d48; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="color: white; margin: 0;">Mesaj nou de contact</h2>
              </div>
              <div style="background: #f5f5f4; padding: 20px; border-radius: 0 0 8px 8px;">
                <p><strong>Nume:</strong> ${cleanName}</p>
                <p><strong>Email:</strong> <a href="mailto:${cleanEmail}">${cleanEmail}</a></p>
                <p><strong>Subiect:</strong> ${cleanSubject}</p>
                <hr style="border: 1px solid #e7e5e4; margin: 16px 0;" />
                <p><strong>Mesaj:</strong></p>
                <p style="white-space: pre-wrap;">${cleanMessage}</p>
              </div>
            </div>
          `,
        });

        logger.info('Contact email sent', { to: CONTACT_EMAIL, subject: cleanSubject, from: cleanEmail });
      } catch (emailError) {
        logger.error('Failed to send contact email via SMTP', { error: emailError });
        // Fall through to log-based backup
      }
    } else {
      // No SMTP configured - log the contact message
      logger.info('Contact form submission (no SMTP configured)', {
        name: cleanName,
        email: cleanEmail,
        subject: cleanSubject,
        message: cleanMessage,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, message: 'Mesajul a fost trimis cu succes!' });
  } catch (error) {
    logger.error('Contact form error', { error });
    return NextResponse.json(
      { error: 'A aparut o eroare. Te rugam sa incerci din nou.' },
      { status: 500 }
    );
  }
}
