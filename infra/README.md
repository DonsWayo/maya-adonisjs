# Maya AdonisJS Kubernetes Infrastructure

Professional Kubernetes infrastructure for deploying Maya AdonisJS to Hetzner Cloud with GitOps practices.

## 📋 Prerequisites

- **Hetzner Cloud Account** with API token
- **GitHub Account** for GitOps repository
- **Domain Name** with DNS management access
- **Container Registry** (GitHub Container Registry recommended)

### Required Tools

```bash
# macOS installation
brew install terraform kubectl helm kustomize packer

# Linux installation
# Follow official installation guides for each tool
```

## 🏗️ Infrastructure Architecture

### Components

1. **Kubernetes Cluster** (Hetzner Cloud with Talos Linux)
   - High-availability control plane
   - Auto-scaling worker nodes
   - Distributed storage with Longhorn

2. **Databases**
   - PostgreSQL (CloudNativePG operator)
   - Redis (Redis operator with Sentinel)
   - ClickHouse (Altinity operator)

3. **Observability Stack**
   - Prometheus & Grafana
   - Loki for logs
   - AlertManager

4. **GitOps**
   - ArgoCD for continuous deployment
   - Automated sync from Git

5. **Security**
   - Network policies
   - Pod security standards
   - External Secrets Operator
   - cert-manager for TLS

## 🚀 Quick Start

### 1. Configuration

```bash
# Copy and configure terraform variables
cd terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

### 2. Deploy Infrastructure

```bash
# Using Make (recommended)
make init
make plan
make apply

# Configure kubectl
eval $(make kubeconfig)

# Setup ArgoCD
make argocd

# Validate deployment
make validate

# Get application URLs
make urls
```

### 3. Manual Deployment Steps

If you prefer manual commands:

```bash
# 1. Initialize Terraform
cd terraform/environments/dev
terraform init

# 2. Plan changes
terraform plan -out=tfplan

# 3. Apply infrastructure
terraform apply tfplan

# 4. Save kubeconfig
mkdir -p ~/.kube
terraform output -raw kubeconfig > ~/.kube/config-maya-dev
export KUBECONFIG=~/.kube/config-maya-dev

# 5. Verify cluster access
kubectl get nodes

# 6. Apply ArgoCD applications
kubectl apply -f kubernetes/argocd/projects/maya-project.yaml
kubectl apply -f kubernetes/argocd/applications/maya-dev-app.yaml
```

## 📁 Directory Structure

```
infra/
├── terraform/                    # Infrastructure as Code
│   ├── environments/            # Environment-specific configs
│   │   ├── dev/                # Development environment
│   │   └── prod/               # Production environment
│   └── modules/                # Reusable Terraform modules
│       ├── cluster/            # Kubernetes cluster
│       ├── databases/          # Database installations
│       ├── networking/         # Ingress, load balancers
│       ├── storage/            # Storage configuration
│       └── security/           # Security components
├── kubernetes/                  # Kubernetes manifests
│   ├── base/                   # Base Kustomize configurations
│   ├── overlays/               # Environment overlays
│   └── argocd/                 # ArgoCD applications
├── helm/                       # Helm charts and values
├── docs/                       # Documentation
└── Makefile                    # Automation commands
```

## 🔧 Configuration Details

### Environment Variables

Create `terraform.tfvars` with:

```hcl
# Hetzner Cloud
hcloud_token = "your-token"

# Domain (automatically uses hakicloud.com)
letsencrypt_email = "admin@hakicloud.com"

# GitHub (for ArgoCD)
github_token = "ghp_your_token"

# Logto
logto_webhook_signing_key = "your-key"

# Optional: Leave empty for auto-generation
postgres_password = ""
redis_password = ""
clickhouse_password = ""
```

### Secrets Management

1. **Development**: Secrets are generated and stored in Kubernetes
2. **Production**: Use External Secrets Operator with Vault/AWS Secrets Manager

```yaml
# Example: External Secret
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
spec:
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: database-credentials
  data:
  - secretKey: postgres-password
    remoteRef:
      key: maya/database
      property: postgres_password
```

## 🚦 GitOps Workflow

### Application Deployment

1. **Push code** to GitHub
2. **CI/CD** builds and pushes container images
3. **ArgoCD** detects changes and syncs
4. **Kubernetes** updates applications

### ArgoCD Access

```bash
# Get ArgoCD password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Access ArgoCD UI
# URL: https://argocd.maya-dev.example.com
# Username: admin
```

## 🔍 Monitoring

### Grafana Access

```bash
# URL: https://grafana.maya-dev.example.com
# Username: admin
# Password: (from terraform output)
```

### Pre-configured Dashboards

- Kubernetes cluster metrics
- Application performance
- Database health
- Error tracking

## 🛠️ Maintenance

### Scaling

```bash
# Scale deployments
kubectl scale deployment main -n maya-apps --replicas=3

# Enable cluster autoscaling
# Edit terraform.tfvars: enable_autoscaling = true
make apply
```

### Backup

```bash
# Database backups are automated via operators
# Application data backed up to S3/MinIO

# Manual backup trigger
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%s) -n maya-data
```

### Updates

```bash
# Update Kubernetes version
# Edit cluster module version in terraform
make plan
make apply

# Update application
# Push to Git - ArgoCD will auto-sync
```

## 🚨 Troubleshooting

### Common Issues

1. **Pods not starting**
   ```bash
   kubectl describe pod <pod-name> -n maya-apps
   kubectl logs <pod-name> -n maya-apps
   ```

2. **Database connection issues**
   ```bash
   # Check database pods
   kubectl get pods -n maya-data
   
   # Test connection
   kubectl run -it --rm psql --image=postgres:15 \
     --command -- psql -h maya-postgres-rw.maya-data -U maya
   ```

3. **Ingress not working**
   ```bash
   # Check Traefik logs
   kubectl logs -n maya-ingress -l app.kubernetes.io/name=traefik
   
   # Check certificates
   kubectl get certificates -A
   ```

### Rollback

```bash
# ArgoCD rollback
kubectl argo rollouts rollback main -n maya-apps

# Terraform rollback
cd terraform/environments/dev
terraform plan -target=module.cluster
```

## 🔐 Security Best Practices

1. **Network Policies**: Enabled by default
2. **Pod Security Standards**: Enforced at namespace level
3. **RBAC**: Minimal permissions per service account
4. **Secrets**: Encrypted at rest, rotated regularly
5. **Image Scanning**: Enable in CI/CD pipeline

## 📊 Cost Optimization

### Development Environment
- Single control plane node: ~€20/month
- 2 worker nodes (CPX31): ~€30/month
- Load balancer: ~€5/month
- **Total**: ~€55/month

### Production Environment
- 3 control plane nodes: ~€60/month
- 3-10 worker nodes: ~€45-150/month
- Load balancer: ~€5/month
- Backups & storage: ~€20/month
- **Total**: ~€130-235/month

## 📚 Additional Resources

- [Hetzner Cloud Documentation](https://docs.hetzner.com/cloud/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Talos Linux Documentation](https://www.talos.dev/)