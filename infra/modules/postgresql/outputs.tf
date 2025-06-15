output "cluster_name" {
  description = "Name of the PostgreSQL cluster"
  value       = var.cluster_name
}

output "namespace" {
  description = "Namespace where PostgreSQL is deployed"
  value       = var.namespace
}

output "connection_string" {
  description = "PostgreSQL connection string (without credentials)"
  value       = "postgresql://${var.cluster_name}-rw.${var.namespace}.svc.cluster.local:5432/${var.db_name}"
}

output "read_write_service" {
  description = "Kubernetes service name for read-write connections"
  value       = "${var.cluster_name}-rw"
}

output "read_only_service" {
  description = "Kubernetes service name for read-only connections"
  value       = "${var.cluster_name}-ro"
}

output "credentials_secret_name" {
  description = "Name of the Kubernetes secret containing database credentials"
  value       = var.create_db_credentials ? kubernetes_secret.db_credentials[0].metadata[0].name : null
}
