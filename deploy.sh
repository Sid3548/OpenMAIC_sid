#!/bin/bash
# OpenMAIC Deployment Script for Hostinger VPS
# Usage: ./deploy.sh
# Run this on your VPS after first-time setup.

set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

echo "==> Pulling latest code..."
git pull origin main

echo "==> Rebuilding and restarting services..."
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d

echo "==> Waiting for services to be healthy..."
sleep 5
docker compose ps

echo ""
echo "Done! App is running at http://localhost:3000"
echo "Check logs with: docker compose logs -f openmaic"
