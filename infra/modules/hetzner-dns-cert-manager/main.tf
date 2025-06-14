terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.19.0"
    }
  }
}

# Hetzner DNS API token secret for cert-manager
resource "kubernetes_secret" "hetzner_dns_api_token" {
  metadata {
    name      = "hetzner-dns-api-token"
    namespace = "cert-manager"
  }

  data = {
    "api-key" = var.hetzner_dns_api_token
  }

  type = "Opaque"
}

# Install cert-manager webhook for Hetzner DNS
resource "helm_release" "cert_manager_webhook_hetzner" {
  name       = "cert-manager-webhook-hetzner"
  repository = "https://vadimkim.github.io/cert-manager-webhook-hetzner"
  chart      = "cert-manager-webhook-hetzner"
  namespace  = "cert-manager"

  set {
    name  = "groupName"
    value = "acme.hetzner.cloud"
  }


  depends_on = [kubernetes_secret.hetzner_dns_api_token]
}

# ClusterIssuer for Let's Encrypt with Hetzner DNS validation
resource "kubectl_manifest" "cluster_issuer" {
  yaml_body = <<YAML
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: ${var.cluster_issuer_name}
spec:
  acme:
    email: ${var.email_address}
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: ${var.cluster_issuer_name}-account-key
    solvers:
    - dns01:
        webhook:
          groupName: acme.hetzner.cloud
          solverName: hetzner
          config:
            secretName: hetzner-dns-api-token
            zoneName: ${var.zone_name}
            apiUrl: "https://dns.hetzner.com/api/v1"
YAML

  depends_on = [helm_release.cert_manager_webhook_hetzner]
}

# RBAC for cert-manager-webhook-hetzner to access the API token secret
resource "kubernetes_cluster_role" "webhook_secret_reader" {
  metadata {
    name = "cert-manager-webhook-hetzner-secret-reader"
  }

  rule {
    api_groups     = [""] # Core API group
    resources      = ["secrets"]
    verbs          = ["get", "list", "watch"]
    resource_names = ["hetzner-dns-api-token"]
  }
}

resource "kubernetes_cluster_role_binding" "webhook_secret_reader" {
  metadata {
    name = "cert-manager-webhook-hetzner-secret-reader"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.webhook_secret_reader.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = "cert-manager-webhook-hetzner"
    namespace = "cert-manager"
  }
}
