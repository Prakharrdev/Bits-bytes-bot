FROM node:20-slim

# FFmpeg for audio merging + build tools for native modules (@discordjs/opus, sodium-native)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --prod --frozen-lockfile
COPY . .

# Temp directory for recordings (cleaned automatically post-processing)
RUN mkdir -p /tmp/bnb-recordings

CMD ["node", "index.js"]
