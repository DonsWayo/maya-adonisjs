output "cluster_name" {
  description = "Name of the Kubernetes cluster"
  value       = var.cluster_name
}

output "kubeconfig" {
  description = "Kubeconfig for cluster access"
  value       = module.kubernetes.kubeconfig
  sensitive   = true
}

output "api_endpoint" {
  description = "Kubernetes API server endpoint"
  value       = module.kubernetes.api_server_url
}

output "cluster_id" {
  description = "Unique identifier for the cluster"
  value       = module.kubernetes.cluster_id
}

output "network_id" {
  description = "ID of the cluster network"
  value       = module.kubernetes.network_id
}

output "control_plane_ips" {
  description = "IP addresses of control plane nodes"
  value       = module.kubernetes.control_plane_ips
}

output "worker_ips" {
  description = "IP addresses of worker nodes"
  value       = module.kubernetes.worker_ips
}

output "argocd_server" {
  description = "ArgoCD server URL"
  value       = var.enable_argocd ? "https://argocd.${var.cluster_domain}" : null
}

output "argocd_initial_password" {
  description = "Initial ArgoCD admin password"
  value       = var.enable_argocd ? random_password.argocd_admin[0].result : null
  sensitive   = true
}

output "grafana_url" {
  description = "Grafana URL"
  value       = var.enable_monitoring ? "https://grafana.${var.cluster_domain}" : null
}

output "prometheus_url" {
  description = "Prometheus URL"
  value       = var.enable_monitoring ? "https://prometheus.${var.cluster_domain}" : null
}

# Random password for ArgoCD if not provided
resource "random_password" "argocd_admin" {
  count   = var.enable_argocd && var.github_token == "" ? 1 : 0
  length  = 24
  special = true
}