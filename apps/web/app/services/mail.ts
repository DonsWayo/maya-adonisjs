import { Message } from '@adonisjs/mail'
import mail from '@adonisjs/mail/services/main'
import * as React from 'react'
import { createReactEmailTemplateEngine, createEmail, WelcomeEmail } from '@workspace/email'

/**
 * Setup the React Email adapter for AdonisJS
 */
export function setupReactEmailAdapter(): void {
  // Create the React Email template engine
  const reactEmailEngine = createReactEmailTemplateEngine()

  // Set the template engine for AdonisJS mail
  Message.templateEngine = {
    async render(templatePath: string, data: Record<string, any>): Promise<string> {
      try {
        // For simplicity, we'll use a mapping approach
        // In a real app, you might want to use dynamic imports
        const component = getEmailComponent(templatePath, data)
        return reactEmailEngine.render(component)
      } catch (error) {
        console.error(`Error rendering React Email template: ${templatePath}`, error)
        throw error
      }
    }
  }
}

/**
 * Helper function to get the right email component based on template path
 */
function getEmailComponent(templatePath: string, data: Record<string, any>): React.ReactElement {
  // Simple mapping of template paths to components
  const templates: Record<string, React.ComponentType<any>> = {
    'welcome': WelcomeEmail,
    // Add more templates here as needed
  }

  const templateName = templatePath.split('/').pop()?.replace('.edge', '') || ''
  const Component = templates[templateName]

  if (!Component) {
    throw new Error(`Email template not found: ${templatePath}`)
  }

  return React.createElement(Component, data)
}

/**
 * Send a welcome email to a user
 */
export async function sendWelcomeEmail(email: string, name: string, welcomeUrl: string) {
  return mail.send((message) => {
    message.from(process.env.MAIL_FROM || 'noreply@example.com')
    message.to(email)
    message.subject('Welcome to our platform!')
    message.htmlView('welcome', {
      welcomeUrl,
      welcomeMessage: `Hello ${name}, welcome to our platform! We're excited to have you on board.`
    })
  })
}

// Initialize the React Email adapter
setupReactEmailAdapter()
