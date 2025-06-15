terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = ">= 1.5.0"
    }
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
    hetznerdns = {
      source  = "timohirt/hetznerdns"
      version = "~> 2.2.0"
    }
    dns = {
      source  = "hashicorp/dns"
      version = "~> 3.3.0"
    }
    # AWS provider removed, using MinIO instead
    minio = {
      source  = "aminueza/minio"
      version = "3.3.0"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

provider "kubernetes" {
  config_path = "${path.module}/kubeconfig"
}

provider "helm" {
  kubernetes {
    config_path = "${path.module}/kubeconfig"
  }
}

provider "kubectl" {
  config_path = "${path.module}/kubeconfig"
}

provider "hetznerdns" {
  apitoken = var.hetzner_dns_api_token
}

# AWS provider removed, using MinIO instead

provider "minio" {
  minio_server   = "fsn1.your-objectstorage.com"
  minio_user     = var.hetzner_s3_access_key
  minio_password = var.hetzner_s3_secret_key
  minio_region   = "fsn1"
  minio_ssl      = true
}
