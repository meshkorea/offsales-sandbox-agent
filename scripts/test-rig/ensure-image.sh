#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE_TAG="${SANDBOX_AGENT_TEST_IMAGE:-sandbox-agent-test:dev}"
LOCK_DIR="$ROOT_DIR/.context/docker-test-image.lock"
STAMP_FILE="$ROOT_DIR/.context/docker-test-image.stamp"

INPUTS=(
  "$ROOT_DIR/Cargo.toml"
  "$ROOT_DIR/Cargo.lock"
  "$ROOT_DIR/server"
  "$ROOT_DIR/gigacode"
  "$ROOT_DIR/resources/agent-schemas/artifacts"
  "$ROOT_DIR/scripts/agent-configs"
  "$ROOT_DIR/docker/test-agent/Dockerfile"
)

release_lock() {
  if [[ -d "$LOCK_DIR" ]]; then
    rm -rf "$LOCK_DIR"
  fi
}

latest_input_mtime() {
  find "${INPUTS[@]}" -type f -exec stat -f '%m' {} + | sort -nr | head -n1
}

image_is_ready() {
  if ! docker image inspect "$IMAGE_TAG" >/dev/null 2>&1; then
    return 1
  fi

  if [[ ! -f "$STAMP_FILE" ]]; then
    return 1
  fi

  local stamp_mtime
  stamp_mtime="$(stat -f '%m' "$STAMP_FILE")"
  local latest_mtime
  latest_mtime="$(latest_input_mtime)"

  [[ -n "$latest_mtime" && "$stamp_mtime" -ge "$latest_mtime" ]]
}

mkdir -p "$ROOT_DIR/.context"

if image_is_ready; then
  printf '%s\n' "$IMAGE_TAG"
  exit 0
fi

while ! mkdir "$LOCK_DIR" 2>/dev/null; do
  sleep 1
done

trap release_lock EXIT

if image_is_ready; then
  printf '%s\n' "$IMAGE_TAG"
  exit 0
fi

docker build \
  --tag "$IMAGE_TAG" \
  --file "$ROOT_DIR/docker/test-agent/Dockerfile" \
  "$ROOT_DIR" \
  >/dev/null

touch "$STAMP_FILE"

printf '%s\n' "$IMAGE_TAG"
