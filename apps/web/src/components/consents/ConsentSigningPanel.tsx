import {
	Download,
	FileText,
	PenTool,
	Printer,
	RotateCcw,
	ShieldCheck,
	Zap,
} from "lucide-react";
import React from "react";
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
}) => {
	// Pointer Event Handlers for SVG Vector Pad
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
			setStrokes((prev) => [...prev, { points: currentPoints, color: "var(--ink)" }]);
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
				borderRadius: "var(--radius-lg, 12px)",
				padding: "1.25rem",
			}}
		>
			{/* Переключение метода: Бумага vs Векторный планшет */}
			<div className="flex items-center justify-between gap-2 flex-wrap pb-1">
				<div className="flex items-center gap-1.5 p-0.5 bg-[var(--paper)] rounded-lg border border-[var(--line)]">
					<button
						type="button"
						className={`consent-mode-btn ${verificationMethod === "paper_physical" ? "active" : ""}`}
						onClick={() => setVerificationMethod("paper_physical")}
						data-testid="tab-method-paper"
						style={{ height: "26px", padding: "0 10px", fontSize: "12px", borderRadius: "6px" }}
					>
						<Printer size={13} />
						<span>Бумажный бланк</span>
					</button>
					<button
						type="button"
						className={`consent-mode-btn ${verificationMethod === "tablet_stylus" ? "active" : ""}`}
						onClick={() => setVerificationMethod("tablet_stylus")}
						data-testid="tab-method-tablet"
						style={{ height: "26px", padding: "0 10px", fontSize: "12px", borderRadius: "6px" }}
					>
						<PenTool size={13} />
						<span>Планшет врача</span>
					</button>
				</div>
				<span className="consent-statutory-badge shrink-0">
					{verificationMethod === "paper_physical" ? "Оригинал в карте" : "Векторная подпись"}
				</span>
			</div>

			{verificationMethod === "paper_physical" ? (
				<>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<ShieldCheck size={22} className="text-[var(--teal,#0d9488)]" />
							<span className="font-bold text-sm">
								Подписание на бумажном носителе (323-ФЗ ст. 20, Приказ МЗ РФ № 1051н)
							</span>
						</div>
						<span className="consent-statutory-badge">
							Оригинал в карте
						</span>
					</div>
					<p className="text-xs text-muted" style={{ margin: 0, lineHeight: 1.5 }}>
						Пациент знакомится с текстом согласия и расписывается шариковой ручкой на бумажном бланке.
						Бумажный оригинал подшивается в медицинскую карту пациента (срок хранения 25 лет).
						В электронной карте фиксируется отметка с криптографическим отпечатком SHA-256.
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
							Оригинал подписан пациентом от руки на бумаге (подшит в карту)
						</span>
					</label>

					<div className="flex items-center gap-3 pt-1 flex-wrap">
						<button
							type="button"
							className="consent-action-btn primary"
							data-testid="btn-confirm-paper-signed"
							onClick={() => onConfirmSign("paper_physical")}
							disabled={isSubmitting}
							style={{
								minHeight: "44px",
								fontSize: "14px",
								fontWeight: "bold",
								background: "var(--teal)",
								color: "var(--on-teal, #ffffff)",
								boxShadow: "var(--shadow-1)",
							}}
						>
							<Zap size={18} />
							<span>
								{activeMode === "packages"
									? `Подтвердить пакет (${packageDocsCount} док.) в 1 клик`
									: "Подтвердить подписание на бумаге (1 клик)"}
							</span>
						</button>
						<button
							type="button"
							className="consent-tool-btn"
							onClick={onPrint}
							title={
								activeMode === "packages"
									? "Многостраничная печать заполненного пакета ИДС (А4)"
									: "Печать заполненного бланка ИДС на принтер (А4)"
							}
						>
							<Printer size={16} />
							<span>{activeMode === "packages" ? "Печать пакета (А4)" : "Печать бланка (А4)"}</span>
						</button>
						<button
							type="button"
							className="consent-tool-btn"
							data-testid="btn-print-blank-consent-inline"
							onClick={onPrintBlank}
							title={
								activeMode === "packages"
									? "Печать чистых бланков всего пакета со строками «________» для ручного заполнения"
									: "Печать чистого бланка со строками «________» для ручного заполнения пациентом"
							}
						>
							<FileText size={16} />
							<span>
								{activeMode === "packages" ? "Печать чистых бланков пакета («________»)" : "Печать чистого бланка («________»)"}
							</span>
						</button>
						<button
							type="button"
							className="consent-tool-btn"
							data-testid="btn-download-pdfa-inline"
							onClick={onDownloadPdfA}
							title="Скачать архивный документ ISO 19005-1 PDF/A-1b с криптографическим отпечатком"
						>
							<Download size={16} />
							<span>Скачать PDF/A</span>
						</button>
					</div>
				</>
			) : (
				<>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<PenTool size={20} className="text-[var(--teal,#0d9488)]" />
							<span className="font-bold text-sm">
								Электронная векторная подпись (сенсорный ввод / стилус)
							</span>
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								className="consent-tool-btn py-1 px-2 text-xs"
								onClick={handleClearStrokes}
								data-testid="btn-clear-vector-strokes"
								title="Очистить поле подписи"
							>
								<RotateCcw size={12} />
								<span>Очистить</span>
							</button>
							<span className="consent-statutory-badge">
								Векторные кривые Безье
							</span>
						</div>
					</div>
					<p className="text-xs text-muted" style={{ margin: 0, lineHeight: 1.5 }}>
						Пациент ставит векторную подпись на экране планшета или монитора. Росчерк сглаживается кубическими кривыми Безье и фиксируется в векторе SVG с отпечатком SHA-256.
					</p>

					{/* Сенсорная SVG-панель без использования Canvas */}
					<div
						style={{
							position: "relative",
							width: "100%",
							height: "140px",
							background: "var(--paper)",
							border: "1.5px dashed var(--line-strong, var(--teal))",
							borderRadius: "8px",
							touchAction: "none",
							userSelect: "none",
						}}
					>
						<svg
							data-testid="consent-vector-pad-svg"
							style={{
								width: "100%",
								height: "100%",
								display: "block",
								cursor: "crosshair",
							}}
							onPointerDown={handlePointerDown}
							onPointerMove={handlePointerMove}
							onPointerUp={handlePointerUp}
							onPointerLeave={handlePointerUp}
						>
							{strokes.length === 0 && currentPoints.length === 0 && (
								<text
									x="50%"
									y="50%"
									textAnchor="middle"
									dominantBaseline="middle"
									fill="var(--muted, #94a3b8)"
									fontSize="13"
									style={{ pointerEvents: "none", userSelect: "none" }}
								>
									Поставьте подпись на сенсорном экране (векторный ввод)
								</text>
							)}
							{strokes.map((stroke, sIdx) => {
								if (stroke.points.length === 1 && stroke.points[0]) {
									return (
										<circle
											key={sIdx}
											cx={stroke.points[0].x}
											cy={stroke.points[0].y}
											r={1.5}
											fill={stroke.color || "var(--ink, #0f172a)"}
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
										stroke={stroke.color || "var(--ink, #0f172a)"}
										strokeWidth={2}
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
									strokeWidth={2}
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							)}
						</svg>
					</div>

					<div className="flex items-center gap-3 pt-1 flex-wrap">
						<button
							type="button"
							className="consent-action-btn primary"
							data-testid="btn-confirm-tablet-signed"
							onClick={() => onConfirmSign("tablet_stylus")}
							disabled={isSubmitting}
							style={{
								minHeight: "44px",
								fontSize: "14px",
								fontWeight: "bold",
								background: "var(--teal)",
								color: "var(--on-teal, #ffffff)",
								boxShadow: "var(--shadow-1)",
							}}
						>
							<Zap size={18} />
							<span>
								{activeMode === "packages"
									? `Подтвердить векторный пакет (${packageDocsCount} док.) в 1 клик`
									: "Подтвердить векторную подпись (1 клик)"}
							</span>
						</button>
						<button
							type="button"
							className="consent-tool-btn"
							data-testid="btn-download-pdfa-tablet"
							onClick={onDownloadPdfA}
							title="Скачать архивный документ ISO 19005-1 PDF/A-1b с векторной подписью"
						>
							<Download size={16} />
							<span>Скачать PDF/A</span>
						</button>
					</div>
				</>
			)}
		</div>
	);
};
