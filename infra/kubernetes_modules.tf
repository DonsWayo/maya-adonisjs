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
