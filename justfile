set dotenv-load := true

# =============================================================================
# Release
# =============================================================================

[group('release')]
release *ARGS:
	cd scripts/release && pnpm exec tsx ./main.ts --phase setup-local {{ ARGS }}

# Build a single target via Docker
[group('release')]
release-build target="x86_64-unknown-linux-musl":
	./docker/release/build.sh {{target}}

# Build all release binaries
[group('release')]
release-build-all:
	./docker/release/build.sh x86_64-unknown-linux-musl
	./docker/release/build.sh aarch64-unknown-linux-musl
	./docker/release/build.sh x86_64-pc-windows-gnu
	./docker/release/build.sh x86_64-apple-darwin
	./docker/release/build.sh aarch64-apple-darwin

# =============================================================================
# Development
# =============================================================================

[group('dev')]
dev-daemon:
	SANDBOX_AGENT_SKIP_INSPECTOR=1 cargo run -p sandbox-agent -- daemon start --upgrade

[group('dev')]
dev: dev-daemon
	pnpm dev -F @sandbox-agent/inspector -- --host 0.0.0.0

[group('dev')]
build:
	cargo build -p sandbox-agent

[group('dev')]
test:
	cargo test --all-targets

[group('dev')]
check:
	cargo check --all-targets
	cargo fmt --all -- --check
	pnpm run typecheck

[group('dev')]
fmt:
	cargo fmt --all

[group('dev')]
install-fast-sa:
	SANDBOX_AGENT_SKIP_INSPECTOR=1 cargo build --release -p sandbox-agent
	rm -f ~/.cargo/bin/sandbox-agent
	cp target/release/sandbox-agent ~/.cargo/bin/sandbox-agent

[group('dev')]
install-gigacode:
	SANDBOX_AGENT_SKIP_INSPECTOR=1 cargo build --release -p gigacode
	rm -f ~/.cargo/bin/gigacode
	cp target/release/gigacode ~/.cargo/bin/gigacode

[group('dev')]
run-sa *ARGS:
	SANDBOX_AGENT_SKIP_INSPECTOR=1 cargo run -p sandbox-agent -- {{ ARGS }}

[group('dev')]
run-gigacode *ARGS:
	SANDBOX_AGENT_SKIP_INSPECTOR=1 cargo run -p gigacode -- {{ ARGS }}

[group('dev')]
dev-docs:
	cd docs && pnpm dlx mintlify dev --host 0.0.0.0

install:
    pnpm install
    pnpm build --filter @sandbox-agent/inspector...
    cargo install --path server/packages/sandbox-agent --debug
    cargo install --path gigacode --debug

install-fast:
    SANDBOX_AGENT_SKIP_INSPECTOR=1 cargo install --path server/packages/sandbox-agent --debug
    SANDBOX_AGENT_SKIP_INSPECTOR=1 cargo install --path gigacode --debug

install-release:
    pnpm install
    pnpm build --filter @sandbox-agent/inspector...
    cargo install --path server/packages/sandbox-agent
    cargo install --path gigacode

# =============================================================================
# Factory
# =============================================================================

[group('factory')]
factory-deps:
	pnpm install

[group('factory')]
factory-install:
	pnpm install
	pnpm -w build

[group('factory')]
factory-typecheck:
	pnpm -w typecheck

[group('factory')]
factory-build:
	pnpm -w build

[group('factory')]
factory-test:
	pnpm -w test

[group('factory')]
factory-check:
	pnpm -w typecheck
	pnpm -w build
	pnpm -w test

[group('factory')]
factory-dev:
	pnpm install
	mkdir -p factory/.openhandoff/logs
	HF_DOCKER_UID="$(id -u)" HF_DOCKER_GID="$(id -g)" docker compose -f factory/compose.dev.yaml up --build --force-recreate -d

[group('factory')]
factory-preview:
	pnpm install
	mkdir -p factory/.openhandoff/logs
	HF_DOCKER_UID="$(id -u)" HF_DOCKER_GID="$(id -g)" docker compose -f factory/compose.preview.yaml up --build --force-recreate -d

[group('factory')]
factory-frontend-dev host='127.0.0.1' port='4173' backend='http://127.0.0.1:7741/api/rivet':
	pnpm install
	VITE_HF_BACKEND_ENDPOINT="{{backend}}" pnpm --filter @openhandoff/frontend dev -- --host {{host}} --port {{port}}

[group('factory')]
factory-dev-mock host='127.0.0.1' port='4173':
	pnpm install
	OPENHANDOFF_FRONTEND_CLIENT_MODE=mock pnpm --filter @openhandoff/frontend dev -- --host {{host}} --port {{port}}

[group('factory')]
factory-dev-turbo:
	pnpm exec turbo run dev --parallel --filter=@openhandoff/*

[group('factory')]
factory-dev-down:
	docker compose -f factory/compose.dev.yaml down

[group('factory')]
factory-dev-logs:
	docker compose -f factory/compose.dev.yaml logs -f --tail=200

[group('factory')]
factory-preview-down:
	docker compose -f factory/compose.preview.yaml down

[group('factory')]
factory-preview-logs:
	docker compose -f factory/compose.preview.yaml logs -f --tail=200

[group('factory')]
factory-format:
	prettier --write factory

[group('factory')]
factory-backend-start host='127.0.0.1' port='7741':
	pnpm install
	pnpm --filter @openhandoff/backend build
	pnpm --filter @openhandoff/backend start -- --host {{host}} --port {{port}}

[group('factory')]
factory-hf *ARGS:
	@echo "CLI package is disabled in this repo; use frontend workflows instead." >&2
	@exit 1

[group('factory')]
factory-docker-build tag='openhandoff:local':
	docker build -f factory/Dockerfile -t {{tag}} .

[group('factory')]
factory-railway-up:
	npx -y @railway/cli up --detach

[group('factory')]
factory-railway-status:
	npx -y @railway/cli status --json
