#!/usr/bin/env bash
# infra/deploy.sh — deploy backend Lambda & frontend static site
# Usage: ./infra/deploy.sh [--env staging|production]
set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
ENV="${DEPLOY_ENV:-production}"
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
STACK_NAME="notohub-${ENV}"

FRONTEND_BUCKET="${FRONTEND_BUCKET:?Set FRONTEND_BUCKET env var}"
CLOUDFRONT_DIST_ID="${CLOUDFRONT_DIST_ID:-}"

# Single Lambda function (handler: handler.handler, runtime: python3.12)
LAMBDA_FUNCTION_NAME="${LAMBDA_FUNCTION_NAME:-}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

while [[ $# -gt 0 ]]; do
  case $1 in
    --env) ENV="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

echo "🚀  Deploying notohub → env=${ENV}, region=${AWS_REGION}"
echo "    Stack: ${STACK_NAME}"

# ─── 1. Build shared (JS types — for frontend) ───────────────────────────────
echo ""
echo "📦  Building @notohub/shared…"
(cd "${ROOT_DIR}" && npm run build:shared)

# ─── 2. Package Python Lambda ────────────────────────────────────────────────
echo ""
echo "📦  Packaging Python Lambda…"
bash "${ROOT_DIR}/infra/build_lambda.sh" --no-boto3

# ─── 3. Deploy Lambda ────────────────────────────────────────────────────────
echo ""
if [[ -n "${LAMBDA_FUNCTION_NAME}" ]]; then
  echo "⚡  Updating Lambda function: ${LAMBDA_FUNCTION_NAME}…"
  aws lambda update-function-code \
    --region "${AWS_REGION}" \
    --function-name "${LAMBDA_FUNCTION_NAME}" \
    --zip-file "fileb://${ROOT_DIR}/backend/dist/lambda.zip" \
    --no-cli-pager
  echo "   ✓ Lambda updated (handler: handler.handler, runtime: python3.12)"
else
  echo "   ⚠  LAMBDA_FUNCTION_NAME not set — skipping Lambda update"
fi

# ─── 4. Build & deploy frontend ──────────────────────────────────────────────
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

# ─── 5. Invalidate CloudFront ────────────────────────────────────────────────
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
