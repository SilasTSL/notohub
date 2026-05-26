#!/usr/bin/env bash
# infra/deploy.sh — deploy backend Lambda functions & frontend static site
# Usage: ./infra/deploy.sh [--env staging|production]
set -euo pipefail

# ─── Config ────────────────────────────────────────────────────────────────
ENV="${DEPLOY_ENV:-production}"
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
STACK_NAME="notohub-${ENV}"

FRONTEND_BUCKET="${FRONTEND_BUCKET:?Set FRONTEND_BUCKET env var}"
CLOUDFRONT_DIST_ID="${CLOUDFRONT_DIST_ID:-}"

LAMBDA_ARTICLES_ARN="${LAMBDA_ARTICLES_ARN:-}"
LAMBDA_SYNC_ARN="${LAMBDA_SYNC_ARN:-}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ─── Parse args ─────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --env) ENV="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

echo "🚀  Deploying notohub → env=${ENV}, region=${AWS_REGION}"
echo "    Stack: ${STACK_NAME}"

# ─── 1. Build shared ─────────────────────────────────────────────────────────
echo ""
echo "📦  Building @notohub/shared…"
(cd "${ROOT_DIR}" && npm run build:shared)

# ─── 2. Build backend ─────────────────────────────────────────────────────────
echo ""
echo "📦  Building @notohub/backend…"
(cd "${ROOT_DIR}" && npm run build:backend)

# ─── 3. Deploy Lambda functions ───────────────────────────────────────────────
echo ""
echo "⚡  Deploying Lambda: articles handler…"
(
  cd "${ROOT_DIR}/backend/dist"
  zip -r /tmp/articles.zip handlers/articles.js handlers/articles.js.map
)

if [[ -n "${LAMBDA_ARTICLES_ARN}" ]]; then
  aws lambda update-function-code \
    --region "${AWS_REGION}" \
    --function-name "${LAMBDA_ARTICLES_ARN}" \
    --zip-file fileb:///tmp/articles.zip \
    --no-cli-pager
  echo "   ✓ articles Lambda updated"
else
  echo "   ⚠  LAMBDA_ARTICLES_ARN not set — skipping Lambda update"
fi

echo "⚡  Deploying Lambda: sync handler…"
(
  cd "${ROOT_DIR}/backend/dist"
  zip -r /tmp/sync.zip handlers/sync.js handlers/sync.js.map
)

if [[ -n "${LAMBDA_SYNC_ARN}" ]]; then
  aws lambda update-function-code \
    --region "${AWS_REGION}" \
    --function-name "${LAMBDA_SYNC_ARN}" \
    --zip-file fileb:///tmp/sync.zip \
    --no-cli-pager
  echo "   ✓ sync Lambda updated"
else
  echo "   ⚠  LAMBDA_SYNC_ARN not set — skipping Lambda update"
fi

# ─── 4. Build & deploy frontend ───────────────────────────────────────────────
echo ""
echo "🌐  Building @notohub/frontend (static export)…"
(cd "${ROOT_DIR}/frontend" && npm run build)

echo "🪣  Syncing to S3 bucket: ${FRONTEND_BUCKET}…"
aws s3 sync \
  "${ROOT_DIR}/frontend/out/" \
  "s3://${FRONTEND_BUCKET}/" \
  --region "${AWS_REGION}" \
  --delete \
  --cache-control "public, max-age=3600" \
  --no-cli-pager

# ─── 5. Invalidate CloudFront ─────────────────────────────────────────────────
if [[ -n "${CLOUDFRONT_DIST_ID}" ]]; then
  echo ""
  echo "🔄  Invalidating CloudFront distribution ${CLOUDFRONT_DIST_ID}…"
  aws cloudfront create-invalidation \
    --distribution-id "${CLOUDFRONT_DIST_ID}" \
    --paths "/*" \
    --no-cli-pager
  echo "   ✓ Invalidation created"
fi

echo ""
echo "✅  Deploy complete!"
