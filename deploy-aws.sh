#!/bin/bash

# SIM2Serve AWS CLI Deployment Script
# This script deploys the application using only AWS CLI and standard Unix tools

set -e

# Configuration
ENVIRONMENT_NAME=${ENVIRONMENT_NAME:-dev}
AWS_REGION=${AWS_REGION:-us-east-1}
CLUSTER_NAME=${CLUSTER_NAME:-${ENVIRONMENT_NAME}-sim2serve-cluster}
VERSION=${VERSION:-latest}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install it first."
    fi
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed. Please install it first."
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install it first."
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured. Run 'aws configure' first."
    fi
    
    # Get AWS Account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    log "Using AWS Account ID: $AWS_ACCOUNT_ID"
}

create_ecr_repos() {
    log "Creating ECR repositories..."
    
    # Create User Service repository
    aws ecr create-repository \
        --repository-name sim2serve/user-service \
        --region $AWS_REGION \
        --image-scanning-configuration scanOnPush=true \
        2>/dev/null || warn "User Service repository already exists"
    
    # Create Tweet Service repository
    aws ecr create-repository \
        --repository-name sim2serve/tweet-service \
        --region $AWS_REGION \
        --image-scanning-configuration scanOnPush=true \
        2>/dev/null || warn "Tweet Service repository already exists"
    
    log "ECR repositories ready"
}

build_and_push_images() {
    log "Building and pushing Docker images..."
    
    # Login to ECR
    aws ecr get-login-password --region $AWS_REGION | \
        docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    # Build and push User Service
    log "Building User Service..."
    docker build -t user-service apps/user-service/
    docker tag user-service:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sim2serve/user-service:$VERSION
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sim2serve/user-service:$VERSION
    
    # Build and push Tweet Service
    log "Building Tweet Service..."
    docker build -t tweet-service apps/tweet-service/
    docker tag tweet-service:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sim2serve/tweet-service:$VERSION
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sim2serve/tweet-service:$VERSION
    
    log "Images pushed successfully"
}

update_k8s_manifests() {
    log "Updating Kubernetes manifests with correct image URLs..."
    
    # Create temporary directory for updated manifests
    mkdir -p /tmp/k8s-deploy
    cp -r k8s/* /tmp/k8s-deploy/
    
    # Update User Service deployment
    sed -i.bak "s|image: user-service:latest|image: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sim2serve/user-service:$VERSION|g" \
        /tmp/k8s-deploy/04-user-service-deployment.yaml
    
    # Update Tweet Service deployment
    sed -i.bak "s|image: tweet-service:latest|image: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sim2serve/tweet-service:$VERSION|g" \
        /tmp/k8s-deploy/05-tweet-service-deployment.yaml
    
    log "Manifests updated"
}

configure_kubectl() {
    log "Configuring kubectl for EKS cluster..."
    aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME
    
    # Test connection
    if ! kubectl get nodes &> /dev/null; then
        error "Cannot connect to EKS cluster. Make sure the cluster exists and you have proper permissions."
    fi
    
    log "kubectl configured successfully"
}

deploy_to_kubernetes() {
    log "Deploying to Kubernetes..."
    
    # Apply manifests in order
    MANIFESTS=(
        "01-namespace.yaml"
        "02-configmap.yaml"
        "03-secrets.yaml"
        "04-user-service-deployment.yaml"
        "05-tweet-service-deployment.yaml"
        "06-services.yaml"
        "07-ingress.yaml"
        "08-hpa.yaml"
    )
    
    for manifest in "${MANIFESTS[@]}"; do
        log "Applying $manifest..."
        kubectl apply -f /tmp/k8s-deploy/$manifest
    done
    
    # Wait for deployments to be ready
    log "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/user-service -n sim2serve
    kubectl wait --for=condition=available --timeout=300s deployment/tweet-service -n sim2serve
    
    log "Deployment completed successfully"
}

run_migrations() {
    log "Running database migrations..."
    
    # Get a pod from user-service to run migrations
    USER_POD=$(kubectl get pods -n sim2serve -l app=user-service -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$USER_POD" ]; then
        error "No user-service pods found"
    fi
    
    # Run user-service migrations
    kubectl exec -n sim2serve $USER_POD -- npm run typeorm:migration:run
    
    # Get a pod from tweet-service to run migrations
    TWEET_POD=$(kubectl get pods -n sim2serve -l app=tweet-service -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$TWEET_POD" ]; then
        error "No tweet-service pods found"
    fi
    
    # Run tweet-service migrations
    kubectl exec -n sim2serve $TWEET_POD -- npm run typeorm:migration:run
    
    log "Migrations completed"
}

show_status() {
    log "Deployment Status:"
    echo ""
    
    # Show pods
    echo "Pods:"
    kubectl get pods -n sim2serve
    echo ""
    
    # Show services
    echo "Services:"
    kubectl get services -n sim2serve
    echo ""
    
    # Show ingress
    echo "Ingress:"
    kubectl get ingress -n sim2serve
    echo ""
    
    # Show HPA
    echo "Horizontal Pod Autoscaler:"
    kubectl get hpa -n sim2serve
    echo ""
    
    # Get ingress URL
    INGRESS_URL=$(kubectl get ingress sim2serve-ingress -n sim2serve -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "Not available yet")
    log "Application URL: http://$INGRESS_URL"
}

cleanup() {
    log "Cleaning up temporary files..."
    rm -rf /tmp/k8s-deploy
}

# Main execution
main() {
    case "${1:-deploy}" in
        "check")
            check_prerequisites
            ;;
        "ecr")
            check_prerequisites
            create_ecr_repos
            ;;
        "build")
            check_prerequisites
            create_ecr_repos
            build_and_push_images
            ;;
        "deploy")
            check_prerequisites
            create_ecr_repos
            build_and_push_images
            update_k8s_manifests
            configure_kubectl
            deploy_to_kubernetes
            cleanup
            show_status
            ;;
        "k8s")
            check_prerequisites
            update_k8s_manifests
            configure_kubectl
            deploy_to_kubernetes
            cleanup
            show_status
            ;;
        "migrate")
            check_prerequisites
            configure_kubectl
            run_migrations
            ;;
        "status")
            check_prerequisites
            configure_kubectl
            show_status
            ;;
        "full")
            check_prerequisites
            create_ecr_repos
            build_and_push_images
            update_k8s_manifests
            configure_kubectl
            deploy_to_kubernetes
            run_migrations
            cleanup
            show_status
            ;;
        *)
            echo "Usage: $0 {check|ecr|build|deploy|k8s|migrate|status|full}"
            echo ""
            echo "Commands:"
            echo "  check   - Check prerequisites only"
            echo "  ecr     - Create ECR repositories"
            echo "  build   - Build and push Docker images"
            echo "  deploy  - Full deployment (build + k8s)"
            echo "  k8s     - Deploy to Kubernetes only"
            echo "  migrate - Run database migrations"
            echo "  status  - Show deployment status"
            echo "  full    - Complete deployment with migrations"
            echo ""
            echo "Environment Variables:"
            echo "  ENVIRONMENT_NAME  - Environment name (default: dev)"
            echo "  AWS_REGION       - AWS region (default: us-east-1)"
            echo "  CLUSTER_NAME     - EKS cluster name (default: dev-sim2serve-cluster)"
            echo "  VERSION          - Image version tag (default: latest)"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
