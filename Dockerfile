# Immagine multi-stage per Cloud Run — Next.js standalone + pnpm.
# Node 22 LTS (allineato a engines in package.json).
# allowBuilds (sharp, esbuild, unrs-resolver): vedi pnpm-workspace.yaml.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat \
  && corepack enable
WORKDIR /app

# --- dipendenze (cache Docker su lockfile) ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Placeholder solo per caricare payload.config in fase di build (non usati a runtime).
# I secret reali arrivano da Cloud Run / Secret Manager.
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PAYLOAD_SECRET=build-time-placeholder
ENV DATABASE_URL=mongodb://127.0.0.1:27017/build-placeholder
ENV SERVER_URL=http://localhost:3000

RUN pnpm build

# sharp 0.35: libvips (.so) non tracciate da Next standalone — materializza binari linuxmusl per lo stage runner.
RUN mkdir -p /opt/sharp-runtime/node_modules \
  && cp -rL node_modules/sharp /opt/sharp-runtime/node_modules/sharp \
  && cp -rL node_modules/@img /opt/sharp-runtime/node_modules/@img

# --- runtime minimale ---
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /opt/sharp-runtime/node_modules/sharp ./node_modules/sharp
COPY --from=builder --chown=nextjs:nodejs /opt/sharp-runtime/node_modules/@img ./node_modules/@img

USER nextjs
EXPOSE 3000

# Cloud Run imposta PORT; il server standalone di Next lo rispetta.
CMD ["node", "server.js"]
