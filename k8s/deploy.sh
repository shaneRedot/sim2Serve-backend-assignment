#!/bin/bash

# SIM2Serve Kubernetes Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-"123456789012"}
AWS_REGION=${AWS_REGION:-"us-east-1"}
CLUSTER_NAME=${CLUSTER_NAME:-"sim2serve-cluster"}
ECR_USER_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/sim2serve/user-service"
ECR_TWEET_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/sim2serve/tweet-service"
VERSION=${VERSION:-"latest"}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "docker is not installed. Please install docker first."
        exit 1
    fi
    
    # Check if aws cli is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install AWS CLI first."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Function to build and push Docker images
build_and_push_images() {
    print_status "Building and pushing Docker images..."
    
    # Login to ECR
    print_status "Logging into ECR..."
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
    
    # Build User Service
    print_status "Building user-service image..."
    docker build -f apps/user-service/Dockerfile -t sim2serve/user-service:${VERSION} apps/user-service/
    docker tag sim2serve/user-service:${VERSION} ${ECR_USER_REPO}:${VERSION}
    docker push ${ECR_USER_REPO}:${VERSION}
    
    # Build Tweet Service
    print_status "Building tweet-service image..."
    docker build -f apps/tweet-service/Dockerfile -t sim2serve/tweet-service:${VERSION} apps/tweet-service/
    docker tag sim2serve/tweet-service:${VERSION} ${ECR_TWEET_REPO}:${VERSION}
    docker push ${ECR_TWEET_REPO}:${VERSION}
    
    print_success "Docker images built and pushed successfully"
}

# Function to update image references in K8s manifests
update_image_references() {
    print_status "Updating image references in Kubernetes manifests..."
    
    # Update user service deployment
    sed -i "s|image: sim2serve/user-service:latest|image: ${ECR_USER_REPO}:${VERSION}|g" k8s/04-user-service-deployment.yaml
    
    # Update tweet service deployment  
    sed -i "s|image: sim2serve/tweet-service:latest|image: ${ECR_TWEET_REPO}:${VERSION}|g" k8s/05-tweet-service-deployment.yaml
    
    print_success "Image references updated"
}

# Function to configure kubectl
configure_kubectl() {
    print_status "Configuring kubectl for EKS cluster..."
    aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}
    
    # Verify connection
    if kubectl cluster-info &> /dev/null; then
        print_success "Successfully connected to EKS cluster: ${CLUSTER_NAME}"
    else
        print_error "Failed to connect to EKS cluster. Please check your configuration."
        exit 1
    fi
}

# Function to deploy to Kubernetes
deploy_to_kubernetes() {
    print_status "Deploying to Kubernetes..."
    
    # Apply all manifests in order
    print_status "Creating namespace..."
    kubectl apply -f k8s/01-namespace.yaml
    
    print_status "Creating ConfigMap..."
    kubectl apply -f k8s/02-configmap.yaml
    
    print_status "Creating Secrets..."
    kubectl apply -f k8s/03-secrets.yaml
    
    print_status "Deploying user service..."
    kubectl apply -f k8s/04-user-service-deployment.yaml
    
    print_status "Deploying tweet service..."
    kubectl apply -f k8s/05-tweet-service-deployment.yaml
    
    print_status "Creating services..."
    kubectl apply -f k8s/06-services.yaml
    
    print_status "Creating ingress..."
    kubectl apply -f k8s/07-ingress.yaml
    
    print_status "Creating horizontal pod autoscalers..."
    kubectl apply -f k8s/08-hpa.yaml
    
    print_success "All resources deployed successfully"
}

# Function to wait for deployment
wait_for_deployment() {
    print_status "Waiting for deployments to be ready..."
    
    kubectl wait --for=condition=available --timeout=300s deployment/user-service -n sim2serve
    kubectl wait --for=condition=available --timeout=300s deployment/tweet-service -n sim2serve
    
    print_success "All deployments are ready"
}

# Function to show deployment status
show_status() {
    print_status "Current deployment status:"
    echo
    kubectl get all -n sim2serve
    echo
    print_status "Ingress information:"
    kubectl get ingress -n sim2serve
    echo
    print_status "HPA status:"
    kubectl get hpa -n sim2serve
}

# Function to get service URLs
get_service_urls() {
    print_status "Service URLs:"
    
    # Get ingress IP/hostname
    INGRESS_IP=$(kubectl get ingress sim2serve-ingress -n sim2serve -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    INGRESS_HOST=$(kubectl get ingress sim2serve-ingress -n sim2serve -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")
    
    if [ "$INGRESS_IP" != "pending" ]; then
        echo "📱 User Service API: http://${INGRESS_IP}/auth/register"
        echo "🐦 Tweet Service API: http://${INGRESS_IP}/tweets"
        echo "📚 API Documentation: http://${INGRESS_IP}/api/docs"
    elif [ "$INGRESS_HOST" != "pending" ]; then
        echo "📱 User Service API: http://${INGRESS_HOST}/auth/register"
        echo "🐦 Tweet Service API: http://${INGRESS_HOST}/tweets"
        echo "📚 API Documentation: http://${INGRESS_HOST}/api/docs"
    else
        print_warning "Ingress is still pending. Check back in a few minutes."
        echo "You can also use port-forwarding for testing:"
        echo "kubectl port-forward service/user-service 3000:3000 -n sim2serve"
        echo "kubectl port-forward service/tweet-service 3001:3001 -n sim2serve"
    fi
}

# Function to run migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Run migrations for user service
    kubectl run migration-user --rm -i --restart=Never --image=${ECR_USER_REPO}:${VERSION} -n sim2serve -- npm run migration:run
    
    # Run migrations for tweet service  
    kubectl run migration-tweet --rm -i --restart=Never --image=${ECR_TWEET_REPO}:${VERSION} -n sim2serve -- npm run migration:run
    
    print_success "Database migrations completed"
}

# Main deployment function
main() {
    case "${1:-}" in
        "build")
            check_prerequisites
            build_and_push_images
            ;;
        "deploy")
            check_prerequisites
            configure_kubectl
            update_image_references
            deploy_to_kubernetes
            wait_for_deployment
            show_status
            get_service_urls
            ;;
        "migrate")
            configure_kubectl
            run_migrations
            ;;
        "status")
            configure_kubectl
            show_status
            get_service_urls
            ;;
        "cleanup")
            configure_kubectl
            print_status "Deleting all resources in sim2serve namespace..."
            kubectl delete namespace sim2serve
            print_success "Cleanup completed"
            ;;
        "full")
            check_prerequisites
            configure_kubectl
            build_and_push_images
            update_image_references
            deploy_to_kubernetes
            run_migrations
            wait_for_deployment
            show_status
            get_service_urls
            ;;
        *)
            echo "Usage: $0 {build|deploy|migrate|status|cleanup|full}"
            echo ""
            echo "Commands:"
            echo "  build    - Build and push Docker images to ECR"
            echo "  deploy   - Deploy to Kubernetes cluster"
            echo "  migrate  - Run database migrations"
            echo "  status   - Show current deployment status"
            echo "  cleanup  - Delete all resources"
            echo "  full     - Complete deployment (build + deploy + migrate)"
            echo ""
            echo "Environment Variables:"
            echo "  AWS_ACCOUNT_ID  - Your AWS Account ID (required)"
            echo "  AWS_REGION      - AWS Region (default: us-east-1)"
            echo "  CLUSTER_NAME    - EKS Cluster name (default: sim2serve-cluster)"
            echo "  VERSION         - Image version tag (default: latest)"
            exit 1
            ;;
    esac
}

main "$@"
