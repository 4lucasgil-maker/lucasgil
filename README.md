# Vou te mandar um áudio — vídeos verticais (HyperFrames)

Vídeos 9:16 (1080×1920) dos episódios do podcast **"Vou te mandar um áudio"** (Cris Junqueira), no conceito
"o episódio é um áudio de WhatsApp sendo gravado": header de chat com status vivo, compositor gravando com
waveform real, legendas em balões palavra a palavra e uma cena de motion design por ideia.

## Estrutura

```
_template/            base compartilhada por todos os episódios
  src/                bg, chrome (header + compositor), captions (balões), transitions, titlecard
  scenes/             intro.html (S01) e outro.html (última cena) reaproveitáveis
  vendor/             gsap.min.js, vtma.js (utilitários/ícones), doodles.svg (papel de parede autoral)
tools/
  transcribe.mjs      transcrição pt-BR palavra a palavra (Parakeet TDT v3 + Whisper small, sherpa-onnx)
  align.mjs           texto corrigido (captions.txt) → tempos do ASR (programação dinâmica)
  envelope.mjs        envelope 20 Hz + resumo de 38 barras da mensagem de voz
  build.mjs           monta index.html + compositions/ a partir de episode.json, captions e scenes/
  build16x9.mjs       versão 16:9: layers/chat (conversa em thread), layers/scenes (cenas) e a raiz 1920×1080
  encode.sh           encode final H.264 High 30 fps, VBV 25 Mbps + verificação (ffprobe, pico de 1 s)
  new-episode.sh      prepara um episódio novo (pasta, áudio, ASR, envelope, intro)
<slug>-16x9/          versão horizontal (gerada por build16x9.mjs a partir do projeto vertical)
<slug>-reel/          um projeto HyperFrames por episódio
  episode.json        número, nome, áudio, janelas das cenas, cena escura, tipos de transição
  captions.txt        texto final (um balão por linha; [in:rótulo] = balão recebido; *palavra* = destaque)
  scenes/sNN.html     cenas (fonte); T("palavra") = tempo local da palavra na cena
  compositions/       gerado pelo build (não editar à mão)
  renders/            MP4 final e thumbnail
```

## Fluxo por episódio

```bash
export ASR_DIR=<pasta com node_modules/sherpa-onnx-node e os modelos>
export HYPERFRAMES_BROWSER_PATH=<chrome headless shell>
tools/new-episode.sh 12 <slug> "<Nome>" <audio.m4a>
# escrever <slug>-reel/captions.txt (clean verbatim) e depois:
node tools/align.mjs <slug>-reel
# definir cenas em episode.json e escrever scenes/sNN.html
node tools/build.mjs <slug>-reel
cd <slug>-reel && npx hyperframes check --json      # 0 erros / 0 avisos
npx hyperframes render --quality delivery --fps 30 --output renders/ep12-<slug>-master.mp4
../tools/encode.sh renders/ep12-<slug>-master.mp4 renders/ep12-<slug>.mp4
```

Versão 16:9 (celular com o chat à esquerda, card de efeitos à direita):

```bash
node tools/build16x9.mjs <slug>-reel          # gera <slug>-16x9/ com layers/chat e layers/scenes
# renderizar as duas camadas (1080×1920), reduzir para 624×1110 (chat) e 1040×1848 (cenas)
# em <slug>-16x9/assets/video/ep12-chat-9x16.mp4 e ep12-scenes-9x16.mp4, depois:
cd <slug>-16x9 && npx hyperframes check && npx hyperframes render --quality delivery --fps 30 --output renders/ep12-<slug>-16x9-master.mp4
../tools/encode.sh renders/ep12-<slug>-16x9-master.mp4 renders/ep12-<slug>-16x9.mp4
```

Modelos de ASR (baixados dos releases do sherpa-onnx no GitHub):
`sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8` e `sherpa-onnx-whisper-small`.

## Foto da Cris

Sem foto na sessão, o avatar usa as iniciais "CJ". Para usar a foto: salvar um recorte quadrado (480 px) em
`<slug>-reel/assets/images/cris-junqueira-avatar.jpg`, rodar `node tools/build.mjs <slug>-reel` e renderizar de novo.
