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

variable "kubeconfig_path" {
  description = "Path to the kubeconfig file"
  type        = string
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
