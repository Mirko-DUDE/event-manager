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

# Next standalone non include le .so di @img/sharp-libvips-linuxmusl-x64 nel file tracing.
# Estraiamo qui (layer deps), dove il CAS pnpm è presente e i hard link sono validi.
# tar -ch dereferenzia symlink e copia file reali; evita il problema di busybox cp con hard link.
RUN set -e; mkdir -p /opt/sharp/@img; \
    SHARP=$(ls -d node_modules/.pnpm/sharp@0.35.3*/node_modules/sharp | head -1); \
    IMG=$(ls -d node_modules/.pnpm/@img+sharp-linuxmusl-x64@*/node_modules/@img/sharp-linuxmusl-x64 | head -1); \
    VIPS=$(ls -d node_modules/.pnpm/@img+sharp-libvips-linuxmusl-x64@*/node_modules/@img/sharp-libvips-linuxmusl-x64 | head -1); \
    tar -chf - -C "$(dirname "$SHARP")" "$(basename "$SHARP")" | tar -xf - -C /opt/sharp/; \
    tar -chf - -C "$(dirname "$IMG")" "$(basename "$IMG")" | tar -xf - -C /opt/sharp/@img/; \
    tar -chf - -C "$(dirname "$VIPS")" "$(basename "$VIPS")" | tar -xf - -C /opt/sharp/@img/; \
    test -d /opt/sharp/@img/sharp-libvips-linuxmusl-x64/lib

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
COPY --from=deps --chown=nextjs:nodejs /opt/sharp/sharp ./node_modules/sharp
COPY --from=deps --chown=nextjs:nodejs /opt/sharp/@img ./node_modules/@img

USER nextjs
EXPOSE 3000

# Cloud Run imposta PORT; il server standalone di Next lo rispetta.
CMD ["node", "server.js"]
