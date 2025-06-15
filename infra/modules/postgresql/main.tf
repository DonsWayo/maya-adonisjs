terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.19.0"
    }
    minio = {
      source  = "aminueza/minio"
      version = "3.3.0"
    }
  }
}

# AWS provider is configured in the root providers.tf file

# Install CloudNative PostgreSQL Operator
resource "helm_release" "cloudnative_pg" {
  name       = "cloudnative-pg"
  repository = "https://cloudnative-pg.github.io/charts"
  chart      = "cloudnative-pg"
  namespace  = var.namespace
  create_namespace = true
  version    = var.operator_version

  set {
    name  = "replicaCount"
    value = var.operator_replica_count
  }

  # Additional operator configurations can be added here
  values = [
    var.operator_values
  ]
}

# Wait for the operator to be ready before creating the PostgreSQL cluster
resource "time_sleep" "wait_for_operator" {
  depends_on = [helm_release.cloudnative_pg]
  create_duration = "30s"
}

# Create PostgreSQL Cluster
resource "kubectl_manifest" "postgresql_cluster" {
  depends_on = [time_sleep.wait_for_operator, helm_release.cloudnative_pg]
  yaml_body = <<YAML
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: ${var.cluster_name}
  namespace: ${var.namespace}
spec:
  instances: ${var.instance_count}
  imageName: ${var.postgres_image}
  
  # PostgreSQL configuration
  postgresql:
    parameters:
      shared_buffers: ${var.shared_buffers}
      max_connections: "${var.max_connections}"
      log_checkpoints: "on"
      log_lock_waits: "on"
      log_min_duration_statement: "1000"
      log_statement: "ddl"
      log_temp_files: "1024"
      
  # Storage configuration
  storage:
    size: ${var.storage_size}
    storageClass: ${var.storage_class}
  
  # Backup configuration
  backup:
    retentionPolicy: ${var.backup_retention_policy}
    barmanObjectStore:
      destinationPath: s3://${var.cluster_name}-${var.s3_bucket_name}/
      endpointURL: ${var.s3_endpoint_url}
      s3Credentials:
        accessKeyId:
          name: ${var.s3_credentials_secret}
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: ${var.s3_credentials_secret}
          key: ACCESS_SECRET_KEY
      wal:
        compression: gzip
        maxParallel: 8
  
  # High availability settings
  primaryUpdateStrategy: ${var.primary_update_strategy}
  startDelay: 30
  stopDelay: 30
  
  # Monitoring
  monitoring:
    enablePodMonitor: ${var.enable_monitoring}
YAML
}

# Create a Kubernetes Secret for database credentials if specified
resource "kubernetes_secret" "db_credentials" {
  count = var.create_db_credentials ? 1 : 0
  depends_on = [helm_release.cloudnative_pg]
  
  metadata {
    name      = "${var.cluster_name}-db-credentials"
    namespace = var.namespace
  }

  data = {
    username = var.db_username
    password = var.db_password
    database = var.db_name
    host     = "${var.cluster_name}-rw.${var.namespace}.svc.cluster.local"
    port     = "5432"
    url      = "postgresql://${var.db_username}:${var.db_password}@${var.cluster_name}-rw.${var.namespace}.svc.cluster.local:5432/${var.db_name}"
  }
}

# Create S3 bucket for PostgreSQL backups using MinIO provider
resource "minio_s3_bucket" "postgresql_backups" {
  bucket        = "${var.cluster_name}-${var.s3_bucket_name}"
  acl           = "private"
  force_destroy = true
}

# Create Kubernetes Secret for S3 credentials
resource "kubernetes_secret" "s3_credentials" {
  depends_on = [helm_release.cloudnative_pg, minio_s3_bucket.postgresql_backups]
  
  metadata {
    name      = var.s3_credentials_secret
    namespace = var.namespace
  }

  data = {
    ACCESS_KEY_ID     = var.s3_access_key
    ACCESS_SECRET_KEY = var.s3_secret_key
  }
}
