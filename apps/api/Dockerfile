FROM node:20-slim
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/dto/package.json packages/dto/

RUN pnpm install --frozen-lockfile

COPY packages/dto/ packages/dto/
RUN pnpm --filter @incursion/dto build

COPY apps/api/ apps/api/

EXPOSE 3000
CMD ["pnpm", "--filter", "@incursion/api", "dev"]
