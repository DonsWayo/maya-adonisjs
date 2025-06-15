variable "kubeconfig_path" {
  description = "Path to the kubeconfig file"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace for ClickHouse deployment"
  type        = string
  default     = "clickhouse"
}

variable "cluster_name" {
  description = "Name of the ClickHouse cluster"
  type        = string
  default     = "clickhouse-cluster"
}

variable "shards" {
  description = "Number of shards in the ClickHouse cluster"
  type        = number
  default     = 3
}

variable "replicas_per_shard" {
  description = "Number of replicas per shard"
  type        = number
  default     = 2
}

variable "storage_size" {
  description = "Storage size for each ClickHouse instance"
  type        = string
  default     = "1Ti"
}

variable "storage_class" {
  description = "Kubernetes storage class to use"
  type        = string
  default     = "hcloud-volumes"
}

variable "cpu_request" {
  description = "CPU request for each ClickHouse instance"
  type        = string
  default     = "4"
}

variable "cpu_limit" {
  description = "CPU limit for each ClickHouse instance"
  type        = string
  default     = "8"
}

variable "memory_request" {
  description = "Memory request for each ClickHouse instance"
  type        = string
  default     = "16Gi"
}

variable "memory_limit" {
  description = "Memory limit for each ClickHouse instance"
  type        = string
  default     = "32Gi"
}

variable "zookeeper_replicas" {
  description = "Number of ZooKeeper replicas for cluster coordination"
  type        = number
  default     = 3
}

variable "domain_name" {
  description = "Domain name for ClickHouse cluster access"
  type        = string
}

variable "hetzner_dns_zone_id" {
  description = "Hetzner DNS zone ID"
  type        = string
}

variable "hetzner_dns_api_token" {
  description = "Hetzner DNS API token"
  type        = string
  sensitive   = true
}

variable "s3_backup_enabled" {
  description = "Enable S3 backups for ClickHouse data"
  type        = bool
  default     = true
}

variable "s3_endpoint" {
  description = "S3 endpoint for backups"
  type        = string
  default     = "https://fsn1.your-objectstorage.com"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for ClickHouse backups"
  type        = string
  default     = "clickhouse-backups"
}

variable "s3_access_key" {
  description = "S3 access key for backups"
  type        = string
  sensitive   = true
  default     = ""
}

variable "s3_secret_key" {
  description = "S3 secret key for backups"
  type        = string
  sensitive   = true
  default     = ""
}

variable "enable_monitoring" {
  description = "Enable Prometheus monitoring for ClickHouse"
  type        = bool
  default     = true
}

variable "enable_tls" {
  description = "Enable TLS for ClickHouse connections"
  type        = bool
  default     = true
}

variable "cert_manager_issuer" {
  description = "Cert-manager issuer name for TLS certificates"
  type        = string
  default     = "letsencrypt-prod"
}

variable "max_connections" {
  description = "Maximum number of concurrent connections per instance"
  type        = number
  default     = 10000
}

variable "max_concurrent_queries" {
  description = "Maximum number of concurrent queries per instance"
  type        = number
  default     = 1000
}

variable "max_memory_usage" {
  description = "Maximum memory usage for queries (bytes)"
  type        = string
  default     = "20000000000"
}

variable "merge_tree_parts_to_delay_insert" {
  description = "Parts count threshold to delay inserts"
  type        = number
  default     = 300
}

variable "merge_tree_parts_to_throw_insert" {
  description = "Parts count threshold to throw on insert"
  type        = number
  default     = 600
}

variable "distributed_ddl_task_timeout" {
  description = "Timeout for distributed DDL queries (seconds)"
  type        = number
  default     = 180
}