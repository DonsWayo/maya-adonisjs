variable "cluster_name" {
  description = "Name of the Kubernetes cluster"
  type        = string
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
}

variable "network_zone" {
  description = "Hetzner Cloud network zone"
  type        = string
  default     = "eu-central"
}

variable "network_cidr" {
  description = "CIDR block for the cluster network"
  type        = string
  default     = "10.0.0.0/16"
}

# Node configuration
variable "control_plane_count" {
  description = "Number of control plane nodes"
  type        = number
  default     = 3
  
  validation {
    condition     = var.control_plane_count % 2 == 1
    error_message = "Control plane count must be an odd number for etcd quorum"
  }
}

variable "control_plane_type" {
  description = "Hetzner server type for control plane nodes"
  type        = string
  default     = "cpx21"
}

variable "worker_count" {
  description = "Initial number of worker nodes"
  type        = number
  default     = 3
}

variable "worker_type" {
  description = "Hetzner server type for worker nodes"
  type        = string
  default     = "cpx31"
}

variable "max_worker_count" {
  description = "Maximum number of worker nodes for autoscaling"
  type        = number
  default     = 10
}

# Feature flags
variable "enable_longhorn" {
  description = "Enable Longhorn distributed storage"
  type        = bool
  default     = true
}

variable "enable_cilium" {
  description = "Enable Cilium CNI"
  type        = bool
  default     = true
}

variable "enable_autoscaling" {
  description = "Enable cluster autoscaling"
  type        = bool
  default     = false
}

variable "enable_gpu_nodes" {
  description = "Enable GPU nodes for AI workloads"
  type        = bool
  default     = false
}

variable "enable_argocd" {
  description = "Enable ArgoCD for GitOps"
  type        = bool
  default     = true
}

variable "enable_monitoring" {
  description = "Enable Prometheus monitoring stack"
  type        = bool
  default     = true
}

# Monitoring configuration
variable "monitoring_retention" {
  description = "Prometheus data retention period"
  type        = string
  default     = "30d"
}

variable "monitoring_storage_size" {
  description = "Storage size for Prometheus data"
  type        = string
  default     = "50Gi"
}

variable "grafana_admin_password" {
  description = "Grafana admin password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts"
  type        = string
  sensitive   = true
  default     = ""
}

# ArgoCD configuration
variable "github_token" {
  description = "GitHub token for ArgoCD"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cluster_domain" {
  description = "Base domain for cluster services"
  type        = string
  default     = "cluster.local"
}

# Labels
variable "labels" {
  description = "Labels to apply to all resources"
  type        = map(string)
  default     = {}
}