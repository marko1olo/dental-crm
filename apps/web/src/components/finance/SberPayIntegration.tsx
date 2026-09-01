/**
 * apps/web/src/components/finance/SberPayIntegration.tsx
 *
 * DENTE Dental CRM — SberPay & POS Terminal Integration Module.
 * Implements Sberbank POS Terminal (Pilot-NT / DualConnector / SmartPOS), SberPay Dynamic QR,
 * FacePay Biometry ("Оплата улыбкой"), automated 1-click Slip printing, and Reversal / RRN recovery.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
	CreditCard,
	QrCode,
	Smile,
	RotateCcw,
	Printer,
	Copy,
	CheckCheck,
	Check,
	AlertCircle,
	RefreshCw,
	ShieldCheck,
	Ban,
	Search,
} from "lucide-react";
import {
	type SberPosTerminalConfig,
	type SberPosTransactionResponse,
	type SberPosTerminalStatus,
	type SberPosOperationType,
} from "@dental/shared";
import {
	sberbankTerminal,
	DEFAULT_SBER_TERMINAL_CONFIG,
} from "../../services/hardware/sberbankTerminal.js";
import { hardwarePrinter } from "../../services/hardware/HardwarePrinter.js";
import { showToast } from "../GlobalToast.js";

export interface SberPayIntegrationProps {
	readonly patientId: string;
	readonly patientName: string;
	readonly amountKopecks: number;
	readonly orderId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly documentId?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly onPaymentSuccess?: ((res: SberPosTransactionResponse) => void) | undefined;
	readonly onSelectAlternativeMethod?: ((method: "sbp" | "cash" | "deposit") => void) | undefined;
	readonly autoStart?: boolean | undefined;
}

export const SberPayIntegration: React.FC<SberPayIntegrationProps> = ({
	patientId,
	patientName,
	amountKopecks,
	orderId = `POS-${Date.now().toString().slice(-8)}`,
	visitId,
	documentId,
	invoiceId,
	onPaymentSuccess,
	onSelectAlternativeMethod,
	autoStart = false,
}) => {
	const [operation, setOperation] = useState<SberPosOperationType>("sale");
	const [terminalStatus, setTerminalStatus] = useState<SberPosTerminalStatus>("ready");
	const [statusMessage, setStatusMessage] = useState<string>("Терминал готов к работе");
	const [qrPayload, setQrPayload] = useState<string | null>(null);
	const [lastResponse, setLastResponse] = useState<SberPosTransactionResponse | null>(null);
	const [isPrinting, setIsPrinting] = useState<boolean>(false);
	const [isCopied, setIsCopied] = useState<boolean>(false);
	const [activeSlipTab, setActiveSlipTab] = useState<"customer" | "merchant">("customer");
	const [rrnInput, setRrnInput] = useState<string>("");
	const [isReconciling, setIsReconciling] = useState<boolean>(false);

	const inFlight = useRef(false);

	// Subscribe to live terminal status updates
	useEffect(() => {
		const unsubscribe = sberbankTerminal.subscribeStatus((status, message, meta) => {
			setTerminalStatus(status);
			setStatusMessage(message);
			if (meta && typeof meta.qrPayload === "string") {
				setQrPayload(meta.qrPayload);
			}
		});
		return unsubscribe;
	}, []);

	const handleStartPayment = useCallback(
		async (targetOp: SberPosOperationType = operation) => {
			if (inFlight.current) return;
			inFlight.current = true;
			setOperation(targetOp);
			setLastResponse(null);
			setQrPayload(null);

			try {
				const response = await sberbankTerminal.executeTransaction({
					amountKopecks,
					patientId,
					patientName,
					orderId,
					...(visitId ? { visitId } : {}),
					...(documentId ? { documentId } : {}),
					...(invoiceId ? { invoiceId } : {}),
					operation: targetOp,
					autoPrintSlip: false, // We provide manual or 1-click auto print button
				});

				setLastResponse(response);
				if (response.success && onPaymentSuccess) {
					onPaymentSuccess(response);
				}
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : "Ошибка выполнения оплаты на терминале";
				showToast(msg, "error");
			} finally {
				inFlight.current = false;
			}
		},
		[amountKopecks, patientId, patientName, orderId, visitId, documentId, invoiceId, operation, onPaymentSuccess],
	);

	useEffect(() => {
		if (autoStart) {
			void handleStartPayment("sale");
		}
	}, [autoStart, handleStartPayment]);

	const handlePrintSlip = async () => {
		if (!lastResponse?.customerSlip) return;
		setIsPrinting(true);
		try {
			const slipToPrint =
				activeSlipTab === "customer" ? lastResponse.customerSlip : lastResponse.merchantSlip;
			await hardwarePrinter.printBankSlip(slipToPrint);
			showToast("Банковский слип отправлен на печать", "info");
		} catch (e) {
			showToast("Ошибка печати слипа на принтере", "error");
		} finally {
			setIsPrinting(false);
		}
	};

	const handleCopySlip = () => {
		if (!lastResponse) return;
		const text = activeSlipTab === "customer" ? lastResponse.customerSlip : lastResponse.merchantSlip;
		navigator.clipboard.writeText(text);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	const handleReconcileRrn = async () => {
		if (!rrnInput.trim() || rrnInput.trim().length !== 12) {
			showToast("Введите корректный номер RRN (12 цифр)", "warning");
			return;
		}
		setIsReconciling(true);
		try {
			const res = await sberbankTerminal.reconcileByRrn(rrnInput.trim(), orderId);
			if (res.success) {
				showToast(`Транзакция по RRN ${rrnInput} подтверждена!`, "success");
			} else {
				showToast(`Сверка по RRN ${rrnInput}: ${res.responseMessageRu}`, "warning");
			}
		} finally {
			setIsReconciling(false);
		}
	};

	const handleVoidOrCancel = async () => {
		if (!lastResponse?.rrn && !orderId) return;
		if (!window.confirm("Отменить транзакцию (Reversal / Void) в процессинге Сбербанка?")) return;

		try {
			await fetch("/api/payments/sberbank/pos/void", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ orderId, rrn: lastResponse?.rrn }),
			});
			showToast("Транзакция успешно отменена на шлюзе Сбербанка", "success");
			setTerminalStatus("ready");
			setStatusMessage("Транзакция отменена. Терминал готов к новому расчету.");
			setLastResponse(null);
		} catch (e) {
			showToast("Ошибка отправки отмены транзакции", "error");
		}
	};

	const amountRubString = (amountKopecks / 100).toFixed(2);

	return (
		<div className="sberpay-integration-widget p-4 rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-4">
			{/* Mode Selectors */}
			<div className="grid grid-cols-3 gap-2">
				<button
					type="button"
					onClick={() => handleStartPayment("sale")}
					className={`min-h-[44px] p-2 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
						operation === "sale"
							? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
							: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-emerald-400"
					}`}
				>
					<CreditCard size={16} className="text-emerald-600 dark:text-emerald-400" />
					<span>Карта / Терминал</span>
				</button>

				<button
					type="button"
					onClick={() => handleStartPayment("sberpay_qr")}
					className={`min-h-[44px] p-2 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
						operation === "sberpay_qr"
							? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300"
							: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-teal-400"
					}`}
				>
					<QrCode size={16} className="text-teal-600 dark:text-teal-400" />
					<span>SberPay QR (СБП)</span>
				</button>

				<button
					type="button"
					onClick={() => handleStartPayment("biometry_facepay")}
					className={`min-h-[44px] p-2 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
						operation === "biometry_facepay"
							? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
							: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-emerald-400"
					}`}
				>
					<Smile size={16} className="text-emerald-600 dark:text-emerald-400" />
					<span>Оплата улыбкой</span>
				</button>
			</div>

			{/* Terminal Status Display HUD */}
			<div className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs border border-slate-800 space-y-2">
				<div className="flex items-center justify-between border-b border-slate-800 pb-2">
					<div className="flex items-center gap-2">
						<ShieldCheck size={14} className="text-emerald-400" />
						<span className="font-bold uppercase tracking-wider">СБЕРБАНК POS • TID {DEFAULT_SBER_TERMINAL_CONFIG.terminalId}</span>
					</div>
					<span className="text-emerald-300 font-bold">{amountRubString} ₽</span>
				</div>

				<div className="py-2 text-center">
					{terminalStatus === "qr_displayed" && qrPayload ? (
						<div className="flex flex-col items-center gap-2 py-2">
							<div className="w-24 h-24 bg-white p-2 rounded-lg flex items-center justify-center">
								<QrCode className="w-full h-full text-slate-950" />
							</div>
							<span className="text-[11px] text-emerald-300">Отсканируйте в СберБанк Онлайн или приложении СБП</span>
						</div>
					) : terminalStatus === "biometry_scan" ? (
						<div className="flex flex-col items-center gap-1 py-1">
							<Smile size={36} className="text-emerald-300 animate-pulse" />
							<span className="text-[11px] text-emerald-200">FacePay: Пациент смотрит в камеру терминала</span>
						</div>
					) : (
						<p className="text-sm font-bold text-emerald-200 m-0">
							{statusMessage}
						</p>
					)}
				</div>
			</div>

			{/* Terminal Action Controls */}
			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={() => handleStartPayment(operation)}
					className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all"
				>
					<RefreshCw size={14} />
					<span>Запустить оплату ({amountRubString} ₽)</span>
				</button>

				{lastResponse?.success && (
					<>
						<button
							type="button"
							onClick={handlePrintSlip}
							disabled={isPrinting}
							className="min-h-[44px] px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-2 cursor-pointer hover:bg-emerald-500/20 transition-colors"
						>
							<Printer size={14} className={isPrinting ? "animate-spin" : ""} />
							<span>Печать банковского слипа (ESC/POS)</span>
						</button>

						<button
							type="button"
							onClick={handleVoidOrCancel}
							className="min-h-[44px] px-3.5 rounded-xl border border-rose-500/30 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-rose-500/10 transition-colors"
						>
							<Ban size={14} />
							<span>Отмена транзакции (Void)</span>
						</button>
					</>
				)}
			</div>

			{/* RRN Recovery Drawer */}
			<div className="pt-2 border-t border-[var(--line,#e2e8f0)] flex items-center gap-2">
				<input
					type="text"
					value={rrnInput}
					onChange={(e) => setRrnInput(e.target.value)}
					placeholder="RRN (12 знаков для проверки)"
					className="h-9 px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono flex-1"
				/>
				<button
					type="button"
					onClick={handleReconcileRrn}
					disabled={isReconciling}
					className="h-9 px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] flex items-center gap-1 cursor-pointer"
				>
					<Search size={14} />
					<span>Проверить RRN</span>
				</button>
			</div>

			{/* Alternative suggestions when failed / timeout */}
			{(terminalStatus === "pin_timeout" || terminalStatus === "card_declined" || terminalStatus === "communication_error") && (
				<div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
					<div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200">
						<AlertCircle size={16} className="text-amber-600 shrink-0" />
						<span>Терминал отклонил операцию или истек таймаут. Выберите альтернативный способ:</span>
					</div>
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={() => handleStartPayment("sberpay_qr")}
							className="min-h-[40px] px-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
						>
							<QrCode size={14} />
							<span>Оплата по QR коду</span>
						</button>
						{onSelectAlternativeMethod && (
							<>
								<button
									type="button"
									onClick={() => onSelectAlternativeMethod("cash")}
									className="min-h-[40px] px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
								>
									<CreditCard size={14} />
									<span>Наличные в кассу</span>
								</button>
								<button
									type="button"
									onClick={() => onSelectAlternativeMethod("deposit")}
									className="min-h-[40px] px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
								>
									<RotateCcw size={14} />
									<span>Депозит / Семья</span>
								</button>
							</>
						)}
					</div>
				</div>
			)}

			{/* Monospace Slip Box (when available) */}
			{lastResponse && (
				<div className="space-y-2">
					<div className="flex items-center justify-between text-xs">
						<div className="flex gap-1">
							<button
								type="button"
								onClick={() => setActiveSlipTab("customer")}
								className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
									activeSlipTab === "customer"
										? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
										: "text-[var(--muted,#64748b)]"
								}`}
							>
								Чек клиента
							</button>
							<button
								type="button"
								onClick={() => setActiveSlipTab("merchant")}
								className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
									activeSlipTab === "merchant"
										? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
										: "text-[var(--muted,#64748b)]"
								}`}
							>
								Чек клиники
							</button>
						</div>

						<button
							type="button"
							onClick={handleCopySlip}
							className="text-xs text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center gap-1 cursor-pointer"
						>
							{isCopied ? <CheckCheck size={14} className="text-emerald-600" /> : <Copy size={14} />}
							<span>{isCopied ? "Скопировано" : "Копировать"}</span>
						</button>
					</div>

					<pre className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[11px] font-mono leading-tight max-h-[180px] overflow-y-auto select-all">
						{activeSlipTab === "customer" ? lastResponse.customerSlip : lastResponse.merchantSlip}
					</pre>
				</div>
			)}
		</div>
	);
};
