output "ingress_ip" {
  description = "IP address of the ingress controller for the echo server"
  value       = try(kubernetes_ingress_v1.echo_server.status[0].load_balancer[0].ingress[0].ip, null)
}

output "domain_name" {
  description = "Domain name of the echo server"
  value       = var.domain_name
}
