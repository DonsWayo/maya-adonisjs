variable "cluster_name" {
  description = "Name of the Kubernetes cluster"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

# PostgreSQL Configuration
variable "enable_postgres" {
  description = "Enable PostgreSQL installation"
  type        = bool
  default     = true
}

variable "postgres_instances" {
  description = "Number of PostgreSQL instances"
  type        = number
  default     = 3
}

variable "postgres_storage_size" {
  description = "Storage size for PostgreSQL"
  type        = string
  default     = "50Gi"
}

variable "postgres_password" {
  description = "PostgreSQL admin password (auto-generated if empty)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "enable_postgres_backup" {
  description = "Enable PostgreSQL backups to S3"
  type        = bool
  default     = false
}

# Redis Configuration
variable "enable_redis" {
  description = "Enable Redis installation"
  type        = bool
  default     = true
}

variable "redis_instances" {
  description = "Number of Redis instances"
  type        = number
  default     = 3
}

variable "redis_password" {
  description = "Redis password (auto-generated if empty)"
  type        = string
  sensitive   = true
  default     = ""
}

# ClickHouse Configuration
variable "enable_clickhouse" {
  description = "Enable ClickHouse installation"
  type        = bool
  default     = true
}

variable "clickhouse_instances" {
  description = "Number of ClickHouse instances"
  type        = number
  default     = 2
}

variable "clickhouse_storage_size" {
  description = "Storage size for ClickHouse"
  type        = string
  default     = "100Gi"
}

variable "clickhouse_password" {
  description = "ClickHouse admin password (auto-generated if empty)"
  type        = string
  sensitive   = true
  default     = ""
}

# Monitoring
variable "enable_monitoring" {
  description = "Enable database monitoring"
  type        = bool
  default     = true
}