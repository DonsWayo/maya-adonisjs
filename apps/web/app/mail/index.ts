import { WelcomeEmail, createEmail, createReactEmailTemplateEngine } from '@workspace/email'
import { Message } from '@adonisjs/mail'
import mail from '@adonisjs/mail/services/main'
import React from 'react'

/**
 * Setup the React Email adapter for AdonisJS
 * Call this function in your application bootstrap process
 */
export function setupReactEmailAdapter(): void {
  // Create the React Email template engine
  const reactEmailEngine = createReactEmailTemplateEngine()

  // Set the template engine for AdonisJS mail
  Message.templateEngine = {
    /**
     * Render a React Email component
     */
    async render(templatePath: string, data: Record<string, any>): Promise<string> {
      try {
        // For simplicity, we'll just use the data directly
        // In a real implementation, you might want to dynamically import components
        const emailElement = React.createElement(WelcomeEmail, data)
        
        // Render the component to HTML
        return reactEmailEngine.render(emailElement)
      } catch (error) {
        console.error(`Error rendering React Email template: ${templatePath}`, error)
        throw error
      }
    }
  }
}

/**
 * Helper function to send an email using React Email components
 */
export async function sendReactEmail<T extends Record<string, any>>(
  EmailComponent: React.ComponentType<T>,
  props: T,
  configureMessage: (message: Message) => void
) {
  // Create the React element
  const emailElement = createEmail(EmailComponent, props)
  
  // Get the React Email template engine
  const reactEmailEngine = createReactEmailTemplateEngine()
  
  // Send the email
  return mail.send(async (message) => {
    // Configure the message (from, to, subject, etc.)
    configureMessage(message)
    
    // Set the HTML content
    const html = await reactEmailEngine.render(emailElement)
    message.html(html)
    
    // Set the plain text content
    const text = await reactEmailEngine.renderPlainText(emailElement)
    message.text(text)
  })
}

/**
 * Send a welcome email to a user
 */
export async function sendWelcomeEmail(email: string, name: string, welcomeUrl: string) {
  return sendReactEmail(
    WelcomeEmail,
    {
      welcomeUrl,
      welcomeMessage: `Hello ${name}, welcome to our platform! We're excited to have you on board.`
    },
    (message) => {
      message.from(process.env.MAIL_FROM || 'noreply@example.com')
      message.to(email)
      message.subject('Welcome to our platform!')
    }
  )
}

// Initialize the React Email adapter
setupReactEmailAdapter()
