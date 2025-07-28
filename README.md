# SIM2Serve Microservices Backend

A scalable microservices backend application for a Twitter-like platform built with NestJS, TypeORM, PostgreSQL, and deployed on AWS using CloudFormation.

## 🏗️ Architecture

This project implements a clean microservices architecture with separation of concerns:

### Infrastructure (CloudFormation)
- **AWS VPC**: Secure networking with public/private subnets
- **AWS EKS**: Managed Kubernetes cluster for container orchestration  
- **AWS RDS**: PostgreSQL database with encryption and backups
- **AWS ECR**: Container registries for Docker images
- **Security Groups**: Proper network isolation and access control

### Application Layer (Kubernetes)
- **User Service** (Port 3000): Authentication and user management
- **Tweet Service** (Port 3001): Tweet operations and retrieval
- **AWS Load Balancer Controller**: Automatic ALB creation via ingress
- **Horizontal Pod Autoscaler**: Dynamic scaling based on CPU/memory
- **Service Discovery**: Internal communication via Kubernetes services

The deployment uses AWS Load Balancer Controller to automatically create Application Load Balancers through Kubernetes ingress resources, providing clean separation between infrastructure provisioning and application deployment.

## 🚀 Quick Start

### Prerequisites

- AWS CLI configured with appropriate permissions
- Docker installed
- Node.js 18+ and npm
- kubectl (optional, for cluster management)

**Deployment will:**
- Create VPC with public/private subnets
- Deploy RDS PostgreSQL database
- Create EKS cluster with worker nodes
- Set up ECR repositories
- Build and push Docker images
- Configure load balancer and routing

### 3. Local Development

Create `.env` file in the root:
```env
# Database Configuration
DATABASE_HOST=your-rds-endpoint 
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-password
DATABASE_NAME=sim2serve_db

Can use below hosted values since this is deployed to kubernaties

DATABASE_HOST=sim2serve-stack-rdsstack-11qgwr6e2fkcu-database-hdidifeusao6.cknyyc82yqf8.us-east-1.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_USERNAME=sim2serve_db
DATABASE_PASSWORD=SecurePassword123
DATABASE_NAME=sim2serve_db

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRES_IN=24h

# Application Ports
USER_SERVICE_PORT=3000
TWEET_SERVICE_PORT=3001
```

## How to Run Locally

1. Clone the repo:
   ```bash
   git clone <your-repo-url>
   cd SIM2Serve-user-authentication
   ```

2. Install dependencies:
   npm run install:all will install the dependencies for both tweet and user services

3. Service wise installation
   # For user-service
   cd apps/user-service
   npm install

   # For tweet-service
   cd ../tweet-service
   npm install

3. Create a `.env` file in the root (see `.env.example` for reference):

4. Start everything with Docker Compose:
   ```bash
   docker-compose up --build
   ```
   This will automatically run the migrations with the given databse configuration

5. Access the services:
   - User Service: http://localhost:3000
   - Tweet Service: http://localhost:3001
   - Swagger Docs: http://localhost:3000/api/docs and http://localhost:3001/api/docs

## 📋 API Documentation

### User Service (Port 3000)

#### Authentication Endpoints
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile (Protected)
GET  /health
```

#### User Management
```
GET    /api/users
GET    /api/users/:id
PUT    /api/users/:id (Protected)
DELETE /api/users/:id (Protected)
```

### Tweet Service (Port 3001)

#### Tweet Endpoints
```
POST   /api/tweets (Protected)
GET    /api/tweets
GET    /api/tweets/:id
PUT    /api/tweets/:id (Protected)
DELETE /api/tweets/:id (Protected)
GET    /api/tweets/user/:userId
GET    /health
```

## 🔧 CloudFormation Infrastructure

### Template Structure

```
cloudformation/
├── main.yaml           # Main orchestration template
├── vpc.yaml           # VPC and networking resources
├── security.yaml      # Security groups and IAM roles
├── rds.yaml           # RDS PostgreSQL database
├── ecr.yaml           # Container registries
└── eks.yaml           # EKS cluster and node groups
```

### Infrastructure Components

1. **VPC Stack** (`vpc.yaml`)
   - VPC with public and private subnets across 2 AZs
   - Internet Gateway and NAT Gateways
   - Route tables and security groups

2. **Security Stack** (`security.yaml`)
   - Security groups for EKS, RDS, and Load Balancer
   - Proper ingress/egress rules for microservices communication

3. **RDS Stack** (`rds.yaml`)
   - PostgreSQL 15 database instance
   - Automated backups and monitoring
   - Secrets Manager integration

4. **ECR Stack** (`ecr.yaml`)
   - Container repositories for user and tweet services
   - Lifecycle policies for image cleanup

5. **EKS Stack** (`eks.yaml`)
   - Managed Kubernetes cluster
   - Worker node groups with auto-scaling
   - Required IAM roles and add-ons

## 🚢 Kubernetes Manifests

### Kubernetes Structure

```
k8s/
├── namespace.yaml                    # Application namespace
├── user-service-deployment.yaml     # User service deployment
├── tweet-service-deployment.yaml    # Tweet service deployment  
├── services.yaml                     # Service definitions
├── ingress.yaml                      # ALB ingress controller
├── hpa.yaml                         # Horizontal Pod Autoscaler
├── storage.yaml                     # Persistent volume claims
├── aws-load-balancer-controller.yaml # AWS Load Balancer Controller
└── cluster-autoscaler.yaml          # EKS cluster autoscaler
```

### Application Components

1. **Deployments**: Container specifications, resource limits, environment variables
2. **Services**: Internal service discovery and communication
3. **Ingress**: AWS Load Balancer Controller for external access
4. **HPA**: Automatic scaling based on CPU/memory usage
5. **Storage**: Persistent volumes for application data
6. **Controllers**: AWS-specific controllers for cloud integration

### Deployment Commands

```bash
# Deploy everything
# SIM2Serve Microservices Backend

This is a simple backend for a Twitter-like app using NestJS, PostgreSQL, and Docker. 

## Main API Endpoints

### User Service
```
POST /api/auth/register    # Register new user
POST /api/auth/login       # Login
GET  /api/users            # List users
GET  /api/users/:id        # Get user by ID
GET  /health               # Health check
```

### Tweet Service
```
POST /api/tweets           # Create tweet
GET  /api/tweets           # List tweets
GET  /api/tweets/:id       # Get tweet by ID
GET  /health               # Health check
```

## How I Built It

- NestJS for backend
- TypeORM for database
- Docker for local dev
- JWT for authentication
- Simple microservices structure

## Notes

- You can run tests with `npm test` in each service folder.
- All configs and scripts are in the repo.
- For AWS/Kubernetes deployment, see the `k8s/` and `cloudformation/` folders (not required for local dev).

---
Feel free to fork, clone, or ask questions!
# Unit tests
