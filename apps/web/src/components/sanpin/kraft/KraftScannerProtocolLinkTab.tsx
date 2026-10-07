/**
 * DENTE CRM — Kraft Package Scanner & Protocol Link Subcomponent
 * SanPiN 3.3686-21 / Fast Hardware Barcode Scanner & Medical Record Link
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8b, 8e (Subcomponents <= 500 lines)
 */

import React from "react";
import {
	AlertOctagon,
	CheckCircle2,
	Sparkles,
	X,
} from "lucide-react";
import type { ParsedKraftBarcode } from "@dental/shared";

export interface KraftScannerProtocolLinkTabProps {
	readonly scannedInput: string;
	readonly onScannedInputChange: (value: string) => void;
	readonly parsedScanned: ParsedKraftBarcode | null;
	readonly onFixateSterilizationNorm: () => void | Promise<void>;
	readonly onAttachScannedTo043: () => void | Promise<void>;
}

export const KraftScannerProtocolLinkTab: React.FC<
	KraftScannerProtocolLinkTabProps
> = ({
	scannedInput,
	onScannedInputChange,
	parsedScanned,
	onFixateSterilizationNorm,
	onAttachScannedTo043,
}) => {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "1.25rem",
				maxWidth: "760px",
				margin: "0 auto",
				width: "100%",
			}}
		>
			{/* Регламентная фиксация стерилизации лотка (Норма) */}
			<div
				style={{
					borderRadius: "10px",
					background: "var(--paper-soft, #f8fafc)",
					border: "1px solid var(--line, #e2e8f0)",
					padding: "1.25rem",
					display: "flex",
					flexDirection: "column",
					gap: "1rem",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						flexWrap: "wrap",
						gap: "0.5rem",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<CheckCircle2 size={20} color="var(--ok-fg, #059669)" />
						<span
							style={{
								fontSize: "0.95rem",
								fontWeight: 700,
								color: "var(--ink)",
							}}
						>
							Фиксация стерилизации лотка
						</span>
					</div>
					<span
						style={{
							fontSize: "0.75rem",
							color: "var(--muted)",
							fontWeight: 600,
						}}
					>
						Тест-индикатор 5 класса • Регламент СанПиН 3.3686-21
					</span>
				</div>

				<div
					style={{
						fontSize: "0.85rem",
						color: "var(--muted)",
						lineHeight: 1.4,
					}}
				>
					Мгновенная фиксация стерильности смотрового или процедурного лотка в
					соответствии с регламентом СанПиН 3.3686-21 для внесения в медицинскую
					карту.
				</div>

				<button
					type="button"
					onClick={onFixateSterilizationNorm}
					className="kraft-btn touch-manipulation"
					style={{
						minHeight: "48px",
						fontSize: "0.95rem",
						fontWeight: 800,
						background: "var(--teal, #0d9488)",
						borderColor: "var(--teal, #0d9488)",
						color: "#ffffff",
						boxShadow: "0 2px 10px rgba(13, 148, 136, 0.3)",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "0.5rem",
						cursor: "pointer",
					}}
					data-testid="btn-fixate-sterilization-norm"
					title="Фиксация стерилизации крафт-пакета по тест-индикатору 5 класса (Норма) для медицинской карты"
				>
					<CheckCircle2 size={18} />
					<span>Стерилизация проведена / Тест-индикатор 5 класса (Норма)</span>
				</button>
			</div>

			{/* Barcode Input */}
			<div
				style={{
					padding: "1.25rem",
					borderRadius: "8px",
					background: "rgba(13, 148, 136, 0.06)",
					border: "1px solid rgba(13, 148, 136, 0.2)",
					display: "flex",
					flexDirection: "column",
					gap: "0.75rem",
				}}
			>
				<label
					style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)" }}
				>
					Штрихкод крафт-пакета (автоматически или вручную):
				</label>
				<div style={{ display: "flex", gap: "0.5rem" }}>
					<input
						type="text"
						value={scannedInput}
						onChange={(e) => onScannedInputChange(e.target.value)}
						placeholder="Отсканируйте штрихкод сканером или введите KP-..."
						style={{
							minHeight: "46px",
							fontSize: "0.95rem",
							width: "100%",
							padding: "0.5rem 0.75rem",
							border: "1px solid var(--line, #cbd5e1)",
							borderRadius: "6px",
							background: "var(--paper, #fff)",
							color: "var(--ink, #0f172a)",
						}}
						data-testid="kraft-modal-scan-input"
					/>
					{scannedInput && (
						<button
							type="button"
							onClick={() => onScannedInputChange("")}
							className="kraft-btn kraft-btn-secondary"
							style={{ minWidth: "46px", padding: 0 }}
							title="Очистить"
						>
							<X size={18} />
						</button>
					)}
				</div>
			</div>

			{/* Scanned Result Card */}
			{parsedScanned ? (
				<div
					style={{
						padding: "1.25rem",
						borderRadius: "8px",
						border: parsedScanned.isExpired
							? "1px solid var(--bad-fg, #ef4444)"
							: "1px solid var(--ok-fg, #10b981)",
						background: parsedScanned.isExpired
							? "rgba(220, 38, 38, 0.06)"
							: "rgba(5, 150, 105, 0.06)",
						display: "flex",
						flexDirection: "column",
						gap: "0.75rem",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						}}
					>
						{parsedScanned.isExpired ? (
							<span
								style={{
									fontSize: "0.85rem",
									fontWeight: 800,
									color: "#b91c1c",
									display: "flex",
									alignItems: "center",
									gap: "0.35rem",
								}}
							>
								<AlertOctagon size={16} /> ПРОСРОЧЕНО (Истек{" "}
								{Math.abs(parsedScanned.daysRemaining)} дн. назад)
							</span>
						) : (
							<span
								style={{
									fontSize: "0.85rem",
									fontWeight: 800,
									color: "#059669",
									display: "flex",
									alignItems: "center",
									gap: "0.35rem",
								}}
							>
								<CheckCircle2 size={16} /> СТЕРИЛЬНО (Годен до{" "}
								{parsedScanned.expDateIso})
							</span>
						)}
						<span
							style={{
								fontSize: "0.8rem",
								color: "var(--muted)",
								fontWeight: 700,
								fontFamily: "monospace",
							}}
						>
							{parsedScanned.barcodeType === "datamatrix_2d"
								? "2D DataMatrix"
								: "1D Code128"}
						</span>
					</div>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
							gap: "0.75rem",
							fontSize: "0.85rem",
						}}
					>
						<div>
							<div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
								Набор инструментов:
							</div>
							<div style={{ fontWeight: 700 }}>
								{parsedScanned.toolSetNameRu}
							</div>
						</div>
						<div>
							<div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
								Стерилизатор и цикл:
							</div>
							<div style={{ fontWeight: 700 }}>
								{parsedScanned.autoclaveId} • Цикл №{parsedScanned.cycleNumber}
							</div>
						</div>
						<div>
							<div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
								Дата упаковки / Срок:
							</div>
							<div style={{ fontWeight: 700 }}>
								{parsedScanned.packDateIso} ({parsedScanned.daysLifespan}{" "}
								сут.)
							</div>
						</div>
					</div>

					{/* Medical card record formatted preview */}
					<div
						style={{
							padding: "0.75rem",
							borderRadius: "6px",
							background: "var(--paper, #ffffff)",
							border: "1px solid var(--line, #e2e8f0)",
							fontSize: "0.8rem",
							fontStyle: "italic",
						}}
					>
						<strong>Запись для медицинской карты:</strong>{" "}
						{parsedScanned.formattedProtocolRecord043}
					</div>

					<button
						type="button"
						onClick={onAttachScannedTo043}
						className="kraft-btn kraft-btn-primary"
						style={{
							minHeight: "48px",
							fontSize: "0.95rem",
							fontWeight: 800,
							background: parsedScanned.isExpired
								? "var(--warning-surface, #d97706)"
								: "var(--ok-fg, #059669)",
							color: "#ffffff",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "0.5rem",
						}}
						data-testid="attach-to-043-btn"
					>
						<Sparkles size={18} />
						<span>Привязать к протоколу приёма</span>
					</button>
				</div>
			) : (
				<div
					style={{
						textAlign: "center",
						padding: "2rem",
						color: "var(--muted)",
						fontSize: "0.88rem",
					}}
				>
					Отсканируйте штрихкод для мгновенной расшифровки и валидации сроков
					годности.
				</div>
			)}
		</div>
	);
};

export default KraftScannerProtocolLinkTab;
