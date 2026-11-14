/**
 * Clinical UI Formatters (Patient Initials, Avatar Palette, Audio Timer & Waveform)
 */

export function formatPatientInitials(fullName: string | null | undefined): string {
	if (!fullName || !fullName.trim()) return "??";
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "??";
	if (parts.length === 1) {
		const single = parts[0] ?? "";
		return single.slice(0, 2).toUpperCase();
	}
	const first = parts[0] ?? "";
	const second = parts[1] ?? "";
	if (first[0] && second[0]) {
		return (first[0] + second[0]).toUpperCase();
	}
	return (first.slice(0, 2) || "??").toUpperCase();
}

export function getAvatarColor(name: string | null | undefined): {
	bg: string;
	text: string;
	border: string;
} {
	const palettes = [
		{ bg: "rgba(15, 118, 110, 0.15)", text: "#0f766e", border: "#14b8a6" },
		{ bg: "rgba(2, 132, 199, 0.15)", text: "#0284c7", border: "#38bdf8" },
		{ bg: "rgba(99, 102, 241, 0.15)", text: "#6366f1", border: "#818cf8" },
		{ bg: "rgba(168, 85, 247, 0.15)", text: "#a855f7", border: "#c084fc" },
		{ bg: "rgba(236, 72, 153, 0.15)", text: "#ec4899", border: "#f472b6" },
		{ bg: "rgba(245, 158, 11, 0.15)", text: "#d97706", border: "#fbbf24" },
		{ bg: "rgba(168, 85, 247, 0.15)", text: "#059669", border: "#34d399" },
	];

	if (!name) return palettes[0]!;
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = (hash << 5) - hash + name.charCodeAt(i);
		hash |= 0;
	}
	const index = Math.abs(hash) % palettes.length;
	return palettes[index] ?? palettes[0]!;
}

export function formatDurationTimer(totalSeconds: number): string {
	if (
		!Number.isFinite(totalSeconds) ||
		Number.isNaN(totalSeconds) ||
		totalSeconds < 0
	) {
		return "00:00";
	}
	const sec = Math.floor(totalSeconds);
	const hours = Math.floor(sec / 3600);
	const minutes = Math.floor((sec % 3600) / 60);
	const remainingSeconds = sec % 60;

	if (hours > 0) {
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
	}
	return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function generateWaveformBars(seed: string | null | undefined, count = 48): number[] {
	const barCount = Math.max(1, count);
	const rawSeed = typeof seed === "string" && seed.trim() ? seed.trim() : "dente-telephony-audio-call";

	let hash = 0;
	for (let i = 0; i < rawSeed.length; i++) {
		hash = (hash << 5) - hash + rawSeed.charCodeAt(i);
		hash |= 0;
	}
	const baseOffset = Math.abs(hash) % 1000;

	const bars: number[] = new Array(barCount);
	for (let i = 0; i < barCount; i++) {
		const t = barCount > 1 ? i / (barCount - 1) : 0.5;

		// Envelope: smooth bell-like curve with lively pauses and peaks
		const envelope = Math.sin(Math.PI * t);

		// 3 distinct frequency harmonics modulated by seed
		const h1 = Math.sin(t * Math.PI * 4 + baseOffset * 0.05);
		const h2 = Math.cos(t * Math.PI * 9 + baseOffset * 0.11);
		const h3 = Math.sin(t * Math.PI * 17 + baseOffset * 0.23);

		// Deterministic pseudo-random syllable jitter from index hash
		const stepHash = Math.sin((i + baseOffset) * 12.9898) * 43758.5453;
		const jitter = stepHash - Math.floor(stepHash); // 0..1

		// Combined wave amplitude: baseline voice presence + harmonic modulation + jitter
		const wave = 0.22 + 0.35 * Math.abs(h1 * 0.5 + h2 * 0.3 + h3 * 0.2) + 0.38 * jitter * envelope;

		// Strictly clamp to [0.15, 0.95]
		const clamped = Math.max(0.15, Math.min(0.95, wave));
		bars[i] = Math.round(clamped * 100) / 100;
	}
	return bars;
}
