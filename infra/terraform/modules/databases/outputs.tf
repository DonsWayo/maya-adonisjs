output "postgres_endpoint" {
  description = "PostgreSQL connection endpoint"
  value       = var.enable_postgres ? "maya-postgres-rw.maya-data.svc.cluster.local:5432" : null
}

output "postgres_read_endpoint" {
  description = "PostgreSQL read-only endpoint"
  value       = var.enable_postgres ? "maya-postgres-ro.maya-data.svc.cluster.local:5432" : null
}

output "postgres_database" {
  description = "PostgreSQL database name"
  value       = "maya"
}

output "postgres_username" {
  description = "PostgreSQL username"
  value       = "maya"
}

output "postgres_password" {
  description = "PostgreSQL password"
  value       = local.postgres_password
  sensitive   = true
}

output "logto_postgres_endpoint" {
  description = "Logto PostgreSQL connection endpoint"
  value       = var.enable_postgres ? "logto-postgres-rw.maya-data.svc.cluster.local:5432" : null
}

output "logto_postgres_database" {
  description = "Logto PostgreSQL database name"
  value       = "logto"
}

output "logto_postgres_username" {
  description = "Logto PostgreSQL username"
  value       = "logto"
}

output "logto_postgres_password" {
  description = "Logto PostgreSQL password"
  value       = "p0stgr3s"
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis connection endpoint"
  value       = var.enable_redis ? "maya-redis.maya-data.svc.cluster.local:6379" : null
}

output "redis_sentinel_endpoint" {
  description = "Redis Sentinel endpoint for HA"
  value       = var.enable_redis ? "maya-redis-sentinel.maya-data.svc.cluster.local:26379" : null
}

output "redis_password" {
  description = "Redis password"
  value       = local.redis_password
  sensitive   = true
}

output "clickhouse_endpoint" {
  description = "ClickHouse connection endpoint"
  value       = var.enable_clickhouse ? "maya-clickhouse.maya-data.svc.cluster.local:8123" : null
}

output "clickhouse_native_endpoint" {
  description = "ClickHouse native protocol endpoint"
  value       = var.enable_clickhouse ? "maya-clickhouse.maya-data.svc.cluster.local:9000" : null
}

output "clickhouse_username" {
  description = "ClickHouse username"
  value       = "default"
}

output "clickhouse_password" {
  description = "ClickHouse password"
  value       = local.clickhouse_password
  sensitive   = true
}

output "database_namespace" {
  description = "Kubernetes namespace for databases"
  value       = "maya-data"
}