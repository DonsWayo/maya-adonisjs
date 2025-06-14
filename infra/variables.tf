variable "hcloud_token" {
  description = "Hetzner Cloud API Token"
  type        = string
  sensitive   = true
}

variable "cluster_name" {
  description = "Name of the Kubernetes cluster"
  type        = string
  default     = "maya-k8s"
}

variable "location" {
  description = "Hetzner Cloud location"
  type        = string
  default     = "fsn1"  # Falkenstein, Germany
}

variable "control_plane_type" {
  description = "Hetzner Cloud server type for control plane nodes (ARM64)"
  type        = string
  default     = "cax21"  # ARM64 instance with 4 vCPUs, 8 GB RAM
}

variable "worker_type" {
  description = "Hetzner Cloud server type for worker nodes (ARM64)"
  type        = string
  default     = "cax11"  # ARM64 instance with 2 vCPUs, 4 GB RAM
}

variable "control_plane_count" {
  description = "Number of control plane nodes"
  type        = number
  default     = 3  # For high availability
}

variable "worker_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 3  # For high availability
}

variable "ssh_keys" {
  description = "SSH key IDs or names to add to nodes"
  type        = list(string)
  default     = []
}
