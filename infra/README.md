# Hetzner Cloud Kubernetes Deployment

This directory contains Terraform configuration for deploying a Kubernetes cluster on Hetzner Cloud using ARM64 architecture nodes. The deployment uses the [hcloud-k8s/kubernetes/hcloud](https://registry.terraform.io/modules/hcloud-k8s/kubernetes/hcloud/latest) Terraform module, which leverages Talos Linux for a secure, immutable Kubernetes setup.

## Prerequisites

Before you begin, make sure you have the following tools installed:

- [Terraform](https://developer.hashicorp.com/terraform/install) (v1.0.0+) or [OpenTofu](https://opentofu.org/docs/intro/install/)
- [Packer](https://developer.hashicorp.com/packer/install) (required for Talos image upload)
- [talosctl](https://www.talos.dev/latest/talos-guides/install/talosctl/) (for managing Talos nodes)
- [kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl) (for interacting with Kubernetes)

## Configuration

### Hetzner Cloud API Token

You'll need a Hetzner Cloud API token with read/write permissions. You can create one in the Hetzner Cloud Console under "Security" > "API Tokens".

**Important**: Never commit your API token to version control. Use one of these methods to provide it:

1. Create a `terraform.tfvars` file (copy from `terraform.tfvars.example`):
   ```hcl
   hcloud_token = "your_hcloud_api_token"
   ```

2. Set an environment variable:
   ```bash
   export TF_VAR_hcloud_token="your_hcloud_api_token"
   ```

### Customizing the Deployment

Edit the variables in `main.tf` or override them in your `terraform.tfvars` file:

- `cluster_name`: Name of your Kubernetes cluster
- `location`: Hetzner Cloud location (e.g., `fsn1`, `nbg1`, `hel1`)
- `control_plane_type`: ARM64 server type for control plane nodes (e.g., `cax21`)
- `worker_type`: ARM64 server type for worker nodes (e.g., `cax11`)
- `control_plane_count`: Number of control plane nodes (3+ recommended for HA)
- `worker_count`: Number of worker nodes

## Deployment

1. Initialize Terraform:
   ```bash
   terraform init -upgrade
   ```

2. Review the deployment plan:
   ```bash
   terraform plan
   ```

3. Apply the configuration:
   ```bash
   terraform apply
   ```

The deployment will take approximately 10-15 minutes to complete. Once finished, the Terraform output will provide:

- `kubeconfig`: Kubernetes configuration data
- `talosconfig`: Talos configuration data
- `control_plane_public_ipv4_list`: Public IPs of control plane nodes
- `worker_public_ipv4_list`: Public IPs of worker nodes

## Accessing the Cluster

After deployment, Terraform will generate `kubeconfig` and `talosconfig` files in the `infra` directory.

### Using talosctl

```bash
export TALOSCONFIG=$(pwd)/talosconfig
talosctl get members
```

### Using kubectl

```bash
export KUBECONFIG=$(pwd)/kubeconfig
kubectl get nodes -o wide
```

## ARM64 Architecture Notes

This deployment uses ARM64 architecture nodes (`cax` series) which offer better price-to-performance ratio compared to x86_64 instances. Key considerations:

- Ensure your container images support ARM64 architecture
- Some applications may require architecture-specific configurations
- For multi-architecture support, use container images with multi-arch manifests

## Teardown

To destroy the cluster:

1. Update `main.tf` to disable delete protection:
   ```hcl
   cluster_delete_protection = false
   ```

2. Apply this change:
   ```bash
   terraform apply
   ```

3. Destroy the cluster:
   ```bash
   terraform destroy
   ```

## Advanced Configuration

For advanced configurations like network segmentation, backups, or Talos discovery, refer to the [module documentation](https://registry.terraform.io/modules/hcloud-k8s/kubernetes/hcloud/latest).
