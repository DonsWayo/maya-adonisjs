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
  description = "Server type for control plane nodes"
  type        = string
  default     = "cax21"  # instance with 4 vCPUs, 8 GB RAM
}

variable "worker_type" {
  description = "Server type for worker nodes"
  type        = string
  default     = "cax11"  # instance with 2 vCPUs, 4 GB RAM
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
  description = "SSH keys to add to nodes"
  type        = list(string)
  default     = []
}

# Hetzner DNS and cert-manager variables
variable "hetzner_dns_api_token" {
  description = "Hetzner DNS API Token for cert-manager DNS01 challenge"
  type        = string
  sensitive   = true
}

variable "email_address" {
  description = "Email address for Let's Encrypt certificate notifications"
  type        = string
  default     = "admin@hakicloud.com"
}

variable "zone_name" {
  description = "DNS zone name for Hetzner DNS"
  type        = string
  default     = "hakicloud.com"
}

variable "cluster_issuer_name" {
  description = "Name of the ClusterIssuer resource"
  type        = string
  default     = "letsencrypt-hetzner-dns"
}

# Echo server variables
variable "echo_server_domain" {
  description = "Domain name for the echo server"
  type        = string
  default     = "echo.hakicloud.com"
}

variable "echo_server_namespace" {
  description = "Kubernetes namespace for the echo server"
  type        = string
  default     = "default"
}

variable "echo_server_image" {
  description = "Docker image for the echo server"
  type        = string
  default     = "ealen/echo-server:latest"
}

variable "echo_server_replicas" {
  description = "Number of echo server replicas"
  type        = number
  default     = 2
}
