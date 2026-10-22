/**
 * CPR 30:2 Metronome Audio Click Engine (Layer 2)
 * Synthesis for cardiac resuscitation compression rhythm (100–120 bpm / default 110 bpm).
 */

class CprMetronomeAudio {
	private audioCtx: AudioContext | null = null;

	private initContext(): AudioContext | null {
		if (typeof window === 'undefined') return null;
		if (!this.audioCtx) {
			const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			if (AudioContextClass) {
				this.audioCtx = new AudioContextClass();
			}
		}
		if (this.audioCtx && this.audioCtx.state === 'suspended') {
			void this.audioCtx.resume();
		}
		return this.audioCtx;
	}

	public playClick(isBreathBeep = false): void {
		try {
			const ctx = this.initContext();
			if (!ctx) return;

			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = isBreathBeep ? 'sine' : 'triangle';
			osc.frequency.setValueAtTime(isBreathBeep ? 880 : 520, ctx.currentTime);

			gain.gain.setValueAtTime(0.3, ctx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isBreathBeep ? 0.15 : 0.05));

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start();
			osc.stop(ctx.currentTime + (isBreathBeep ? 0.16 : 0.06));
		} catch {
			// AudioContext autoplay restrictions or mock environment safety
		}
	}
}

export const cprMetronomeAudio = new CprMetronomeAudio();
