---
workflow: general-video
flow: automation
storyboard: no
mode: autonomous
format: 9:16 (1080×1920)
fps: 30
language: pt-BR
duration: 242.535s (áudio 241.335s + 1,2 s de respiro)
---

# BRIEF — "Vou te mandar um áudio" · EP 11 · Experiência

**Mensagem:** experiência chega logo depois de precisar dela; diante do novo, resgate o coletivo das
experiências que você já tem, abstraia padrões e ajuste por analogia.

**Entrega pedida:** somente a versão vertical (MP4 1080×1920, H.264 High, 30 fps, pico < 25 Mbps) + thumbnail 9:16
com o nome do episódio; frame 0 do MP4 = nome do episódio.

**Fonte:** áudio `assets/audio/ep11-experiencia.m4a` (AAC 128 kbps, 4:01, tag #11 Experiência, YouTube sfYfHklTXhY);
cópia FLAC sem perdas para o player do Chromium.

**Identidade:** chat do WhatsApp (header, compositor gravando, balões com ✓✓), paleta e tipografia do prompt-base.
Avatar: sem foto disponível nesta sessão → iniciais "CJ" em círculo verde-escuro (trocar colocando
`assets/images/cris-junqueira-avatar.jpg` e rodando `node tools/build.mjs` + render).

**Notas de correção da transcrição:** ver `.asr/` e o relatório final (Parakeet TDT v3 + Whisper small via sherpa-onnx,
texto "clean verbatim", alinhamento DP com `tools/align.mjs`).
