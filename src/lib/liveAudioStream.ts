// Mikrofon sesini yakalayıp 16kHz mono PCM16'ya çevirip WebSocket üzerinden
// backend'e akıtır. Mantık, backend'in kendi kanıtlanmış test arayüzündeki
// (meeting_scribe/server/templates/index.html) downsampleTo16k akışının
// birebir TypeScript karşılığıdır.
//
// Mikrofon toplantı masasının ortasında olacağından uzaktaki katılımcılar
// zor duyulabilir; bunu telafi etmek için source ile scriptNode arasına
// bir kompresör + kazanç zinciri eklendi (aşağıdaki createGainStage).

export interface LiveSegmentEvent {
  segment_id: string;
  revision: number;
  status: "provisional" | "final";
  speaker_label: string;
  text: string;
}

interface LiveAudioStreamCallbacks {
  onSegment: (event: LiveSegmentEvent) => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

function downsampleTo16k(input: Float32Array, inputRate: number): Float32Array {
  const outputRate = 16000;
  if (inputRate === outputRate) return input;
  if (inputRate < outputRate) throw new Error("Mikrofon örnekleme hızı 16 kHz altına düşemez.");
  const ratio = inputRate / outputRate;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let outIndex = 0; outIndex < output.length; outIndex++) {
    const start = Math.floor(outIndex * ratio);
    const end = Math.max(start + 1, Math.floor((outIndex + 1) * ratio));
    let sum = 0;
    for (let inIndex = start; inIndex < end && inIndex < input.length; inIndex++) {
      sum += input[inIndex]!;
    }
    output[outIndex] = sum / (end - start);
  }
  return output;
}

// Uzak konuşmacıları güçlendirmek için highpass filtre + kompresör + sabit
// kazanç zinciri kurar:
//   - highpass: konuşmanın altındaki oda uğultusunu/hum'u kompresöre
//     girmeden önce keser (kompresör aksi halde gürültüyü de yükseltirdi).
//   - compressor: yüksek sesleri bastırıp ortalamayı yükseltir (AGC etkisi).
//   - gain: kompresörden sonra genel seviyeyi sabitçe yukarı çeker.
// Zincir: source -> highpass -> compressor -> gain -> scriptNode.
function createGainStage(
  context: AudioContext,
  source: MediaStreamAudioSourceNode,
): AudioNode {
  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 100;

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -50;
  compressor.knee.value = 30;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  const gain = context.createGain();
  gain.gain.value = 2.5;

  source.connect(highpass);
  highpass.connect(compressor);
  compressor.connect(gain);
  return gain;
}

export class LiveAudioStream {
  private socket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private scriptNode: ScriptProcessorNode | null = null;

  async start(wsUrl: string, callbacks: LiveAudioStreamCallbacks): Promise<void> {
    if (!window.isSecureContext && location.hostname !== "localhost") {
      throw new Error("Mikrofon erişimi için arayüz HTTPS üzerinden açılmalıdır.");
    }

    this.socket = new WebSocket(wsUrl);

    this.socket.onmessage = (event) => {
      try {
        callbacks.onSegment(JSON.parse(event.data) as LiveSegmentEvent);
      } catch {
        // Beklenmeyen mesaj formatı — sessizce atlanır.
      }
    };
    this.socket.onerror = () => callbacks.onError?.("Canlı bağlantı hatası.");
    this.socket.onclose = () => {
      this.socket = null;
      callbacks.onClose?.();
    };

    await new Promise<void>((resolve, reject) => {
      if (!this.socket) return reject(new Error("Soket oluşturulamadı."));
      this.socket.onopen = () => resolve();
      this.socket.addEventListener("error", () => reject(new Error("WebSocket açılamadı.")), { once: true });
    });

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          // Kendi kompresör/kazanç zincirimiz olduğundan tarayıcının AGC'si
          // kapatılıyor; ikisi birden gürültüyü de aşırı yükseltebilir.
          autoGainControl: false,
        },
      });
    } catch (error) {
      this.socket?.close();
      throw new Error(error instanceof Error ? error.message : "Mikrofon başlatılamadı.");
    }

    this.audioContext = new AudioContext();
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
    if (this.audioContext.state !== "running") {
      this.stop();
      throw new Error(
        "Tarayıcı ses işlemeyi duraklattı. Sayfaya tıklayıp toplantıyı yeniden başlatın.",
      );
    }
    const source = this.audioContext.createMediaStreamSource(this.micStream);
    const boosted = createGainStage(this.audioContext, source);
    this.scriptNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    boosted.connect(this.scriptNode);
    this.scriptNode.connect(this.audioContext.destination);

    this.scriptNode.onaudioprocess = (event) => {
      if (!this.audioContext) return;
      const input = downsampleTo16k(event.inputBuffer.getChannelData(0), this.audioContext.sampleRate);
      const pcm16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const clamped = Math.max(-1, Math.min(1, input[i]!));
        pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      }
      const socket = this.socket;
      if (socket && socket.readyState === WebSocket.OPEN) {
        if (socket.bufferedAmount < 1024 * 1024) {
          socket.send(pcm16.buffer);
        } else {
          callbacks.onError?.("Ağ ses akışına yetişemiyor; bağlantıyı kontrol edin.");
        }
      }
    };
  }

  stop(): void {
    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
