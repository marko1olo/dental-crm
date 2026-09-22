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
	const [isModalOpen, setIsModalOpen] = useState(false);

	useEffect(() => {
		const checkModal = () => {
			const hasDialog =
				typeof document !== "undefined" &&
				!!document.querySelector(
					'[role="dialog"], [aria-modal="true"], .payment-modal-backdrop, .payment-modal, .modal-backdrop',
				);
			setIsModalOpen(hasDialog);
		};
		checkModal();
		const observer = new MutationObserver(checkModal);
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["role", "aria-modal", "class"],
		});
		return () => observer.disconnect();
	}, []);

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

	const toastZIndex = 99999;

	// Re-use sa-toast styles from ShadowAnalyst with full theme tokens support
	return (
		<div
			className={`sa-toast sa-toast--${toast.type} ${isModalOpen ? "sa-toast--modal-active" : ""} fixed sm:bottom-6 sm:right-6 sm:top-auto max-sm:bottom-20 max-sm:top-auto max-sm:inset-x-4 flex items-center gap-2 px-4 py-3 max-w-[420px] max-sm:max-w-[calc(100vw-2rem)] rounded-xl shadow-2xl transition-all select-none border font-medium text-xs sm:text-sm bg-neutral-900 text-slate-100 dark:bg-neutral-900 dark:text-slate-100 pointer-events-auto ${toast.type === "error" ? "border-rose-500/60 dark:border-rose-500/50" : toast.type === "warning" ? "border-amber-500/60 dark:border-amber-500/50" : "border-neutral-700 dark:border-neutral-700"}`}
			data-testid="global-toast"
			style={{
				zIndex: toastZIndex,
				display: "flex",
				alignItems: "center",
				gap: "8px",
				padding: "12px 16px",
				backgroundColor: "#171717",
				color: "#f8fafc",
				borderRadius: "12px",
				boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
				pointerEvents: "auto",
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
			<span className="font-medium text-slate-100" style={{ color: "#f8fafc" }}>
				{toast.text}
			</span>
			<button
				type="button"
				onClick={() => setToast(null)}
				style={{
					background: "transparent",
					border: "none",
					color: "var(--muted, #94a3b8)",
					cursor: "pointer",
					marginLeft: "auto",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "0 4px",
				}}
				aria-label="Закрыть"
			>
				<X size={16} className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors" />
			</button>
		</div>
	);
}
