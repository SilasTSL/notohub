#!/usr/bin/env bash
# infra/build_lambda.sh — package the Python backend into a Lambda-ready zip
#
# Output: backend/dist/lambda.zip
#
# Usage:
#   ./infra/build_lambda.sh
#   ./infra/build_lambda.sh --no-boto3   # exclude boto3 (saves ~8MB; it's in the runtime)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
DIST_DIR="${BACKEND_DIR}/dist"
PKG_DIR="${DIST_DIR}/package"
ZIP_FILE="${DIST_DIR}/lambda.zip"

EXCLUDE_BOTO3=false
for arg in "$@"; do
  [[ "${arg}" == "--no-boto3" ]] && EXCLUDE_BOTO3=true
done

echo "📦  Building Lambda package…"
echo "    Backend: ${BACKEND_DIR}"
echo "    Output:  ${ZIP_FILE}"

# ── Clean previous build ─────────────────────────────────────────────────────
rm -rf "${DIST_DIR}"
mkdir -p "${PKG_DIR}"

# ── Install Python dependencies ───────────────────────────────────────────────
echo ""
echo "⬇   Installing dependencies from requirements.txt…"

PIP_ARGS=(
  install
  --quiet
  --target "${PKG_DIR}"
  --python-version "3.12"
  --only-binary=:all:
  --platform manylinux2014_x86_64   # Lambda runs on Amazon Linux 2 (x86_64)
  -r "${BACKEND_DIR}/requirements.txt"
)

if "${EXCLUDE_BOTO3}"; then
  echo "    (skipping boto3 — using Lambda runtime version)"
  # Install everything except boto3/botocore
  grep -v "^boto" "${BACKEND_DIR}/requirements.txt" > /tmp/reqs_no_boto.txt
  PIP_ARGS[-1]="/tmp/reqs_no_boto.txt"
fi

pip "${PIP_ARGS[@]}"

# ── Copy source files ─────────────────────────────────────────────────────────
echo ""
echo "📋  Copying source files…"
cp "${BACKEND_DIR}/handler.py" "${PKG_DIR}/"
cp -r "${BACKEND_DIR}/handlers/" "${PKG_DIR}/handlers/"
cp -r "${BACKEND_DIR}/lib/" "${PKG_DIR}/lib/"

# ── Strip unnecessary files to reduce zip size ────────────────────────────────
echo "🧹  Stripping tests, __pycache__, *.dist-info…"
find "${PKG_DIR}" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "${PKG_DIR}" -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null || true
find "${PKG_DIR}" -type d -name "*.egg-info"  -exec rm -rf {} + 2>/dev/null || true
find "${PKG_DIR}" -type f -name "*.pyc"       -delete 2>/dev/null || true

# ── Zip ───────────────────────────────────────────────────────────────────────
echo ""
echo "🗜   Creating zip…"
(cd "${PKG_DIR}" && zip -r -q "${ZIP_FILE}" .)

SIZE=$(du -sh "${ZIP_FILE}" | cut -f1)
echo ""
echo "✅  Done! ${ZIP_FILE} (${SIZE})"
echo ""
echo "Lambda handler entrypoint: handler.handler"
