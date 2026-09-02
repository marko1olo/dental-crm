/**
 * AudioWorkletProcessor.ts — Высокопроизводительный Web Audio API AudioWorklet процессор
 * для захвата звука микрофона, даунсэмплинга до 16 кГц, вычисления RMS и потоковой передачи PCM.
 *
 * ФУНКЦИОНАЛ:
 * 1. Даунсэмплинг на лету (Linear Interpolation Resampling) с любой входной частоты (44.1k/48k/96k) в 16000 Гц.
 * 2. Конвертация 32-bit Float в 16-bit Signed Integer PCM (Int16Array).
 * 3. Непрерывный расчет мгновенной RMS энергии звукового потока.
 * 4. Буферизация и передача чанков через transferable ArrayBuffer в основной поток (Zero-Copy).
 * 5. Устойчивость к перегрузкам и динамическая настройка параметров через MessagePort.
 */

export const DENTAL_AUDIO_WORKLET_PROCESSOR_NAME = "dental-audio-worklet-processor";

export interface AudioWorkletPcmPayload {
	type: "pcm_chunk";
	pcm: Int16Array;
	rms: number;
	sampleRate: number;
	samplesCount: number;
	timestamp: number;
}

export interface AudioWorkletVapPayload {
	type: "vad_event";
	isSpeaking: boolean;
	rms: number;
}

export type AudioWorkletOutputMessage =
	| AudioWorkletPcmPayload
	| AudioWorkletVapPayload;

export interface AudioWorkletCommand {
	command: "configure" | "reset" | "set_chunk_size";
	targetSampleRate?: number;
	chunkSize?: number;
	rmsThreshold?: number;
}

/**
 * Исходный код AudioWorkletProcessor для изолированного AudioWorkletGlobalScope.
 * Собирается в standalone-строку без внешних зависимостей для создания Blob URL.
 */
export const AUDIO_WORKLET_PROCESSOR_SOURCE = `
class DentalAudioWorkletProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetSampleRate = (options && options.processorOptions && options.processorOptions.targetSampleRate) || 16000;
    this.chunkSize = (options && options.processorOptions && options.processorOptions.chunkSize) || 2048; // ~128ms @ 16kHz
    this.rmsThreshold = (options && options.processorOptions && options.processorOptions.rmsThreshold) || 0.015;

    this.resampleBuffer = new Float32Array(this.chunkSize * 4);
    this.resampleCount = 0;
    this.pcmBuffer = new Int16Array(this.chunkSize);
    this.pcmIndex = 0;
    this.resampleRatio = 1.0;
    this.sourceSampleRate = 48000;
    this.resamplePhase = 0.0;

    this.port.onmessage = (event) => {
      const data = event.data;
      if (!data) return;
      if (data.command === 'configure') {
        if (data.targetSampleRate) this.targetSampleRate = data.targetSampleRate;
        if (data.chunkSize) {
          this.chunkSize = Math.max(512, Math.min(16384, data.chunkSize));
          this.pcmBuffer = new Int16Array(this.chunkSize);
          this.pcmIndex = 0;
        }
        if (typeof data.rmsThreshold === 'number') this.rmsThreshold = data.rmsThreshold;
      } else if (data.command === 'reset') {
        this.pcmIndex = 0;
        this.resampleCount = 0;
        this.resamplePhase = 0.0;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channelData = input[0];
    if (!channelData || channelData.length === 0) return true;

    // В AudioWorklet sampleRate глобально доступен
    const inputSampleRate = typeof sampleRate !== 'undefined' ? sampleRate : 48000;
    this.sourceSampleRate = inputSampleRate;
    const ratio = inputSampleRate / this.targetSampleRate;

    // 1. Быстрый расчет RMS для входного фрейма
    let sumSquares = 0;
    for (let i = 0; i < channelData.length; i++) {
      const s = channelData[i];
      sumSquares += s * s;
    }
    const frameRms = Math.sqrt(sumSquares / channelData.length);

    // 2. Линейная интерполяция и даунсэмплинг
    let inIdx = this.resamplePhase;
    while (inIdx < channelData.length) {
      const idxFloor = Math.floor(inIdx);
      const idxCeil = Math.min(idxFloor + 1, channelData.length - 1);
      const frac = inIdx - idxFloor;

      const s0 = channelData[idxFloor];
      const s1 = channelData[idxCeil];
      const interpolated = s0 + frac * (s1 - s0);

      // Конвертация Float32 (-1.0 .. 1.0) в Int16 (-32768 .. 32767) с насыщением
      const clamped = Math.max(-1.0, Math.min(1.0, interpolated));
      const int16Val = clamped < 0 ? clamped * 32768 : clamped * 32767;

      this.pcmBuffer[this.pcmIndex++] = Math.round(int16Val);

      // Если чанк заполнен — передаем в основной поток
      if (this.pcmIndex >= this.chunkSize) {
        const outPcm = new Int16Array(this.pcmBuffer);
        
        // Вычисляем RMS для ресэмплированного чанка
        let pcmSumSquares = 0;
        for (let j = 0; j < outPcm.length; j++) {
          const norm = outPcm[j] / 32768.0;
          pcmSumSquares += norm * norm;
        }
        const chunkRms = Math.sqrt(pcmSumSquares / outPcm.length);

        this.port.postMessage({
          type: 'pcm_chunk',
          pcm: outPcm,
          rms: chunkRms,
          sampleRate: this.targetSampleRate,
          samplesCount: outPcm.length,
          timestamp: Date.now()
        }, [outPcm.buffer]);

        this.pcmIndex = 0;
      }

      inIdx += ratio;
    }

    this.resamplePhase = inIdx - channelData.length;
    return true;
  }
}

registerProcessor('${DENTAL_AUDIO_WORKLET_PROCESSOR_NAME}', DentalAudioWorkletProcessor);
`;

let cachedBlobUrl: string | null = null;

/**
 * Создает или возвращает кэшированный Blob URL для загрузки процессора в AudioWorklet
 */
export function getAudioWorkletBlobUrl(): string {
	if (cachedBlobUrl) return cachedBlobUrl;
	if (typeof window === "undefined" || typeof Blob === "undefined") {
		return "";
	}
	const blob = new Blob([AUDIO_WORKLET_PROCESSOR_SOURCE], {
		type: "application/javascript",
	});
	cachedBlobUrl = URL.createObjectURL(blob);
	return cachedBlobUrl;
}

/**
 * Регистрирует AudioWorklet процессор в переданном AudioContext
 */
export async function registerDentalAudioWorklet(
	audioContext: AudioContext,
): Promise<boolean> {
	if (
		!audioContext ||
		typeof audioContext.audioWorklet === "undefined" ||
		typeof audioContext.audioWorklet.addModule !== "function"
	) {
		return false;
	}

	try {
		const blobUrl = getAudioWorkletBlobUrl();
		if (!blobUrl) return false;
		await audioContext.audioWorklet.addModule(blobUrl);
		return true;
	} catch (error) {
		const err = error as Error;
		if (
			err.name === "NotSupportedError" ||
			err.message.includes("already registered")
		) {
			return true;
		}
		console.warn("Failed to register dental audio worklet module:", error);
		return false;
	}
}
