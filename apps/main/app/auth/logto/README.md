# Logto Integration Module

This module provides comprehensive integration with Logto identity service, handling authentication, authorization, API resources, and webhooks.

## Overview

The Logto integration module enables your application to:

1. Register API resources with Logto automatically
2. Set up M2M (machine-to-machine) roles and permissions
3. Receive real-time notifications via webhooks for user and organization events
4. Verify JWT tokens and enforce permissions

## Components

### API Resource Service

The `ApiResourceService` handles:
- Automatic registration of API resources with Logto
- Creation and management of M2M roles and permissions
- Verification of API resource scopes

### Management API Service

The `LogtoManagementApiService` provides:
- Authentication with Logto Management API
- CRUD operations for users, organizations, and roles
- Role and permission management

### Webhook Service

The `WebhookService` manages:
- Automatic registration of webhooks with Logto
- Configuration of event subscriptions
- Testing webhook functionality

### Webhook Controller

The `LogtoWebhookController` processes:
- Webhook events from Logto (user creation, updates, sign-ins, etc.)
- Signature verification for security
- User synchronization between Logto and the application

## Automatic Setup

The module includes an `ApiResourceProvider` that automatically:
1. Registers the API resource with Logto during application startup
2. Creates necessary M2M roles and permissions
3. Sets up the webhook to receive events from Logto

## Configuration

The module requires the following environment variables:

```
# Logto URLs
LOGTO_URL=http://logto.localhost
LOGTO_AUTHORIZE_URL=http://logto.localhost/oidc/auth
LOGTO_ACCESS_TOKEN_URL=http://logto.localhost/oidc/token
LOGTO_USER_INFO_URL=http://logto.localhost/oidc/me

# Logto client credentials
LOGTO_CLIENT_ID=your-client-id
LOGTO_CLIENT_SECRET=your-client-secret
LOGTO_CALLBACK_URL=http://your-app.com/logto/callback

# M2M client credentials
LOGTO_M2M_CLIENT_ID=your-m2m-client-id
LOGTO_M2M_CLIENT_SECRET=your-m2m-client-secret

# Webhook signing key
LOGTO_WEBHOOK_SIGNING_KEY=your-webhook-signing-key

# API resource identifier
API_RESOURCE_IDENTIFIER=http://your-app.com
```

## Webhook Events

The webhook is configured to receive the following events:

- User Events: Created, Updated, Deleted
- Authentication Events: Sign-in, Registration, Password Reset
- Organization Events: Created, Updated, Deleted, User Added/Removed
- Role and Permission Events: Role Created/Updated/Deleted, Scopes Updated

## Security

All webhook requests are verified using HMAC SHA-256 signatures to ensure they come from Logto.
