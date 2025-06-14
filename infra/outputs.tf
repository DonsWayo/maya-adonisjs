output "kubeconfig" {
  description = "Kubeconfig data used for cluster authentication"
  value       = module.kubernetes.kubeconfig
  sensitive   = true
}

output "talosconfig" {
  description = "Configuration data for Talos OS"
  value       = module.kubernetes.talosconfig
  sensitive   = true
}

output "kubeconfig_data" {
  description = "Structured kubeconfig data to supply to other providers"
  value       = module.kubernetes.kubeconfig_data
  sensitive   = true
}

output "control_plane_public_ipv4_list" {
  description = "Public IPv4 addresses of all control plane nodes"
  value       = module.kubernetes.control_plane_public_ipv4_list
}

output "worker_public_ipv4_list" {
  description = "Public IPv4 addresses of all worker nodes"
  value       = module.kubernetes.worker_public_ipv4_list
}
