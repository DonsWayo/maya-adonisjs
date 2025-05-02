# Logto Webhook Integration

This module provides webhook integration with Logto identity service, allowing your application to receive real-time notifications about user-related events.

## Overview

The Logto webhook integration enables your application to:

1. Receive notifications when users are created, updated, or deleted in Logto
2. Sync user data between Logto and your application's database
3. Handle organization-related events (creation, updates, user membership changes)
4. Process post-authentication events (sign-in, registration, password reset)

## Implementation Details

### Controller

The `LogtoWebhookController` handles incoming webhook events from Logto, verifies their authenticity using the webhook signing key, and processes them according to the event type.

Key features:
- Secure signature verification to ensure requests come from Logto
- Event-specific handlers for different webhook events
- User data synchronization between Logto and your application

### Routes

The webhook endpoint is available at:
```
POST /api/webhooks/logto
```

### Security

All webhook requests are verified using HMAC SHA-256 signatures. The webhook controller validates that:
1. The request includes a valid signature header (`logto-signature-sha-256`)
2. The signature matches the expected value calculated using the webhook signing key

## Configuration

To use the Logto webhook integration, you need to:

1. Configure a webhook in your Logto console with the URL: `https://your-domain.com/api/webhooks/logto`
2. Copy the signing key from Logto and set it in your environment variables:
   ```
   LOGTO_WEBHOOK_SIGNING_KEY=your-webhook-signing-key
   ```
3. Select the events you want to receive in the Logto console

## Supported Events

The integration supports the following Logto events:

### User Events
- `User.Created`: When a user is created in Logto
- `User.Data.Updated`: When user data is updated in Logto

### Organization Events
- `Organization.Created`: When an organization is created
- `Organization.Data.Updated`: When organization data is updated
- `Organization.User.Added`: When a user is added to an organization
- `Organization.User.Removed`: When a user is removed from an organization

### Interaction Events
- `PostSignIn`: After a user signs in
- `PostRegister`: After a user registers
- `PostResetPassword`: After a user resets their password

## Database Integration

The webhook controller synchronizes user data with your application's database by:
1. Creating local user records when users are created in Logto
2. Updating local user records when user data changes in Logto
3. Storing Logto user IDs in the `customData` field of your user records

## Testing Webhooks

To test the webhook integration locally:
1. Use a tool like ngrok to expose your local server to the internet
2. Configure the webhook URL in Logto to point to your ngrok URL
3. Trigger events in Logto (create users, update profiles, etc.)
4. Check your application logs to see the webhook events being processed

## Troubleshooting

Common issues:
- Invalid signature errors: Check that your `LOGTO_WEBHOOK_SIGNING_KEY` matches the one in Logto
- Missing events: Verify that you've selected the correct events in the Logto webhook configuration
- Database sync issues: Check your database logs for errors during user creation/updates
