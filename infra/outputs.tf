output "kubeconfig" {
  description = "Kubeconfig for the Kubernetes cluster"
  value       = module.kubernetes.kubeconfig
  sensitive   = true
}

output "talosconfig" {
  description = "Talosconfig for the Talos cluster"
  value       = module.kubernetes.talosconfig
  sensitive   = true
}

output "kubeconfig_data" {
  description = "Structured kubeconfig data to supply to other providers"
  value       = module.kubernetes.kubeconfig_data
  sensitive   = true
}

output "control_plane_public_ipv4_list" {
  description = "List of public IPv4 addresses of the control plane nodes"
  value       = module.kubernetes.control_plane_public_ipv4_list
}

output "worker_public_ipv4_list" {
  description = "List of public IPv4 addresses of the worker nodes"
  value       = module.kubernetes.worker_public_ipv4_list
}

# Echo server outputs
output "echo_server_ingress_ip" {
  description = "IP address of the ingress controller for the echo server"
  value       = module.echo_server.ingress_ip
}

output "echo_server_domain" {
  description = "Domain name of the echo server"
  value       = module.echo_server.domain_name
}

# Cert-manager outputs
output "cluster_issuer_name" {
  description = "Name of the ClusterIssuer for TLS certificates"
  value       = module.hetzner_dns_cert_manager.cluster_issuer_name
}
