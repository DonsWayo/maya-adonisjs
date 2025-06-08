output "cluster_name" {
  description = "Name of the Kubernetes cluster"
  value       = local.cluster_name
}

output "kubeconfig" {
  description = "Kubeconfig for cluster access"
  value       = module.kubernetes.kubeconfig
  sensitive   = true
}

output "load_balancer_ip" {
  description = "Public IP address of the load balancer (will be available after cluster creation)"
  value       = "Use 'kubectl get svc -n traefik-system' to get the load balancer IP"
}

output "control_plane_ips" {
  description = "Control plane node IPs"
  value = {
    public  = module.kubernetes.control_plane_public_ipv4_list
    private = module.kubernetes.control_plane_private_ipv4_list
  }
}

# Application URLs
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

# Connect instructions
output "connect" {
  description = "How to connect to the cluster"
  value = <<-EOT
    # Save kubeconfig
    terraform output -raw kubeconfig > ~/.kube/config-maya-dev
    export KUBECONFIG=~/.kube/config-maya-dev
    
    # Test connection
    kubectl get nodes
    
    # Configure DNS
    # Get load balancer IP:
    kubectl get svc -n traefik-system
    # Then add A record: *.${local.domain} -> <LOAD_BALANCER_IP>
  EOT
}