# Secrets Management Strategy

This document outlines the comprehensive secrets management approach for Maya AdonisJS infrastructure.

## Overview

We use a layered approach to secrets management:
- **Development**: Kubernetes Secrets with Sealed Secrets
- **Production**: External Secrets Operator with HashiCorp Vault

## Secret Categories

### 1. Application Secrets
- `APP_KEY`: AdonisJS encryption key
- Database passwords
- Redis passwords
- API tokens

### 2. Authentication Secrets
- Logto client credentials
- M2M authentication tokens
- Webhook signing keys
- OAuth client secrets

### 3. Infrastructure Secrets
- S3/MinIO credentials
- Container registry credentials
- TLS certificates
- Monitoring credentials

## Development Environment

### Using Sealed Secrets

```bash
# Install Sealed Secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.5/controller.yaml

# Install kubeseal CLI
brew install kubeseal

# Create a secret
echo -n 'mypassword' | kubectl create secret generic database-credentials \
  --dry-run=client \
  --from-file=postgres-password=/dev/stdin \
  -o yaml | kubeseal -o yaml > sealed-database-credentials.yaml

# Apply sealed secret
kubectl apply -f sealed-database-credentials.yaml
```

### Example Sealed Secret

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: database-credentials
  namespace: maya-apps
spec:
  encryptedData:
    postgres-password: AgCj3J2eHc... # Encrypted value
  template:
    metadata:
      name: database-credentials
      namespace: maya-apps
    type: Opaque
```

## Production Environment

### External Secrets with Vault

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace
```

### Vault Configuration

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: maya-apps
spec:
  provider:
    vault:
      server: "https://vault.maya.example.com"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "maya-apps"
          serviceAccountRef:
            name: "external-secrets"
```

### External Secret Example

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: maya-apps
spec:
  refreshInterval: 15s
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
  - secretKey: app-key
    remoteRef:
      key: maya/app
      property: app_key
  - secretKey: db-password
    remoteRef:
      key: maya/database
      property: password
```

## Secret Rotation Strategy

### Automatic Rotation

1. **Database Passwords**: Rotated every 90 days
2. **API Keys**: Rotated every 180 days
3. **TLS Certificates**: Auto-renewed by cert-manager

### Manual Rotation Process

```bash
# 1. Generate new secret
openssl rand -base64 32

# 2. Update in Vault
vault kv put secret/maya/database password=<new-password>

# 3. Trigger application restart
kubectl rollout restart deployment/main -n maya-apps
```

## Encryption at Rest

### Kubernetes Secret Encryption

```yaml
# Enable encryption at rest in kube-apiserver
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
    - secrets
    providers:
    - aescbc:
        keys:
        - name: key1
          secret: <base64-encoded-key>
    - identity: {}
```

## Access Control

### RBAC for Secrets

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: maya-apps
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]
  resourceNames: ["app-secrets", "database-credentials"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-secrets
  namespace: maya-apps
subjects:
- kind: ServiceAccount
  name: main-app
  namespace: maya-apps
roleRef:
  kind: Role
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

## Emergency Access

### Break Glass Procedure

1. **Vault Unseal Keys**: Stored in separate secure locations
2. **Emergency Access Token**: Time-limited, audit-logged
3. **Recovery Process**:
   ```bash
   # Unseal Vault
   vault operator unseal <key-1>
   vault operator unseal <key-2>
   vault operator unseal <key-3>
   
   # Generate emergency token
   vault token create -policy=emergency-access -ttl=1h
   ```

## Compliance & Auditing

### Audit Requirements

1. **Access Logs**: All secret access is logged
2. **Change History**: Version control for all secrets
3. **Compliance Reports**: Monthly audit reports

### Audit Configuration

```yaml
# Vault audit backend
vault audit enable file file_path=/vault/logs/audit.log

# Kubernetes audit policy
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: RequestResponse
  omitStages:
  - RequestReceived
  resources:
  - group: ""
    resources: ["secrets"]
  namespaces: ["maya-apps", "maya-auth"]
```

## Best Practices

1. **Never commit secrets** to Git repositories
2. **Use separate secrets** per environment
3. **Implement least privilege** access
4. **Regular rotation** schedule
5. **Monitor secret access** patterns
6. **Test recovery procedures** regularly

## Secret Templates

### Application Secret Template

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: maya-apps
type: Opaque
stringData:
  APP_KEY: "32-character-key-here"
  SESSION_SECRET: "random-session-secret"
```

### Database Secret Template

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: maya-apps
type: Opaque
stringData:
  postgres-password: "strong-password"
  postgres-username: "maya"
  postgres-database: "maya"
  connection-string: "postgres://maya:password@host:5432/maya"
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Deploy to Kubernetes
  env:
    KUBE_CONFIG: ${{ secrets.KUBE_CONFIG }}
  run: |
    echo "$KUBE_CONFIG" | base64 -d > kubeconfig
    export KUBECONFIG=kubeconfig
    
    # Create secret from GitHub secrets
    kubectl create secret generic app-secrets \
      --from-literal=app-key="${{ secrets.APP_KEY }}" \
      --dry-run=client -o yaml | \
      kubeseal -o yaml | \
      kubectl apply -f -
```

## Monitoring & Alerts

### Secret Access Alerts

```yaml
# Prometheus rule for unusual secret access
groups:
- name: secret-access
  rules:
  - alert: UnusualSecretAccess
    expr: rate(apiserver_audit_event_total{verb="get",objectRef_resource="secrets"}[5m]) > 10
    for: 5m
    annotations:
      summary: "High rate of secret access detected"
      description: "{{ $labels.user }} is accessing secrets at an unusual rate"
```

## Recovery Procedures

### Lost Secret Recovery

1. **Check Vault backup**: Latest version available
2. **Check sealed secrets**: Encrypted copies in Git
3. **Generate new secret**: If unrecoverable
4. **Update applications**: Rolling restart
5. **Document incident**: For audit trail