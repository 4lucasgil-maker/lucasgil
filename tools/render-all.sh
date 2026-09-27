#!/usr/bin/env bash
# Renderiza e entrega um episódio: vertical 9:16 e/ou horizontal 16:9, thumbnails e prévias leves.
# Uso: tools/render-all.sh <slug> [all|vertical|16x9]
# Variáveis: HF (comando do CLI, padrão "npx hyperframes"), HYPERFRAMES_BROWSER_PATH (Chrome headless).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SLUG="$1"; WHAT="${2:-all}"
V="$ROOT/$SLUG-reel"; H="$ROOT/$SLUG-16x9"
N=$(node -e "process.stdout.write(String(require('$V/episode.json').number))")
HF="${HF:-npx hyperframes}"
log() { echo "[$(date +%H:%M:%S)] $*"; }
snap0() { # $1 projeto, $2 png de saída
  local d; d=$(mktemp -d)
  (cd "$1" && $HF snapshot --at 0 --no-end --timeout 30000 -o "$d" >/dev/null 2>&1)
  cp "$d/frame-00-at-0s.png" "$2"; rm -rf "$d"
}
preview() { # $1 entrada, $2 saída, $3 escala, $4 bitrate de vídeo — prévia < 30 MB para o chat
  local lg; lg=$(mktemp -u)
  ffmpeg -hide_banner -loglevel error -y -i "$1" -vf "scale=$3:flags=lanczos" -c:v libx264 -profile:v high -preset slow -b:v "$4" -pass 1 -passlogfile "$lg" -an -f mp4 /dev/null
  ffmpeg -hide_banner -loglevel error -y -i "$1" -vf "scale=$3:flags=lanczos" -c:v libx264 -profile:v high -preset slow -b:v "$4" -pass 2 -passlogfile "$lg" -c:a aac -b:a 96k -movflags +faststart "$2"
  rm -f "$lg"*
}

if [ "$WHAT" = "all" ] || [ "$WHAT" = "vertical" ]; then
  log "vertical: build + render"
  node "$ROOT/tools/build.mjs" "$V"
  mkdir -p "$V/renders/preview"
  (cd "$V" && $HF render --quality delivery --fps 30 --workers 4 --output "renders/ep$N-$SLUG-master.mp4" >/dev/null 2>&1)
  log "vertical: encode"
  "$ROOT/tools/encode.sh" "$V/renders/ep$N-$SLUG-master.mp4" "$V/renders/ep$N-$SLUG.mp4"
  snap0 "$V" "$V/renders/thumb-ep$N-9x16.png"
  preview "$V/renders/ep$N-$SLUG.mp4" "$V/renders/preview/ep$N-$SLUG-preview-720p.mp4" 720:1280 750k
  rm -f "$V/renders/ep$N-$SLUG-master.mp4"
  log "vertical: ok"
fi

if [ "$WHAT" = "all" ] || [ "$WHAT" = "16x9" ]; then
  log "16:9: build + camadas"
  node "$ROOT/tools/build16x9.mjs" "$V"
  (cd "$H/layers/chat" && $HF render --quality delivery --fps 30 --workers 4 --output "renders/ep$N-chat-master.mp4" >/dev/null 2>&1)
  log "16:9: camada chat ok"
  (cd "$H/layers/scenes" && $HF render --quality delivery --fps 30 --workers 4 --output "renders/ep$N-scenes-master.mp4" >/dev/null 2>&1)
  log "16:9: camada cenas ok"
  mkdir -p "$H/assets/video" "$H/renders/preview"
  ffmpeg -hide_banner -loglevel error -y -i "$H/layers/chat/renders/ep$N-chat-master.mp4" -an -vf scale=624:1110:flags=lanczos -c:v libx264 -preset slow -crf 12 -pix_fmt yuv420p -r 30 "$H/assets/video/ep$N-chat-9x16.mp4"
  ffmpeg -hide_banner -loglevel error -y -i "$H/layers/scenes/renders/ep$N-scenes-master.mp4" -an -vf scale=1040:1848:flags=lanczos -c:v libx264 -preset slow -crf 12 -pix_fmt yuv420p -r 30 "$H/assets/video/ep$N-scenes-9x16.mp4"
  log "16:9: render da raiz"
  (cd "$H" && $HF render --quality delivery --fps 30 --workers 4 --output "renders/ep$N-$SLUG-16x9-master.mp4" >/dev/null 2>&1)
  log "16:9: encode"
  "$ROOT/tools/encode.sh" "$H/renders/ep$N-$SLUG-16x9-master.mp4" "$H/renders/ep$N-$SLUG-16x9.mp4" --fit 95
  snap0 "$H" "$H/renders/thumb-ep$N-16x9.png"
  ffmpeg -hide_banner -loglevel error -y -i "$H/renders/thumb-ep$N-16x9.png" -vf scale=1280:720:flags=lanczos -q:v 2 "$H/renders/thumb-ep$N-youtube.jpg"
  preview "$H/renders/ep$N-$SLUG-16x9.mp4" "$H/renders/preview/ep$N-$SLUG-16x9-preview-720p.mp4" 1280:720 780k
  rm -f "$H/renders/ep$N-$SLUG-16x9-master.mp4"
  log "16:9: ok"
fi
log "fim"
