variable "hcloud_token" {
  description = "Hetzner Cloud API token"
  type        = string
  sensitive   = true
}

variable "hetzner_dns_token" {
  description = "Hetzner DNS API token (different from Cloud API token)"
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub token for ArgoCD"
  type        = string
  sensitive   = true
  default     = ""
}

variable "logto_webhook_signing_key" {
  description = "Signing key for Logto webhooks"
  type        = string
  sensitive   = true
}

# Database passwords (auto-generated if empty)
variable "postgres_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "redis_password" {
  description = "Redis password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "clickhouse_password" {
  description = "ClickHouse password"
  type        = string
  sensitive   = true
  default     = ""
}