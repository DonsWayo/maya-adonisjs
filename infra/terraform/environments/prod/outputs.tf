output "cluster_name" {
  description = "Name of the Kubernetes cluster"
  value       = local.cluster_name
}

output "kubeconfig" {
  description = "Kubeconfig for cluster access"
  value       = module.kubernetes.kubeconfig_content
  sensitive   = true
}

output "load_balancer_ips" {
  description = "Load balancer IPs by zone"
  value = {
    for k, v in hcloud_load_balancer.main : k => v.ipv4
  }
}

output "api_endpoint" {
  description = "Kubernetes API server endpoint"
  value       = module.kubernetes.api_server_url
}

output "urls" {
  description = "Application URLs"
  value = {
    main       = "https://main.${local.domain}"
    monitoring = "https://monitoring.${local.domain}"
    docs       = "https://docs.${local.domain}"
    logto      = "https://logto.${local.domain}"
    logto_admin = "https://admin.logto.${local.domain}"
  }
}

output "dns_instructions" {
  description = "DNS configuration required"
  value = <<-EOT
    Configure DNS for ${local.domain}:
    
    # Primary load balancer
    A    *.${local.domain} -> ${values(hcloud_load_balancer.main)[0].ipv4}
    
    # Geo-redundancy (optional)
    You can use GeoDNS to route traffic to the nearest LB:
    - Europe: ${hcloud_load_balancer.main["fsn1"].ipv4} (Falkenstein)
    - Europe: ${hcloud_load_balancer.main["nbg1"].ipv4} (Nuremberg)
  EOT
}