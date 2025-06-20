import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

/**
 * Determine the default mailer based on environment
 * Use SMTP (MailHog) for development and Resend for production
 */
const defaultMailer = env.get('SMTP_HOST') ? 'smtp' : 'resend'

const mailConfig = defineConfig({
  default: defaultMailer,

  /**
   * The mailers object can be used to configure multiple mailers
   * each using a different transport or same transport with different
   * options.
   */
  mailers: {
    // SMTP configuration for local development with MailHog
    smtp: transports.smtp({
      host: env.get('SMTP_HOST') || 'localhost',
      port: env.get('SMTP_PORT') || 1025,
      secure: env.get('SMTP_SECURE', false),
      auth: env.get('SMTP_USERNAME')
        ? {
            type: 'login',
            user: env.get('SMTP_USERNAME') || '',
            pass: env.get('SMTP_PASSWORD') || '',
          }
        : undefined,
      tls: {
        rejectUnauthorized: false,
      },
      // No authentication needed for MailHog
      requireTLS: false,
      // Debug option not available in type definition, but works at runtime
      // @ts-ignore - debug is a valid option for nodemailer
      debug: env.get('NODE_ENV') === 'development',
    }),

    // Resend configuration for production
    resend: transports.resend({
      key: env.get('RESEND_API_KEY', ''),
      baseUrl: 'https://api.resend.com',
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
