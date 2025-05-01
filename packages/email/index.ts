import { render } from '@react-email/render'
import * as React from 'react'

// Import all email templates
import WelcomeEmail from './emails/welcome.js'

// Export email templates
export { WelcomeEmail }

// Re-export React Email components for convenience
export * from '@react-email/components'

/**
 * Simple interface for the React Email template engine
 */
export interface ReactEmailTemplateEngine {
  render(component: React.ReactElement, data?: Record<string, any>): Promise<string>
  renderPlainText(component: React.ReactElement, data?: Record<string, any>): Promise<string>
}

/**
 * Create a template engine adapter for React Email components
 */
export const createReactEmailTemplateEngine = (): ReactEmailTemplateEngine => {
  return {
    /**
     * Render a React Email component to HTML
     */
    async render(component: React.ReactElement, data?: Record<string, any>): Promise<string> {
      try {
        // Clone the component with the provided data if needed
        const elementToRender = data ? React.cloneElement(component, data) : component;
        
        // Render the component to HTML
        const html = await render(elementToRender, {
          pretty: true,
        });
        
        return html;
      } catch (error) {
        console.error('Error rendering React Email component to HTML', error);
        throw error;
      }
    },
    
    /**
     * Render a React Email component to plain text
     */
    async renderPlainText(component: React.ReactElement, data?: Record<string, any>): Promise<string> {
      try {
        // Clone the component with the provided data if needed
        const elementToRender = data ? React.cloneElement(component, data) : component;
        
        // Render the component to plain text
        const text = await render(elementToRender, {
          plainText: true,
        });
        
        return text;
      } catch (error) {
        console.error('Error rendering React Email component to plain text', error);
        throw error;
      }
    }
  };
};

/**
 * Helper function to create a React Email component instance with props
 */
export function createEmail<T extends Record<string, any>>(EmailComponent: React.ComponentType<T>, props: T): React.ReactElement {
  return React.createElement(EmailComponent, props);
}
