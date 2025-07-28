#!/bin/bash

# SIM2Serve CloudFormation Deployment Script
# This script deploys the complete SIM2Serve microservices infrastructure on AWS

set -e

# Configuration
ENVIRONMENT_NAME="sim2serve"
REGION="us-east-1"
STACK_NAME="sim2serve-stack"

# Database credentials (change these in production)
DB_USERNAME="postgres"
DB_PASSWORD="SecurePassword123"
DB_NAME="sim2serve_db"

# Node configuration
NODE_INSTANCE_TYPE="t3.medium"
NODE_DESIRED_CAPACITY=2
NODE_MAX_SIZE=4
NODE_MIN_SIZE=1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'   
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_success "AWS CLI is configured"
}

# Function to check if kubectl is installed
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        print_warning "kubectl is not installed. You'll need it to manage the EKS cluster."
        print_warning "Install it from: https://kubernetes.io/docs/tasks/tools/"
    else
        print_success "kubectl is available"
    fi
}

# Function to validate CloudFormation template
validate_template() {
    local template_file=$1
    print_status "Validating CloudFormation template: $template_file"
    
    if aws cloudformation validate-template --template-body file://$template_file --region $REGION > /dev/null; then
        print_success "Template $template_file is valid"
    else
        print_error "Template $template_file is invalid"
        exit 1
    fi
}

# Function to deploy CloudFormation stack
deploy_stack() {
    print_status "Deploying CloudFormation stack: $STACK_NAME"
    
    # Validate main template
    validate_template "cloudformation/main.yaml"
    
    # Create or update stack
    if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION &> /dev/null; then
        print_status "Stack exists, updating..."
        aws cloudformation update-stack \
            --stack-name $STACK_NAME \
            --template-body file://cloudformation/main.yaml \
            --parameters \
                ParameterKey=EnvironmentName,ParameterValue=$ENVIRONMENT_NAME \
                ParameterKey=DatabaseUsername,ParameterValue=$DB_USERNAME \
                ParameterKey=DatabasePassword,ParameterValue=$DB_PASSWORD \
                ParameterKey=DatabaseName,ParameterValue=$DB_NAME \
                ParameterKey=NodeInstanceType,ParameterValue=$NODE_INSTANCE_TYPE \
                ParameterKey=NodeGroupDesiredCapacity,ParameterValue=$NODE_DESIRED_CAPACITY \
                ParameterKey=NodeGroupMaxSize,ParameterValue=$NODE_MAX_SIZE \
                ParameterKey=NodeGroupMinSize,ParameterValue=$NODE_MIN_SIZE \
            --capabilities CAPABILITY_NAMED_IAM \
            --region $REGION
        
        print_status "Waiting for stack update to complete..."
        aws cloudformation wait stack-update-complete --stack-name $STACK_NAME --region $REGION
    else
        print_status "Creating new stack..."
        aws cloudformation create-stack \
            --stack-name $STACK_NAME \
            --template-body file://cloudformation/main.yaml \
            --parameters \
                ParameterKey=EnvironmentName,ParameterValue=$ENVIRONMENT_NAME \
                ParameterKey=DatabaseUsername,ParameterValue=$DB_USERNAME \
                ParameterKey=DatabasePassword,ParameterValue=$DB_PASSWORD \
                ParameterKey=DatabaseName,ParameterValue=$DB_NAME \
                ParameterKey=NodeInstanceType,ParameterValue=$NODE_INSTANCE_TYPE \
                ParameterKey=NodeGroupDesiredCapacity,ParameterValue=$NODE_DESIRED_CAPACITY \
                ParameterKey=NodeGroupMaxSize,ParameterValue=$NODE_MAX_SIZE \
                ParameterKey=NodeGroupMinSize,ParameterValue=$NODE_MIN_SIZE \
            --capabilities CAPABILITY_NAMED_IAM \
            --region $REGION
        
        print_status "Waiting for stack creation to complete..."
        aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $REGION
    fi
    
    print_success "CloudFormation stack deployed successfully"
}

# Function to get stack outputs
get_stack_outputs() {
    print_status "Getting stack outputs..."
    
    local outputs=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs')
    
    echo $outputs | jq -r '.[] | "\(.OutputKey): \(.OutputValue)"'
}

# Function to configure kubectl for EKS
configure_kubectl() {
    print_status "Configuring kubectl for EKS cluster..."
    
    local cluster_name=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`EKSClusterName`].OutputValue' \
        --output text)
    
    if [ ! -z "$cluster_name" ] && command -v kubectl &> /dev/null; then
        aws eks update-kubeconfig --region $REGION --name $cluster_name
        print_success "kubectl configured for cluster: $cluster_name"
        
        # Test connection
        if kubectl get nodes > /dev/null 2>&1; then
            print_success "Successfully connected to EKS cluster"
            kubectl get nodes
        else
            print_warning "Could not connect to EKS cluster. It may still be initializing."
        fi
    else
        print_warning "Skipping kubectl configuration (cluster name not found or kubectl not installed)"
    fi
}

# Function to deploy Kubernetes applications
deploy_k8s_applications() {
    print_status "Deploying Kubernetes applications..."
    
    if [ -x "k8s/deploy-k8s.sh" ]; then
        ./k8s/deploy-k8s.sh deploy
        print_success "Kubernetes applications deployed successfully"
    else
        print_warning "Kubernetes deployment script not found or not executable"
        print_status "You can deploy manually with: ./k8s/deploy-k8s.sh deploy"
    fi
}

# Function to build and push Docker images
build_and_push_images() {
    print_status "Building and pushing Docker images..."
    
    # Get ECR repository URLs from stack outputs
    local user_service_ecr=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`UserServiceECR`].OutputValue' \
        --output text)
    
    local tweet_service_ecr=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`TweetServiceECR`].OutputValue' \
        --output text)
    
    if [ ! -z "$user_service_ecr" ] && [ ! -z "$tweet_service_ecr" ]; then
        # Login to ECR
        aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $user_service_ecr
        
        # Build and push User Service
        print_status "Building User Service..."
        docker build -t $user_service_ecr:latest ./apps/user-service
        docker push $user_service_ecr:latest
        
        # Build and push Tweet Service
        print_status "Building Tweet Service..."
        docker build -t $tweet_service_ecr:latest ./apps/tweet-service
        docker push $tweet_service_ecr:latest
        
        print_success "Docker images built and pushed successfully"
    else
        print_error "Could not get ECR repository URLs from stack outputs"
    fi
}

# Function to show deployment information
show_deployment_info() {
    print_success "Deployment completed successfully!"
    echo ""
    print_status "Stack Outputs:"
    get_stack_outputs
    echo ""
    print_status "Next Steps:"
    echo "1. Your EKS cluster is ready and configured"
    echo "2. Your RDS PostgreSQL database is running"
    echo "3. Your ECR repositories are created"
    echo "4. Your Docker images are built and pushed"
    echo ""
    print_status "To manage your cluster:"
    echo "kubectl get nodes"
    echo "kubectl get pods --all-namespaces"
    echo ""
    print_status "To delete the infrastructure:"
    echo "./deploy.sh delete"
}

# Function to delete the stack
delete_stack() {
    print_warning "This will delete ALL infrastructure including the database!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deleting CloudFormation stack: $STACK_NAME"
        aws cloudformation delete-stack --stack-name $STACK_NAME --region $REGION
        print_status "Waiting for stack deletion to complete..."
        aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME --region $REGION
        print_success "Stack deleted successfully"
    else
        print_status "Operation cancelled"
    fi
}

# Main execution
main() {
    echo "SIM2Serve CloudFormation Deployment Script"
    echo "=========================================="
    echo ""
    
    # Parse command line arguments
    case "${1:-deploy}" in
        deploy)
            check_aws_cli
            check_kubectl
            deploy_stack
            configure_kubectl
            build_and_push_images
            deploy_k8s_applications
            show_deployment_info
            ;;
        delete)
            delete_stack
            ;;
        outputs)
            get_stack_outputs
            ;;
        configure-kubectl)
            configure_kubectl
            ;;
        build-images)
            build_and_push_images
            ;;
        deploy-k8s)
            deploy_k8s_applications
            ;;
        *)
            echo "Usage: $0 {deploy|delete|outputs|configure-kubectl|build-images|deploy-k8s}"
            echo ""
            echo "Commands:"
            echo "  deploy           - Deploy the complete infrastructure and applications"
            echo "  delete           - Delete the infrastructure"
            echo "  outputs          - Show stack outputs"
            echo "  configure-kubectl - Configure kubectl for EKS"
            echo "  build-images     - Build and push Docker images"
            echo "  deploy-k8s       - Deploy Kubernetes applications only"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
