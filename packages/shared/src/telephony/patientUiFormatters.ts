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

export function generateWaveformBars(_seed: string | null | undefined, count = 48): number[] {
	const barCount = Math.max(1, count);
	return new Array(barCount).fill(0.5);
}
