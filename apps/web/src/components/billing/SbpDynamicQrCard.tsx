/**
 * apps/web/src/components/billing/SbpDynamicQrCard.tsx
 *
 * DENTE Dental CRM — Autonomous Dynamic SBP QR Code Widget & Frictionless Payment Card.
 *
 * Invariants:
 * - ГОСТ Р 56042-2014 & НСПК СБП (160x160px vector SVG with center SBP emblem)
 * - Studio Clinical HIG: var(--paper-strong) card, 12px radius, var(--teal) accent
 * - Dark mode safety: Pure white 8px padding underplate for smartphone camera contrast without blinding
 * - 30s countdown timer with auto-polling & manual instant verification
 * - Enter hotkey & "✓ Оплачено в приложении банка" with playTactileEarcon('pay')
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
	QrCode,
	Copy,
	Check,
	CheckCircle2,
	RefreshCw,
	ShieldCheck,
	Clock,
	Zap,
	ExternalLink,
	Sparkles,
} from "lucide-react";
import { showToast } from "../GlobalToast.js";
import { playTactileEarcon } from "../../lib/chairsideErgonomics.js";
import {
	createSbpDynamicQr,
	copySbpUrlToClipboard,
	type SbpDynamicQrConfig,
	type SbpDynamicQrPayloadData,
} from "./sbpQrEngine.js";

export interface SbpDynamicQrCardProps {
	readonly sumRub: number;
	readonly orderId?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly ttlSeconds?: number | undefined;
	readonly isAutoConfirmEnabled?: boolean | undefined;
	readonly onPaymentSuccess?: ((result: {
		paymentId: string;
		sumRub: number;
		method: "sbp";
		timestampIso: string;
	}) => void) | undefined;
	readonly onCancel?: (() => void) | undefined;
	readonly compactMode?: boolean | undefined;
}

export const SbpDynamicQrCard: React.FC<SbpDynamicQrCardProps> = ({
	sumRub,
	orderId,
	invoiceId,
	patientName = "Пациент клиники",
	clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	ttlSeconds = 30,
	isAutoConfirmEnabled = true,
	onPaymentSuccess,
	compactMode = false,
}) => {
	const [status, setStatus] = useState<"awaiting" | "paid" | "expired">("awaiting");
	const [secondsLeft, setSecondsLeft] = useState<number>(ttlSeconds);
	const [isCopied, setIsCopied] = useState<boolean>(false);
	const [qrIteration, setQrIteration] = useState<number>(0);
	const [isCheckingSbp, setIsCheckingSbp] = useState<boolean>(false);
	const [sbpCheckMessage, setSbpCheckMessage] = useState<string | null>(null);

	// Generate QR payload and vector SVG
	const qrData: SbpDynamicQrPayloadData = useMemo(() => {
		return createSbpDynamicQr({
			sumRub,
			orderId,
			invoiceId,
			patientName,
			clinicLegalName,
			ttlSeconds,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sumRub, orderId, invoiceId, patientName, clinicLegalName, ttlSeconds, qrIteration]);

	// Handle successful payment
	const handleConfirmPayment = useCallback(() => {
		if (status === "paid") return;
		setStatus("paid");
		playTactileEarcon("pay");
		showToast(`Оплата ${sumRub.toLocaleString("ru-RU")} ₽ по СБП подтверждена!`, "success");
		onPaymentSuccess?.({
			paymentId: qrData.paymentId,
			sumRub,
			method: "sbp",
			timestampIso: new Date().toISOString(),
		});
	}, [status, sumRub, qrData.paymentId, onPaymentSuccess]);

	// Poll SBP bank gateway for real incoming transaction (/api/fiscal/sbp-status)
	const pollSbpStatus = useCallback(
		async (manual = false) => {
			if (status === "paid") return;
			try {
				if (manual) setIsCheckingSbp(true);
				const effectiveId = qrData.paymentId || orderId || invoiceId || "";
				const sumKop = Math.round(sumRub * 100);
				const url = `/api/fiscal/sbp-status?orderId=${encodeURIComponent(effectiveId)}&qrId=${encodeURIComponent(qrData.paymentId)}&sumKop=${sumKop}`;
				const res = await fetch(url, { credentials: "same-origin" });
				if (res.ok) {
					const json = await res.json();
					if (json.isPaid || json.status === "paid") {
						handleConfirmPayment();
						return;
					}
					if (manual) {
						setSbpCheckMessage("Ожидание зачисления от банка-эмитента...");
						setTimeout(() => setSbpCheckMessage(null), 3500);
					}
				}
			} catch {
				// graceful offline or test environment catch
			} finally {
				if (manual) setIsCheckingSbp(false);
			}
		},
		[status, qrData.paymentId, orderId, invoiceId, sumRub, handleConfirmPayment],
	);

	// Active polling every 2.5s while awaiting payment
	useEffect(() => {
		if (status !== "awaiting") return;
		const pollInterval = setInterval(() => {
			pollSbpStatus(false);
		}, 2500);
		return () => clearInterval(pollInterval);
	}, [status, pollSbpStatus]);

	// Explicit manual confirmation by cashier: «Деньги поступили на счет клиники (ручное подтверждение)»
	const handleManualConfirmation = useCallback(async () => {
		try {
			setIsCheckingSbp(true);
			const effectiveId = qrData.paymentId || orderId || invoiceId || "";
			const sumKop = Math.round(sumRub * 100);
			await fetch("/api/fiscal/sbp-status", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "same-origin",
				body: JSON.stringify({
					orderId: effectiveId,
					qrId: qrData.paymentId,
					invoiceId: invoiceId || undefined,
					action: "confirm_manual",
					sumKop,
				}),
			});
		} catch {
			// Continue to confirm locally even if network/offline
		} finally {
			setIsCheckingSbp(false);
			handleConfirmPayment();
		}
	}, [qrData.paymentId, orderId, invoiceId, sumRub, handleConfirmPayment]);

	// 30s countdown timer (counts down TTL without fake auto-pay transitions)
	useEffect(() => {
		if (status !== "awaiting") return;

		setSecondsLeft(ttlSeconds);
		const interval = setInterval(() => {
			setSecondsLeft((prev) => {
				if (prev <= 1) {
					clearInterval(interval);
					setStatus("expired");
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [status, ttlSeconds, qrIteration]);

	// Global Enter hotkey for frictionless cashier manual confirmation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && status === "awaiting") {
				const activeTag = document.activeElement?.tagName.toLowerCase();
				if (activeTag === "input" || activeTag === "textarea") return;
				e.preventDefault();
				handleManualConfirmation();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [status, handleManualConfirmation]);

	// Copy URL
	const handleCopyLink = async () => {
		const success = await copySbpUrlToClipboard(qrData.nspkUrl);
		if (success) {
			setIsCopied(true);
			showToast("Ссылка на оплату СБП скопирована в буфер", "info");
			setTimeout(() => setIsCopied(false), 2200);
		} else {
			showToast("Не удалось скопировать ссылку", "error");
		}
	};

	// Refresh expired QR
	const handleRefreshQr = () => {
		setStatus("awaiting");
		setSecondsLeft(ttlSeconds);
		setQrIteration((prev) => prev + 1);
		showToast("Новый динамический QR-код СБП сформирован", "info");
	};

	return (
		<div
			className="p-3.5 sm:p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-xs transition-all flex flex-col gap-3"
			data-testid="sbp-dynamic-qr-card"
		>
			{/* Header with Telemetry & SBP Badge */}
			<div className="flex items-center justify-between gap-2 border-b border-[var(--line,#cbd5e1)] pb-2.5">
				<div className="flex items-center gap-2">
					<div className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
						<QrCode size={16} />
					</div>
					<div>
						<span className="text-xs font-bold leading-tight flex items-center gap-1.5 text-[var(--ink,#0f172a)]">
							<span>Динамический QR СБП</span>
							<span className="text-[10px] font-mono font-bold text-teal-700 dark:text-teal-300 px-1.5 py-0.2 rounded bg-teal-500/10 border border-teal-500/25">
								0.4% комиссия
							</span>
						</span>
						<span className="text-[11px] text-[var(--muted,#64748b)] block leading-none mt-0.5">
							НСПК · ГОСТ Р 56042-2014
						</span>
					</div>
				</div>

				{/* Countdown Pill */}
				{status === "awaiting" && (
					<div
						className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold border transition-colors ${
							secondsLeft <= 7
								? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300 animate-pulse"
								: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#cbd5e1)] text-[var(--muted,#64748b)]"
						}`}
						data-testid="sbp-timer-indicator"
						title="Время жизни динамического QR-кода"
					>
						<Clock size={12} className={secondsLeft <= 7 ? "text-amber-600" : "text-slate-400"} />
						<span>{secondsLeft} с</span>
					</div>
				)}

				{status === "paid" && (
					<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
						<CheckCircle2 size={12} />
						<span>Оплачено</span>
					</span>
				)}
			</div>

			{/* Main Content Area */}
			{status === "paid" ? (
				/* Paid Success State */
				<div
					className="py-4 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col items-center justify-center text-center gap-2 animate-in fade-in zoom-in-95 duration-150"
					data-testid="sbp-paid-success-banner"
				>
					<div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
						<Check size={26} className="stroke-[3]" />
					</div>
					<div>
						<div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-100">
							Безналичная оплата СБП получена!
						</div>
						<div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-300 mt-0.5">
							{sumRub.toLocaleString("ru-RU")} ₽
						</div>
						<div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-1">
							Средства поступили на расчетный счет клиники мгновенно
						</div>
					</div>
				</div>
			) : status === "expired" ? (
				/* Expired State with 1-click regenerate */
				<div
					className="py-6 px-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col items-center justify-center text-center gap-2.5 animate-in fade-in duration-150"
					data-testid="sbp-expired-banner"
				>
					<Clock size={28} className="text-amber-600 dark:text-amber-400" />
					<div className="space-y-0.5">
						<span className="text-xs font-bold text-amber-900 dark:text-amber-100 block">
							Время действия QR-кода истекло (30 сек)
						</span>
						<span className="text-[11px] text-[var(--muted,#64748b)]">
							Сформируйте новый динамический код для пациента
						</span>
					</div>
					<button
						type="button"
						onClick={handleRefreshQr}
						className="h-9 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
						data-testid="btn-sbp-refresh"
					>
						<RefreshCw size={14} />
						<span>Сформировать новый QR</span>
					</button>
				</div>
			) : (
				/* Active Awaiting State: 160x160 Vector QR & Details */
				<div className="flex flex-col sm:flex-row items-center gap-4">
					{/* Protected Pure-White Underplate (8px padding for camera contrast in Dark mode) */}
					<div
						className="relative shrink-0 rounded-xl bg-white p-2 border border-slate-300 dark:border-slate-700 shadow-sm flex items-center justify-center"
						style={{ width: "176px", height: "176px" }}
						data-testid="sbp-qr-camera-underplate"
					>
						<div
							className="w-[160px] h-[160px] flex items-center justify-center overflow-hidden"
							dangerouslySetInnerHTML={{ __html: qrData.svg }}
							data-testid="sbp-qr-svg-canvas"
						/>
					</div>

					{/* Payment Instruction & Action Controls */}
					<div className="flex-1 flex flex-col justify-between gap-3 text-center sm:text-left min-w-0">
						<div className="space-y-1">
							<div className="text-[11px] uppercase tracking-wider text-[var(--muted,#64748b)] font-bold">
								Сумма к оплате
							</div>
							<div
								className="text-2xl font-black font-mono text-[var(--ink,#0f172a)] tracking-tight"
								data-testid="sbp-display-amount"
							>
								{sumRub.toLocaleString("ru-RU")} ₽
							</div>
							<div className="text-[11px] text-[var(--muted,#64748b)] leading-tight">
								Пациент открывает камеру смартфона или приложение любого банка
							</div>
						</div>

						{/* Quick Action Buttons */}
						{sbpCheckMessage && (
							<div className="text-[11px] text-teal-700 dark:text-teal-300 font-medium">
								{sbpCheckMessage}
							</div>
						)}
						<div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
							{/* Manual Confirmation Button (Enter) */}
							<button
								type="button"
								onClick={handleManualConfirmation}
								disabled={isCheckingSbp}
								className="w-full sm:flex-1 h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-50"
								data-testid="btn-confirm-sbp-payment"
								title="Подтвердить зачисление средств на расчетный счет клиники (Хоткей: Enter)"
							>
								<Check size={15} className="stroke-[2.5]" />
								<span className="truncate">Деньги поступили на счет клиники (ручное подтверждение)</span>
								<kbd className="hidden md:inline-block ml-1 px-1 py-0.2 text-[9px] font-mono bg-emerald-800/60 rounded border border-emerald-500/30">
									Enter
								</kbd>
							</button>

							{/* Poll Button */}
							<button
								type="button"
								onClick={() => pollSbpStatus(true)}
								disabled={isCheckingSbp}
								className="w-full sm:w-auto h-9 px-3 rounded-lg border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
								data-testid="btn-check-sbp-status"
								title="Опросить банковский шлюз СБП"
							>
								<RefreshCw size={13} className={isCheckingSbp ? "animate-spin" : ""} />
								<span>Проверить</span>
							</button>

							{/* Copy SBP Link */}
							<button
								type="button"
								onClick={handleCopyLink}
								className="w-full sm:w-auto h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-bold text-[var(--ink,#0f172a)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
								data-testid="btn-copy-sbp-link"
								title="Скопировать ссылку СБП"
							>
								{isCopied ? (
									<>
										<Check size={13} className="text-emerald-600" />
										<span className="text-emerald-600">Скопировано</span>
									</>
								) : (
									<>
										<Copy size={13} className="text-[var(--muted,#64748b)]" />
										<span>Ссылка СБП</span>
									</>
								)}
							</button>
						</div>

						{/* Security Footer */}
						<div className="text-[10px] text-teal-700 dark:text-teal-400 font-mono flex items-center justify-center sm:justify-start gap-1">
							<ShieldCheck size={12} className="shrink-0" />
							<span className="truncate">Контрольная сумма CRC16: {qrData.crc16Hex}</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default SbpDynamicQrCard;
