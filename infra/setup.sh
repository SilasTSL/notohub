#!/usr/bin/env bash
# infra/setup.sh — one-time AWS resource provisioning for notohub
# Usage: ./infra/setup.sh [--env staging|production]
set -euo pipefail

ENV="${DEPLOY_ENV:-production}"
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
TABLE_NAME="notohub-articles-${ENV}"
BUCKET_NAME="notohub-content-${ENV}"
FRONTEND_BUCKET="notohub-frontend-${ENV}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --env) ENV="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

echo "🔧  Setting up AWS resources for notohub (env=${ENV}, region=${AWS_REGION})"

# ─── DynamoDB table ───────────────────────────────────────────────────────────
echo ""
echo "📊  Creating DynamoDB table: ${TABLE_NAME}…"
aws dynamodb create-table \
  --region "${AWS_REGION}" \
  --table-name "${TABLE_NAME}" \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes '[
    {
      "IndexName": "GSI1",
      "KeySchema": [
        {"AttributeName":"GSI1PK","KeyType":"HASH"},
        {"AttributeName":"GSI1SK","KeyType":"RANGE"}
      ],
      "Projection": {"ProjectionType":"ALL"}
    }
  ]' \
  --billing-mode PAY_PER_REQUEST \
  --no-cli-pager || echo "   Table may already exist, continuing…"

echo "   ✓ DynamoDB table: ${TABLE_NAME}"

# ─── S3 content bucket ────────────────────────────────────────────────────────
echo ""
echo "🪣  Creating S3 content bucket: ${BUCKET_NAME}…"
if [[ "${AWS_REGION}" == "us-east-1" ]]; then
  aws s3api create-bucket \
    --region "${AWS_REGION}" \
    --bucket "${BUCKET_NAME}" \
    --no-cli-pager || true
else
  aws s3api create-bucket \
    --region "${AWS_REGION}" \
    --bucket "${BUCKET_NAME}" \
    --create-bucket-configuration LocationConstraint="${AWS_REGION}" \
    --no-cli-pager || true
fi
echo "   ✓ Content bucket: ${BUCKET_NAME}"

# ─── S3 frontend bucket ────────────────────────────────────────────────────────
echo ""
echo "🪣  Creating S3 frontend bucket: ${FRONTEND_BUCKET}…"
if [[ "${AWS_REGION}" == "us-east-1" ]]; then
  aws s3api create-bucket \
    --region "${AWS_REGION}" \
    --bucket "${FRONTEND_BUCKET}" \
    --no-cli-pager || true
else
  aws s3api create-bucket \
    --region "${AWS_REGION}" \
    --bucket "${FRONTEND_BUCKET}" \
    --create-bucket-configuration LocationConstraint="${AWS_REGION}" \
    --no-cli-pager || true
fi

# Enable static website hosting on frontend bucket
aws s3 website "s3://${FRONTEND_BUCKET}/" \
  --index-document index.html \
  --error-document 404.html \
  --no-cli-pager || true

echo "   ✓ Frontend bucket: ${FRONTEND_BUCKET}"

echo ""
echo "✅  Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Set Lambda environment variables (NOTION_API_KEY, NOTION_DATABASE_ID, etc.)"
echo "  2. Configure API Gateway routes → Lambda ARNs"
echo "  3. Set FRONTEND_BUCKET=${FRONTEND_BUCKET} and run ./infra/deploy.sh"
