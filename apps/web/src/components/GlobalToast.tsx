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
			className={`sa-toast sa-toast--${toast.type} fixed top-16 right-6 z-[99999] flex items-center gap-2 px-4 py-3 max-w-[420px] rounded-lg shadow-2xl transition-all select-none border font-medium text-xs sm:text-sm bg-neutral-900 text-white border-neutral-700 dark:bg-neutral-900 dark:text-white ${toast.type === "error" ? "border-rose-500/60 dark:border-rose-500/50" : toast.type === "warning" ? "border-amber-500/60 dark:border-amber-500/50" : "border-neutral-700 dark:border-neutral-700"}`}
			data-testid="global-toast"
			style={{
				position: "fixed",
				top: "4rem",
				right: "1.5rem",
				bottom: "auto",
				left: "auto",
				zIndex: 99999,
				display: "flex",
				alignItems: "center",
				gap: "8px",
				padding: "12px 16px",
				maxWidth: "420px",
				backgroundColor: "#171717",
				color: "#ffffff",
				borderRadius: "8px",
				boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
				border:
					toast.type === "error"
						? "1px solid rgba(244,63,94,0.6)"
						: toast.type === "warning"
						? "1px solid rgba(245,158,11,0.6)"
						: "1px solid rgba(255,255,255,0.25)",
			}}
		>
			{toast.type === "error" && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
			{toast.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
			{toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
			{toast.type === "info" && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
			<span className="font-medium">{toast.text}</span>
			<button
				type="button"
				onClick={() => setToast(null)}
				style={{
					background: "transparent",
					border: "none",
					color: "#ffffff",
					cursor: "pointer",
					marginLeft: "auto",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "0 4px",
				}}
				aria-label="Закрыть"
			>
				<X size={16} className="text-neutral-300 hover:text-white transition-colors" />
			</button>
		</div>
	);
}
