import { Message } from '@adonisjs/mail'
import { createReactEmailTemplateEngine, createEmail } from '@workspace/email/src/index'
import React from 'react'

/**
 * Configure AdonisJS to use React Email as the template engine
 * Call this function in your application bootstrap process
 */
export function setupReactEmailAdapter() {
  // Create the React Email template engine
  const reactEmailEngine = createReactEmailTemplateEngine()

  // Set the template engine for AdonisJS mail
  Message.templateEngine = {
    /**
     * Render a React Email component
     * 
     * The templatePath should be a React component imported from @maya/email
     * The data will be passed as props to the component
     */
    async render(templatePath: string, data: Record<string, any>) {
      try {
        // Dynamic import of the React Email component
        const EmailComponent = await import(templatePath)
        
        // Create a React element with the component and data
        const emailElement = React.createElement(EmailComponent.default, data)
        
        // Render the component to HTML
        return reactEmailEngine.render(emailElement, {})
      } catch (error) {
        console.error(`Error rendering React Email template: ${templatePath}`, error)
        throw error
      }
    }
  }
}

/**
 * Helper function to create a React Email message
 * 
 * @example
 * ```ts
 * import { WelcomeEmail } from '@maya/email'
 * 
 * await sendReactEmail(WelcomeEmail, {
 *   welcomeUrl: 'https://example.com',
 *   welcomeMessage: 'Welcome to our platform!'
 * }, (message) => {
 *   message.from('noreply@example.com')
 *   message.to('user@example.com')
 *   message.subject('Welcome to our platform!')
 * })
 * ```
 */
export async function sendReactEmail<T extends Record<string, any>>(
  EmailComponent: React.ComponentType<T>,
  props: T,
  configureMessage: (message: Message) => void
) {
  // Import the mail service
  const { default: mail } = await import('@adonisjs/mail/services/main')
  
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
