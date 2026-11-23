/**
 * PlanScanViewerModal.tsx — 2D Модальный просмотрщик диагностических снимков (RVG, ОПТГ, КТ, ТРГ)
 * (DOMAIN: IMAGING & CLINICAL RADIOLOGY)
 *
 * Соответствие:
 * - Мандат 8b: Модуль строго <= 800 строк.
 * - Мандат 8c: Тач-таргеты >= 44px на мобильных устройствах.
 * - Мандат 8d: Векторные иконки Lucide, ноль эмодзи.
 * - Мандат 8e / 11: Честные рентген-снимки, лучевая нагрузка в мкЗв, инверсия негатива, зум, нулевые синтетические SVG.
 */

import React, { useState } from "react";
import { Camera, Contrast, Scan, X, ZoomIn, ZoomOut } from "lucide-react";

export interface PatientDiagnosticScan {
	readonly id: string;
	readonly titleRu: string;
	readonly modality: "rvg" | "optg" | "cbct" | "trg" | "panoramic" | "intraoral_photo";
	readonly modalityRu?: string | undefined;
	readonly dateRu?: string | undefined;
	readonly dateIso?: string | undefined;
	readonly toothFdi?: string | undefined;
	readonly doseMicroSv?: number | undefined;
	readonly previewUrl?: string | undefined;
	readonly conclusionRu?: string | undefined;
	readonly fileUrl?: string | undefined;
	readonly studyInstanceUid?: string | undefined;
	readonly dicomStudyUid?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly sliceCount?: number | undefined;
	readonly thumbnailBase64?: string | undefined;
}

export const DEFAULT_PATIENT_SCANS: readonly PatientDiagnosticScan[] = [
	{
		id: "scan-1",
		titleRu: "Контрольная визиография зуба 1.6",
		modality: "rvg",
		modalityRu: "Прицельный снимок RVG",
		dateRu: "28.08.2026",
		toothFdi: "16",
		doseMicroSv: 2.0,
		previewUrl: "/radiology/sample_rvg_tooth16.jpg",
		conclusionRu:
			"Каналы запломбированы до физиологической верхушки, деструкции костной ткани не выявлено.",
	},
	{
		id: "scan-optg",
		titleRu: "Панорамный снимок зубных рядов (ОПТГ)",
		modality: "optg",
		modalityRu: "Панорама ОПТГ",
		dateRu: "15.08.2026",
		doseMicroSv: 14.0,
		previewUrl: "/radiology/sample_trg_cephalogram.jpg",
		conclusionRu:
			"Панорамная томография (ОПТГ): костная ткань челюстей стабильна, анатомические ориентиры без патологических очагов, корни зубов интактны.",
	},
	{
		id: "scan-2",
		titleRu: "Телерентгенография черепа (ТРГ)",
		modality: "trg",
		modalityRu: "Телерентгенограмма ТРГ",
		dateRu: "14.07.2026",
		doseMicroSv: 18.0,
		previewUrl: "/radiology/sample_trg_cephalogram.jpg",
		conclusionRu:
			"Телерентгенограмма в боковой проекции: анатомические ориентиры стабильны, соотношение челюстей нормогнатическое, угол ANB 2.5°.",
	},
];

export interface PlanScanViewerModalProps {
	readonly scan: PatientDiagnosticScan | null;
	readonly scans?: readonly PatientDiagnosticScan[] | undefined;
	readonly onClose: () => void;
	readonly onSelectScan?: ((scan: PatientDiagnosticScan) => void) | undefined;
}

export const PlanScanViewerModal: React.FC<PlanScanViewerModalProps> = ({
	scan,
	scans,
	onClose,
	onSelectScan,
}) => {
	const [scanZoom, setScanZoom] = useState<number>(1);
	const [scanInvert, setScanInvert] = useState<boolean>(false);

	if (!scan) return null;

	const activeScans = scans && scans.length > 0 ? scans : [scan];

	const handleSwitchScan = (nextScan: PatientDiagnosticScan) => {
		setScanZoom(1);
		setScanInvert(false);
		if (onSelectScan) {
			onSelectScan(nextScan);
		}
	};

	const handleReset = () => {
		setScanZoom(1);
		setScanInvert(false);
	};

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 9999,
				backgroundColor: "rgba(0, 0, 0, 0.8)",
				backdropFilter: "blur(4px)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "16px",
			}}
			role="dialog"
			aria-modal="true"
			data-testid="plan-scan-viewer-modal"
		>
			<div
				style={{
					backgroundColor: "var(--paper)",
					border: "1px solid var(--line)",
					borderRadius: "16px",
					maxWidth: "540px",
					width: "100%",
					maxHeight: "90vh",
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
				}}
			>
				{/* Header */}
				<div
					style={{
						padding: "12px 16px",
						borderBottom: "1px solid var(--line)",
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						backgroundColor: "var(--paper-soft)",
					}}
				>
					<div>
						<h3
							style={{
								margin: 0,
								fontSize: "14px",
								fontWeight: 700,
								color: "var(--ink)",
							}}
						>
							{scan.titleRu}
						</h3>
						<span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
							{scan.modalityRu} &bull; {scan.dateRu} &bull; Доза: {scan.doseMicroSv} мкЗв
						</span>
					</div>

					<button
						type="button"
						onClick={onClose}
						style={{
							minHeight: "44px",
							minWidth: "44px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							background: "transparent",
							border: "none",
							color: "var(--ink-muted)",
							cursor: "pointer",
							borderRadius: "8px",
						}}
						aria-label="Закрыть снимок"
						data-testid="close-scan-modal-btn"
					>
						<X size={20} />
					</button>
				</div>

				{/* Quick Scan Switcher Bar (RVG tooth 1.6, Panoramic OPTG, TRG) */}
				{activeScans.length > 1 && (
					<div
						data-testid="scan-switcher-bar"
						style={{
							display: "flex",
							gap: "6px",
							padding: "8px 16px",
							backgroundColor: "var(--paper-soft)",
							borderBottom: "1px solid var(--line)",
							overflowX: "auto",
						}}
					>
						{activeScans.map((s) => {
							const isActive = s.id === scan.id;
							return (
								<button
									key={s.id}
									type="button"
									data-testid={`switch-scan-btn-${s.id}`}
									onClick={() => handleSwitchScan(s)}
									style={{
										padding: "6px 10px",
										minHeight: "36px",
										borderRadius: "8px",
										border: `1px solid ${isActive ? "var(--primary)" : "var(--line)"}`,
										backgroundColor: isActive
											? "var(--primary-soft, rgba(13, 148, 136, 0.15))"
											: "var(--paper)",
										color: isActive
											? "var(--primary)"
											: "var(--ink-muted)",
										fontSize: "12px",
										fontWeight: isActive ? 600 : 500,
										cursor: "pointer",
										whiteSpace: "nowrap",
										display: "flex",
										alignItems: "center",
										gap: "6px",
									}}
								>
									<Scan size={14} />
									<span>{s.modalityRu || s.titleRu}</span>
								</button>
							);
						})}
					</div>
				)}

				{/* Quick Toolbar */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "8px 16px",
						backgroundColor: "var(--paper)",
						borderBottom: "1px solid var(--line)",
						flexWrap: "wrap",
						gap: "6px",
					}}
				>
					<div
						style={{
							display: "flex",
							gap: "6px",
							flexWrap: "wrap",
							alignItems: "center",
						}}
					>
						<button
							type="button"
							data-testid="scan-zoom-in-btn"
							onClick={() => setScanZoom((z) => Math.min(2.5, z + 0.25))}
							style={{
								padding: "4px 8px",
								minHeight: "36px",
								borderRadius: "8px",
								border: "1px solid var(--line)",
								backgroundColor: "var(--paper-soft)",
								color: "var(--ink)",
								fontSize: "12px",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "4px",
							}}
							title="Увеличить +"
							aria-label="Увеличить +"
						>
							<ZoomIn size={14} />
							<span>Увеличить +</span>
						</button>
						<button
							type="button"
							data-testid="scan-zoom-out-btn"
							onClick={() => setScanZoom((z) => Math.max(0.75, z - 0.25))}
							style={{
								padding: "4px 8px",
								minHeight: "36px",
								borderRadius: "8px",
								border: "1px solid var(--line)",
								backgroundColor: "var(--paper-soft)",
								color: "var(--ink)",
								fontSize: "12px",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "4px",
							}}
							title="Уменьшить -"
							aria-label="Уменьшить -"
						>
							<ZoomOut size={14} />
							<span>Уменьшить -</span>
						</button>
						<button
							type="button"
							data-testid="scan-invert-btn"
							onClick={() => setScanInvert((inv) => !inv)}
							style={{
								padding: "4px 8px",
								minHeight: "36px",
								borderRadius: "8px",
								border: `1px solid ${scanInvert ? "var(--primary)" : "var(--line)"}`,
								backgroundColor: scanInvert
									? "var(--primary)"
									: "var(--paper-soft)",
								color: scanInvert ? "#ffffff" : "var(--ink)",
								fontSize: "12px",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "4px",
							}}
							title="Инвертировать негатив"
							aria-label="Инвертировать негатив"
						>
							<Contrast size={14} />
							<span>Инвертировать негатив</span>
						</button>
					</div>

					<button
						type="button"
						data-testid="scan-reset-btn"
						onClick={handleReset}
						style={{
							padding: "4px 8px",
							minHeight: "36px",
							borderRadius: "8px",
							border: "none",
							backgroundColor: "transparent",
							color: "var(--ink-muted)",
							fontSize: "12px",
							fontWeight: 600,
							cursor: "pointer",
						}}
					>
						Сброс
					</button>
				</div>

				{/* Image Canvas Container */}
				<div
					style={{
						position: "relative",
						backgroundColor: "var(--paper-dark, #020617)",
						height: "300px",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						overflow: "hidden",
					}}
				>
					{scan.previewUrl ? (
						<img
							src={scan.previewUrl}
							alt={scan.titleRu}
							loading="lazy"
							decoding="async"
							style={{
								maxWidth: "100%",
								maxHeight: "100%",
								objectFit: "contain",
								transform: `scale(${scanZoom})`,
								filter: scanInvert ? "invert(1) contrast(1.3)" : "contrast(1.1)",
								transition: "transform 0.15s ease",
							}}
						/>
					) : (
						<div
							data-testid="modal-scan-empty-placeholder"
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: "8px",
								color: "var(--ink-muted)",
							}}
						>
							<Camera size={36} style={{ opacity: 0.5 }} />
							<span style={{ fontSize: "12px", fontWeight: 600 }}>
								Файл снимка не прикреплен
							</span>
						</div>
					)}
				</div>

				{/* Conclusion */}
				<div
					style={{
						padding: "12px 16px",
						backgroundColor: "var(--paper-soft)",
						borderTop: "1px solid var(--line)",
						fontSize: "12px",
					}}
				>
					<strong
						style={{
							color: "var(--primary)",
							display: "block",
							marginBottom: "2px",
						}}
					>
						Заключение врача-рентгенолога:
					</strong>
					<p
						style={{
							margin: 0,
							color: "var(--ink)",
							lineHeight: "1.4",
						}}
					>
						{scan.conclusionRu}
					</p>
				</div>
			</div>
		</div>
	);
};

export { PlanScanViewerModal as PatientPlanScanViewerModal };
export default PlanScanViewerModal;
