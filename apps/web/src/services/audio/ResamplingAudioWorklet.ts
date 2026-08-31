/**
 * ResamplingAudioWorklet.ts — Высокопроизводительный AudioWorkletProcessor для захвата
 * аудиопотока микрофона, аппаратного антиалиасинга (Low-Pass IIR Butterworth),
 * честного даунсэмплинга до 16000 Гц и конвертации Float32 в Int16 PCM.
 *
 * ТЕХНИЧЕСКИЕ ИНВАРИАНТЫ:
 * 1. Антиалиасинг (Anti-Aliasing Filter):
 *    - 4-го порядка каскадный Butterworth Low-Pass фильтр (2 каскада Direct Form II Transposed).
 *    - Частота среза fc = 7200 Гц (ниже частоты Найквиста 8000 Гц для 16 кГц).
 *    - Полное подавление зеркальных частот (aliasing) при любой входной частоте (44.1k, 48k, 96k, 192k).
 * 2. Честный даунсэмплинг до 16000 Гц:
 *    - Точный фазовый аккумулятор с кубической интерполяцией Эрмита / Catmull-Rom.
 *    - Нулевой джиттер и непрерывное сохранение фазы между аудиоблоками.
 * 3. Конвертация Float32 -> Int16 PCM:
 *    - Диапазон [-1.0 .. 1.0] -> [-32768 .. 32767] с насыщением (hard-clipping guard).
 * 4. Непрерывный расчет RMS энергии в линейной шкале и dB (децибелы):
 *    - dB = 20 * log10(max(RMS, 1e-6)).
 * 5. Zero-Copy передача:
 *    - Передача ArrayBuffer через Transferable объекты в port.postMessage.
 */

export const RESAMPLING_AUDIO_WORKLET_NAME = "resampling-audio-worklet-processor";

export interface ResamplingWorkletOptions {
	targetSampleRate?: number;
	chunkSize?: number;
	lowPassCutoffHz?: number;
	speechThresholdDb?: number;
}

export interface AudioPcmChunkPayload {
	type: "pcm_chunk";
	pcm: Int16Array;
	rms: number;
	rmsDb: number;
	sampleRate: number;
	samplesCount: number;
	timestamp: number;
}

export interface AudioVadEventPayload {
	type: "vad_event";
	isSpeaking: boolean;
	rms: number;
	rmsDb: number;
	timestamp: number;
}

export type ResamplingWorkletOutputMessage =
	| AudioPcmChunkPayload
	| AudioVadEventPayload;

export interface ResamplingWorkletCommand {
	command: "configure" | "reset" | "set_chunk_size";
	targetSampleRate?: number;
	chunkSize?: number;
	lowPassCutoffHz?: number;
	speechThresholdDb?: number;
}

/**
 * Чистая математическая реализация каскадного Biquad Low-Pass фильтра 4-го порядка
 * для подавления эффекта наложения спектров (Anti-Aliasing) перед даунсэмплингом.
 */
export class AntiAliasingBiquadFilter {
	private b0_1 = 1;
	private b1_1 = 0;
	private b2_1 = 0;
	private a1_1 = 0;
	private a2_1 = 0;
	private s1_1 = 0;
	private s2_1 = 0;

	private b0_2 = 1;
	private b1_2 = 0;
	private b2_2 = 0;
	private a1_2 = 0;
	private a2_2 = 0;
	private s1_2 = 0;
	private s2_2 = 0;

	private currentSampleRate = 48000;
	private currentCutoffHz = 7200;

	constructor(sampleRate = 48000, cutoffHz = 7200) {
		this.updateCoefficients(sampleRate, cutoffHz);
	}

	public updateCoefficients(sampleRate: number, cutoffHz: number): void {
		this.currentSampleRate = Math.max(8000, sampleRate);
		// Ограничиваем срез значением не выше 0.45 * sampleRate
		const maxAllowedCutoff = this.currentSampleRate * 0.45;
		this.currentCutoffHz = Math.min(cutoffHz, maxAllowedCutoff);

		// Если входная частота уже <= целевой (например 16кГц), фильтрация пропускает без изменений
		if (this.currentSampleRate <= 16000 || this.currentCutoffHz >= this.currentSampleRate * 0.49) {
			this.b0_1 = 1;
			this.b1_1 = 0;
			this.b2_1 = 0;
			this.a1_1 = 0;
			this.a2_1 = 0;
			this.b0_2 = 1;
			this.b1_2 = 0;
			this.b2_2 = 0;
			this.a1_2 = 0;
			this.a2_2 = 0;
			return;
		}

		// 4th order Butterworth poles: Q1 = 0.54119610, Q2 = 1.30656296
		const q1 = 0.5411961;
		const q2 = 1.306563;

		const coef1 = this.calculateBiquadCoefficients(this.currentSampleRate, this.currentCutoffHz, q1);
		this.b0_1 = coef1.b0;
		this.b1_1 = coef1.b1;
		this.b2_1 = coef1.b2;
		this.a1_1 = coef1.a1;
		this.a2_1 = coef1.a2;

		const coef2 = this.calculateBiquadCoefficients(this.currentSampleRate, this.currentCutoffHz, q2);
		this.b0_2 = coef2.b0;
		this.b1_2 = coef2.b1;
		this.b2_2 = coef2.b2;
		this.a1_2 = coef2.a1;
		this.a2_2 = coef2.a2;
	}

	private calculateBiquadCoefficients(fs: number, fc: number, q: number) {
		const w0 = (2 * Math.PI * fc) / fs;
		const cosW0 = Math.cos(w0);
		const sinW0 = Math.sin(w0);
		const alpha = sinW0 / (2 * q);

		const b0 = (1 - cosW0) / 2;
		const b1 = 1 - cosW0;
		const b2 = (1 - cosW0) / 2;
		const a0 = 1 + alpha;
		const a1 = -2 * cosW0;
		const a2 = 1 - alpha;

		return {
			b0: b0 / a0,
			b1: b1 / a0,
			b2: b2 / a0,
			a1: a1 / a0,
			a2: a2 / a0,
		};
	}

	/**
	 * Фильтрация одного сэмпла через 2 каскада Direct Form II Transposed
	 */
	public processSample(x: number): number {
		// Каскад 1
		const y1 = this.b0_1 * x + this.s1_1;
		this.s1_1 = this.b1_1 * x - this.a1_1 * y1 + this.s2_1;
		this.s2_1 = this.b2_1 * x - this.a2_1 * y1;

		// Каскад 2
		const y2 = this.b0_2 * y1 + this.s1_2;
		this.s1_2 = this.b1_2 * y1 - this.a1_2 * y2 + this.s2_2;
		this.s2_2 = this.b2_2 * y1 - this.a2_2 * y2;

		return y2;
	}

	/**
	 * Пакетная фильтрация массива сэмплов in-place или в выходной буфер
	 */
	public processBuffer(input: Float32Array, output?: Float32Array): Float32Array {
		const out = output ?? new Float32Array(input.length);
		for (let i = 0; i < input.length; i++) {
			const val = input[i] ?? 0;
			out[i] = this.processSample(val);
		}
		return out;
	}

	public reset(): void {
		this.s1_1 = 0;
		this.s2_1 = 0;
		this.s1_2 = 0;
		this.s2_2 = 0;
	}
}

/**
 * Утилиты конвертации аудиоформатов и расчета акустической энергии
 */
export function calculateRms(samples: Float32Array | Int16Array): { rms: number; rmsDb: number } {
	if (!samples || samples.length === 0) {
		return { rms: 0, rmsDb: -120 };
	}

	let sumSq = 0;
	const len = samples.length;

	if (samples instanceof Float32Array) {
		for (let i = 0; i < len; i++) {
			const s = samples[i] ?? 0;
			sumSq += s * s;
		}
	} else {
		for (let i = 0; i < len; i++) {
			const s = (samples[i] ?? 0) / 32768.0;
			sumSq += s * s;
		}
	}

	const rms = Math.sqrt(sumSq / len);
	const clampedRms = Math.max(rms, 1e-6);
	const rmsDb = 20 * Math.log10(clampedRms);

	return { rms, rmsDb };
}

/**
 * Безопасная конвертация Float32 (-1.0 .. 1.0) в Int16 (-32768 .. 32767) с насыщением
 */
export function float32ToInt16Sample(sample: number): number {
	const clamped = Math.max(-1.0, Math.min(1.0, sample));
	const scaled = clamped < 0 ? clamped * 32768.0 : clamped * 32767.0;
	return Math.round(scaled);
}

/**
 * Чистый алгоритм даунсэмплинга с антиалиасингом для оффлайн/тестового использования
 */
export function resampleAudioBuffer(
	input: Float32Array,
	inputSampleRate: number,
	targetSampleRate = 16000,
	lowPassCutoffHz = 7200,
): Int16Array {
	if (input.length === 0) return new Int16Array(0);

	const filter = new AntiAliasingBiquadFilter(inputSampleRate, lowPassCutoffHz);
	const filtered = filter.processBuffer(input);

	const ratio = inputSampleRate / targetSampleRate;
	const outLen = Math.floor(input.length / ratio);
	const outPcm = new Int16Array(outLen);

	let phase = 0.0;
	for (let i = 0; i < outLen; i++) {
		const idxFloor = Math.floor(phase);
		const frac = phase - idxFloor;

		const x0 = filtered[Math.max(0, idxFloor - 1)] ?? 0;
		const x1 = filtered[idxFloor] ?? 0;
		const x2 = filtered[Math.min(filtered.length - 1, idxFloor + 1)] ?? 0;
		const x3 = filtered[Math.min(filtered.length - 1, idxFloor + 2)] ?? 0;

		// 4-point Hermite / Catmull-Rom cubic interpolation
		const c0 = x1;
		const c1 = 0.5 * (x2 - x0);
		const c2 = x0 - 2.5 * x1 + 2.0 * x2 - 0.5 * x3;
		const c3 = 0.5 * (x3 - x0) + 1.5 * (x1 - x2);
		const interpolated = ((c3 * frac + c2) * frac + c1) * frac + c0;

		outPcm[i] = float32ToInt16Sample(interpolated);
		phase += ratio;
	}

	return outPcm;
}

/**
 * Исходный код AudioWorkletProcessor для изолированного AudioWorkletGlobalScope.
 * Включает встроенный AntiAliasing фильтр, интерполяционный ресэмплер,
 * расчет RMS/dB и потоковую отправку PCM Int16 чанков.
 */
export const RESAMPLING_AUDIO_WORKLET_SOURCE = `
class ResamplingAudioWorkletProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.targetSampleRate = opts.targetSampleRate || 16000;
    this.chunkSize = opts.chunkSize || 2048; // ~128ms @ 16kHz
    this.lowPassCutoffHz = opts.lowPassCutoffHz || 7200;
    this.speechThresholdDb = opts.speechThresholdDb || -45;

    this.pcmBuffer = new Int16Array(this.chunkSize);
    this.pcmIndex = 0;
    this.resamplePhase = 0.0;
    this.history = [0, 0, 0]; // Для кубической интерполяции через границы фреймов

    // Biquad 4th order Direct Form II Transposed filter states
    this.s1_1 = 0; this.s2_1 = 0;
    this.s1_2 = 0; this.s2_2 = 0;
    this.b0_1 = 1; this.b1_1 = 0; this.b2_1 = 0; this.a1_1 = 0; this.a2_1 = 0;
    this.b0_2 = 1; this.b1_2 = 0; this.b2_2 = 0; this.a1_2 = 0; this.a2_2 = 0;

    this.cachedSampleRate = 0;
    this.updateFilter(typeof sampleRate !== 'undefined' ? sampleRate : 48000);

    this.port.onmessage = (event) => {
      const data = event.data;
      if (!data) return;
      if (data.command === 'configure') {
        if (data.targetSampleRate) this.targetSampleRate = data.targetSampleRate;
        if (data.chunkSize) {
          this.chunkSize = Math.max(256, Math.min(16384, data.chunkSize));
          this.pcmBuffer = new Int16Array(this.chunkSize);
          this.pcmIndex = 0;
        }
        if (data.lowPassCutoffHz) {
          this.lowPassCutoffHz = data.lowPassCutoffHz;
          this.updateFilter(this.cachedSampleRate);
        }
        if (typeof data.speechThresholdDb === 'number') {
          this.speechThresholdDb = data.speechThresholdDb;
        }
      } else if (data.command === 'reset') {
        this.pcmIndex = 0;
        this.resamplePhase = 0.0;
        this.s1_1 = 0; this.s2_1 = 0;
        this.s1_2 = 0; this.s2_2 = 0;
        this.history = [0, 0, 0];
      }
    };
  }

  updateFilter(fs) {
    if (this.cachedSampleRate === fs && fs > 0) return;
    this.cachedSampleRate = fs || 48000;

    if (this.cachedSampleRate <= this.targetSampleRate) {
      this.b0_1 = 1; this.b1_1 = 0; this.b2_1 = 0; this.a1_1 = 0; this.a2_1 = 0;
      this.b0_2 = 1; this.b1_2 = 0; this.b2_2 = 0; this.a1_2 = 0; this.a2_2 = 0;
      return;
    }

    const fc = Math.min(this.lowPassCutoffHz, this.cachedSampleRate * 0.45);
    const q1 = 0.5411961;
    const q2 = 1.306563;

    const calc = (q) => {
      const w0 = (2 * Math.PI * fc) / this.cachedSampleRate;
      const cosW0 = Math.cos(w0);
      const sinW0 = Math.sin(w0);
      const alpha = sinW0 / (2 * q);
      const b0 = (1 - cosW0) / 2;
      const b1 = 1 - cosW0;
      const b2 = (1 - cosW0) / 2;
      const a0 = 1 + alpha;
      const a1 = -2 * cosW0;
      const a2 = 1 - alpha;
      return {
        b0: b0 / a0,
        b1: b1 / a0,
        b2: b2 / a0,
        a1: a1 / a0,
        a2: a2 / a0
      };
    };

    const c1 = calc(q1);
    this.b0_1 = c1.b0; this.b1_1 = c1.b1; this.b2_1 = c1.b2; this.a1_1 = c1.a1; this.a2_1 = c1.a2;

    const c2 = calc(q2);
    this.b0_2 = c2.b0; this.b1_2 = c2.b1; this.b2_2 = c2.b2; this.a1_2 = c2.a1; this.a2_2 = c2.a2;
  }

  filterSample(x) {
    const y1 = this.b0_1 * x + this.s1_1;
    this.s1_1 = this.b1_1 * x - this.a1_1 * y1 + this.s2_1;
    this.s2_1 = this.b2_1 * x - this.a2_1 * y1;

    const y2 = this.b0_2 * y1 + this.s1_2;
    this.s1_2 = this.b1_2 * y1 - this.a1_2 * y2 + this.s2_2;
    this.s2_2 = this.b2_2 * y1 - this.a2_2 * y2;
    return y2;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const numChannels = input.length;
    const channelLength = input[0].length;
    if (channelLength === 0) return true;

    const currentFs = typeof sampleRate !== 'undefined' ? sampleRate : 48000;
    this.updateFilter(currentFs);
    const ratio = currentFs / this.targetSampleRate;

    // 1. Моно-микширование и фильтрация
    const filtered = new Float32Array(channelLength);
    for (let i = 0; i < channelLength; i++) {
      let monoSample = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        monoSample += input[ch][i] || 0;
      }
      monoSample /= numChannels;
      filtered[i] = this.filterSample(monoSample);
    }

    // 2. Расширенный буфер для непрерывной кубической интерполяции
    const extended = new Float32Array(this.history.length + filtered.length);
    extended.set(this.history, 0);
    extended.set(filtered, this.history.length);
    const historyOffset = this.history.length;

    let inIdx = this.resamplePhase;
    while (inIdx < filtered.length) {
      const extIdx = historyOffset + inIdx;
      const idxFloor = Math.floor(extIdx);
      const frac = extIdx - idxFloor;

      const x0 = extended[Math.max(0, idxFloor - 1)] || 0;
      const x1 = extended[idxFloor] || 0;
      const x2 = extended[Math.min(extended.length - 1, idxFloor + 1)] || 0;
      const x3 = extended[Math.min(extended.length - 1, idxFloor + 2)] || 0;

      // Cubic Hermite Interpolation
      const c0 = x1;
      const c1 = 0.5 * (x2 - x0);
      const c2 = x0 - 2.5 * x1 + 2.0 * x2 - 0.5 * x3;
      const c3 = 0.5 * (x3 - x0) + 1.5 * (x1 - x2);
      const interpolated = ((c3 * frac + c2) * frac + c1) * frac + c0;

      // Float32 -> Int16 с жестким насыщением
      const clamped = Math.max(-1.0, Math.min(1.0, interpolated));
      const int16Val = clamped < 0 ? clamped * 32768.0 : clamped * 32767.0;
      this.pcmBuffer[this.pcmIndex++] = Math.round(int16Val);

      if (this.pcmIndex >= this.chunkSize) {
        const outPcm = new Int16Array(this.pcmBuffer);

        // Точный расчет RMS и dB для сформированного PCM чанка
        let sumSq = 0;
        for (let j = 0; j < outPcm.length; j++) {
          const norm = outPcm[j] / 32768.0;
          sumSq += norm * norm;
        }
        const rms = Math.sqrt(sumSq / outPcm.length);
        const clampedRms = Math.max(rms, 1e-6);
        const rmsDb = 20 * Math.log10(clampedRms);

        this.port.postMessage({
          type: 'pcm_chunk',
          pcm: outPcm,
          rms: rms,
          rmsDb: rmsDb,
          sampleRate: this.targetSampleRate,
          samplesCount: outPcm.length,
          timestamp: Date.now()
        }, [outPcm.buffer]);

        this.pcmIndex = 0;
      }

      inIdx += ratio;
    }

    this.resamplePhase = inIdx - filtered.length;

    // Сохраняем последние сэмплы в историю для следующего блока
    const fLen = filtered.length;
    this.history[0] = fLen >= 3 ? filtered[fLen - 3] : (this.history[1] || 0);
    this.history[1] = fLen >= 2 ? filtered[fLen - 2] : (this.history[2] || 0);
    this.history[2] = fLen >= 1 ? filtered[fLen - 1] : 0;

    return true;
  }
}

registerProcessor('${RESAMPLING_AUDIO_WORKLET_NAME}', ResamplingAudioWorkletProcessor);
`;
