variable "namespace" {
  description = "Kubernetes namespace for PostgreSQL deployment"
  type        = string
  default     = "postgresql"
}

variable "operator_version" {
  description = "Version of the CloudNative PostgreSQL operator Helm chart"
  type        = string
  default     = "0.24.0" # Check for the latest version at https://github.com/cloudnative-pg/cloudnative-pg/releases
}

variable "operator_replica_count" {
  description = "Number of replicas for the operator"
  type        = number
  default     = 1
}

variable "operator_values" {
  description = "Additional values for the operator Helm chart in YAML format"
  type        = string
  default     = ""
}

variable "cluster_name" {
  description = "Name of the PostgreSQL cluster"
  type        = string
  default     = "postgres-cluster"
}

variable "instance_count" {
  description = "Number of PostgreSQL instances"
  type        = number
  default     = 3
}

variable "postgres_image" {
  description = "PostgreSQL container image"
  type        = string
  default     = "ghcr.io/cloudnative-pg/postgresql:17.5"
}

variable "shared_buffers" {
  description = "PostgreSQL shared_buffers parameter"
  type        = string
  default     = "128MB"
}

variable "max_connections" {
  description = "PostgreSQL max_connections parameter"
  type        = number
  default     = 100
}

variable "storage_size" {
  description = "Size of the PostgreSQL storage"
  type        = string
  default     = "10Gi"
}

variable "storage_class" {
  description = "Storage class for PostgreSQL volumes"
  type        = string
  default     = "hcloud-volumes" # Updated to match available storage class in Hetzner Cloud
}

variable "backup_retention_policy" {
  description = "Retention policy for backups"
  type        = string
  default     = "30d"
}

variable "backup_destination_path" {
  description = "S3 path for backups"
  type        = string
  default     = "s3://postgresql-backups/"
}

variable "backup_endpoint_url" {
  description = "S3 endpoint URL for backups"
  type        = string
  default     = "https://s3.amazonaws.com"
}

variable "s3_credentials_secret" {
  description = "Name of the Kubernetes secret containing S3 credentials"
  type        = string
  default     = "s3-credentials"
}

variable "primary_update_strategy" {
  description = "Strategy for updating the primary PostgreSQL instance"
  type        = string
  default     = "unsupervised"
}

variable "enable_monitoring" {
  description = "Enable Prometheus monitoring"
  type        = bool
  default     = true
}

variable "create_db_credentials" {
  description = "Whether to create a Kubernetes secret with database credentials"
  type        = bool
  default     = false
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "Database password"
  type        = string
  default     = ""
  sensitive   = true
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "postgres"
}

variable "kubeconfig_path" {
  description = "Path to the kubeconfig file"
  type        = string
}

# S3 backup variables
variable "s3_access_key" {
  description = "S3 access key for backups"
  type        = string
  sensitive   = true
}

variable "s3_secret_key" {
  description = "S3 secret key for backups"
  type        = string
  sensitive   = true
}

variable "s3_bucket_name" {
  description = "S3 bucket name for backups"
  type        = string
  default     = "postgresql-backups"
}

variable "s3_region" {
  description = "S3 region for backups"
  type        = string
  default     = "eu-central-1"
}

variable "s3_endpoint_url" {
  description = "S3 endpoint URL for backups"
  type        = string
  default     = "https://s3.eu-central-1.hetzner.cloud"
}
