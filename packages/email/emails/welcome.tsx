
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components';
interface WelcomeEmailProps {
  welcomeUrl?: string;
  welcomeMessage?: string;
}

export const WelcomeEmail = ({
  welcomeUrl = 'https://example.com',
  welcomeMessage,
}: WelcomeEmailProps) => {
  const defaultMessage = "Thank you for joining our community. Explore our features and start your journey with us. If you have any questions, feel free to reach out!";
  
  return (
    <Html>
      <Head>
        <title>Welcome!</title>
        <Preview>Welcome to AdonisJS Starter Kit</Preview>
      </Head>
      <Body style={styles.body}>
        <Container style={styles.emailWrapper}>
          <Section style={styles.emailCard}>
            <Heading style={styles.title}>Welcome!</Heading>
            <Text style={styles.subtitle}>We're thrilled to have you on board.</Text>
            <Section style={styles.buttonWrapper}>
              <Button
                href={welcomeUrl}
                style={styles.button}
                // Use padding in the style object instead of pX and pY props
                // which are not supported by the Button component type
              >
                Get Started
              </Button>
            </Section>
            <Text style={styles.message}>
              {welcomeMessage || defaultMessage}
            </Text>
          </Section>
          
          <Section style={styles.emailFooter}>
            <Text style={styles.footerText}>
              <Link
                href="https://github.com/filipebraida/adonisjs-starter-kit"
                style={styles.footerLink}
              >
                AdonisJS Starter Kit
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

const styles = {
  body: {
    margin: '0',
    padding: '0',
    backgroundColor: '#f9f9f9',
    WebkitTextSizeAdjust: '100%',
    MsTextSizeAdjust: '100%',
  },
  emailWrapper: {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#f9f9f9',
  },
  emailCard: {
    background: '#fff',
    border: '1px solid #dddddd',
    padding: '20px',
    textAlign: 'center' as const,
  },
  title: {
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: '38px',
    fontWeight: 'bold',
    lineHeight: '1',
    color: '#555',
    padding: '10px 25px 40px',
    textAlign: 'center' as const,
  },
  subtitle: {
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: '18px',
    lineHeight: '1',
    color: '#555',
    padding: '10px 25px 40px',
    textAlign: 'center' as const,
  },
  buttonWrapper: {
    padding: '30px 25px 50px',
  },
  button: {
    backgroundColor: '#2f67f6',
    color: '#ffffff',
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: '15px',
    textDecoration: 'none',
    borderRadius: '3px',
    display: 'inline-block',
  },
  message: {
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: '16px',
    lineHeight: '20px',
    color: '#7f8fa4',
    padding: '10px 25px 40px',
    textAlign: 'center' as const,
  },
  emailFooter: {
    padding: '20px 0',
    textAlign: 'center' as const,
  },
  footerText: {
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: '12px',
    fontWeight: '300',
    color: '#575757',
    textAlign: 'center' as const,
  },
  footerLink: {
    color: '#575757',
    textDecoration: 'underline',
  },
};
