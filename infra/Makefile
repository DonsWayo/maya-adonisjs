# Maya AdonisJS Infrastructure Makefile
ENVIRONMENT ?= dev
TERRAFORM_DIR = terraform/environments/$(ENVIRONMENT)
K8S_DIR = kubernetes
KUBECONFIG_PATH = ~/.kube/config-maya-$(ENVIRONMENT)

.PHONY: help check init plan apply destroy kubeconfig argocd validate urls clean

# Default target
help:
	@echo "Maya AdonisJS Infrastructure Management"
	@echo ""
	@echo "Usage: make [target] ENVIRONMENT=[dev|staging|prod]"
	@echo ""
	@echo "Targets:"
	@echo "  check       - Check requirements"
	@echo "  init        - Initialize Terraform"
	@echo "  plan        - Plan infrastructure changes"
	@echo "  apply       - Apply infrastructure changes"
	@echo "  destroy     - Destroy infrastructure"
	@echo "  kubeconfig  - Export kubeconfig"
	@echo "  argocd      - Setup ArgoCD"
	@echo "  validate    - Validate deployment"
	@echo "  urls        - Show application URLs"
	@echo "  clean       - Clean temporary files"
	@echo ""
	@echo "Current environment: $(ENVIRONMENT)"

# Check requirements
check:
	@echo "Checking requirements..."
	@which terraform >/dev/null || (echo "terraform not found" && exit 1)
	@which kubectl >/dev/null || (echo "kubectl not found" && exit 1)
	@which helm >/dev/null || (echo "helm not found" && exit 1)
	@which kustomize >/dev/null || (echo "kustomize not found" && exit 1)
	@echo "✓ All requirements satisfied"

# Initialize Terraform
init: check
	@echo "Initializing Terraform for $(ENVIRONMENT)..."
	@test -f $(TERRAFORM_DIR)/terraform.tfvars || \
		(echo "Error: $(TERRAFORM_DIR)/terraform.tfvars not found" && \
		 echo "Copy terraform.tfvars.example to terraform.tfvars and configure it" && exit 1)
	@cd $(TERRAFORM_DIR) && terraform init -upgrade

# Plan infrastructure changes
plan: init
	@echo "Planning infrastructure changes for $(ENVIRONMENT)..."
	@cd $(TERRAFORM_DIR) && terraform plan -out=tfplan

# Apply infrastructure changes
apply: 
	@test -f $(TERRAFORM_DIR)/tfplan || (echo "No plan found. Run 'make plan' first" && exit 1)
	@echo "Applying infrastructure changes for $(ENVIRONMENT)..."
	@cd $(TERRAFORM_DIR) && terraform apply tfplan && rm -f tfplan
	@echo "Saving kubeconfig..."
	@mkdir -p ~/.kube
	@cd $(TERRAFORM_DIR) && terraform output -raw kubeconfig > $(KUBECONFIG_PATH)
	@echo "✓ Infrastructure deployed successfully"
	@echo "✓ Run 'make kubeconfig' to configure kubectl"

# Destroy infrastructure
destroy:
	@echo "WARNING: This will destroy the $(ENVIRONMENT) infrastructure!"
	@read -p "Type 'yes' to confirm: " confirm && \
		[ "$$confirm" = "yes" ] && \
		cd $(TERRAFORM_DIR) && terraform destroy -auto-approve || \
		echo "Destruction cancelled"

# Export kubeconfig
kubeconfig:
	@echo "export KUBECONFIG=$(KUBECONFIG_PATH)"
	@echo ""
	@echo "Run the above command or:"
	@echo "eval \$$(make kubeconfig)"

# Setup ArgoCD
argocd:
	@echo "Setting up ArgoCD..."
	@kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd || true
	@kubectl apply -f $(K8S_DIR)/argocd/projects/maya-project.yaml
	@kubectl apply -f $(K8S_DIR)/argocd/applications/maya-$(ENVIRONMENT)-app.yaml
	@echo "✓ ArgoCD configured"

# Validate deployment
validate:
	@echo "Validating deployment..."
	@echo "\n=== Namespaces ==="
	@kubectl get namespaces | grep maya || true
	@echo "\n=== Deployments ==="
	@kubectl get deployments -n maya-apps
	@kubectl get deployments -n maya-auth || true
	@echo "\n=== Pods ==="
	@kubectl get pods -n maya-apps
	@kubectl get pods -n maya-auth || true
	@kubectl get pods -n maya-data || true
	@echo "\n=== Ingresses ==="
	@kubectl get ingress -A | grep maya || true

# Show application URLs
urls:
	@cd $(TERRAFORM_DIR) && terraform output -json application_urls 2>/dev/null | \
		jq -r 'to_entries[] | "\(.key): \(.value)"' || \
		echo "Run 'make apply' first to get URLs"

# Clean temporary files
clean:
	@rm -f $(TERRAFORM_DIR)/tfplan
	@rm -f $(TERRAFORM_DIR)/.terraform.lock.hcl
	@rm -rf $(TERRAFORM_DIR)/.terraform
	@echo "✓ Cleaned temporary files"

# Quick deployment (all steps)
.PHONY: deploy
deploy: check init plan apply kubeconfig argocd validate urls
	@echo "✓ Deployment complete!"