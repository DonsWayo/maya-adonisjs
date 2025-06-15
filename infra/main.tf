module "kubernetes" {
  source  = "hcloud-k8s/kubernetes/hcloud"
  version = "~> 1.5.0"

  cluster_name = var.cluster_name
  hcloud_token = var.hcloud_token

  # Export configs for Talos and Kube API access
  cluster_kubeconfig_path  = "kubeconfig"
  cluster_talosconfig_path = "talosconfig"

  # Enable Ingress Controller and Cert Manager
  cert_manager_enabled  = true
  ingress_nginx_enabled = true

  

  # ARM64 architecture nodes
  control_plane_nodepools = [
    { 
      name     = "control", 
      type     = var.control_plane_type, 
      location = var.location, 
      count    = var.control_plane_count 
    }
  ]
  
  worker_nodepools = [
    { 
      name     = "worker-cax31", 
      type     = var.worker_type, 
      location = var.location, 
      count    = var.worker_count 
    }
  ]

  # Optional: Configure cluster autoscaler
  cluster_autoscaler_nodepools = [
    {
      name     = "autoscaler"
      type     = var.worker_type
      location = var.location
      min      = 0
      max      = 6
      labels   = { "autoscaler-node" = "true" }
    }
  ]

}
