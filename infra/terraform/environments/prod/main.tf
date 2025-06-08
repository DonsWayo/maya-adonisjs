terraform {
  required_version = ">= 1.3.0"
  
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
  
  backend "s3" {
    bucket = "maya-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "eu-central-1"
    encrypt = true
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

locals {
  cluster_name = "maya-prod"
  environment  = "production"
  domain       = "hakicloud.com"
  
  common_labels = {
    environment = local.environment
    project     = "maya"
    managed_by  = "terraform"
  }
}

# Production Kubernetes cluster
module "kubernetes" {
  source  = "hcloud-k8s/kubernetes/hcloud"
  version = "~> 2.0"
  
  cluster_name = local.cluster_name
  
  # Network configuration
  network_zone = "eu-central"
  network_cidr = "10.1.0.0/16"
  
  # HA control plane - 3 nodes (ARM64)
  control_plane_nodepools = [
    {
      name     = "control-fsn"
      type     = "cax21"  # ARM64: 4 vCPU, 8GB RAM
      location = "fsn1"
      count    = 1
    },
    {
      name     = "control-nbg"
      type     = "cax21"  # ARM64: 4 vCPU, 8GB RAM
      location = "nbg1"
      count    = 1
    },
    {
      name     = "control-hel"
      type     = "cax21"  # ARM64: 4 vCPU, 8GB RAM
      location = "hel1"
      count    = 1
    }
  ]
  
  # Worker nodes with autoscaling (ARM64)
  worker_nodepools = [
    {
      name         = "worker-fsn"
      type         = "cax31"  # ARM64: 8 vCPU, 16GB RAM
      location     = "fsn1"
      count        = 2
      autoscale    = true
      min_count    = 2
      max_count    = 5
      
      labels = {
        "workload-type" = "general"
        "zone" = "fsn1"
      }
    },
    {
      name         = "worker-nbg"
      type         = "cax31"  # ARM64: 8 vCPU, 16GB RAM
      location     = "nbg1"
      count        = 2
      autoscale    = true
      min_count    = 2
      max_count    = 5
      
      labels = {
        "workload-type" = "general"
        "zone" = "nbg1"
      }
    }
  ]
  
  # Production features
  enable_longhorn = true
  longhorn_replica_count = 3
  enable_metrics_server = true
  enable_cilium = true
  enable_autoscaler = true
  
  # Secure firewall rules
  firewall_rules = {
    http = {
      direction   = "in"
      protocol    = "tcp"
      port        = "80"
      source_ips  = ["0.0.0.0/0", "::/0"]
    }
    https = {
      direction   = "in"
      protocol    = "tcp"
      port        = "443"
      source_ips  = ["0.0.0.0/0", "::/0"]
    }
  }
  
  # Enable backups
  enable_etcd_backup = true
  etcd_backup_s3_endpoint = var.s3_endpoint
  etcd_backup_s3_bucket = var.s3_bucket
  etcd_backup_s3_region = var.s3_region
  etcd_backup_s3_access_key_id = var.s3_access_key_id
  etcd_backup_s3_secret_access_key = var.s3_secret_access_key
  
  labels = local.common_labels
}

# Production load balancers (2 for redundancy)
resource "hcloud_load_balancer" "main" {
  for_each = toset(["fsn1", "nbg1"])
  
  name               = "${local.cluster_name}-lb-${each.key}"
  load_balancer_type = "lb21"
  location           = each.key
  labels             = merge(local.common_labels, { zone = each.key })
}

resource "hcloud_load_balancer_network" "main" {
  for_each = hcloud_load_balancer.main
  
  load_balancer_id = each.value.id
  network_id       = module.kubernetes.network_id
  ip               = each.key == "fsn1" ? "10.1.1.100" : "10.1.1.101"
}

resource "hcloud_load_balancer_target" "workers" {
  for_each = hcloud_load_balancer.main
  
  type             = "label_selector"
  load_balancer_id = each.value.id
  label_selector   = "workload-type=general,zone=${each.key}"
  use_private_ip   = true
}

resource "hcloud_load_balancer_service" "http" {
  for_each = hcloud_load_balancer.main
  
  load_balancer_id = each.value.id
  protocol         = "tcp"
  listen_port      = 80
  destination_port = 30080
  
  health_check {
    protocol = "http"
    port     = 30080
    interval = 10
    timeout  = 5
    retries  = 3
    http {
      path = "/healthz"
    }
  }
}

resource "hcloud_load_balancer_service" "https" {
  for_each = hcloud_load_balancer.main
  
  load_balancer_id = each.value.id
  protocol         = "tcp"
  listen_port      = 443
  destination_port = 30443
  
  health_check {
    protocol = "tcp"
    port     = 30443
    interval = 10
    timeout  = 5
    retries  = 3
  }
}