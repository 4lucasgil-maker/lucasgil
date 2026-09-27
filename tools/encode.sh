#!/usr/bin/env bash
# Encode final (§3.11) + verificação técnica.
# Uso: tools/encode.sh <master.mp4> <final.mp4>
set -euo pipefail
IN="$1"; OUT="$2"
ffmpeg -hide_banner -loglevel error -y -i "$IN" -map 0:v:0 -map 0:a:0 \
  -c:v libx264 -profile:v high -level:v 4.2 -pix_fmt yuv420p -r 30 -preset slow -crf 16 \
  -maxrate 25M -bufsize 50M -g 60 -keyint_min 30 -c:a copy -movflags +faststart "$OUT"

echo "== ffprobe =="
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,profile,width,height,r_frame_rate,avg_frame_rate,pix_fmt -of default=nw=1 "$OUT"
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels -of default=nw=1 "$OUT"
ffprobe -v error -show_entries format=duration,bit_rate,size -of default=nw=1 "$OUT"

echo "== pico de bitrate de vídeo (janela deslizante de 1 s) =="
ffprobe -v error -select_streams v:0 -show_entries packet=pts_time,size -of csv=p=0 "$OUT" | python3 -c '
import sys
pk = []
for line in sys.stdin:
    p = line.strip().split(",")
    if len(p) >= 2 and p[0] not in ("", "N/A"):
        pk.append((float(p[0]), int(p[1])))
pk.sort()
j = 0; acc = 0; peak = 0; tot = sum(s for _, s in pk)
for i in range(len(pk)):
    acc += pk[i][1]
    while pk[i][0] - pk[j][0] >= 1.0:
        acc -= pk[j][1]; j += 1
    peak = max(peak, acc)
dur = pk[-1][0] - pk[0][0] if pk else 1
print("video medio: %.2f Mbps | pico 1 s: %.2f Mbps" % (tot * 8 / dur / 1e6, peak * 8 / 1e6))
'
