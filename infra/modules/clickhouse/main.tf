terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.23.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = ">= 2.11.0"
    }
    hetznerdns = {
      source  = "timohirt/hetznerdns"
      version = ">= 2.2.0"
    }
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = ">= 1.14.0"
    }
    time = {
      source  = "hashicorp/time"
      version = ">= 0.9.0"
    }
  }
}

resource "kubernetes_namespace" "clickhouse" {
  metadata {
    name = var.namespace
  }
}

resource "kubernetes_secret" "clickhouse_s3_backup" {
  count = var.s3_backup_enabled ? 1 : 0

  metadata {
    name      = "clickhouse-s3-backup"
    namespace = kubernetes_namespace.clickhouse.metadata[0].name
  }

  data = {
    access_key = var.s3_access_key
    secret_key = var.s3_secret_key
  }
}

resource "kubernetes_config_map" "clickhouse_config" {
  metadata {
    name      = "clickhouse-config"
    namespace = kubernetes_namespace.clickhouse.metadata[0].name
  }

  data = {
    "config.xml" = templatefile("${path.module}/templates/config.xml.tpl", {
      max_connections         = var.max_connections
      max_concurrent_queries  = var.max_concurrent_queries
      max_memory_usage       = var.max_memory_usage
      enable_tls             = var.enable_tls
      shards                 = var.shards
      replicas_per_shard     = var.replicas_per_shard
      cluster_name           = var.cluster_name
    })

    "users.xml" = templatefile("${path.module}/templates/users.xml.tpl", {
      max_memory_usage = var.max_memory_usage
    })

    "merge_tree.xml" = templatefile("${path.module}/templates/merge_tree.xml.tpl", {
      parts_to_delay_insert = var.merge_tree_parts_to_delay_insert
      parts_to_throw_insert = var.merge_tree_parts_to_throw_insert
    })
  }
}

resource "helm_release" "clickhouse_operator" {
  name       = "clickhouse-operator"
  repository = "https://docs.altinity.com/clickhouse-operator"
  chart      = "altinity-clickhouse-operator"
  version    = "0.25.0"
  namespace  = kubernetes_namespace.clickhouse.metadata[0].name

  set {
    name  = "metrics.enabled"
    value = var.enable_monitoring
  }
}

resource "time_sleep" "wait_for_crds" {
  depends_on = [helm_release.clickhouse_operator]
  
  create_duration = "30s"
}

resource "kubectl_manifest" "clickhouse_installation" {
  depends_on = [time_sleep.wait_for_crds, helm_release.zookeeper]
  
  yaml_body = yamlencode({
    apiVersion = "clickhouse.altinity.com/v1"
    kind       = "ClickHouseInstallation"
    metadata = {
      name      = var.cluster_name
      namespace = kubernetes_namespace.clickhouse.metadata[0].name
    }
    spec = {
      configuration = {
        clusters = [{
          name = "main"
          layout = {
            shardsCount   = var.shards
            replicasCount = var.replicas_per_shard
            shards = [
              for shard_idx in range(var.shards) : {
                replicas = [
                  for replica_idx in range(var.replicas_per_shard) : {
                    name = "r${replica_idx}"
                  }
                ]
              }
            ]
          }
        }]

        zookeeper = {
          nodes = [
            for i in range(var.zookeeper_replicas) : {
              host = "clickhouse-zookeeper-${i}.clickhouse-zookeeper-headless.${var.namespace}.svc.cluster.local"
              port = 2181
            }
          ]
        }

        files = {
          "config.d/config.xml"      = kubernetes_config_map.clickhouse_config.data["config.xml"]
          "users.d/users.xml"        = kubernetes_config_map.clickhouse_config.data["users.xml"]
          "config.d/merge_tree.xml"  = kubernetes_config_map.clickhouse_config.data["merge_tree.xml"]
        }

        settings = var.s3_backup_enabled ? {
          backup_endpoint   = var.s3_endpoint
          backup_bucket     = var.s3_bucket_name
          backup_access_key = kubernetes_secret.clickhouse_s3_backup[0].data.access_key
          backup_secret_key = kubernetes_secret.clickhouse_s3_backup[0].data.secret_key
        } : {}
      }

      defaults = {
        templates = {
          dataVolumeClaimTemplate = "data-volume-template"
          podTemplate             = "clickhouse-pod-template"
        }
      }

      templates = {
        volumeClaimTemplates = [{
          name = "data-volume-template"
          spec = {
            accessModes = ["ReadWriteOnce"]
            resources = {
              requests = {
                storage = var.storage_size
              }
            }
            storageClassName = var.storage_class
          }
        }]

        podTemplates = [{
          name = "clickhouse-pod-template"
          spec = {
            containers = [{
              name  = "clickhouse"
              image = "clickhouse/clickhouse-server:24.11-alpine"
              
              resources = {
                requests = {
                  cpu    = var.cpu_request
                  memory = var.memory_request
                }
                limits = {
                  cpu    = var.cpu_limit
                  memory = var.memory_limit
                }
              }

              ports = [
                {
                  name          = "http"
                  containerPort = 8123
                },
                {
                  name          = "tcp"
                  containerPort = 9000
                },
                {
                  name          = "interserver"
                  containerPort = 9009
                }
              ]

              livenessProbe = {
                httpGet = {
                  path = "/ping"
                  port = 8123
                }
                initialDelaySeconds = 60
                periodSeconds       = 30
                timeoutSeconds      = 5
              }

              readinessProbe = {
                httpGet = {
                  path = "/ping"
                  port = 8123
                }
                initialDelaySeconds = 30
                periodSeconds       = 10
                timeoutSeconds      = 5
              }
            }]

            affinity = {
              podAntiAffinity = {
                requiredDuringSchedulingIgnoredDuringExecution = [{
                  labelSelector = {
                    matchExpressions = [{
                      key      = "clickhouse.altinity.com/chi"
                      operator = "In"
                      values   = [var.cluster_name]
                    }]
                  }
                  topologyKey = "kubernetes.io/hostname"
                }]
              }
            }
          }
        }]
      }
    }
  })
}

resource "helm_release" "zookeeper" {
  name       = "clickhouse-zookeeper"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "zookeeper"
  version    = "13.4.6"
  namespace  = kubernetes_namespace.clickhouse.metadata[0].name

  set {
    name  = "replicaCount"
    value = var.zookeeper_replicas
  }

  set {
    name  = "persistence.enabled"
    value = "true"
  }

  set {
    name  = "persistence.storageClass"
    value = var.storage_class
  }

  set {
    name  = "persistence.size"
    value = "10Gi"
  }

  set {
    name  = "resources.requests.cpu"
    value = "500m"
  }

  set {
    name  = "resources.requests.memory"
    value = "1Gi"
  }

  set {
    name  = "resources.limits.cpu"
    value = "1"
  }

  set {
    name  = "resources.limits.memory"
    value = "2Gi"
  }

  set {
    name  = "metrics.enabled"
    value = var.enable_monitoring
  }
}

resource "kubernetes_service" "clickhouse_lb" {
  metadata {
    name      = "${var.cluster_name}-lb"
    namespace = kubernetes_namespace.clickhouse.metadata[0].name
    annotations = {
      "load-balancer.hetzner.cloud/name"               = "${var.cluster_name}-lb"
      "load-balancer.hetzner.cloud/use-private-ip"     = "false"
      "load-balancer.hetzner.cloud/disable-private-ingress" = "true"
      "load-balancer.hetzner.cloud/location"           = "fsn1"
    }
  }

  spec {
    type = "LoadBalancer"
    selector = {
      "clickhouse.altinity.com/chi" = var.cluster_name
    }

    port {
      name        = "http"
      port        = 8123
      target_port = 8123
      protocol    = "TCP"
    }

    port {
      name        = "tcp"
      port        = 9000
      target_port = 9000
      protocol    = "TCP"
    }
  }
}

resource "kubernetes_ingress_v1" "clickhouse" {
  count = var.enable_tls ? 1 : 0

  metadata {
    name      = "${var.cluster_name}-ingress"
    namespace = kubernetes_namespace.clickhouse.metadata[0].name
    annotations = {
      "nginx.ingress.kubernetes.io/backend-protocol" = "HTTP"
      "nginx.ingress.kubernetes.io/proxy-body-size"  = "100m"
      "nginx.ingress.kubernetes.io/proxy-read-timeout" = "600"
      "nginx.ingress.kubernetes.io/proxy-send-timeout" = "600"
      "cert-manager.io/cluster-issuer" = var.cert_manager_issuer
    }
  }

  spec {
    ingress_class_name = "nginx"

    tls {
      hosts       = ["clickhouse.${var.domain_name}"]
      secret_name = "${var.cluster_name}-tls"
    }

    rule {
      host = "clickhouse.${var.domain_name}"
      
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          
          backend {
            service {
              name = kubernetes_service.clickhouse_lb.metadata[0].name
              port {
                number = 8123
              }
            }
          }
        }
      }
    }
  }
}

data "kubernetes_service" "clickhouse_lb" {
  depends_on = [kubernetes_service.clickhouse_lb]
  
  metadata {
    name      = kubernetes_service.clickhouse_lb.metadata[0].name
    namespace = kubernetes_namespace.clickhouse.metadata[0].name
  }
}

resource "hetznerdns_record" "clickhouse" {
  zone_id = var.hetzner_dns_zone_id
  name    = "clickhouse"
  value   = data.kubernetes_service.clickhouse_lb.status.0.load_balancer.0.ingress.0.ip
  type    = "A"
  ttl     = 60
}

resource "kubernetes_horizontal_pod_autoscaler_v2" "clickhouse" {
  metadata {
    name      = "${var.cluster_name}-hpa"
    namespace = kubernetes_namespace.clickhouse.metadata[0].name
  }

  spec {
    scale_target_ref {
      api_version = "clickhouse.altinity.com/v1"
      kind        = "ClickHouseInstallation"
      name        = var.cluster_name
    }

    min_replicas = var.shards * var.replicas_per_shard
    max_replicas = var.shards * var.replicas_per_shard * 2

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }

    metric {
      type = "Resource"
      resource {
        name = "memory"
        target {
          type                = "Utilization"
          average_utilization = 80
        }
      }
    }
  }
}