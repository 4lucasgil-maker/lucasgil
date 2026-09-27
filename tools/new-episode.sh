#!/usr/bin/env bash
# Prepara um episódio novo: pasta, áudio, transcrição palavra a palavra, envelope e esqueleto.
# Uso: tools/new-episode.sh <número> <slug> "<Nome do episódio>" <áudio (.m4a/.mp3)>
# Requer ASR_DIR apontando para a pasta com sherpa-onnx-node + modelos (ver README).
set -euo pipefail
N="$1"; SLUG="$2"; NAME="$3"; SRC="$4"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
P="$ROOT/$SLUG-reel"
mkdir -p "$P/assets/audio" "$P/scenes" "$P/renders"
EXT="${SRC##*.}"
cp "$SRC" "$P/assets/audio/ep$N-$SLUG.$EXT"
# FLAC sem perdas: o Chromium headless não decodifica AAC; o mix final usa este arquivo
ffmpeg -hide_banner -loglevel error -y -i "$SRC" -c:a flac "$P/assets/audio/ep$N-$SLUG.flac"
node "$ROOT/tools/transcribe.mjs" "$P/assets/audio/ep$N-$SLUG.flac" "$P/.asr" --whisper
node "$ROOT/tools/envelope.mjs" "$P/assets/audio/ep$N-$SLUG.flac" "$P"
sed "s/__ID__/s01/g" "$ROOT/_template/scenes/intro.html" > "$P/scenes/s01.html"
if [ ! -f "$P/episode.json" ]; then
cat > "$P/episode.json" <<EOF
{
  "number": $N,
  "name": "$NAME",
  "slug": "$SLUG",
  "audio": "assets/audio/ep$N-$SLUG.flac",
  "tail": 1.2,
  "clockStart": "08:20",
  "hidden": [0, 1],
  "dark": null,
  "scenes": [["s01", 0]],
  "cuts": {}
}
EOF
fi
echo "Pronto: $P — agora escreva captions.txt, rode tools/align.mjs, defina as cenas e rode tools/build.mjs."
