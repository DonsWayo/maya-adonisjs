terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    hetznerdns = {
      source  = "timohirt/hetznerdns"
      version = "~> 2.2.0"
    }
    dns = {
      source  = "hashicorp/dns"
      version = "~> 3.3.0"
    }
  }
}

# Echo server deployment
resource "kubernetes_deployment" "echo_server" {
  metadata {
    name      = "echo-server"
    namespace = var.namespace
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        app = "echo-server"
      }
    }

    template {
      metadata {
        labels = {
          app = "echo-server"
        }
      }

      spec {
        container {
          image = var.image
          name  = "echo-server"
          
          port {
            container_port = 80
          }
          
          resources {
            limits = {
              cpu    = "0.5"
              memory = "512Mi"
            }
            requests = {
              cpu    = "250m"
              memory = "256Mi"
            }
          }
        }
      }
    }
  }
}

# Echo server service
resource "kubernetes_service" "echo_server" {
  metadata {
    name      = "echo-server"
    namespace = var.namespace
  }

  spec {
    selector = {
      app = "echo-server"
    }
    
    port {
      port        = 80
      target_port = 80
    }
  }

  depends_on = [kubernetes_deployment.echo_server]
}

# Ingress for echo server with TLS
resource "kubernetes_ingress_v1" "echo_server" {
  metadata {
    name      = "echo-server"
    namespace = var.namespace
    annotations = {
      "kubernetes.io/ingress.class"                    = "nginx"
      "cert-manager.io/cluster-issuer"                 = var.cluster_issuer_name
      "nginx.ingress.kubernetes.io/ssl-redirect"       = "true"
      "nginx.ingress.kubernetes.io/force-ssl-redirect" = "true"
    }
  }

  spec {
    tls {
      hosts       = [var.domain_name]
      secret_name = "${replace(var.domain_name, ".", "-")}-tls"
    }

    rule {
      host = var.domain_name
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service.echo_server.metadata[0].name
              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }

  depends_on = [kubernetes_service.echo_server]
}

# Get the Nginx Ingress Controller service to find its external IP/hostname
data "kubernetes_service" "ingress_nginx" {
  metadata {
    name      = "ingress-nginx-controller"
    namespace = "ingress-nginx"
  }
}

# If the ingress controller provides a hostname instead of an IP, resolve it
data "dns_a_record_set" "ingress_ip" {
  count = data.kubernetes_service.ingress_nginx.status.0.load_balancer.0.ingress.0.ip == "" ? 1 : 0
  host  = data.kubernetes_service.ingress_nginx.status.0.load_balancer.0.ingress.0.hostname
}

# Create DNS record for the echo server domain
resource "hetznerdns_record" "echo_server" {
  zone_id = var.dns_zone_id
  name    = trimsuffix(var.domain_name, ".${var.dns_zone_name}")
  value   = data.kubernetes_service.ingress_nginx.status.0.load_balancer.0.ingress.0.ip != "" ? data.kubernetes_service.ingress_nginx.status.0.load_balancer.0.ingress.0.ip : data.dns_a_record_set.ingress_ip[0].addrs[0]
  type    = "A"
  ttl     = 60
}
