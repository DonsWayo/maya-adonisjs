variable "kubeconfig_path" {
  description = "Path to the kubeconfig file"
  type        = string
}

variable "cluster_issuer_name" {
  description = "Name of the ClusterIssuer to use for TLS certificates"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the echo server"
  type        = string
  default     = "echo.hakicloud.com"
}

variable "dns_zone_name" {
  description = "DNS zone name for the domain (e.g., hakicloud.com for echo.hakicloud.com)"
  type        = string
}

variable "dns_zone_id" {
  description = "Hetzner DNS zone ID for the domain"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace for the echo server"
  type        = string
  default     = "default"
}

variable "image" {
  description = "Docker image for the echo server"
  type        = string
  default     = "ealen/echo-server:latest"
}

variable "replicas" {
  description = "Number of echo server replicas"
  type        = number
  default     = 2
}
