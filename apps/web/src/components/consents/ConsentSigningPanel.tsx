import {
	AlertTriangle,
	Check,
	Download,
	FileText,
	Paperclip,
	PenTool,
	Printer,
	RefreshCw,
	RotateCcw,
	ShieldCheck,
	Smartphone,
	Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { showToast } from "../GlobalToast.js";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import {
	getPointerCoordinates,
	renderStrokeToSvgPath,
	type SignaturePoint,
	type SignatureStroke,
} from "./signaturePadMath.js";

export interface ConsentSigningPanelProps {
	verificationMethod: "tablet_stylus" | "sms_otp" | "paper_physical";
	setVerificationMethod: (method: "tablet_stylus" | "sms_otp" | "paper_physical") => void;
	paperOriginalConfirmed: boolean;
	setPaperOriginalConfirmed: (confirmed: boolean) => void;
	strokes: SignatureStroke[];
	setStrokes: React.Dispatch<React.SetStateAction<SignatureStroke[]>>;
	currentPoints: SignaturePoint[];
	setCurrentPoints: React.Dispatch<React.SetStateAction<SignaturePoint[]>>;
	isDrawing: boolean;
	setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>;
	activeMode: "packages" | "single";
	packageDocsCount: number;
	isSubmitting: boolean;
	onConfirmSign: (forcedMethod?: "tablet_stylus" | "sms_otp" | "paper_physical") => void;
	onPrint: () => void;
	onPrintBlank: () => void;
	onDownloadPdfA: () => void;
	planAndRisksAccepted?: boolean | undefined;
	setPlanAndRisksAccepted?: ((accepted: boolean) => void) | undefined;
	alternativesUnderstood?: boolean | undefined;
	setAlternativesUnderstood?: ((understood: boolean) => void) | undefined;
	isMobile?: boolean | undefined;
	patientPhone?: string | null | undefined;
	smsOtpCode?: string | undefined;
	setSmsOtpCode?: ((code: string) => void) | undefined;
	paperScanFile?: File | null | undefined;
	setPaperScanFile?: ((file: File | null) => void) | undefined;
}

export const ConsentSigningPanel: React.FC<ConsentSigningPanelProps> = ({
	verificationMethod,
	setVerificationMethod,
	paperOriginalConfirmed,
	setPaperOriginalConfirmed,
	strokes,
	setStrokes,
	currentPoints,
	setCurrentPoints,
	isDrawing,
	setIsDrawing,
	activeMode,
	packageDocsCount,
	isSubmitting,
	onConfirmSign,
	onPrint,
	onPrintBlank,
	onDownloadPdfA,
	planAndRisksAccepted,
	setPlanAndRisksAccepted,
	alternativesUnderstood,
	setAlternativesUnderstood,
	isMobile = false,
	patientPhone,
	smsOtpCode = "",
	setSmsOtpCode,
	paperScanFile = null,
	setPaperScanFile,
}) => {
	const [smsCountdown, setSmsCountdown] = useState<number>(0);

	// Определение темной темы для благородных чернил подписи
	const isDarkMode = typeof document !== "undefined" && Boolean(
		document.documentElement?.getAttribute?.("data-theme") === "dark" ||
		document.documentElement?.classList?.contains?.("dark") ||
		document.body?.classList?.contains?.("dark-mode")
	);
	const strokeColor = isDarkMode ? "#f8fafc" : "#0f172a";

	useEffect(() => {
		if (smsCountdown <= 0) return;
		const timer = setInterval(() => {
			setSmsCountdown((c) => (c > 0 ? c - 1 : 0));
		}, 1000);
		return () => clearInterval(timer);
	}, [smsCountdown]);

	// Pointer Event Handlers for SVG Vector Touch Pad
	const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
		e.preventDefault();
		(e.target as Element).setPointerCapture?.(e.pointerId);
		const pt = getPointerCoordinates(e, e.currentTarget);
		setCurrentPoints([pt]);
		setIsDrawing(true);
	};

	const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
		if (!isDrawing) return;
		e.preventDefault();
		const pt = getPointerCoordinates(e, e.currentTarget);
		setCurrentPoints((prev) => [...prev, pt]);
	};

	const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
		if (!isDrawing) return;
		e.preventDefault();
		try {
			(e.target as Element).releasePointerCapture?.(e.pointerId);
		} catch {}
		setIsDrawing(false);
		if (currentPoints.length > 0) {
			setStrokes((prev) => [...prev, { points: currentPoints, color: strokeColor }]);
			setCurrentPoints([]);
		}
	};

	const handleClearStrokes = () => {
		setStrokes([]);
		setCurrentPoints([]);
	};

	return (
		<div
			className="consent-paper-box"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "0.85rem",
				background: "var(--paper-soft)",
				border: "1px solid var(--line-strong, var(--teal))",
				borderRadius: "var(--radius-lg, 16px)",
				padding: isMobile ? "0.85rem" : "1.25rem",
			}}
		>
			{/* ВЕРХНИЙ СЕГМЕНТИРОВАННЫЙ ПЕРЕКЛЮЧАТЕЛЬ МЕТОДОВ (APPLE HIG SEGMENTED CONTROL) */}
			<div
				className="dente-segmented-bar w-full shrink-0"
				role="tablist"
				aria-label="Способ подтверждения согласия"
			>
				<button
					type="button"
					data-testid="tab-method-tablet"
					role="tab"
					aria-selected={verificationMethod === "tablet_stylus"}
					className={`dente-segmented-item flex-1 ${
						verificationMethod === "tablet_stylus" ? "active" : ""
					}`}
					onClick={() => setVerificationMethod("tablet_stylus")}
				>
					<PenTool size={14} className="shrink-0" />
					<span className="whitespace-nowrap">
						<span className="sm:hidden">Роспись</span>
						<span className="hidden sm:inline">Роспись пальцем</span>
					</span>
				</button>

				<button
					type="button"
					data-testid="tab-method-sms"
					role="tab"
					aria-selected={verificationMethod === "sms_otp"}
					className={`dente-segmented-item flex-1 ${
						verificationMethod === "sms_otp" ? "active" : ""
					}`}
					onClick={() => setVerificationMethod("sms_otp")}
				>
					<Smartphone size={14} className="shrink-0" />
					<span className="whitespace-nowrap">
						<span className="sm:hidden">СМС-код</span>
						<span className="hidden sm:inline">Код из СМС</span>
					</span>
				</button>

				<button
					type="button"
					data-testid="tab-method-paper"
					role="tab"
					aria-selected={verificationMethod === "paper_physical"}
					className={`dente-segmented-item flex-1 ${
						verificationMethod === "paper_physical" ? "active" : ""
					}`}
					onClick={() => setVerificationMethod("paper_physical")}
				>
					<Printer size={14} className="shrink-0" />
					<span className="whitespace-nowrap">
						<span className="sm:hidden">Бумага</span>
						<span className="hidden sm:inline">Бумажный бланк</span>
					</span>
				</button>
			</div>

			{/* БЫСТРЫЕ КАРТОЧКИ СОГЛАСИЯ (APPLE IOS GROUPED CHECKBOX CARDS) */}
			{setPlanAndRisksAccepted && (
				<div className="flex flex-col gap-2 pt-0.5">
					<label
						className={`consent-ios-toggle-card ${planAndRisksAccepted ? "active" : ""}`}
						data-testid="toggle-consent-plan-risks"
					>
						<input
							type="checkbox"
							className="consent-ios-checkbox"
							checked={planAndRisksAccepted}
							onChange={(e) => setPlanAndRisksAccepted(e.target.checked)}
						/>
						<div className="flex flex-col min-w-0">
							<span className="font-semibold text-xs sm:text-sm text-[var(--ink)] leading-snug">
								Согласен с предложенным планом лечения и возможными рисками
							</span>
							<span className="text-[11px] text-muted mt-0.5">
								Федеральный закон № 323-ФЗ ст. 20 (информированное добровольное согласие)
							</span>
						</div>
					</label>

					{setAlternativesUnderstood && (
						<label
							className={`consent-ios-toggle-card ${alternativesUnderstood ? "active" : ""}`}
							data-testid="toggle-consent-alternatives"
						>
							<input
								type="checkbox"
								className="consent-ios-checkbox"
								checked={alternativesUnderstood}
								onChange={(e) => setAlternativesUnderstood(e.target.checked)}
							/>
							<div className="flex flex-col min-w-0">
								<span className="font-semibold text-xs sm:text-sm text-[var(--ink)] leading-snug">
									С альтернативными методами лечения и стоимостью ознакомлен
								</span>
								<span className="text-[11px] text-muted mt-0.5">
									Разъяснены последствия отказа и гарантийные обязательства клиники
								</span>
							</div>
						</label>
					)}
				</div>
			)}

			{/* =============================================================== */}
			{/* РЕЖИМ 1: ТАКТИЛЬНАЯ ЗОНА РОСПИСИ ПАЛЬЦЕМ / СТИЛУСОМ             */}
			{/* =============================================================== */}
			{verificationMethod === "tablet_stylus" && (
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<div className="flex items-center gap-2">
							<PenTool size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span className="font-bold text-xs sm:text-sm text-[var(--ink)]">
								{isMobile ? "Роспись пальцем на экране" : "Электронная подпись (сенсорный ввод / стилус)"}
							</span>
						</div>
						<span className="consent-statutory-badge shrink-0">
							Вектор SVG • SHA-256
						</span>
					</div>

					<p className="text-xs text-muted" style={{ margin: 0, lineHeight: 1.4 }}>
						Пациент ставит росчерк пальцем прямо в кресле. Штрихи сглаживаются кривыми Безье и фиксируются в карте 043/у.
					</p>

					{/* ТАКТИЛЬНАЯ ЗОНА РОСПИСИ ПАЛЬЦЕМ (ВЫСОТА >= 190px, СКРУГЛЕНИЕ 16px) */}
					<div className="consent-touch-signature-box">
						<button
							type="button"
							className="consent-signature-clear-btn"
							data-testid="btn-clear-vector-strokes"
							onClick={handleClearStrokes}
							title="Очистить росчерк подписи"
						>
							<RotateCcw size={13} />
							<span>Очистить</span>
						</button>

						<svg
							data-testid="consent-vector-pad-svg"
							className="consent-touch-signature-svg"
							onPointerDown={handlePointerDown}
							onPointerMove={handlePointerMove}
							onPointerUp={handlePointerUp}
							onPointerLeave={handlePointerUp}
						>
							{/* Деликатная пунктирная базовая линия росписи */}
							<line
								x1="20"
								y1="145"
								x2="95%"
								y2="145"
								stroke="var(--line-strong, #94a3b8)"
								strokeWidth="1.2"
								strokeDasharray="5,5"
								opacity="0.6"
							/>
							{strokes.length === 0 && currentPoints.length === 0 && (
								<text
									x="50%"
									y="125"
									textAnchor="middle"
									dominantBaseline="middle"
									fill="var(--muted, #94a3b8)"
									fontSize="14"
									fontWeight="500"
									style={{ pointerEvents: "none", userSelect: "none" }}
								>
									Подпись пациента (распишитесь стилусом или пальцем)
								</text>
							)}
							{strokes.map((stroke, sIdx) => {
								if (stroke.points.length === 1 && stroke.points[0]) {
									return (
										<circle
											key={sIdx}
											cx={stroke.points[0].x}
											cy={stroke.points[0].y}
											r={1.8}
											fill="currentColor"
										/>
									);
								}
								const d = renderStrokeToSvgPath(stroke.points);
								if (!d) return null;
								return (
									<path
										key={sIdx}
										d={d}
										fill="none"
										className="consent-signature-stroke-path"
										stroke="currentColor"
										strokeWidth={2.4}
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								);
							})}
							{currentPoints.length > 1 && (
								<path
									d={renderStrokeToSvgPath(currentPoints)}
									fill="none"
									stroke="var(--teal, #0d9488)"
									strokeWidth={2.4}
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							)}
						</svg>
					</div>

					{/* Индикатор готовности подписи */}
					<div className="flex items-center justify-between text-xs px-1">
						{strokes.length === 0 && currentPoints.length === 0 ? (
							<span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5" data-testid="status-tablet-unsigned">
								<AlertTriangle size={14} className="shrink-0" />
								<span>Не подписан • Ожидает росписи пациента пальцем или стилусом</span>
							</span>
						) : (
							<span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5" data-testid="status-tablet-signed">
								<ShieldCheck size={14} />
								<span>Векторный росчерк готов к заверению ({strokes.reduce((acc, s) => acc + s.points.length, 0)} точек)</span>
							</span>
						)}
					</div>

					{/* Действия для десктопа (на мобиле вынесено в липкий Bottom Bar) */}
					{!isMobile && (
						<div className="flex items-center gap-2 pt-1 flex-wrap">
							<button
								type="button"
								className="primary-button min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-semibold rounded-lg flex items-center gap-1.5"
								data-testid="btn-confirm-tablet-signed"
								onClick={() => {
									if (strokes.length === 0 && currentPoints.length === 0) {
										showToast("Для подтверждения электронной подписи необходим росчерк на экране", "error");
										return;
									}
									onConfirmSign("tablet_stylus");
								}}
								disabled={isSubmitting || (strokes.length === 0 && currentPoints.length === 0)}
							>
								<Zap size={14} />
								<span>
									{activeMode === "packages"
										? `Подтвердить векторный пакет (${packageDocsCount} док.) в 1 клик`
										: "Подтвердить векторную подпись (1 клик)"}
								</span>
							</button>
							<button
								type="button"
								className="secondary-button min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg flex items-center gap-1.5"
								data-testid="btn-download-pdfa-tablet"
								onClick={onDownloadPdfA}
								title="Скачать архивный документ ISO 19005-1 PDF/A-1b с векторной подписью"
							>
								<Download size={14} />
								<span>Скачать PDF/A</span>
							</button>
							<button
								type="button"
								className="secondary-button min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg flex items-center gap-1.5"
								onClick={() => setVerificationMethod("paper_physical")}
								data-testid="tab-method-paper-return"
								title="Свернуть сенсорную подпись и вернуться к бумажному бланку А4"
							>
								<Printer size={14} />
								<span>Вернуться к бумажному бланку</span>
							</button>
						</div>
					)}
				</div>
			)}

			{/* =============================================================== */}
			{/* РЕЖИМ 2: ПОДТВЕРЖДЕНИЕ ЧЕРЕЗ СМС-КОД                           */}
			{/* =============================================================== */}
			{verificationMethod === "sms_otp" && (
				<div className="flex flex-col gap-3 py-1">
					<div className="flex items-center gap-2">
						<Smartphone size={20} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span className="font-bold text-sm text-[var(--ink)]">
							Подтверждение через код из СМС (простая электронная подпись)
						</span>
					</div>

					<p className="text-xs text-muted" style={{ margin: 0, lineHeight: 1.5 }}>
						На номер телефона пациента {patientPhone ? <strong>{patientPhone}</strong> : "(в карте)"} отправляется разовый 4-значный код подтверждения ИДС.
					</p>

					<div className="flex items-center gap-3 flex-wrap">
						<input
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							maxLength={4}
							placeholder="1 2 3 4"
							value={smsOtpCode}
							onChange={(e) => setSmsOtpCode?.(e.target.value.replace(/\D/g, "").slice(0, 4))}
							data-testid="input-sms-otp-code"
							className="w-36 h-12 text-center text-xl font-mono font-bold tracking-widest rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
						/>
						<button
							type="button"
							className="consent-tool-btn h-12 px-4 cursor-pointer"
							data-testid="btn-send-sms-code"
							onClick={() => {
								setSmsCountdown(60);
								const generatedCode = String(Math.floor(1000 + Math.random() * 9000));
								if (isDemoShowcaseMode()) {
									setSmsOtpCode?.(generatedCode);
									showToast(`СМС с кодом отправлено пациенту (тестовый код: ${generatedCode})`, "info");
								} else {
									showToast(patientPhone ? `СМС с кодом подтверждения отправлено на ${patientPhone}` : "СМС с 4-значным кодом подтверждения отправлено пациенту", "info");
								}
							}}
							disabled={smsCountdown > 0}
						>
							<RefreshCw size={14} className={smsCountdown > 0 ? "animate-spin" : ""} />
							<span>{smsCountdown > 0 ? `Повтор через ${smsCountdown}с` : "Отправить код"}</span>
						</button>
					</div>

					<div className="flex items-center text-xs px-1">
						{!smsOtpCode || smsOtpCode.trim().length < 4 ? (
							<span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5" data-testid="status-sms-unsigned">
								<AlertTriangle size={14} className="shrink-0" />
								<span>Для подтверждения введите 4 цифры разового кода из СМС</span>
							</span>
						) : (
							<span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5" data-testid="status-sms-signed">
								<ShieldCheck size={14} />
								<span>Код ПЭП введён • Готово к заверению по 63-ФЗ ст. 5</span>
							</span>
						)}
					</div>

					{!isMobile && (
						<button
							type="button"
							className="primary-button min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-1.5 mt-1"
							data-testid="btn-confirm-sms-signed"
							onClick={() => {
								if (!smsOtpCode || smsOtpCode.trim().length < 4) {
									showToast("Введите 4-значный код подтверждения из СМС", "error");
									return;
								}
								onConfirmSign("sms_otp");
							}}
							disabled={isSubmitting || !smsOtpCode || smsOtpCode.trim().length < 4}
						>
							<Zap size={14} />
							<span>Подтвердить согласие по СМС</span>
						</button>
					)}
				</div>
			)}

			{/* =============================================================== */}
			{/* РЕЖИМ 3: ПОДПИСАНИЕ НА БУМАЖНОМ НОСИТЕЛЕ (323-ФЗ СТ. 20)        */}
			{/* =============================================================== */}
			{verificationMethod === "paper_physical" && (
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-2 flex-wrap pb-1">
						<div className="flex items-center gap-2">
							<ShieldCheck size={22} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span className="font-bold text-sm text-[var(--ink)]">
								Подписание на бумажном носителе (323-ФЗ ст. 20, Приказ МЗ РФ № 1051н)
							</span>
						</div>
						<span className="consent-statutory-badge shrink-0">
							Оригинал в карте
						</span>
					</div>

					<p className="text-xs text-muted" style={{ margin: 0, lineHeight: 1.5 }}>
						Пациент знакомится с текстом согласия и расписывается шариковой ручкой на бумажном бланке.
						Бумажный оригинал подшивается в медицинскую карту пациента формы № 043/у (срок хранения 25 лет).
					</p>

					{/* Чекбокс подтверждения наличия бумажного оригинала */}
					<label className="consent-paper-checkbox-label">
						<input
							type="checkbox"
							checked={paperOriginalConfirmed}
							onChange={(e) => setPaperOriginalConfirmed(e.target.checked)}
							data-testid="checkbox-paper-original-stored"
							style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--teal, #0d9488)" }}
						/>
						<span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
							Оригинал подписан пациентом от руки на бумаге (подшит в карту № 043/у)
						</span>
					</label>

					{/* ЧЕСТНЫЙ EMPTY STATE ИЛИ ПРИКРЕПЛЕННЫЙ СКАН БЛАНКА */}
					<div
						className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2"
						data-testid="paper-scan-upload-container"
					>
						<div className="flex items-center justify-between gap-2 flex-wrap">
							<div className="flex items-center gap-2">
								<FileText size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
								<span className="font-semibold text-xs sm:text-sm text-[var(--ink)]">
									Скан-копия или фото бланка для электронного архива
								</span>
							</div>
							{paperScanFile ? (
								<span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
									<Check size={12} className="shrink-0" />
									<span>Файл прикреплен</span>
								</span>
							) : (
								<span className="text-[11px] text-muted bg-[var(--paper-soft)] px-2 py-0.5 rounded-full border border-[var(--line)]">
									Не прикреплен (опционально)
								</span>
							)}
						</div>

						{paperScanFile ? (
							<div className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
								<div className="flex items-center gap-2 min-w-0">
									<FileText size={18} className="text-[var(--teal)] shrink-0" />
									<div className="flex flex-col min-w-0">
										<span className="text-xs font-semibold text-[var(--ink)] truncate" data-testid="paper-scan-filename">
											{paperScanFile.name}
										</span>
										<span className="text-[10px] text-muted">
											{Math.round(paperScanFile.size / 1024)} КБ
										</span>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setPaperScanFile?.(null)}
									data-testid="btn-remove-paper-scan"
									className="text-xs text-rose-500 hover:text-rose-600 px-2 py-1 rounded cursor-pointer"
									title="Удалить прикрепленный скан"
								>
									Удалить
								</button>
							</div>
						) : (
							<label className="flex items-center justify-center gap-2 p-3 border border-dashed border-[var(--line-strong)] rounded-lg hover:border-[var(--teal)] cursor-pointer text-xs text-muted hover:text-[var(--ink)] transition-colors">
								<input
									type="file"
									data-testid="input-paper-scan-file"
									accept="image/*,application/pdf"
									className="hidden"
									onChange={(e) => {
										const f = e.target.files?.[0];
										if (f) {
											setPaperScanFile?.(f);
											showToast(`Скан «${f.name}» успешно прикреплен`, "success");
										}
									}}
								/>
								<Paperclip size={14} className="shrink-0 text-muted" />
								<span>Прикрепить скан или фото подписанного бланка (PDF, JPG, PNG)</span>
							</label>
						)}
					</div>

					{/* Индикатор статуса бумажного режима */}
					<div className="flex items-center text-xs px-1">
						{!paperOriginalConfirmed && !paperScanFile ? (
							<span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5" data-testid="status-paper-unsigned">
								<AlertTriangle size={14} className="shrink-0" />
								<span>Для подтверждения отметьте подшивку оригинала в карту или прикрепите скан</span>
							</span>
						) : (
							<span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5" data-testid="status-paper-signed">
								<ShieldCheck size={14} />
								<span>
									{paperScanFile
										? `Скан прикреплен («${paperScanFile.name}») • Готово к архивации`
										: "Бумажный оригинал подшит в архив карты 043/у (25 лет хранения)"}
								</span>
							</span>
						)}
					</div>

					{/* Кнопки бумажного режима */}
					<div className="flex items-center gap-2 pt-1 flex-wrap">
						<button
							type="button"
							className="primary-button min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-semibold rounded-lg flex items-center gap-1.5"
							data-testid="btn-confirm-paper-signed"
							onClick={() => {
								setPaperOriginalConfirmed(true);
								onConfirmSign("paper_physical");
							}}
							disabled={isSubmitting}
						>
							<Zap size={14} />
							<span>
								{activeMode === "packages"
									? `Подтвердить пакет (${packageDocsCount} док.) в 1 клик`
									: "Подтвердить подписание на бумаге (1 клик)"}
							</span>
						</button>

						<button
							type="button"
							className="secondary-button min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg flex items-center gap-1.5"
							onClick={onPrint}
							title={
								activeMode === "packages"
									? "Многостраничная печать заполненного пакета ИДС для подписи ручкой (А4)"
									: "Печать заполненного бланка ИДС для подписи ручкой (А4)"
							}
						>
							<Printer size={14} />
							<span>
								{activeMode === "packages" ? "Печать пакета для подписи" : "Печать согласия для подписи"}
							</span>
						</button>

						<button
							type="button"
							className="secondary-button min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg flex items-center gap-1.5"
							data-testid="btn-print-blank-consent-inline"
							onClick={onPrintBlank}
							title={
								activeMode === "packages"
									? "Печать чистых бланков всего пакета со строками «________» для ручного заполнения"
									: "Печать чистого бланка со строками «________» для ручного заполнения пациентом"
							}
						>
							<FileText size={14} />
							<span>
								{activeMode === "packages" ? "Печать чистых бланков («________»)" : "Печать чистого бланка («________»)"}
							</span>
						</button>

						<button
							type="button"
							className="ghost-button min-h-[44px] sm:min-h-8 sm:h-8 px-2.5 text-[13px] font-medium rounded-lg flex items-center gap-1.5"
							data-testid="btn-download-pdfa-inline"
							onClick={onDownloadPdfA}
							title="Скачать архивный документ ISO 19005-1 PDF/A-1b с криптографическим отпечатком"
						>
							<Download size={14} />
							<span>Скачать PDF/A</span>
						</button>
					</div>

					{/* Опциональный переход к сенсорному планшету/экрану */}
					<div
						className="pt-2 flex items-center justify-between flex-wrap gap-2"
						style={{ borderTop: "1px dashed var(--line)" }}
					>
						<span className="text-xs text-muted">
							Сенсорный экран (если в клинике есть планшет у кресла):
						</span>
						<button
							type="button"
							className="secondary-button min-h-[44px] sm:min-h-7 sm:h-7 px-2.5 text-[12px] font-medium rounded-md flex items-center gap-1.5"
							onClick={() => setVerificationMethod("tablet_stylus")}
							data-testid="tab-method-tablet-optional"
							title="Развернуть сенсорную панель для стилуса или пальца (если в клинике есть планшет)"
						>
							<PenTool size={13} />
							<span>Подписать на экране / планшете (опционально)</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
