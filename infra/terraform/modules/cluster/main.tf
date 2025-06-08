# Cluster Module - Core Kubernetes Infrastructure
terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

# Use the official hcloud-k8s module
module "kubernetes" {
  source  = "hcloud-k8s/kubernetes/hcloud"
  version = "~> 2.0"
  
  cluster_name = var.cluster_name
  
  # Control plane configuration
  control_plane_nodepools = [
    {
      name     = "control"
      type     = var.control_plane_type
      location = "fsn1"  # Falkenstein datacenter
      count    = var.control_plane_count
    }
  ]
  
  # Worker nodes configuration
  worker_nodepools = [
    {
      name         = "worker-general"
      type         = var.worker_type
      location     = "fsn1"
      count        = var.worker_count
      autoscale    = var.enable_autoscaling
      min_count    = var.worker_count
      max_count    = var.max_worker_count
      
      labels = {
        "node-role.kubernetes.io/worker" = "true"
        "workload-type" = "general"
      }
      
      taints = []
    }
  ]
  
  # Optional GPU nodes for AI workloads
  dynamic "worker_nodepools" {
    for_each = var.enable_gpu_nodes ? [1] : []
    content {
      name     = "worker-gpu"
      type     = "cax41"  # ARM-based with good performance for AI
      location = "fsn1"
      count    = 1
      
      labels = {
        "node-role.kubernetes.io/worker" = "true"
        "workload-type" = "ai"
        "gpu-enabled" = "true"
      }
      
      taints = [
        {
          key    = "ai-workload"
          value  = "true"
          effect = "NoSchedule"
        }
      ]
    }
  }
  
  # Network configuration
  network_zone = var.network_zone
  network_cidr = var.network_cidr
  
  # Enable Longhorn for distributed storage
  enable_longhorn = var.enable_longhorn
  
  # Cilium CNI configuration
  enable_cilium = var.enable_cilium
  
  # Metrics server for HPA
  enable_metrics_server = true
  
  # Cluster autoscaler
  enable_autoscaler = var.enable_autoscaling
  
  # Additional labels
  labels = var.labels
}

# Install ArgoCD for GitOps
resource "helm_release" "argocd" {
  count = var.enable_argocd ? 1 : 0
  
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  namespace        = "argocd"
  create_namespace = true
  version          = "5.51.6"
  
  values = [
    templatefile("${path.module}/templates/argocd-values.yaml", {
      domain = var.cluster_domain
      github_token = var.github_token
    })
  ]
  
  depends_on = [module.kubernetes]
}

# Install Prometheus Stack for monitoring
resource "helm_release" "kube_prometheus_stack" {
  count = var.enable_monitoring ? 1 : 0
  
  name             = "kube-prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  namespace        = "monitoring"
  create_namespace = true
  version          = "55.5.0"
  
  values = [
    templatefile("${path.module}/templates/prometheus-values.yaml", {
      retention = var.monitoring_retention
      storage_size = var.monitoring_storage_size
      grafana_password = var.grafana_admin_password
      slack_webhook_url = var.slack_webhook_url
    })
  ]
  
  depends_on = [module.kubernetes]
}

# Create namespaces for applications
resource "kubernetes_namespace" "app_namespaces" {
  for_each = toset(["maya-apps", "maya-data", "maya-ingress"])
  
  metadata {
    name = each.key
    
    labels = merge(var.labels, {
      "name" = each.key
      "app.kubernetes.io/part-of" = "maya"
    })
  }
  
  depends_on = [module.kubernetes]
}