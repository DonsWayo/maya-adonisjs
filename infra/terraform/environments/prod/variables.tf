variable "hcloud_token" {
  description = "Hetzner Cloud API token"
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

# Database passwords
variable "postgres_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
}

variable "redis_password" {
  description = "Redis password"
  type        = string
  sensitive   = true
}

variable "clickhouse_password" {
  description = "ClickHouse password"
  type        = string
  sensitive   = true
}

# S3 backup configuration
variable "s3_endpoint" {
  description = "S3 endpoint for backups"
  type        = string
  default     = "s3.eu-central-1.amazonaws.com"
}

variable "s3_bucket" {
  description = "S3 bucket for backups"
  type        = string
}

variable "s3_region" {
  description = "S3 region"
  type        = string
  default     = "eu-central-1"
}

variable "s3_access_key_id" {
  description = "S3 access key"
  type        = string
  sensitive   = true
}

variable "s3_secret_access_key" {
  description = "S3 secret key"
  type        = string
  sensitive   = true
}