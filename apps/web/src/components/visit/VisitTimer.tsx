import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

export function VisitTimer({ createdAt }: { createdAt?: string | null }) {
	const initialElapsed = (() => {
		if (!createdAt || typeof createdAt !== "string") return "";
		const start = new Date(createdAt).getTime();
		if (!Number.isFinite(start) || Number.isNaN(start)) return "";
		const now = Date.now();
		const diffMs = Math.max(0, now - start);
		if (!Number.isFinite(diffMs) || Number.isNaN(diffMs)) return "00:00";
		const hours = Math.floor(diffMs / (1000 * 60 * 60));
		const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
		const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
		const p = (n: number) => (Number.isFinite(n) ? n.toString().padStart(2, "0") : "00");
		return hours > 0 ? `${hours}:${p(mins)}:${p(secs)}` : `${p(mins)}:${p(secs)}`;
	})();

	const [elapsed, setElapsed] = useState(initialElapsed);

	useEffect(() => {
		if (!createdAt || typeof createdAt !== "string") {
			setElapsed("");
			return;
		}
		const start = new Date(createdAt).getTime();
		if (!Number.isFinite(start) || Number.isNaN(start)) {
			setElapsed("");
			return;
		}

		const updateTimer = () => {
			const now = Date.now();
			const diffMs = Math.max(0, now - start);
			if (!Number.isFinite(diffMs) || Number.isNaN(diffMs)) {
				setElapsed("00:00");
				return;
			}

			const hours = Math.floor(diffMs / (1000 * 60 * 60));
			const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
			const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

			const p = (n: number) => (Number.isFinite(n) ? n.toString().padStart(2, "0") : "00");

			if (hours > 0) {
				setElapsed(`${hours}:${p(mins)}:${p(secs)}`);
			} else {
				setElapsed(`${p(mins)}:${p(secs)}`);
			}
		};

		updateTimer();
		const interval = setInterval(updateTimer, 1000);
		return () => clearInterval(interval);
	}, [createdAt]);

	if (!createdAt || !elapsed) return null;

	return (
		<div
			role="timer"
			className="visit-timer whitespace-nowrap tabular-nums shrink-0"
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: "6px",
				color: "var(--muted)",
				fontSize: "14px",
				fontWeight: 500,
				whiteSpace: "nowrap",
				fontVariantNumeric: "tabular-nums",
				flexShrink: 0,
			}}
			aria-label="Время приёма"
		>
			<Clock size={16} className="shrink-0" />
			<span className="whitespace-nowrap tabular-nums shrink-0">{elapsed}</span>
		</div>
	);
}
