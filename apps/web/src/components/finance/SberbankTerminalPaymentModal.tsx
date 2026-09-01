import { AlertCircle, Banknote, Coins, ExternalLink, QrCode, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { money } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

export type SberbankTerminalPaymentModalProps = {
	isOpen: boolean;
	patientId: string;
	amountInRubles: number;
	onClose: () => void;
	onSuccess: () => void;
	onSelectAlternativeMethod?: (method: "sbp" | "cash" | "deposit") => void;
};

const TERMINAL_POLL_TIMEOUT_SEC = 60;

export function SberbankTerminalPaymentModal({
	isOpen,
	patientId,
	amountInRubles,
	onClose,
	onSuccess,
	onSelectAlternativeMethod,
}: SberbankTerminalPaymentModalProps) {
	const [status, setStatus] = useState<
		"idle" | "initiating" | "polling" | "cancelling" | "success" | "error"
	>("idle");
	const [orderId, setOrderId] = useState<string | null>(null);
	const [formUrl, setFormUrl] = useState<string | null>(null);
	const [errorMsg, setErrorMsg] = useState("");
	const [secondsElapsed, setSecondsElapsed] = useState(0);
	const { auth } = useAppLogicContext();

	const inFlight = useRef(false);

	const handleCancelOrReconcile = useCallback(
		async (orderIdToCancel: string) => {
			setStatus("cancelling");
			try {
				const res = await fetch("/api/sberbank/cancel-or-reconcile", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(auth && typeof auth.denteClinicalReadHeaders === "function"
							? auth.denteClinicalReadHeaders()
							: {}),
					},
					body: JSON.stringify({ orderId: orderIdToCancel }),
				});
				if (!res.ok) {
					setStatus("error");
					setErrorMsg(
						"Время ожидания терминала истекло. Не удалось автоматически подтвердить отмену в банке. Обратитесь к администратору.",
					);
					return;
				}
				const data = (await res.json().catch(() => ({}))) as {
					success?: boolean;
					status?: string;
					message?: string;
				};
				if (data.status === "paid") {
					setStatus("success");
					showToast("Оплата была успешно принята банком", "success");
					setTimeout(() => {
						onSuccess();
						onClose();
					}, 1500);
					return;
				}
				setStatus("error");
				setErrorMsg(
					data.message ||
						"Время ожидания терминала истекло. Транзакция отменена в банке. Выберите альтернативный способ оплаты.",
				);
			} catch (err) {
				logger.error("Sberbank cancel error:", err);
				setStatus("error");
				setErrorMsg("Время ожидания истекло. Проверьте статус операции или повторите запрос.");
			}
		},
		[auth, onSuccess, onClose],
	);

	const initiatePayment = useCallback(async () => {
		if (
			!patientId ||
			typeof amountInRubles !== "number" ||
			Number.isNaN(amountInRubles)
		)
			return;
		if (inFlight.current) return;
		inFlight.current = true;
		setStatus("initiating");
		setErrorMsg("");
		setSecondsElapsed(0);
		try {
			const res = await fetch("/api/sberbank/pay", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(auth && typeof auth.denteClinicalReadHeaders === "function"
						? auth.denteClinicalReadHeaders()
						: {}),
				},
				body: JSON.stringify({
					amount: Math.round(
						(typeof amountInRubles === "number" && !Number.isNaN(amountInRubles)
							? amountInRubles
							: 0) * 100,
					),
					patientId,
					description: `Оплата по пациенту ${patientId}`,
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(
					data.message || data.error || "Не удалось запустить оплату на терминале Сбербанк",
				);
			}

			setOrderId(data.orderId);
			if (data.formUrl) {
				setFormUrl(data.formUrl);
			}
			setStatus("polling");
		} catch (err) {
			setStatus("error");
			setErrorMsg(
				err instanceof Error ? err.message : "Не удалось запустить терминал Сбербанка (Arcus2/TTK)",
			);
		} finally {
			inFlight.current = false;
		}
	}, [amountInRubles, patientId, auth]);

	useEffect(() => {
		if (isOpen && status === "idle") {
			initiatePayment();
		}
	}, [isOpen, status, initiatePayment]);

	useEffect(() => {
		if (!isOpen) {
			setStatus("idle");
			setOrderId(null);
			setFormUrl(null);
			setErrorMsg("");
			setSecondsElapsed(0);
		}
	}, [isOpen]);

	// Polling and timeout countdown with Double-Charge protection
	useEffect(() => {
		if (status !== "polling" || !orderId) return;

		let isCleanedUp = false;

		const timer = setInterval(() => {
			setSecondsElapsed((prev) => {
				if (prev >= TERMINAL_POLL_TIMEOUT_SEC) {
					clearInterval(timer);
					if (!isCleanedUp && orderId) {
						void handleCancelOrReconcile(orderId);
					}
					return prev;
				}
				return prev + 1;
			});
		}, 1000);

		const interval = setInterval(async () => {
			try {
				const res = await fetch(`/api/sberbank/status/${orderId}`, {
					headers:
						auth && typeof auth.denteClinicalReadHeaders === "function"
							? auth.denteClinicalReadHeaders()
							: {},
				});
				if (!res.ok) {
					return;
				}
				const data = (await res.json().catch(() => ({}))) as {
					success?: boolean;
					status?: string;
					errorDescription?: string;
					message?: string;
				};
				const normalizedStatus =
					typeof data.status === "string" ? data.status.toUpperCase() : "";
				const isSuccess =
					data.success === true ||
					normalizedStatus === "PAID" ||
					normalizedStatus === "CONFIRMED" ||
					normalizedStatus === "SUCCESS" ||
					normalizedStatus === "APPROVED";
				const isFailed =
					normalizedStatus === "FAILED" ||
					normalizedStatus === "DECLINED" ||
					normalizedStatus === "EXPIRED" ||
					normalizedStatus === "ERROR" ||
					normalizedStatus === "REJECTED";

				if (isSuccess) {
					setStatus("success");
					clearInterval(interval);
					clearInterval(timer);
					showToast("Оплата через терминал успешно принята", "success");
					setTimeout(() => {
						onSuccess();
						onClose();
					}, 1500);
				} else if (isFailed) {
					setStatus("error");
					setErrorMsg(
						data.errorDescription ||
							data.message ||
							"Оплата отклонена банком или истекло время ожидания.",
					);
					clearInterval(interval);
					clearInterval(timer);
				}
			} catch (err) {
				logger.error("Sberbank status poll error", err);
			}
		}, 3000);

		return () => {
			isCleanedUp = true;
			clearInterval(interval);
			clearInterval(timer);
		};
	}, [status, orderId, auth, onSuccess, onClose, handleCancelOrReconcile]);

	const handleClose = () => {
		if (status === "polling" && orderId) {
			if (
				!window.confirm(
					"Оплата еще не подтверждена. Отменить транзакцию на терминале Сбербанк и закрыть окно?",
				)
			) {
				return;
			}
			void handleCancelOrReconcile(orderId);
			return;
		}
		if (status === "cancelling") return;
		onClose();
	};


	const handleChooseAlternative = (method: "sbp" | "cash" | "deposit") => {
		if (onSelectAlternativeMethod) {
			onSelectAlternativeMethod(method);
		}
		onClose();
	};

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				handleClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, status]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="sber-terminal-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) handleClose();
			}}
		>
			<div
				className="w-full max-w-lg p-6 rounded-2xl shadow-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] space-y-4"
			>
				<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-3">
					<h2
						id="sber-terminal-modal-title"
						className="text-lg sm:text-xl font-bold m-0 text-[var(--ink,#0f172a)]"
					>
						Оплата через терминал Сбербанка
					</h2>
					<span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
						Arcus2 / Pilot-NT
					</span>
				</div>

				<div className="text-sm text-[var(--muted,#64748b)]">
					Сумма к оплате:{" "}
					<strong className="text-[var(--ink,#0f172a)] font-mono text-base font-bold">
						{money(amountInRubles)}
					</strong>
				</div>

				{status === "initiating" && (
					<div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 text-xs sm:text-sm font-semibold flex items-center gap-2">
						<RotateCcw className="w-4 h-4 animate-spin shrink-0" />
						<span>Отправка запроса на терминал Сбербанк...</span>
					</div>
				)}

				{status === "cancelling" && (
					<div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs sm:text-sm font-semibold flex items-center gap-2">
						<RotateCcw className="w-4 h-4 animate-spin shrink-0 text-amber-600" />
						<span>Проверка статуса в банке и безопасная отмена транзакции (защита от двойного списания)...</span>
					</div>
				)}

				{status === "polling" && (
					<div className="space-y-3 p-4 rounded-xl bg-teal-500/5 border border-teal-500/20">
						<div className="flex items-center justify-between text-xs sm:text-sm">
							<span className="text-teal-700 dark:text-teal-300 font-bold">
								Ожидание оплаты клиентом на терминале...
							</span>
							<span className="font-mono text-xs text-[var(--muted,#64748b)]">
								{TERMINAL_POLL_TIMEOUT_SEC - secondsElapsed}с
							</span>
						</div>

						{formUrl && (
							<div className="pt-1">
								<a
									href={formUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] text-xs font-bold inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
								>
									<ExternalLink size={16} />
									<span>Открыть страницу оплаты / QR Сбербанк</span>
								</a>
							</div>
						)}
						<p className="text-xs text-amber-700 dark:text-amber-300 m-0">
							Безопасный режим: при таймауте или закрытии окна транзакция автоматически проверяется и отменяется на шлюзе Сбербанка.
						</p>
					</div>
				)}


				{status === "success" && (
					<div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
						Оплата успешно проведена!
					</div>
				)}

				{status === "error" && (
					<div className="space-y-4">
						<div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs sm:text-sm space-y-1">
							<div className="flex items-center gap-2 font-bold">
								<AlertCircle size={18} className="shrink-0" />
								<span>Сбой эквайринга Сбербанк</span>
							</div>
							<p className="m-0 text-xs">{errorMsg}</p>
						</div>

						{/* Automated Alternative Payment Suggestions HUD */}
						<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-2.5">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] block">
								Предложите пациенту альтернативный способ оплаты:
							</span>

							<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
								<button
									type="button"
									onClick={() => handleChooseAlternative("sbp")}
									className="min-h-[44px] p-2 rounded-xl border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
								>
									<QrCode size={16} className="shrink-0" />
									<span>СБП / QR</span>
								</button>

								<button
									type="button"
									onClick={() => handleChooseAlternative("cash")}
									className="min-h-[44px] p-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
								>
									<Banknote size={16} className="shrink-0" />
									<span>Наличные</span>
								</button>

								<button
									type="button"
									onClick={() => handleChooseAlternative("deposit")}
									className="min-h-[44px] p-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
								>
									<Coins size={16} className="shrink-0" />
									<span>Депозит / Семья</span>
								</button>
							</div>
						</div>
					</div>
				)}

				<div className="flex justify-end gap-2 pt-2">
					{status === "error" && (
						<button
							type="button"
							className="min-h-[44px] px-4 py-2 rounded-xl bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] text-xs font-bold hover:opacity-90 cursor-pointer transition-all"
							onClick={initiatePayment}
						>
							Повторить запрос на терминал
						</button>
					)}
					<button
						type="button"
						className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs font-bold hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer transition-all"
						onClick={handleClose}
						disabled={status === "initiating"}
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}
