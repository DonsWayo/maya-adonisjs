# Maya AdonisJS Kubernetes Infrastructure Architecture

## Overview

This infrastructure is designed for deploying the Maya AdonisJS monorepo application to Hetzner Cloud Kubernetes clusters with professional DevOps practices.

## Architecture Principles

1. **Environment Separation**: Complete isolation between dev, staging, and production
2. **GitOps**: All deployments managed through Git commits using ArgoCD
3. **Security First**: Zero-trust networking, encrypted secrets, RBAC
4. **High Availability**: Multi-zone deployments with automatic failover
5. **Observability**: Full monitoring, logging, and tracing stack
6. **Cost Optimization**: Right-sized resources with autoscaling

## Infrastructure Layers

### 1. Infrastructure Layer (Terraform)
- **Cluster Management**: Hetzner Cloud Kubernetes with Talos Linux
- **Networking**: Cilium CNI with network policies
- **Storage**: Longhorn for distributed storage, CSI drivers
- **Load Balancing**: Hetzner Cloud Load Balancers
- **DNS**: External DNS with Cloudflare/Route53 integration

### 2. Platform Layer (Kubernetes)
- **Ingress**: Traefik/NGINX with cert-manager
- **Service Mesh**: Optional Istio/Linkerd for advanced scenarios
- **Secrets**: External Secrets Operator with HashiCorp Vault
- **GitOps**: ArgoCD for continuous deployment
- **Observability**: Prometheus, Grafana, Loki, Tempo

### 3. Data Layer
- **PostgreSQL**: CloudNativePG operator for HA PostgreSQL
- **Redis**: Redis operator with Sentinel for HA
- **ClickHouse**: ClickHouse operator for analytics
- **Object Storage**: MinIO operator or Hetzner Object Storage
- **Backups**: Velero for cluster backups

### 4. Application Layer
- **Main App**: AdonisJS with horizontal pod autoscaling
- **Monitoring App**: Separate deployment with dedicated resources
- **Docs**: Static site with CDN integration
- **AI Services**: GPU nodes for Ollama (optional)

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Hetzner Cloud                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │   Zone FSN1   │  │   Zone NBG1   │  │   Zone HEL1   │       │
│  │               │  │               │  │               │       │
│  │ ┌───────────┐ │  │ ┌───────────┐ │  │ ┌───────────┐ │       │
│  │ │Control    │ │  │ │Control    │ │  │ │Control    │ │       │
│  │ │Plane Node │ │  │ │Plane Node │ │  │ │Plane Node │ │       │
│  │ └───────────┘ │  │ └───────────┘ │  │ └───────────┘ │       │
│  │               │  │               │  │               │       │
│  │ ┌───────────┐ │  │ ┌───────────┐ │  │ ┌───────────┐ │       │
│  │ │Worker     │ │  │ │Worker     │ │  │ │Worker     │ │       │
│  │ │Nodes      │ │  │ │Nodes      │ │  │ │Nodes      │ │       │
│  │ └───────────┘ │  │ └───────────┘ │  │ └───────────┘ │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              Hetzner Cloud Load Balancer             │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Environment Strategy

### Development
- Single-zone deployment (FSN1)
- Minimal resource allocation
- Integrated observability tools
- Direct database access for debugging

### Production
- Multi-zone deployment (FSN1, NBG1, HEL1)
- Auto-scaling enabled
- External managed databases option
- CDN integration for static assets
- Disaster recovery procedures

## Security Architecture

1. **Network Security**
   - Private network isolation
   - Network policies for pod-to-pod communication
   - Ingress rate limiting and WAF rules

2. **Identity & Access**
   - OIDC integration with Logto
   - Kubernetes RBAC aligned with application roles
   - Service account security

3. **Secrets Management**
   - Vault for secret storage
   - Encrypted secrets in Git
   - Automatic secret rotation

4. **Compliance**
   - Audit logging
   - Pod security standards
   - Regular security scanning

## Deployment Pipeline

```
Developer → Git Push → GitHub Actions → Build & Test → Container Registry
                                                           ↓
                                    ArgoCD ← Git Ops Repo ←┘
                                        ↓
                                    Kubernetes
```

## Monitoring & Observability

1. **Metrics**: Prometheus + Grafana
2. **Logs**: Loki + Promtail
3. **Traces**: Tempo + OpenTelemetry
4. **Alerts**: AlertManager + PagerDuty/Slack
5. **APM**: Optional DataDog/New Relic integration