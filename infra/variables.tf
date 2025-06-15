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
  default     = "cax31"  # instance with 8 vCPUs, 16 GB RAM
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

# PostgreSQL variables
variable "postgresql_namespace" {
  description = "Kubernetes namespace for PostgreSQL deployment"
  type        = string
  default     = "postgresql"
}

variable "postgresql_cluster_name" {
  description = "Name of the PostgreSQL cluster"
  type        = string
  default     = "postgres-cluster"
}

variable "postgresql_instance_count" {
  description = "Number of PostgreSQL instances"
  type        = number
  default     = 3
}

variable "postgresql_storage_size" {
  description = "Size of the PostgreSQL storage"
  type        = string
  default     = "10Gi"
}

variable "postgresql_storage_class" {
  description = "Storage class for PostgreSQL volumes"
  type        = string
  default     = "hcloud-volumes"
}

variable "postgresql_image" {
  description = "PostgreSQL container image"
  type        = string
  default     = "ghcr.io/cloudnative-pg/postgresql:17.5"
}

variable "postgresql_create_credentials" {
  description = "Whether to create a Kubernetes secret with database credentials"
  type        = bool
  default     = true
}

variable "postgresql_username" {
  description = "Database username"
  type        = string
  default     = "postgres"
}

variable "postgresql_password" {
  description = "Database password"
  type        = string
  sensitive   = true
  default     = "" # Should be provided in terraform.tfvars
}

variable "postgresql_database_name" {
  description = "Database name"
  type        = string
  default     = "postgres"
}

# Hetzner S3 Object Storage variables for PostgreSQL backups
variable "hetzner_s3_access_key" {
  description = "Hetzner Object Storage access key"
  type        = string
  sensitive   = true
}

variable "hetzner_s3_secret_key" {
  description = "Hetzner Object Storage secret key"
  type        = string
  sensitive   = true
}

variable "hetzner_s3_bucket_name_postgres" {
  description = "Bucket name for PostgreSQL backups"
  type        = string
  default     = "postgresql-backups"
}

variable "hetzner_s3_region" {
  description = "Location for Hetzner Object Storage (fsn1, nbg1, or hel1)"
  type        = string
  default     = "fsn1"
}

variable "hetzner_s3_endpoint_url" {
  description = "Endpoint URL for Hetzner Object Storage"
  type        = string
  default     = "https://fsn1.your-objectstorage.com"
}

# ClickHouse configuration
variable "clickhouse_namespace" {
  description = "Kubernetes namespace for ClickHouse deployment"
  type        = string
  default     = "clickhouse"
}

variable "clickhouse_cluster_name" {
  description = "Name of the ClickHouse cluster"
  type        = string
  default     = "clickhouse-cluster"
}

variable "clickhouse_shards" {
  description = "Number of shards in the ClickHouse cluster"
  type        = number
  default     = 3
}

variable "clickhouse_replicas_per_shard" {
  description = "Number of replicas per shard"
  type        = number
  default     = 2
}

variable "clickhouse_storage_size" {
  description = "Storage size for each ClickHouse instance"
  type        = string
  default     = "1Ti"
}

variable "clickhouse_storage_class" {
  description = "Kubernetes storage class for ClickHouse volumes"
  type        = string
  default     = "hcloud-volumes"
}

variable "clickhouse_cpu_request" {
  description = "CPU request for each ClickHouse instance"
  type        = string
  default     = "4"
}

variable "clickhouse_cpu_limit" {
  description = "CPU limit for each ClickHouse instance"
  type        = string
  default     = "8"
}

variable "clickhouse_memory_request" {
  description = "Memory request for each ClickHouse instance"
  type        = string
  default     = "16Gi"
}

variable "clickhouse_memory_limit" {
  description = "Memory limit for each ClickHouse instance"
  type        = string
  default     = "32Gi"
}

variable "clickhouse_zookeeper_replicas" {
  description = "Number of ZooKeeper replicas for cluster coordination"
  type        = number
  default     = 3
}

variable "clickhouse_enable_tls" {
  description = "Enable TLS for ClickHouse connections"
  type        = bool
  default     = true
}

variable "clickhouse_s3_backup_enabled" {
  description = "Enable S3 backups for ClickHouse data"
  type        = bool
  default     = true
}

variable "clickhouse_s3_bucket_name" {
  description = "S3 bucket name for ClickHouse backups"
  type        = string
  default     = "clickhouse-backups"
}

variable "clickhouse_enable_monitoring" {
  description = "Enable Prometheus monitoring for ClickHouse"
  type        = bool
  default     = true
}

variable "clickhouse_max_connections" {
  description = "Maximum number of concurrent connections per instance"
  type        = number
  default     = 10000
}

variable "clickhouse_max_concurrent_queries" {
  description = "Maximum number of concurrent queries per instance"
  type        = number
  default     = 1000
}

variable "clickhouse_max_memory_usage" {
  description = "Maximum memory usage for queries (bytes)"
  type        = string
  default     = "20000000000"
}

variable "clickhouse_merge_tree_parts_to_delay_insert" {
  description = "Parts count threshold to delay inserts"
  type        = number
  default     = 300
}

variable "clickhouse_merge_tree_parts_to_throw_insert" {
  description = "Parts count threshold to throw on insert"
  type        = number
  default     = 600
}
