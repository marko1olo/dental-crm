import React, { useState, useEffect, useMemo, useRef } from "react";
import {
	CreditCard,
	QrCode,
	Smile,
	RotateCcw,
	Ban,
	FileText,
	Printer,
	Check,
	AlertCircle,
	X,
	RefreshCw,
	Sliders,
	Wifi,
	Copy,
	CheckCheck,
	Radio,
} from "lucide-react";
import {
	type SberPosOperationType,
	type SberPosTerminalStatus,
	type SberPosTerminalConfig,
	type SberPosTransactionResponse,
	type SberPosHardwareModel,
	createMockSberPosResponse,
	getPilotNtCommandCode,
	buildPilotNtCommandPacket,
} from "./sberPosEngine";
import {
	DEFAULT_SBER_TERMINAL_CONFIG,
	SBER_HARDWARE_PROFILES,
} from "./sberPosPresets";
import "./sberPos.css";

export interface SberPosTerminalModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly totalBillKop?: number | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly orderId?: string | undefined;
	readonly initialOperation?: SberPosOperationType | undefined;
	readonly onTransactionSuccess?: ((response: SberPosTransactionResponse) => void) | undefined;
	readonly onSelectAlternativeMethod?: ((method: "sbp" | "cash" | "deposit") => void) | undefined;
}

export const SberPosTerminalModal: React.FC<SberPosTerminalModalProps> = ({
	isOpen,
	onClose,
	totalBillKop = 1960000,
	patientName = "Смирнова Екатерина Васильевна",
	patientPhone = "+7 (999) 123-45-67",
	orderId = "CHK-2026-891",
	initialOperation = "sale",
	onTransactionSuccess,
	onSelectAlternativeMethod,
}) => {
	const [operation, setOperation] = useState<SberPosOperationType>(initialOperation);
	const [config, setConfig] = useState<SberPosTerminalConfig>(DEFAULT_SBER_TERMINAL_CONFIG);
	const [status, setStatus] = useState<SberPosTerminalStatus>("ready");
	const [statusMessage, setStatusMessage] = useState<string>("Готов к работе. Вставьте или приложите карту.");
	const [pinBuffer, setPinBuffer] = useState<string>("");
	const [timerSeconds, setTimerSeconds] = useState<number>(45);
	const [lastResponse, setLastResponse] = useState<SberPosTransactionResponse | null>(null);
	const [activeSlipTab, setActiveSlipTab] = useState<"customer" | "merchant">("customer");
	const [isCopied, setIsCopied] = useState<boolean>(false);
	const [isPrinting, setIsPrinting] = useState<boolean>(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

	// Refund / Void custom inputs
	const [originalRrnInput, setOriginalRrnInput] = useState<string>("423891028471");
	const [originalAuthInput, setOriginalAuthInput] = useState<string>("982310");

	const timerRef = useRef<NodeJS.Timeout | null>(null);

	const activeProfile = useMemo(() => {
		const found = SBER_HARDWARE_PROFILES.find((p) => p.id === config.hardwareModel);
		return found || SBER_HARDWARE_PROFILES[0]!;
	}, [config.hardwareModel]);

	useEffect(() => {
		if (isOpen) {
			setOperation(initialOperation);
			setStatus("ready");
			setStatusMessage("Готов к работе. Вставьте или приложите карту.");
			setPinBuffer("");
			setTimerSeconds(45);
			setLastResponse(null);
			setIsSettingsOpen(false);
		}
	}, [isOpen, initialOperation]);

	// Auto-countdown when in active transaction state
	useEffect(() => {
		if (
			status === "processing_card" ||
			status === "pin_entry" ||
			status === "biometry_scan" ||
			status === "qr_displayed" ||
			status === "authorizing"
		) {
			timerRef.current = setInterval(() => {
				setTimerSeconds((prev) => {
					if (prev <= 1) {
						setStatus("pin_timeout");
						setStatusMessage("Время ожидания действия клиента истекло (Таймаут).");
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		} else {
			if (timerRef.current) clearInterval(timerRef.current);
		}
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [status]);

	if (!isOpen) return null;

	const handleStartOperation = (targetOp: SberPosOperationType = operation) => {
		setOperation(targetOp);
		setStatus("connecting");
		setStatusMessage(`Подключение к ${config.hostIp}:${config.hostPort} (Pilot-NT)...`);
		setTimerSeconds(45);
		setPinBuffer("");
		setLastResponse(null);

		setTimeout(() => {
			if (targetOp === "sberpay_qr") {
				setStatus("qr_displayed");
				setStatusMessage("QR-код сформирован. Ожидание сканирования в приложении банка...");
			} else if (targetOp === "biometry_facepay") {
				setStatus("biometry_scan");
				setStatusMessage("Взгляните в 3D-камеру FacePay терминала...");
			} else if (targetOp === "settlement") {
				setStatus("authorizing");
				setStatusMessage("Выполняется сверка итогов с процессингом ПАО Сбербанк...");
				setTimeout(() => {
					const res = createMockSberPosResponse(config, {
						operation: "settlement",
						amountKop: 0,
						orderId: `Z-REPORT-${Date.now()}`,
					});
					setLastResponse(res);
					setStatus("success");
					setStatusMessage("Смена успешно закрыта. Итоги совпали.");
					if (onTransactionSuccess) onTransactionSuccess(res);
				}, 2000);
			} else if (targetOp === "refund" || targetOp === "void") {
				setStatus("authorizing");
				setStatusMessage("Запрос отмены/возврата в процессинг Сбербанка...");
				setTimeout(() => {
					const res = createMockSberPosResponse(config, {
						operation: targetOp,
						amountKop: totalBillKop,
						orderId,
						originalRrn: originalRrnInput,
						originalAuthCode: originalAuthInput,
					});
					setLastResponse(res);
					setStatus("success");
					setStatusMessage("Операция возврата успешно одобрена.");
					if (onTransactionSuccess) onTransactionSuccess(res);
				}, 1800);
			} else {
				// Standard Card Sale
				setStatus("processing_card");
				setStatusMessage("Чтение карты: Приложите бесконтактно или вставьте чип...");
			}
		}, 800);
	};

	// Simulation helper: user enters PIN or completes FacePay/QR scan
	const handleSimulateClientAction = () => {
		if (status === "processing_card") {
			setStatus("pin_entry");
			setStatusMessage("Введите PIN-код на клавиатуре терминала:");
			setPinBuffer("••••");
		} else if (status === "pin_entry" || status === "biometry_scan" || status === "qr_displayed") {
			setStatus("authorizing");
			setStatusMessage("Авторизация транзакции в ПАО Сбербанк...");
			setTimeout(() => {
				const res = createMockSberPosResponse(config, {
					operation,
					amountKop: totalBillKop,
					orderId,
					patientName,
					patientPhone,
				});
				setLastResponse(res);
				setStatus("success");
				setStatusMessage("Одобрено! Оплата успешно проведена.");
				if (onTransactionSuccess) onTransactionSuccess(res);
			}, 1400);
		}
	};

	// Simulation helper: simulate error (e.g. Card Declined)
	const handleSimulateDecline = () => {
		setStatus("authorizing");
		setStatusMessage("Авторизация транзакции в ПАО Сбербанк...");
		setTimeout(() => {
			const res = createMockSberPosResponse(config, {
				operation,
				amountKop: totalBillKop,
				orderId,
				patientName,
				patientPhone,
			}, "51");
			setLastResponse(res);
			setStatus("card_declined");
			setStatusMessage("Отказ: Недостаточно средств на карте (Код 51).");
		}, 1200);
	};

	const handleCopySlip = () => {
		if (!lastResponse) return;
		const text = activeSlipTab === "customer" ? lastResponse.customerSlip : lastResponse.merchantSlip;
		navigator.clipboard.writeText(text);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	const handlePrintSlip = () => {
		setIsPrinting(true);
		setTimeout(() => {
			setIsPrinting(false);
		}, 1500);
	};

	const pilotCommandText = buildPilotNtCommandPacket(config, {
		operation,
		amountKop: totalBillKop,
		orderId,
		originalRrn: originalRrnInput,
		originalAuthCode: originalAuthInput,
	});

	return (
		<div className="sber-pos-modal-overlay" data-testid="sber-pos-terminal-modal">
			<div className="sber-pos-modal-container">
				{/* Top Navigation / Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
							<CreditCard className="w-5 h-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)]">
									Сбербанк POS Терминал & SberPay
								</h2>
								<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
									Pilot-NT TCP:4000
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)]">
								{patientName} • Заказ #{orderId} • К оплате: <span className="font-bold text-[var(--ink,#0f172a)]">{(totalBillKop / 100).toLocaleString("ru-RU")} ₽</span>
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setIsSettingsOpen(!isSettingsOpen)}
							className={"h-9 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-colors " + (
								isSettingsOpen
									? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
									: "border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							)}
						>
							<Sliders className="w-3.5 h-3.5" />
							<span>Профиль</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="w-9 h-9 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Settings Drawer (Collapsible) */}
				{isSettingsOpen && (
					<div className="p-4 border-b border-[var(--line,#e2e8f0)] bg-emerald-500/5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
						<div>
							<label className="font-semibold text-[var(--ink,#0f172a)] block mb-1">Модель терминала:</label>
							<select
								value={config.hardwareModel}
								onChange={(e) => setConfig((prev) => ({ ...prev, hardwareModel: e.target.value as SberPosHardwareModel }))}
								className="w-full h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] px-2 text-xs font-medium text-[var(--ink,#0f172a)]"
							>
								{SBER_HARDWARE_PROFILES.map((p) => (
									<option key={p.id} value={p.id}>
										{p.modelName}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="font-semibold text-[var(--ink,#0f172a)] block mb-1">Хост и Порт драйвера:</label>
							<div className="flex gap-2">
								<input
									type="text"
									value={config.hostIp}
									onChange={(e) => setConfig((prev) => ({ ...prev, hostIp: e.target.value }))}
									className="flex-1 h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] px-2 text-xs font-mono"
								/>
								<input
									type="number"
									value={config.hostPort}
									onChange={(e) => setConfig((prev) => ({ ...prev, hostPort: Number(e.target.value) }))}
									className="w-20 h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] px-2 text-xs font-mono"
								/>
							</div>
						</div>
						<div>
							<label className="font-semibold text-[var(--ink,#0f172a)] block mb-1">TID / MID Сбербанка:</label>
							<div className="flex gap-2">
								<input
									type="text"
									value={config.terminalId}
									onChange={(e) => setConfig((prev) => ({ ...prev, terminalId: e.target.value }))}
									placeholder="TID"
									className="w-24 h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] px-2 text-xs font-mono"
								/>
								<input
									type="text"
									value={config.merchantId}
									onChange={(e) => setConfig((prev) => ({ ...prev, merchantId: e.target.value }))}
									placeholder="MID"
									className="flex-1 h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] px-2 text-xs font-mono"
								/>
							</div>
						</div>
					</div>
				)}

				{/* Body */}
				<div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-5 flex-1">
					{/* Operation Tabs */}
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
						<button
							type="button"
							onClick={() => handleStartOperation("sale")}
							className={"min-h-[48px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer " + (
								operation === "sale"
									? "border-emerald-600 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-sm"
									: "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-emerald-400"
							)}
						>
							<CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
							<span className="text-xs">Оплата картой</span>
						</button>

						<button
							type="button"
							onClick={() => handleStartOperation("sberpay_qr")}
							className={"min-h-[48px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer " + (
								operation === "sberpay_qr"
									? "border-[var(--ok-fg,#059669)] bg-[var(--ok-bg,#f0fdf4)] text-[var(--ok-fg,#059669)] shadow-sm"
									: "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--ok-fg,#059669)]"
							)}
						>
							<QrCode className="w-4 h-4 text-[var(--teal,#0d9488)]" />
							<span className="text-xs">SberPay QR</span>
						</button>

						<button
							type="button"
							onClick={() => handleStartOperation("biometry_facepay")}
							className={"min-h-[48px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer " + (
								operation === "biometry_facepay"
									? "border-[var(--ok-fg,#059669)] bg-[var(--ok-bg,#f0fdf4)] text-[var(--ok-fg,#059669)] shadow-sm"
									: "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--ok-fg,#059669)]"
							)}
						>
							<Smile className="w-4 h-4 text-[var(--brand-primary,#0d9488)]" />
							<span className="text-xs">FacePay Улыбкой</span>
						</button>

						<button
							type="button"
							onClick={() => handleStartOperation("refund")}
							className={"min-h-[48px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer " + (
								operation === "refund"
									? "border-[var(--warn-fg,#d97706)] bg-[var(--warn-bg,#fef3c7)] text-[var(--warn-fg,#d97706)] shadow-sm"
									: "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--warn-fg,#d97706)]"
							)}
						>
							<RotateCcw className="w-4 h-4 text-[var(--warn-fg,#d97706)]" />
							<span className="text-xs">Возврат</span>
						</button>

						<button
							type="button"
							onClick={() => handleStartOperation("void")}
							className={"min-h-[48px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer " + (
								operation === "void"
									? "border-[var(--bad-fg,#dc2626)] bg-[var(--bad-bg,#fee2e2)] text-[var(--bad-fg,#dc2626)] shadow-sm"
									: "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--bad-fg,#dc2626)]"
							)}
						>
							<Ban className="w-4 h-4 text-[var(--bad-fg,#dc2626)]" />
							<span className="text-xs">Отмена</span>
						</button>

						<button
							type="button"
							onClick={() => handleStartOperation("settlement")}
							className={"min-h-[48px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer " + (
								operation === "settlement"
									? "border-[var(--brand-primary,#0d9488)] bg-[var(--brand-primary-soft,#f0fdfa)] text-[var(--brand-primary,#0d9488)] shadow-sm"
									: "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--brand-primary,#0d9488)]"
							)}
						>
							<FileText className="w-4 h-4 text-[var(--brand-primary,#0d9488)]" />
							<span className="text-xs">Сверка итогов (Z)</span>
						</button>
					</div>

					{/* Custom Refund / Void RRN & AuthCode Fields */}
					{(operation === "refund" || operation === "void") && status === "ready" && (
						<div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row gap-3 items-center text-xs">
							<span className="font-bold text-amber-800 dark:text-amber-200 shrink-0">Данные чека для возврата:</span>
							<div className="flex gap-2 w-full">
								<input
									type="text"
									value={originalRrnInput}
									onChange={(e) => setOriginalRrnInput(e.target.value)}
									placeholder="RRN (12 цифр)"
									className="flex-1 h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] px-2.5 font-mono text-xs"
								/>
								<input
									type="text"
									value={originalAuthInput}
									onChange={(e) => setOriginalAuthInput(e.target.value)}
									placeholder="Код авториз. (6 знаков)"
									className="w-36 h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] px-2.5 font-mono text-xs"
								/>
							</div>
						</div>
					)}

					{/* Main Grid: Interactive Terminal LCD Simulation & Bank Slip / Receipt */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
						{/* POS Terminal Emulator (Left side: 7 cols) */}
						<div className="lg:col-span-7 flex flex-col gap-4">
							<div className="sber-pos-lcd-screen p-5 min-h-[220px] flex flex-col justify-between">
								{/* Terminal Status Header */}
								<div className="flex items-center justify-between text-xs border-b border-emerald-500/30 pb-2.5">
									<div className="flex items-center gap-1.5">
										<Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
										<span className="font-bold uppercase tracking-wider">{activeProfile?.modelName ? activeProfile.modelName.split(" ")[0] : "SBER-POS"}</span>
										<span>• TID {config.terminalId}</span>
									</div>
									<div className="flex items-center gap-2">
										<span>Таймаут: {timerSeconds}с</span>
										<Wifi className="w-3.5 h-3.5 text-emerald-400" />
									</div>
								</div>

								{/* Terminal Display Message / Interactive center */}
								<div className="my-auto py-3 text-center flex flex-col items-center justify-center gap-2">
									{status === "qr_displayed" ? (
										<div className="flex flex-col items-center gap-2">
											<div className="w-28 h-28 bg-white p-2 rounded-xl border-2 border-emerald-400 flex items-center justify-center shadow-lg">
												<QrCode className="w-full h-full text-slate-950" />
											</div>
											<span className="text-xs font-bold text-emerald-300">ПЛАТИ QR / СБЕРБАНК ОНЛАЙН</span>
										</div>
									) : status === "biometry_scan" ? (
										<div className="flex flex-col items-center gap-2">
											<div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center sber-facepay-active-ring">
												<Smile className="w-10 h-10 text-emerald-300" />
											</div>
											<span className="text-xs font-bold text-emerald-300">3D FacePay: Сканирование лица...</span>
										</div>
									) : (
										<>
											<p className="text-sm sm:text-base font-bold tracking-wide text-emerald-300 leading-snug">
												{statusMessage}
											</p>
											{pinBuffer && (
												<div className="text-2xl font-mono tracking-widest text-emerald-200 mt-1">
													{pinBuffer}
												</div>
											)}
										</>
									)}

									<p className="text-xs text-emerald-400/80 font-mono mt-1">
										СУММА: {((totalBillKop || 1960000) / 100).toFixed(2)} РУБ.
									</p>
								</div>

								{/* Protocol Command Info */}
								<div className="text-[10px] text-emerald-400/60 font-mono pt-2 border-t border-emerald-500/30 flex items-center justify-between">
									<span>Pilot-NT: CMD {getPilotNtCommandCode(operation)}</span>
									<span className="truncate max-w-[200px]">{pilotCommandText}</span>
								</div>
							</div>

							{/* Terminal Action Simulator Buttons */}
							<div className="flex items-center gap-2 flex-wrap">
								<button
									type="button"
									onClick={() => handleStartOperation(operation)}
									className="min-h-[44px] px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
								>
									<RefreshCw className="w-3.5 h-3.5" />
									<span>Повторить запрос (Retry)</span>
								</button>

								{(status === "processing_card" || status === "pin_entry" || status === "biometry_scan" || status === "qr_displayed") && (
									<>
										<button
											type="button"
											onClick={handleSimulateClientAction}
											className="min-h-[44px] px-5 rounded-xl bg-[var(--ok-fg,#059669)] hover:opacity-90 text-[var(--on-teal,#ffffff)] text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
										>
											<Check className="w-4 h-4" />
											<span>
												{status === "processing_card"
													? "Симуляция: Приложить карту"
													: status === "pin_entry"
													? "Симуляция: Ввести PIN и подтвердить"
													: "Симуляция: Завершить оплату"}
											</span>
										</button>

										<button
											type="button"
											onClick={handleSimulateDecline}
											className="min-h-[44px] px-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
										>
											<AlertCircle className="w-3.5 h-3.5" />
											<span>Симуляция: Отказ банка</span>
										</button>
									</>
								)}
							</div>

							{/* Fallback: Automated Alternative Payment Suggestions upon Timeout / Decline */}
							{(status === "pin_timeout" || status === "card_declined" || status === "communication_error") && (
								<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-amber-500/30 space-y-2.5">
									<div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
										<AlertCircle size={16} className="text-amber-600 shrink-0" />
										<span>Таймаут или отказ терминала Сбербанк. Выберите альтернативную оплату:</span>
									</div>
									<div className="flex items-center gap-2 flex-wrap">
										<button
											type="button"
											onClick={() => handleStartOperation("sberpay_qr")}
											className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]/30 text-[var(--teal,#0d9488)] font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-colors"
										>
											<QrCode size={16} />
											<span>SberPay / СБП QR</span>
										</button>
										{onSelectAlternativeMethod && (
											<>
												<button
													type="button"
													onClick={() => {
														onSelectAlternativeMethod("cash");
														onClose();
													}}
													className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-emerald-500/20 transition-colors"
												>
													<CreditCard size={16} />
													<span>Наличные в кассу</span>
												</button>
												<button
													type="button"
													onClick={() => {
														onSelectAlternativeMethod("deposit");
														onClose();
													}}
													className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-amber-500/20 transition-colors"
												>
													<RotateCcw size={16} />
													<span>Семейный баланс / депозит</span>
												</button>
											</>
										)}
									</div>
								</div>
							)}
						</div>

						{/* Bank Slip & Details (Right side: 5 cols) */}
						<div className="lg:col-span-5 flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1 bg-[var(--paper-soft,#f8fafc)] p-0.5 rounded-xl border border-[var(--line,#e2e8f0)]">
									<button
										type="button"
										onClick={() => setActiveSlipTab("customer")}
										className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (
											activeSlipTab === "customer"
												? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-sm"
												: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
										)}
									>
										Чек клиента
									</button>
									<button
										type="button"
										onClick={() => setActiveSlipTab("merchant")}
										className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (
											activeSlipTab === "merchant"
												? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-sm"
												: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
										)}
									>
										Чек клиники
									</button>
								</div>
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={handleCopySlip}
										disabled={!lastResponse}
										title="Скопировать слип-чек"
										className="w-8 h-8 rounded-lg border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] disabled:opacity-40"
									>
										{isCopied ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
									</button>
									<button
										type="button"
										onClick={handlePrintSlip}
										disabled={!lastResponse || isPrinting}
										title="Распечатать чек на терминале"
										className="w-8 h-8 rounded-lg border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] disabled:opacity-40"
									>
										<Printer className={"w-4 h-4 " + (isPrinting ? "animate-spin text-[var(--ok-fg,#059669)]" : "")} />
									</button>
								</div>
							</div>

							{/* Monospace Slip Box */}
							<div className="sber-slip-box p-3 max-h-[300px] overflow-y-auto select-all">
								{lastResponse ? (
									activeSlipTab === "customer" ? lastResponse.customerSlip : lastResponse.merchantSlip
								) : (
									<div className="py-12 text-center text-[var(--muted,#64748b)] font-sans text-xs">
										<p className="font-semibold">Банковский слип еще не сформирован</p>
										<p className="text-[10px] mt-1 opacity-75">Запустите операцию на терминале для получения чека</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between flex-wrap gap-3">
					<div className="text-xs text-[var(--muted,#64748b)]">
						Сбербанк Эквайринг • MCC 8021 • ПАО Сбербанк Генеральная лицензия ЦБ РФ №1481
					</div>
					<div className="flex items-center gap-2">
						{lastResponse?.success && (
							<button
								type="button"
								onClick={handlePrintSlip}
								disabled={isPrinting}
								className="h-11 px-4 rounded-xl border border-[var(--ok-fg,#059669)]/40 bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ok-fg,#059669)] hover:bg-[var(--ok-bg,#f0fdf4)] flex items-center gap-2 cursor-pointer shadow-sm"
							>
								<Printer className={"w-4 h-4 " + (isPrinting ? "animate-spin" : "")} />
								<span>{isPrinting ? "Печать чека..." : "Печать банковского чека"}</span>
							</button>
						)}
						<button
							type="button"
							onClick={onClose}
							className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
						>
							<span>Закрыть</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
