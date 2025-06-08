# Databases Module - PostgreSQL, Redis, ClickHouse
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# Generate passwords if not provided
resource "random_password" "postgres" {
  count   = var.postgres_password == "" ? 1 : 0
  length  = 24
  special = true
}

resource "random_password" "redis" {
  count   = var.redis_password == "" ? 1 : 0
  length  = 24
  special = true
}

resource "random_password" "clickhouse" {
  count   = var.clickhouse_password == "" ? 1 : 0
  length  = 24
  special = true
}

locals {
  postgres_password   = var.postgres_password != "" ? var.postgres_password : random_password.postgres[0].result
  redis_password      = var.redis_password != "" ? var.redis_password : random_password.redis[0].result
  clickhouse_password = var.clickhouse_password != "" ? var.clickhouse_password : random_password.clickhouse[0].result
}

# CloudNativePG for PostgreSQL
resource "helm_release" "cloudnative_pg" {
  count = var.enable_postgres ? 1 : 0
  
  name             = "cloudnative-pg"
  repository       = "https://cloudnative-pg.github.io/charts"
  chart            = "cloudnative-pg"
  namespace        = "maya-data"
  create_namespace = true
  version          = "0.20.0"
  
  values = [
    yamlencode({
      monitoring = {
        enabled = true
      }
    })
  ]
}

# PostgreSQL Cluster for main database
resource "kubernetes_manifest" "postgres_cluster" {
  count = var.enable_postgres ? 1 : 0
  
  manifest = {
    apiVersion = "postgresql.cnpg.io/v1"
    kind       = "Cluster"
    metadata = {
      name      = "maya-postgres"
      namespace = "maya-data"
    }
    spec = {
      instances = var.postgres_instances
      
      postgresql = {
        parameters = {
          max_connections         = "200"
          shared_buffers         = "256MB"
          effective_cache_size   = "1GB"
          work_mem              = "8MB"
          maintenance_work_mem  = "64MB"
          
          # Enable required extensions
          shared_preload_libraries = "pg_stat_statements,pgaudit"
        }
      }
      
      bootstrap = {
        initdb = {
          database = "maya"
          owner    = "maya"
          secret = {
            name = kubernetes_secret.postgres_credentials[0].metadata[0].name
          }
          
          # Enable UUID extension
          postInitSQL = [
            "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";",
            "CREATE EXTENSION IF NOT EXISTS \"pg_stat_statements\";",
          ]
        }
      }
      
      storage = {
        size         = var.postgres_storage_size
        storageClass = "longhorn"
      }
      
      monitoring = {
        enabled = true
      }
      
      # High availability settings
      primaryUpdateStrategy = "unsupervised"
      
      # Backup configuration
      backup = var.enable_postgres_backup ? {
        retentionPolicy = "30d"
        barmanObjectStore = {
          destinationPath = "s3://maya-backups/postgres"
          s3Credentials = {
            secretAccessKey = {
              name = "s3-backup-credentials"
              key  = "SECRET_ACCESS_KEY"
            }
            accessKeyId = {
              name = "s3-backup-credentials"
              key  = "ACCESS_KEY_ID"
            }
          }
        }
      } : null
    }
  }
  
  depends_on = [helm_release.cloudnative_pg]
}

# PostgreSQL credentials secret
resource "kubernetes_secret" "postgres_credentials" {
  count = var.enable_postgres ? 1 : 0
  
  metadata {
    name      = "postgres-credentials"
    namespace = "maya-data"
  }
  
  data = {
    username = "maya"
    password = local.postgres_password
  }
}

# Separate PostgreSQL for Logto
resource "kubernetes_manifest" "logto_postgres_cluster" {
  count = var.enable_postgres ? 1 : 0
  
  manifest = {
    apiVersion = "postgresql.cnpg.io/v1"
    kind       = "Cluster"
    metadata = {
      name      = "logto-postgres"
      namespace = "maya-data"
    }
    spec = {
      instances = 1  # Single instance for Logto
      
      postgresql = {
        parameters = {
          max_connections = "100"
          shared_buffers  = "128MB"
        }
      }
      
      bootstrap = {
        initdb = {
          database = "logto"
          owner    = "logto"
          secret = {
            name = kubernetes_secret.logto_postgres_credentials[0].metadata[0].name
          }
        }
      }
      
      storage = {
        size         = "10Gi"
        storageClass = "longhorn"
      }
    }
  }
  
  depends_on = [helm_release.cloudnative_pg]
}

# Logto PostgreSQL credentials
resource "kubernetes_secret" "logto_postgres_credentials" {
  count = var.enable_postgres ? 1 : 0
  
  metadata {
    name      = "logto-postgres-credentials"
    namespace = "maya-data"
  }
  
  data = {
    username = "logto"
    password = "p0stgr3s"  # Keep the same as docker-compose
  }
}

# Redis using Redis Operator
resource "helm_release" "redis_operator" {
  count = var.enable_redis ? 1 : 0
  
  name             = "redis-operator"
  repository       = "https://spotahome.github.io/redis-operator"
  chart            = "redis-operator"
  namespace        = "maya-data"
  create_namespace = true
  version          = "3.2.9"
}

# Redis instance
resource "kubernetes_manifest" "redis_failover" {
  count = var.enable_redis ? 1 : 0
  
  manifest = {
    apiVersion = "databases.spotahome.com/v1"
    kind       = "RedisFailover"
    metadata = {
      name      = "maya-redis"
      namespace = "maya-data"
    }
    spec = {
      sentinel = {
        replicas = var.redis_instances >= 3 ? 3 : 1
        resources = {
          requests = {
            cpu    = "100m"
            memory = "128Mi"
          }
          limits = {
            cpu    = "200m"
            memory = "256Mi"
          }
        }
      }
      
      redis = {
        replicas = var.redis_instances
        resources = {
          requests = {
            cpu    = "250m"
            memory = "512Mi"
          }
          limits = {
            cpu    = "500m"
            memory = "1Gi"
          }
        }
        
        storage = {
          persistentVolumeClaim = {
            metadata = {
              name = "redis-data"
            }
            spec = {
              accessModes = ["ReadWriteOnce"]
              storageClassName = "longhorn"
              resources = {
                requests = {
                  storage = "10Gi"
                }
              }
            }
          }
        }
        
        customConfig = [
          "maxmemory 1gb",
          "maxmemory-policy allkeys-lru",
          "save 900 1",
          "save 300 10",
          "save 60 10000"
        ]
      }
      
      auth = {
        secretPath = kubernetes_secret.redis_credentials[0].metadata[0].name
      }
    }
  }
  
  depends_on = [helm_release.redis_operator]
}

# Redis credentials
resource "kubernetes_secret" "redis_credentials" {
  count = var.enable_redis ? 1 : 0
  
  metadata {
    name      = "redis-credentials"
    namespace = "maya-data"
  }
  
  data = {
    password = local.redis_password
  }
}

# ClickHouse Operator
resource "helm_release" "clickhouse_operator" {
  count = var.enable_clickhouse ? 1 : 0
  
  name             = "clickhouse-operator"
  repository       = "https://docs.altinity.com/clickhouse-operator/"
  chart            = "altinity-clickhouse-operator"
  namespace        = "maya-data"
  create_namespace = true
  version          = "0.23.0"
}

# ClickHouse installation
resource "kubernetes_manifest" "clickhouse_installation" {
  count = var.enable_clickhouse ? 1 : 0
  
  manifest = {
    apiVersion = "clickhouse.altinity.com/v1"
    kind       = "ClickHouseInstallation"
    metadata = {
      name      = "maya-clickhouse"
      namespace = "maya-data"
    }
    spec = {
      defaults = {
        templates = {
          dataVolumeClaimTemplate = "data-volume-template"
          logVolumeClaimTemplate  = "log-volume-template"
        }
      }
      
      configuration = {
        users = {
          default = {
            password_sha256_hex = sha256(local.clickhouse_password)
            networks = {
              ip = ["0.0.0.0/0"]
            }
            profile = "default"
            quota   = "default"
          }
        }
        
        profiles = {
          default = {
            max_memory_usage             = "10000000000"
            use_uncompressed_cache       = "0"
            load_balancing              = "random"
            max_query_size              = "1073741824"
          }
        }
        
        quotas = {
          default = {
            interval = {
              duration = "3600"
              queries  = "0"
              errors   = "0"
              result_rows = "0"
              read_rows   = "0"
              execution_time = "0"
            }
          }
        }
      }
      
      templates = {
        volumeClaimTemplates = [
          {
            name = "data-volume-template"
            spec = {
              accessModes = ["ReadWriteOnce"]
              storageClassName = "longhorn"
              resources = {
                requests = {
                  storage = var.clickhouse_storage_size
                }
              }
            }
          },
          {
            name = "log-volume-template"
            spec = {
              accessModes = ["ReadWriteOnce"]
              storageClassName = "longhorn"
              resources = {
                requests = {
                  storage = "10Gi"
                }
              }
            }
          }
        ]
      }
      
      spec = {
        replicas = var.clickhouse_instances
        shards = [
          {
            name     = "shard0"
            replicas = var.clickhouse_instances
          }
        ]
      }
    }
  }
  
  depends_on = [helm_release.clickhouse_operator]
}

# Service monitors for Prometheus
resource "kubernetes_manifest" "postgres_service_monitor" {
  count = var.enable_postgres && var.enable_monitoring ? 1 : 0
  
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "ServiceMonitor"
    metadata = {
      name      = "postgres-metrics"
      namespace = "maya-data"
    }
    spec = {
      selector = {
        matchLabels = {
          "cnpg.io/cluster" = "maya-postgres"
        }
      }
      endpoints = [{
        port = "metrics"
      }]
    }
  }
}

resource "kubernetes_manifest" "redis_exporter" {
  count = var.enable_redis && var.enable_monitoring ? 1 : 0
  
  manifest = {
    apiVersion = "apps/v1"
    kind       = "Deployment"
    metadata = {
      name      = "redis-exporter"
      namespace = "maya-data"
    }
    spec = {
      replicas = 1
      selector = {
        matchLabels = {
          app = "redis-exporter"
        }
      }
      template = {
        metadata = {
          labels = {
            app = "redis-exporter"
          }
        }
        spec = {
          containers = [{
            name  = "redis-exporter"
            image = "oliver006/redis_exporter:latest"
            env = [{
              name = "REDIS_PASSWORD"
              valueFrom = {
                secretKeyRef = {
                  name = "redis-credentials"
                  key  = "password"
                }
              }
            }]
            args = [
              "--redis.addr=redis://maya-redis:6379"
            ]
            ports = [{
              containerPort = 9121
              name          = "metrics"
            }]
          }]
        }
      }
    }
  }
}