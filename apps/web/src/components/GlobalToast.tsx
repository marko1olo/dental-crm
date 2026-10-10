import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	Info,
	Undo2,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastAction {
	label: string;
	onAction: () => void;
	ariaLabel?: string;
}

export interface ToastEventDetail {
	type: ToastType;
	text: string;
	duration?: number;
	action?: ToastAction;
}

// Global utility function to trigger a toast
export function showToast(
	text: string,
	type: ToastType = "info",
	duration: number = 4000,
	action?: ToastAction,
) {
	if (
		typeof window !== "undefined" &&
		typeof window.dispatchEvent === "function"
	) {
		const event = new CustomEvent<ToastEventDetail>("dente-toast", {
			detail: { text, type, duration, action },
		});
		window.dispatchEvent(event);
	}
}

/**
 * showRollbackToast: Запуск неблокирующего тоста с возможностью мгновенного отката (Gmail/Apple Undo Stack).
 * Заменяет блокирующие модалки «Вы уверены?» и window.confirm.
 */
export function showRollbackToast(
	text: string,
	onUndo: () => void,
	duration: number = 5000,
	actionLabel: string = "Отменить",
) {
	showToast(text, "info", duration, {
		label: actionLabel,
		onAction: onUndo,
	});
}

export function GlobalToast() {
	const [toast, setToast] = useState<ToastEventDetail | null>(null);
	const [remainingSeconds, setRemainingSeconds] = useState<number>(5);
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
		let dismissTimer: NodeJS.Timeout;
		let countdownInterval: NodeJS.Timeout;

		const handleToast = (e: Event) => {
			const customEvent = e as CustomEvent<ToastEventDetail>;
			const detail = customEvent.detail;
			setToast(detail);

			clearTimeout(dismissTimer);
			clearInterval(countdownInterval);

			const duration = detail.duration || (detail.action ? 5000 : 4000);
			const initialSec = Math.max(1, Math.ceil(duration / 1000));
			setRemainingSeconds(initialSec);

			if (detail.action) {
				let currentSec = initialSec;
				countdownInterval = setInterval(() => {
					currentSec -= 1;
					if (currentSec <= 0) {
						clearInterval(countdownInterval);
					}
					setRemainingSeconds(Math.max(0, currentSec));
				}, 1000);
			}

			dismissTimer = setTimeout(() => {
				setToast(null);
			}, duration);
		};

		window.addEventListener("dente-toast", handleToast);
		return () => {
			window.removeEventListener("dente-toast", handleToast);
			clearTimeout(dismissTimer);
			clearInterval(countdownInterval);
		};
	}, []);

	if (!toast) return null;

	const toastZIndex = 99999;

	const handleUndoClick = () => {
		if (toast.action) {
			const actionToExecute = toast.action.onAction;
			setToast(null);
			actionToExecute();
		}
	};

	// Clean theme-token styles without heavy animation libraries (optimized for low-end Celeron/Core i3)
	return (
		<div
			className={`sa-toast sa-toast--${toast.type} ${isModalOpen ? "sa-toast--modal-active" : ""} fixed sm:bottom-[88px] sm:right-6 sm:top-auto max-sm:top-[max(10px,env(safe-area-inset-top,10px))] max-sm:bottom-auto max-sm:inset-x-3 flex items-center gap-2.5 px-3.5 py-2.5 max-w-md max-h-24 sm:max-h-32 text-xs sm:text-sm overflow-hidden text-ellipsis shadow-lg rounded-xl transition-all select-none border font-medium pointer-events-auto`}
			data-testid="global-toast"
			role="status"
			aria-live="polite"
			style={{
				zIndex: toastZIndex,
				display: "flex",
				alignItems: "center",
				gap: "10px",
				padding: "8px 14px",
				maxHeight: "6rem",
				maxWidth: "30rem",
				backgroundColor: "var(--paper-strong, #18181b)",
				color: "var(--ink, #f8fafc)",
				borderRadius: "12px",
				boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
				pointerEvents: "auto",
				overflow: "hidden",
				border:
					toast.type === "error"
						? "1px solid rgba(244,63,94,0.6)"
						: toast.type === "warning"
							? "1px solid rgba(245,158,11,0.6)"
							: "1px solid var(--line, rgba(255,255,255,0.18))",
			}}
		>
			{toast.type === "error" && (
				<AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
			)}
			{toast.type === "warning" && (
				<AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
			)}
			{toast.type === "success" && (
				<CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
			)}
			{toast.type === "info" && (
				<Info className="w-4 h-4 text-cyan-400 shrink-0" />
			)}

			<span
				className="font-medium min-w-0 flex-1 overflow-hidden text-ellipsis line-clamp-2 sm:line-clamp-3 text-xs sm:text-sm"
				style={{ color: "var(--ink, #f8fafc)" }}
			>
				{toast.text}
			</span>

			{/* Action / Undo Rollback Button (Gmail / Apple Style) */}
			{toast.action && (
				<button
					type="button"
					onClick={handleUndoClick}
					className="toast-rollback-btn inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 dark:text-teal-200 border border-teal-500/40 transition-colors shrink-0 cursor-pointer select-none active:scale-95"
					style={{
						minHeight: "32px",
					}}
					data-testid="toast-undo-button"
					aria-label={
						toast.action.ariaLabel ||
						`Отменить действие (${remainingSeconds} сек)`
					}
				>
					<Undo2 size={13} className="shrink-0 text-teal-400" />
					<span>
						{toast.action.label} ({remainingSeconds}с)
					</span>
				</button>
			)}

			<button
				type="button"
				onClick={() => setToast(null)}
				style={{
					background: "transparent",
					border: "none",
					color: "var(--muted, #94a3b8)",
					cursor: "pointer",
					marginLeft: toast.action ? "2px" : "auto",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "0 4px",
					flexShrink: 0,
					minHeight: "28px",
					minWidth: "28px",
				}}
				data-testid="toast-close-button"
				aria-label="Закрыть"
			>
				<X
					size={16}
					className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors shrink-0"
				/>
			</button>
		</div>
	);
}
