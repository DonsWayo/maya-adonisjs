# Deploy Kubernetes modules

# Deploy Hetzner DNS cert-manager module
module "hetzner_dns_cert_manager" {
  source = "./modules/hetzner-dns-cert-manager"

  hetzner_dns_api_token = var.hetzner_dns_api_token
  email_address         = var.email_address
  kubeconfig_path       = "${path.module}/kubeconfig"
  zone_name             = var.zone_name
  cluster_issuer_name   = var.cluster_issuer_name
}

# Get Hetzner DNS zone ID for the echo server domain
data "hetznerdns_zone" "echo_server" {
  name = var.zone_name
}

# Deploy echo server application module
module "echo_server" {
  source = "./modules/echo-server-app"

  kubeconfig_path     = "${path.module}/kubeconfig"
  cluster_issuer_name = module.hetzner_dns_cert_manager.cluster_issuer_name
  domain_name         = var.echo_server_domain
  namespace           = var.echo_server_namespace
  image               = var.echo_server_image
  replicas            = var.echo_server_replicas
  dns_zone_id         = data.hetznerdns_zone.echo_server.id
  dns_zone_name       = var.zone_name
  
  depends_on = [module.hetzner_dns_cert_manager]
}

# Deploy PostgreSQL with CloudNativePG operator
module "postgresql" {
  source = "./modules/postgresql"

  kubeconfig_path       = "${path.module}/kubeconfig"
  namespace             = var.postgresql_namespace
  cluster_name          = var.postgresql_cluster_name
  instance_count        = var.postgresql_instance_count
  storage_size          = var.postgresql_storage_size
  storage_class         = var.postgresql_storage_class
  postgres_image        = var.postgresql_image
  create_db_credentials = var.postgresql_create_credentials
  db_username           = var.postgresql_username
  db_password           = var.postgresql_password
  db_name               = var.postgresql_database_name
  
  # S3 backup configuration
  s3_access_key         = var.hetzner_s3_access_key
  s3_secret_key         = var.hetzner_s3_secret_key
  s3_bucket_name        = var.hetzner_s3_bucket_name_postgres
  s3_region             = var.hetzner_s3_region
  s3_endpoint_url       = var.hetzner_s3_endpoint_url
  
  depends_on = [module.hetzner_dns_cert_manager]
}

# Deploy ClickHouse cluster for high-throughput data processing
module "clickhouse" {
  source = "./modules/clickhouse"

  kubeconfig_path       = "${path.module}/kubeconfig"
  namespace             = var.clickhouse_namespace
  cluster_name          = var.clickhouse_cluster_name
  shards                = var.clickhouse_shards
  replicas_per_shard    = var.clickhouse_replicas_per_shard
  storage_size          = var.clickhouse_storage_size
  storage_class         = var.clickhouse_storage_class
  
  # Resource configuration
  cpu_request           = var.clickhouse_cpu_request
  cpu_limit             = var.clickhouse_cpu_limit
  memory_request        = var.clickhouse_memory_request
  memory_limit          = var.clickhouse_memory_limit
  
  # Networking
  domain_name           = var.zone_name
  hetzner_dns_zone_id   = data.hetznerdns_zone.echo_server.id
  hetzner_dns_api_token = var.hetzner_dns_api_token
  cert_manager_issuer   = module.hetzner_dns_cert_manager.cluster_issuer_name
  enable_tls            = var.clickhouse_enable_tls
  
  # S3 backup configuration
  s3_backup_enabled     = var.clickhouse_s3_backup_enabled
  s3_endpoint           = var.hetzner_s3_endpoint_url
  s3_bucket_name        = var.clickhouse_s3_bucket_name
  s3_access_key         = var.hetzner_s3_access_key
  s3_secret_key         = var.hetzner_s3_secret_key
  
  # Performance tuning
  max_connections              = var.clickhouse_max_connections
  max_concurrent_queries       = var.clickhouse_max_concurrent_queries
  max_memory_usage            = var.clickhouse_max_memory_usage
  merge_tree_parts_to_delay_insert = var.clickhouse_merge_tree_parts_to_delay_insert
  merge_tree_parts_to_throw_insert = var.clickhouse_merge_tree_parts_to_throw_insert
  
  # Monitoring
  enable_monitoring     = var.clickhouse_enable_monitoring
  
  # ZooKeeper configuration
  zookeeper_replicas    = var.clickhouse_zookeeper_replicas
  
  depends_on = [module.hetzner_dns_cert_manager]
}
