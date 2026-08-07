import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

export function VisitTimer({ createdAt }: { createdAt?: string | null }) {
	const [elapsed, setElapsed] = useState("");

	useEffect(() => {
		if (!createdAt) {
			setElapsed("");
			return;
		}
		const start = new Date(createdAt).getTime();

		const updateTimer = () => {
			const now = Date.now();
			const diffMs = Math.max(0, now - start);

			const hours = Math.floor(diffMs / (1000 * 60 * 60));
			const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
			const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

			const p = (n: number) => n.toString().padStart(2, "0");

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

	if (!createdAt) return null;

	return (
		<div
			role="timer"
			className="visit-timer"
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: "6px",
				color: "var(--muted)",
				fontSize: "14px",
				fontWeight: 500,
			}}
			aria-label="Время приёма"
		>
			<Clock size={16} />
			<span>{elapsed}</span>
		</div>
	);
}
