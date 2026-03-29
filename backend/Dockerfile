FROM node:20-slim

# Install ffmpeg, yt-dlp, and build whisper.cpp
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    curl \
    git \
    build-essential \
    cmake \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && git clone --depth 1 https://github.com/ggerganov/whisper.cpp /opt/whisper.cpp \
    && cmake -S /opt/whisper.cpp -B /opt/whisper.cpp/build \
    && cmake --build /opt/whisper.cpp/build --config Release -j2 \
    && ( [ -f /opt/whisper.cpp/build/bin/whisper-cli ] && ln -sf /opt/whisper.cpp/build/bin/whisper-cli /usr/local/bin/whisper-cpp || true ) \
    && ( [ -f /opt/whisper.cpp/build/bin/main ] && ln -sf /opt/whisper.cpp/build/bin/main /usr/local/bin/whisper-cpp || true ) \
    && mkdir -p /app/models \
    && curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin -o /app/models/ggml-small.bin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN mkdir -p uploads outputs temp

EXPOSE 3001
CMD ["node", "dist/index.js"]
