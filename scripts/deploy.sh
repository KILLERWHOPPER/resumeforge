#!/bin/bash
# Deploy script for ResumeForge on self-hosted server
# Usage: ./deploy.sh [staging|prod] [tag]

set -euo pipefail

ENVIRONMENT=${1:-staging}
TAG=${2:-develop}
PROJECT_DIR="/opt/resumeforge"
COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"

echo "🚀 Deploying ResumeForge to ${ENVIRONMENT} with tag ${TAG}"

cd "${PROJECT_DIR}/${ENVIRONMENT}"

# Pull latest images
echo "📥 Pulling latest Docker images..."
docker compose -f "${COMPOSE_FILE}" pull

# Stop and remove old containers
echo "🛑 Stopping old containers..."
docker compose -f "${COMPOSE_FILE}" down --remove-orphans

# Start new containers
echo "▶️ Starting new containers..."
TAG="${TAG}" docker compose -f "${COMPOSE_FILE}" up -d

# Wait for health checks
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
for service in postgres backend frontend nginx; do
    if docker compose -f "${COMPOSE_FILE}" ps "${service}" | grep -q "healthy\|Up"; then
        echo "✅ ${service} is running"
    else
        echo "❌ ${service} is not healthy"
        docker compose -f "${COMPOSE_FILE}" logs "${service}" --tail=50
        exit 1
    fi
done

# Clean up old images
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

echo "✅ Deployment to ${ENVIRONMENT} completed successfully!"
echo "🌐 Application available at:"
if [ "${ENVIRONMENT}" = "staging" ]; then
    echo "   https://staging.resumeforge.com"
    echo "   https://staging-api.resumeforge.com"
else
    echo "   https://resumeforge.com"
    echo "   https://api.resumeforge.com"
fi