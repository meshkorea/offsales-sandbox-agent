# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY docs/openapi.json docs/openapi.json
COPY foundry/tsconfig.base.json foundry/tsconfig.base.json
COPY foundry/packages/shared/package.json foundry/packages/shared/package.json
COPY foundry/packages/backend/package.json foundry/packages/backend/package.json
COPY sdks/acp-http-client/package.json sdks/acp-http-client/package.json
COPY sdks/cli-shared/package.json sdks/cli-shared/package.json
COPY sdks/persist-rivet/package.json sdks/persist-rivet/package.json
COPY sdks/typescript/package.json sdks/typescript/package.json
RUN pnpm fetch --frozen-lockfile --filter @sandbox-agent/foundry-backend...

FROM base AS build
COPY --from=deps /pnpm/store /pnpm/store
COPY . .
RUN pnpm install --frozen-lockfile --prefer-offline --filter @sandbox-agent/foundry-backend...
RUN pnpm --filter @sandbox-agent/foundry-shared build
RUN pnpm --filter acp-http-client build
RUN pnpm --filter @sandbox-agent/cli-shared build
RUN SKIP_OPENAPI_GEN=1 pnpm --filter sandbox-agent build
RUN pnpm --filter @sandbox-agent/persist-rivet build
RUN pnpm --filter @sandbox-agent/foundry-backend build
RUN pnpm --filter @sandbox-agent/foundry-backend deploy --prod /out

FROM oven/bun:1.2 AS runtime
ENV NODE_ENV=production
ENV HOME=/home/task
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    gh \
    openssh-client \
  && rm -rf /var/lib/apt/lists/*
RUN addgroup --system --gid 1001 task \
  && adduser --system --uid 1001 --home /home/task --ingroup task task \
  && mkdir -p /home/task \
  && chown -R task:task /home/task /app
COPY --from=build /out ./
USER task
EXPOSE 7741
CMD ["bun", "dist/index.js", "start", "--host", "0.0.0.0"]
