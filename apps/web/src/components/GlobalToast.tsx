import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastEventDetail {
	type: ToastType;
	text: string;
	duration?: number;
}

// Global utility function to trigger a toast
export function showToast(
	text: string,
	type: ToastType = "info",
	duration: number = 4000,
) {
	if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
		const event = new CustomEvent<ToastEventDetail>("dente-toast", {
			detail: { text, type, duration },
		});
		window.dispatchEvent(event);
	}
}

export function GlobalToast() {
	const [toast, setToast] = useState<ToastEventDetail | null>(null);

	useEffect(() => {
		let timer: NodeJS.Timeout;

		const handleToast = (e: Event) => {
			const customEvent = e as CustomEvent<ToastEventDetail>;
			setToast(customEvent.detail);

			const duration = customEvent.detail.duration || 4000;
			clearTimeout(timer);
			timer = setTimeout(() => {
				setToast(null);
			}, duration);
		};

		window.addEventListener("dente-toast", handleToast);
		return () => {
			window.removeEventListener("dente-toast", handleToast);
			clearTimeout(timer);
		};
	}, []);

	if (!toast) return null;

	// Re-use sa-toast styles from ShadowAnalyst or define minimal inline/fallback
	return (
		<div
			className={`sa-toast sa-toast--${toast.type}`}
			data-testid="global-toast"
			style={{
				position: "fixed",
				display: "flex",
				alignItems: "center",
				gap: "8px",
				padding: "12px 16px",
				background: "var(--surface-sunken, #0f172a)",
				color: "var(--paper, #ffffff)",
				borderRadius: "8px",
				boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
				border: "1px solid rgba(255,255,255,0.1)",
			}}
		>
			{toast.type === "error" && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
			{toast.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
			{toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
			{toast.type === "info" && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
			<span>{toast.text}</span>
			<button
				type="button"
				onClick={() => setToast(null)}
				style={{
					background: "transparent",
					border: "none",
					color: "var(--paper, #ffffff)",
					cursor: "pointer",
					marginLeft: "auto",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "0 4px",
				}}
				aria-label="Закрыть"
			>
				<X size={16} />
			</button>
		</div>
	);
}
