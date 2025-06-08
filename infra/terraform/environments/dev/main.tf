terraform {
  required_version = ">= 1.3.0"
  
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

locals {
  cluster_name = "maya-dev"
  environment  = "development"
  domain       = "dev.hakicloud.com"
  
  common_labels = {
    environment = local.environment
    project     = "maya"
    managed_by  = "terraform"
  }
}

# Main Kubernetes cluster using hcloud-k8s module
# The module will create and manage its own network
module "kubernetes" {
  source  = "hcloud-k8s/kubernetes/hcloud"
  version = "~> 1.5"
  
  cluster_name = local.cluster_name
  hcloud_token = var.hcloud_token
  
  # Let the module create and manage the network
  # hcloud_network_id = null (default)
  
  # Export cluster configs
  cluster_kubeconfig_path = "${path.module}/kubeconfig.yaml"
  cluster_talosconfig_path = "${path.module}/talosconfig.yaml"
  
  # Single control plane for dev (ARM64)
  control_plane_nodepools = [{
    name     = "control"
    type     = "cax11"  # ARM64: 2 vCPU, 4GB RAM
    location = "fsn1"
    count    = 1
  }]
  
  # Two worker nodes for dev (ARM64)
  worker_nodepools = [{
    name     = "worker"
    type     = "cax21"  # ARM64: 4 vCPU, 8GB RAM
    location = "fsn1"
    count    = 2
  }]
  
  # Enable essential features
  longhorn_enabled = true
  cilium_enabled = true
  cert_manager_enabled = true
  ingress_nginx_enabled = false  # We'll use Traefik instead
  
  # Enable built-in ingress load balancer
  ingress_load_balancer_type = "lb11"
  ingress_load_balancer_public_network_enabled = true
  ingress_load_balancer_algorithm = "round_robin"
  
  # Configure ingress load balancer pool for Traefik
  ingress_load_balancer_pools = [{
    name = "traefik"
    namespace = "traefik-system"
    service_selector = "app.kubernetes.io/name=traefik"
    service_port = 80
    location = "fsn1"
    
    # HTTP service
    listen_port = 80
    target_port = 80
    protocol = "tcp"
  }, {
    name = "traefik-https"
    namespace = "traefik-system"
    service_selector = "app.kubernetes.io/name=traefik"
    service_port = 443
    location = "fsn1"
    
    # HTTPS service
    listen_port = 443
    target_port = 443
    protocol = "tcp"
  }]
}

# Output DNS token for manual secret creation
output "dns_token_command" {
  description = "Command to create external-dns secret"
  value = <<-EOT
    kubectl create namespace external-dns || true
    kubectl create secret generic hetzner-dns-token \
      --from-literal=token='${var.hetzner_dns_token}' \
      -n external-dns \
      --dry-run=client -o yaml | kubectl apply -f -
  EOT
  sensitive = true
}