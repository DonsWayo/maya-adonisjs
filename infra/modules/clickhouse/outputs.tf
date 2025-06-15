output "cluster_name" {
  description = "Name of the ClickHouse cluster"
  value       = var.cluster_name
}

output "namespace" {
  description = "Kubernetes namespace where ClickHouse is deployed"
  value       = kubernetes_namespace.clickhouse.metadata[0].name
}

output "service_name" {
  description = "Name of the ClickHouse LoadBalancer service"
  value       = kubernetes_service.clickhouse_lb.metadata[0].name
}

output "service_ip" {
  description = "External IP address of the ClickHouse LoadBalancer"
  value       = try(data.kubernetes_service.clickhouse_lb.status.0.load_balancer.0.ingress.0.ip, "pending")
}

output "http_endpoint" {
  description = "HTTP endpoint for ClickHouse"
  value       = "http://${try(data.kubernetes_service.clickhouse_lb.status.0.load_balancer.0.ingress.0.ip, "pending")}:8123"
}

output "tcp_endpoint" {
  description = "TCP endpoint for ClickHouse native protocol"
  value       = "${try(data.kubernetes_service.clickhouse_lb.status.0.load_balancer.0.ingress.0.ip, "pending")}:9000"
}

output "dns_name" {
  description = "DNS name for accessing ClickHouse"
  value       = "clickhouse.${var.domain_name}"
}

output "https_url" {
  description = "HTTPS URL for accessing ClickHouse (if TLS is enabled)"
  value       = var.enable_tls ? "https://clickhouse.${var.domain_name}" : null
}

output "zookeeper_nodes" {
  description = "ZooKeeper nodes for ClickHouse cluster coordination"
  value = [
    for i in range(var.zookeeper_replicas) : "clickhouse-zookeeper-${i}.clickhouse-zookeeper-headless.${var.namespace}.svc.cluster.local:2181"
  ]
}

output "clickhouse_nodes" {
  description = "All ClickHouse node hostnames"
  value = [
    for shard_idx in range(var.shards) : [
      for replica_idx in range(var.replicas_per_shard) : 
        "chi-${var.cluster_name}-main-${shard_idx}-${replica_idx}.${var.cluster_name}.${var.namespace}.svc.cluster.local"
    ]
  ]
}

output "cluster_config" {
  description = "ClickHouse cluster configuration details"
  value = {
    shards             = var.shards
    replicas_per_shard = var.replicas_per_shard
    total_nodes        = var.shards * var.replicas_per_shard
    storage_per_node   = var.storage_size
    total_storage      = "${var.shards * var.replicas_per_shard}x${var.storage_size}"
  }
}

output "monitoring_endpoint" {
  description = "Prometheus metrics endpoint (if monitoring is enabled)"
  value       = var.enable_monitoring ? "http://${try(data.kubernetes_service.clickhouse_lb.status.0.load_balancer.0.ingress.0.ip, "pending")}:9363/metrics" : null
}