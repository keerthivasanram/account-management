# SocialHub Enterprise OS — Deployment & Infrastructure Guide

**Target Cloud Provider:** Amazon Web Services (AWS)  
**Deployment Model:** Containerized Services via Amazon ECS (Fargate)  
**Edge Layer:** Amazon CloudFront + AWS WAF  
**Databases:** Amazon RDS PostgreSQL (Multi-AZ) + Amazon ElastiCache Redis  

---

## 1. Cloud Infrastructure Topology

```text
                                INTERNET
                                   |
                         Amazon CloudFront (CDN)
                                   |
                              AWS WAF
                                   |
                     Application Load Balancer (ALB)
                                   |
                  +----------------+----------------+
                  |                                 |
                  v                                 v
        Next.js Web (Port 3000)          NestJS API (Port 8000)
             [ECS Fargate]                    [ECS Fargate]
                  |                                 |
                  +----------------+----------------+
                                   |
                     Private VPC Subnet (No Public IP)
                                   |
          +------------------------+------------------------+
          |                        |                        |
          v                        v                        v
    Amazon RDS PostgreSQL     Amazon ElastiCache Redis   Amazon S3 (Private)
     (Authoritative DB)           (Queues & PubSub)       (KMS Encrypted Docs)
```

---

## 2. Environment Variables & Secret Configuration

All production secrets are injected via **AWS Secrets Manager** and **AWS Systems Manager Parameter Store**. Secrets must never be committed to Git.

### 2.1 Backend Environment (`apps/api/.env`)
```bash
# Core Environment
NODE_ENV=production
PORT=8000
API_PREFIX=/api/v1
APP_URL=https://hub.company.internal

# Database & Cache
DATABASE_URL=postgresql://app_user:${DB_PASSWORD}@rds.internal:5432/socialhub_prod?sslmode=require
REDIS_URL=rediss://default:${REDIS_PASSWORD}@elasticache.internal:6379

# Cryptography & KMS
AWS_REGION=us-east-1
AWS_KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/...
SESSION_COOKIE_SECRET=super_secure_entropy_32_bytes_min

# Meta / Instagram Graph API
META_APP_ID=...
META_APP_SECRET=...
META_REDIRECT_URI=https://hub.company.internal/oauth/callback
META_API_VERSION=v19.0

# Document Storage
S3_BUCKET_DOCUMENTS=company-socialhub-docs-private
S3_BUCKET_MEDIA=company-socialhub-media-private
```

### 2.2 Frontend Environment (`apps/web/.env`)
```bash
NEXT_PUBLIC_API_URL=https://hub.company.internal/api/v1
NEXT_PUBLIC_WS_URL=wss://hub.company.internal
```

---

## 3. Containerization (Docker)

Multi-stage Docker builds ensure small, hardened production image footprints without dev tooling or compilers.

### Backend Dockerfile (`apps/api/Dockerfile`)
```dockerfile
# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
USER nestjs
EXPOSE 8000
CMD ["node", "dist/main.js"]
```

---

## 4. Disaster Recovery & Rollback Strategy

1. **Database Backups:**
   - Automated RDS daily snapshots with 35-day retention.
   - Point-in-Time Recovery (PITR) with 5-minute granularity.
   - Monthly automated restore drill in an isolated staging VPC.
2. **Blue/Green ECS Deployments:**
   - CodeDeploy manages zero-downtime container swaps with automatic rollback if health checks fail over a 3-minute window.
3. **Database Rollbacks:**
   - Every database migration must include a verified, forward-compatible down script or schema expansion technique (expand-contract pattern) to prevent breaking live services during deploy transitions.
