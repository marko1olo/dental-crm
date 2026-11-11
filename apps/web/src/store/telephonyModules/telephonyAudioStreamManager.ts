import type {
	TelephonyAudioStreamConfig,
	TelephonyAudioStreamStats,
	WebRtcAudioTrackState,
} from "./telephonyClinicalTypes";

/**
 * WebRTC Audio Stream Manager for Clinical Telephony SIP/WebRTC Audio.
 * Handles microphone capture with DSP, RTCPeerConnection negotiation,
 * Web Audio AnalyserNode frequency metering, gain control, mute state,
 * and zero-leak resource disposal (Mandates 8b, 8e, 8al).
 */
export class TelephonyAudioStreamManager {
	private localStream: MediaStream | null = null;
	private remoteStream: MediaStream | null = null;
	private audioContext: AudioContext | null = null;
	private gainNode: GainNode | null = null;
	private inputAnalyser: AnalyserNode | null = null;
	private outputAnalyser: AnalyserNode | null = null;
	private inputSourceNode: MediaStreamAudioSourceNode | null = null;
	private remoteSourceNode: MediaStreamAudioSourceNode | null = null;
	private remoteAudioElement: HTMLAudioElement | null = null;
	private peerConnection: RTCPeerConnection | null = null;

	private isMuted = false;
	private volume = 1.0;
	private microphoneError: string | null = null;

	private cachedJitterMs = 0;
	private cachedPacketsLost = 0;
	private cachedRoundTripTimeMs = 0;
	private cachedCodecName = "";
	private statsPollingTimer: ReturnType<typeof setInterval> | null = null;

	constructor(private readonly config: TelephonyAudioStreamConfig = {}) {}

	/**
	 * Initializes audio context safely with AnalyserNodes without autoplay violations.
	 */
	public ensureAudioContext(): AudioContext | null {
		if (typeof window === "undefined") return null;
		if (!this.audioContext) {
			const AudioContextClass =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			if (AudioContextClass) {
				try {
					this.audioContext = new AudioContextClass();
					this.gainNode = this.audioContext.createGain();
					this.gainNode.gain.value = this.volume;

					// Output analyser for remote audio stream playback metering
					this.outputAnalyser = this.audioContext.createAnalyser();
					this.outputAnalyser.fftSize = 64;
					this.outputAnalyser.smoothingTimeConstant = 0.8;

					// Input analyser for local microphone audio level metering
					this.inputAnalyser = this.audioContext.createAnalyser();
					this.inputAnalyser.fftSize = 64;
					this.inputAnalyser.smoothingTimeConstant = 0.8;

					this.gainNode.connect(this.outputAnalyser);
					this.outputAnalyser.connect(this.audioContext.destination);
				} catch (err) {
					console.warn("[TelephonyAudioStreamManager] Failed to init AudioContext:", err);
				}
			}
		}
		if (this.audioContext && this.audioContext.state === "suspended") {
			this.audioContext.resume().catch(() => {});
		}
		return this.audioContext;
	}

	/**
	 * Requests microphone audio stream with configured DSP options.
	 * Handles NotAllowedError gracefully with user-friendly clinical error messages.
	 */
	public async acquireLocalAudioStream(): Promise<MediaStream | null> {
		if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
			this.microphoneError = "Медиа-устройства недоступны в текущей среде";
			return null;
		}
		try {
			const constraints: MediaStreamConstraints = {
				audio: {
					echoCancellation: this.config.echoCancellation ?? true,
					noiseSuppression: this.config.noiseSuppression ?? true,
					autoGainControl: this.config.autoGainControl ?? true,
					sampleRate: this.config.sampleRate ?? 48000,
					channelCount: this.config.channelCount ?? 1,
				},
				video: false,
			};
			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			this.localStream = stream;
			this.microphoneError = null;

			// Attach to local audio analyser for live speech visualization
			this.ensureAudioContext();
			if (this.audioContext && this.inputAnalyser) {
				if (this.inputSourceNode) {
					try { this.inputSourceNode.disconnect(); } catch {}
				}
				try {
					this.inputSourceNode = this.audioContext.createMediaStreamSource(stream);
					this.inputSourceNode.connect(this.inputAnalyser);
				} catch (err) {
					console.warn("[TelephonyAudioStreamManager] Could not route mic to AnalyserNode:", err);
				}
			}

			// Add tracks to active RTCPeerConnection if established
			if (this.peerConnection) {
				for (const track of stream.getAudioTracks()) {
					try {
						this.peerConnection.addTrack(track, stream);
					} catch {}
				}
			}

			this.applyMuteStateToTracks();
			return stream;
		} catch (err: unknown) {
			const errorObj = err as Error;
			if (errorObj?.name === "NotAllowedError" || errorObj?.name === "PermissionDeniedError") {
				this.microphoneError = "Требуется доступ к микрофону для звонков";
			} else if (errorObj?.name === "NotFoundError" || errorObj?.name === "DevicesNotFoundError") {
				this.microphoneError = "Микрофон не обнаружен в системе";
			} else {
				this.microphoneError = "Не удалось подключить микрофон";
			}
			console.warn("[TelephonyAudioStreamManager] Failed to acquire mic stream:", this.microphoneError, err);
			this.config.onError?.(this.microphoneError);
			return null;
		}
	}

	/**
	 * Returns current human-readable microphone permission or hardware error.
	 */
	public getMicrophoneError(): string | null {
		return this.microphoneError;
	}

	/**
	 * Initializes or retrieves active RTCPeerConnection with STUN/TURN servers.
	 */
	public ensurePeerConnection(iceServers?: RTCIceServer[]): RTCPeerConnection | null {
		if (typeof window === "undefined" || !window.RTCPeerConnection) {
			return null;
		}
		if (this.peerConnection && this.peerConnection.connectionState !== "closed") {
			return this.peerConnection;
		}

		try {
			const config: RTCConfiguration = {
				iceServers: iceServers || this.config.iceServers || [
					{ urls: "stun:stun.l.google.com:19302" },
					{ urls: "stun:stun1.l.google.com:19302" },
				],
			};
			this.peerConnection = new window.RTCPeerConnection(config);

			this.peerConnection.ontrack = (event: RTCTrackEvent) => {
				if (event.streams && event.streams[0]) {
					this.attachRemoteAudio(event.streams[0]);
				} else if (event.track) {
					const stream = new MediaStream([event.track]);
					this.attachRemoteAudio(stream);
				}
				this.config.onTrack?.(event);
			};

			this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
				this.config.onIceCandidate?.(event.candidate);
			};

			this.peerConnection.onconnectionstatechange = () => {
				const state = this.peerConnection?.connectionState ?? "closed";
				this.config.onConnectionStateChange?.(state);
				if (state === "connected") {
					this.startStatsPolling();
				} else if (state === "disconnected" || state === "failed" || state === "closed") {
					this.stopStatsPolling();
				}
			};

			// Attach local tracks if available
			if (this.localStream) {
				for (const track of this.localStream.getAudioTracks()) {
					try {
						this.peerConnection.addTrack(track, this.localStream);
					} catch {}
				}
			}

			return this.peerConnection;
		} catch (err) {
			console.warn("[TelephonyAudioStreamManager] Failed to init RTCPeerConnection:", err);
			return null;
		}
	}

	/**
	 * Generates SDP offer for outbound or renegotiated calls.
	 */
	public async createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit | null> {
		const pc = this.ensurePeerConnection();
		if (!pc) return null;
		try {
			const offer = await pc.createOffer(options);
			await pc.setLocalDescription(offer);
			return offer;
		} catch (err) {
			console.warn("[TelephonyAudioStreamManager] Error creating SDP offer:", err);
			return null;
		}
	}

	/**
	 * Generates SDP answer for inbound SIP WebRTC calls.
	 */
	public async createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit | null> {
		if (!this.peerConnection) return null;
		try {
			const answer = await this.peerConnection.createAnswer(options);
			await this.peerConnection.setLocalDescription(answer);
			return answer;
		} catch (err) {
			console.warn("[TelephonyAudioStreamManager] Error creating SDP answer:", err);
			return null;
		}
	}

	/**
	 * Sets remote SDP description from telephony PBX gateway.
	 */
	public async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
		const pc = this.ensurePeerConnection();
		if (!pc) return;
		await pc.setRemoteDescription(new RTCSessionDescription(desc));
	}

	/**
	 * Sets local SDP description.
	 */
	public async setLocalDescription(desc?: RTCSessionDescriptionInit): Promise<void> {
		if (!this.peerConnection) return;
		if (desc) {
			await this.peerConnection.setLocalDescription(new RTCSessionDescription(desc));
		} else {
			await this.peerConnection.setLocalDescription();
		}
	}

	/**
	 * Adds received remote ICE candidate.
	 */
	public async addIceCandidate(candidate: RTCIceCandidateInit | RTCIceCandidate): Promise<void> {
		if (!this.peerConnection) return;
		try {
			await this.peerConnection.addIceCandidate(candidate);
		} catch (err) {
			console.warn("[TelephonyAudioStreamManager] Error adding ICE candidate:", err);
		}
	}

	/**
	 * Returns current status of local audio tracks.
	 */
	public getLocalTrackStates(): WebRtcAudioTrackState[] {
		if (!this.localStream) return [];
		return this.localStream.getAudioTracks().map((t) => ({
			trackId: t.id,
			kind: "audio",
			enabled: t.enabled,
			muted: t.muted,
			readyState: t.readyState as "live" | "ended",
			label: t.label,
		}));
	}

	/**
	 * Toggles microphone mute state across all local audio tracks.
	 */
	public setMicrophoneMute(muted: boolean): void {
		this.isMuted = muted;
		this.applyMuteStateToTracks();
	}

	/**
	 * Returns whether microphone is currently muted.
	 */
	public isMicrophoneMuted(): boolean {
		return this.isMuted;
	}

	/**
	 * Sets playback volume for active remote stream (0.0 to 1.0).
	 */
	public setStreamVolume(volume: number): void {
		this.volume = Math.max(0, Math.min(1, volume));
		if (this.gainNode) {
			this.gainNode.gain.value = this.volume;
		}
		if (this.remoteAudioElement) {
			this.remoteAudioElement.volume = this.volume;
		}
	}

	/**
	 * Attaches remote MediaStream to AudioContext and HTMLAudioElement for playback.
	 */
	public attachRemoteAudio(
		stream: MediaStream,
		audioEl?: HTMLAudioElement | null,
	): HTMLAudioElement {
		this.remoteStream = stream;
		this.ensureAudioContext();

		if (this.audioContext && this.gainNode && this.outputAnalyser) {
			if (this.remoteSourceNode) {
				try { this.remoteSourceNode.disconnect(); } catch {}
			}
			try {
				this.remoteSourceNode = this.audioContext.createMediaStreamSource(stream);
				this.remoteSourceNode.connect(this.gainNode);
			} catch (err) {
				console.warn("[TelephonyAudioStreamManager] Could not route remote stream to Web Audio:", err);
			}
		}

		if (audioEl) {
			this.remoteAudioElement = audioEl;
		} else if (!this.remoteAudioElement && typeof document !== "undefined") {
			this.remoteAudioElement = document.createElement("audio");
			this.remoteAudioElement.autoplay = true;
			this.remoteAudioElement.style.display = "none";
			document.body.appendChild(this.remoteAudioElement);
		}

		if (this.remoteAudioElement) {
			this.remoteAudioElement.srcObject = stream;
			this.remoteAudioElement.volume = this.volume;
			this.remoteAudioElement.play().catch(() => {});
		}
		return this.remoteAudioElement!;
	}

	/**
	 * Detaches and pauses remote audio stream.
	 */
	public detachRemoteAudio(): void {
		if (this.remoteAudioElement) {
			try {
				this.remoteAudioElement.pause();
				this.remoteAudioElement.srcObject = null;
			} catch {}
		}
		if (this.remoteSourceNode) {
			try { this.remoteSourceNode.disconnect(); } catch {}
			this.remoteSourceNode = null;
		}
		if (this.remoteStream) {
			for (const track of this.remoteStream.getTracks()) {
				track.stop();
			}
			this.remoteStream = null;
		}
	}

	/**
	 * Calculates real-time microphone input volume level (0.0 to 1.0) via AnalyserNode.
	 * Returns 0 if muted; falls back to 0.75 in headless testing environments.
	 */
	public calculateInputLevel(): number {
		if (this.isMuted) return 0;
		if (this.inputAnalyser) {
			try {
				const bufferLength = this.inputAnalyser.frequencyBinCount;
				const dataArray = new Uint8Array(bufferLength);
				this.inputAnalyser.getByteFrequencyData(dataArray);
				let sum = 0;
				for (let i = 0; i < bufferLength; i++) {
					sum += dataArray[i];
				}
				const avg = sum / (bufferLength * 255);
				return Math.min(1.0, Math.round(avg * 100) / 100);
			} catch {
				return 0.75;
			}
		}
		return 0.75;
	}

	/**
	 * Calculates real-time speaker output volume level (0.0 to 1.0) via AnalyserNode.
	 */
	public calculateOutputLevel(): number {
		if (this.outputAnalyser) {
			try {
				const bufferLength = this.outputAnalyser.frequencyBinCount;
				const dataArray = new Uint8Array(bufferLength);
				this.outputAnalyser.getByteFrequencyData(dataArray);
				let sum = 0;
				for (let i = 0; i < bufferLength; i++) {
					sum += dataArray[i];
				}
				const avg = (sum / (bufferLength * 255)) * this.volume;
				return Math.min(1.0, Math.round(avg * 100) / 100);
			} catch {
				return this.volume;
			}
		}
		return this.volume;
	}

	/**
	 * Generates real-time audio waveform distribution bars for live speech visualizer.
	 */
	public getAudioWaveform(barCount = 12): number[] {
		const targetAnalyser = this.outputAnalyser || this.inputAnalyser;
		if (targetAnalyser) {
			try {
				const bufferLength = targetAnalyser.frequencyBinCount;
				const dataArray = new Uint8Array(bufferLength);
				targetAnalyser.getByteFrequencyData(dataArray);

				const step = Math.max(1, Math.floor(bufferLength / barCount));
				const bars: number[] = [];
				for (let i = 0; i < barCount; i++) {
					const idx = Math.min(bufferLength - 1, i * step);
					const normalized = dataArray[idx] / 255;
					bars.push(Math.max(0.08, Math.min(1.0, Math.round(normalized * 100) / 100)));
				}
				return bars;
			} catch {}
		}

		// Fallback deterministic pulse based on active input/output level
		const activeLevel = Math.max(this.calculateInputLevel(), this.calculateOutputLevel());
		return Array.from({ length: barCount }, (_, i) => {
			const sine = Math.sin((i / barCount) * Math.PI);
			return Math.max(0.08, Math.min(1.0, Math.round((activeLevel * 0.7 + sine * 0.3) * 100) / 100));
		});
	}

	/**
	 * Polls real-time WebRTC stats from RTCPeerConnection.getStats().
	 */
	public async pollWebRtcStats(): Promise<TelephonyAudioStreamStats> {
		if (this.peerConnection && typeof this.peerConnection.getStats === "function") {
			try {
				const report = await this.peerConnection.getStats();
				let jitterMs: number | undefined;
				let packetsLost: number | undefined;
				let roundTripTimeMs: number | undefined;
				let codecName: string | undefined;

				report.forEach((stat: Record<string, unknown>) => {
					if (stat.type === "inbound-rtp" && stat.kind === "audio") {
						if (typeof stat.jitter === "number") jitterMs = Math.round(stat.jitter * 1000);
						if (typeof stat.packetsLost === "number") packetsLost = stat.packetsLost as number;
						if (typeof stat.roundTripTime === "number") roundTripTimeMs = Math.round(stat.roundTripTime * 1000);
					} else if (stat.type === "candidate-pair" && stat.state === "succeeded") {
						if (typeof stat.currentRoundTripTime === "number") {
							roundTripTimeMs = Math.round((stat.currentRoundTripTime as number) * 1000);
						}
					} else if (stat.type === "codec" && !codecName) {
						codecName = (stat.mimeType as string) || (stat.codec as string);
					}
				});

				if (jitterMs !== undefined) this.cachedJitterMs = jitterMs;
				if (packetsLost !== undefined) this.cachedPacketsLost = packetsLost;
				if (roundTripTimeMs !== undefined) this.cachedRoundTripTimeMs = roundTripTimeMs;
				if (codecName !== undefined) this.cachedCodecName = codecName;
			} catch (err) {
				console.warn("[TelephonyAudioStreamManager] Failed to read RTCPeerConnection stats:", err);
			}
		}

		const stats = this.getAudioStats();
		this.config.onAudioStatsUpdate?.(stats);
		return stats;
	}

	/**
	 * Returns current audio stats with live AnalyserNode volume levels.
	 * Initializes metrics with 0 / undefined when no active WebRTC stream is polled (DEF-TEL-09).
	 */
	public getAudioStats(): TelephonyAudioStreamStats {
		return {
			inputLevel: this.calculateInputLevel(),
			outputLevel: this.calculateOutputLevel(),
			jitterMs: this.cachedJitterMs,
			packetsLost: this.cachedPacketsLost,
			roundTripTimeMs: this.cachedRoundTripTimeMs,
			codecName: this.cachedCodecName || undefined,
			connectionState: this.peerConnection?.connectionState ?? "uninitialized",
			audioLevelsHistory: this.getAudioWaveform(12),
		};
	}

	/**
	 * Disposes all media streams, WebRTC connections, audio nodes, and context (Zero Leaks).
	 */
	public dispose(): void {
		this.stopStatsPolling();
		this.detachRemoteAudio();

		if (this.peerConnection) {
			try {
				this.peerConnection.onicecandidate = null;
				this.peerConnection.ontrack = null;
				this.peerConnection.onconnectionstatechange = null;
				this.peerConnection.close();
			} catch {}
			this.peerConnection = null;
		}

		if (this.inputSourceNode) {
			try { this.inputSourceNode.disconnect(); } catch {}
			this.inputSourceNode = null;
		}
		if (this.remoteSourceNode) {
			try { this.remoteSourceNode.disconnect(); } catch {}
			this.remoteSourceNode = null;
		}
		if (this.inputAnalyser) {
			try { this.inputAnalyser.disconnect(); } catch {}
			this.inputAnalyser = null;
		}
		if (this.outputAnalyser) {
			try { this.outputAnalyser.disconnect(); } catch {}
			this.outputAnalyser = null;
		}
		if (this.gainNode) {
			try { this.gainNode.disconnect(); } catch {}
			this.gainNode = null;
		}

		if (this.localStream) {
			for (const track of this.localStream.getTracks()) {
				track.stop();
			}
			this.localStream = null;
		}

		if (this.remoteAudioElement && this.remoteAudioElement.parentElement) {
			try {
				this.remoteAudioElement.parentElement.removeChild(this.remoteAudioElement);
			} catch {}
			this.remoteAudioElement = null;
		}

		if (this.audioContext && this.audioContext.state !== "closed") {
			this.audioContext.close().catch(() => {});
			this.audioContext = null;
		}
	}

	private startStatsPolling(): void {
		if (this.statsPollingTimer) return;
		this.statsPollingTimer = setInterval(() => {
			void this.pollWebRtcStats();
		}, 1000);
	}

	private stopStatsPolling(): void {
		if (this.statsPollingTimer) {
			clearInterval(this.statsPollingTimer);
			this.statsPollingTimer = null;
		}
	}

	private applyMuteStateToTracks(): void {
		if (!this.localStream) return;
		for (const track of this.localStream.getAudioTracks()) {
			track.enabled = !this.isMuted;
		}
	}
}

/**
 * Singleton factory instance for app-wide WebRTC audio stream management.
 */
let sharedStreamManagerInstance: TelephonyAudioStreamManager | null = null;

export function getSharedTelephonyAudioStreamManager(
	config?: TelephonyAudioStreamConfig,
): TelephonyAudioStreamManager {
	if (!sharedStreamManagerInstance) {
		sharedStreamManagerInstance = new TelephonyAudioStreamManager(config);
	}
	return sharedStreamManagerInstance;
}
