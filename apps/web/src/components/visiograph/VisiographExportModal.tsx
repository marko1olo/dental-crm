/**
 * VisiographExportModal.tsx
 *
 * Export & Legal Fixation Sheet (JPEG, PNG, DICOM Secondary Capture .dcm)
 * Applies clinical watermark (EDS, patient, doctor credentials, calibration scale).
 */

import { Download, Printer, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
	createDicomSecondaryCaptureFile,
	exportCanvasToJpeg,
	exportCanvasToPng,
	triggerBinaryDownload,
} from "./VisiographDicomExporter";
import { exportSnapshotToClinicalRecord } from "./VisiographExportService";
import {
	buildLegalExportCanvas,
	DEFAULT_CLINIC_CREDENTIALS,
	DEFAULT_DOCTOR_SIGNATURE,
} from "./VisiographLegalWatermark";
import type {
	AngleMeasurement,
	CalibrationReference,
	PeriapicalLesion,
	RulerMeasurement,
} from "./VisiographMeasurementMath";

export interface VisiographExportModalProps {
	isOpen: boolean;
	onClose: () => void;
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	patientId?: string | null | undefined;
	patientFullName?: string | undefined;
	doctorName?: string | undefined;
	studyId?: string | undefined;
	toothCode?: string | null | undefined;
	rulers: RulerMeasurement[];
	angles: AngleMeasurement[];
	lesions: PeriapicalLesion[];
	calibration: CalibrationReference;
	isCalibrated: boolean;
	onSaveToRecord?: ((
		imageDataUri: string,
		exportMeta: {
			rulers: RulerMeasurement[];
			angles: AngleMeasurement[];
			lesions: PeriapicalLesion[];
			scaleMmPerPx: number;
		},
	) => Promise<void> | void) | undefined;
	onPrintProtocol: () => void;
}

export function VisiographExportModal({
	isOpen,
	onClose,
	canvasRef,
	patientId = "pat_unknown",
	patientFullName = "Пациент ДЕНТЕ",
	doctorName = "Врач-рентгенолог ДЕНТЕ",
	studyId,
	toothCode = null,
	rulers,
	angles,
	lesions,
	calibration,
	isCalibrated,
	onSaveToRecord,
	onPrintProtocol,
}: VisiographExportModalProps) {
	const [exportFormat, setExportFormat] = useState<"jpeg" | "png" | "dicom">("jpeg");
	const [includeWatermark, setIncludeWatermark] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	if (!isOpen) return null;

	const handleExecuteExport = async () => {
		const canvas = canvasRef.current;
		if (!canvas || isSaving) return;

		setIsSaving(true);
		try {
			let outputCanvas = canvas;
			if (includeWatermark) {
				outputCanvas = buildLegalExportCanvas(canvas, {
					patient: {
						id: patientId || "pat_001",
						fullName: patientFullName || "Пациент",
					},
					clinic: DEFAULT_CLINIC_CREDENTIALS,
					doctor: {
						...DEFAULT_DOCTOR_SIGNATURE,
						doctorFullName: doctorName || DEFAULT_DOCTOR_SIGNATURE.doctorFullName,
					},
					study: {
						id: studyId,
						toothCode: toothCode || undefined,
						capturedAt: new Date().toISOString(),
					},
					calibration: isCalibrated ? calibration : undefined,
					rulers,
					angles,
					lesions,
				});
			}

			const filenameBase = `visiograph_${toothCode ? `tooth_${toothCode}_` : ""}${Date.now()}`;

			if (exportFormat === "jpeg") {
				const dataUri = exportCanvasToJpeg(outputCanvas, 0.95);
				triggerBinaryDownload(
					await (await fetch(dataUri)).blob(),
					`${filenameBase}.jpg`,
					"image/jpeg",
				);
			} else if (exportFormat === "png") {
				const dataUri = exportCanvasToPng(outputCanvas);
				triggerBinaryDownload(
					await (await fetch(dataUri)).blob(),
					`${filenameBase}.png`,
					"image/png",
				);
			} else if (exportFormat === "dicom") {
				const dicomBytes = createDicomSecondaryCaptureFile(outputCanvas, {
					patientId: patientId || "PATIENT-001",
					patientFullName,
					toothCode: toothCode || undefined,
					clinicName: DEFAULT_CLINIC_CREDENTIALS.clinicName,
					doctorFullName: doctorName,
					scaleMmPerPixel: calibration.scaleMmPerPixel,
				});
				triggerBinaryDownload(
					dicomBytes,
					`${filenameBase}.dcm`,
					"application/dicom",
				);
			}

			// If caller provided Form 043 save handler
			if (onSaveToRecord) {
				const finalDataUri = exportCanvasToJpeg(outputCanvas, 0.92);
				await onSaveToRecord(finalDataUri, {
					rulers,
					angles,
					lesions,
					scaleMmPerPx: calibration.scaleMmPerPixel,
				});
			} else if (patientId && patientId !== "pat_unknown") {
				const finalDataUri = exportCanvasToJpeg(outputCanvas, 0.92);
				await exportSnapshotToClinicalRecord({
					patientId,
					imageDataUri: finalDataUri,
					toothCode: toothCode || undefined,
					clinicalNote: `Экспорт визиографа (зуб ${toothCode || "н/д"})`,
					viewKind: "periapical_2d",
				}).catch((err) => {
					console.warn("[VisiographExportModal] Auto-export to clinical record failed:", err);
				});
			}

			onClose();
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				background: "rgba(0, 0, 0, 0.75)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 50,
			}}
		>
			<div
				style={{
					background: "var(--paper, #161b22)",
					border: "1px solid var(--line, #30363d)",
					borderRadius: "12px",
					width: "480px",
					padding: "20px",
					display: "flex",
					flexDirection: "column",
					gap: "16px",
					color: "var(--ink, #c9d1d9)",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						borderBottom: "1px solid var(--line, #30363d)",
						paddingBottom: "8px",
					}}
				>
					<span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--paper-contrast, #ffffff)" }}>
						Юридический экспорт и фиксация снимка
					</span>
					<button
						type="button"
						onClick={onClose}
						style={{ background: "none", border: "none", color: "var(--muted, #8b949e)", cursor: "pointer" }}
					>
						<X size={18} />
					</button>
				</div>

				{/* Format selector */}
				<div>
					<label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 6, color: "var(--ink, #c9d1d9)" }}>
						Формат файла:
					</label>
					<div style={{ display: "flex", gap: "8px" }}>
						<button
							type="button"
							onClick={() => setExportFormat("jpeg")}
							style={{
								flex: 1,
								padding: "8px",
								background: exportFormat === "jpeg" ? "var(--primary, #1f6feb)" : "var(--paper-strong, #21262d)",
								color: exportFormat === "jpeg" ? "#ffffff" : "var(--ink, #c9d1d9)",
								border: "1px solid var(--line, #30363d)",
								borderRadius: "6px",
								cursor: "pointer",
								fontWeight: 600,
							}}
						>
							JPEG (High-Res)
						</button>
						<button
							type="button"
							onClick={() => setExportFormat("png")}
							style={{
								flex: 1,
								padding: "8px",
								background: exportFormat === "png" ? "var(--primary, #1f6feb)" : "var(--paper-strong, #21262d)",
								color: exportFormat === "png" ? "#ffffff" : "var(--ink, #c9d1d9)",
								border: "1px solid var(--line, #30363d)",
								borderRadius: "6px",
								cursor: "pointer",
								fontWeight: 600,
							}}
						>
							PNG (Lossless)
						</button>
						<button
							type="button"
							onClick={() => setExportFormat("dicom")}
							style={{
								flex: 1,
								padding: "8px",
								background: exportFormat === "dicom" ? "var(--primary, #1f6feb)" : "var(--paper-strong, #21262d)",
								color: exportFormat === "dicom" ? "#ffffff" : "var(--ink, #c9d1d9)",
								border: "1px solid var(--line, #30363d)",
								borderRadius: "6px",
								cursor: "pointer",
								fontWeight: 600,
							}}
						>
							DICOM (.dcm)
						</button>
					</div>
				</div>

				{/* Watermark toggle */}
				<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem", color: "var(--ink, #c9d1d9)" }}>
					<input
						type="checkbox"
						checked={includeWatermark}
						onChange={(e) => setIncludeWatermark(e.target.checked)}
					/>
					<span>
						Наложить юридический водяной знак (ФИО пациента, дата, реквизиты клиники, штамп ЭЦП врача)
					</span>
				</label>

				{/* Details preview */}
				<div
					style={{
						background: "var(--paper-strong, #0d1117)",
						padding: "10px",
						borderRadius: "6px",
						fontSize: "0.78rem",
						display: "flex",
						flexDirection: "column",
						gap: "4px",
						color: "var(--ink, #c9d1d9)",
					}}
				>
					<div><strong>Пациент:</strong> {patientFullName} (ID: {patientId})</div>
					<div><strong>Врач:</strong> {doctorName} (ЭЦП ГОСТ Р 34.10)</div>
					<div><strong>Клиника:</strong> {DEFAULT_CLINIC_CREDENTIALS.clinicName}</div>
					<div><strong>Замеры на снимке:</strong> {rulers.length} линеек, {angles.length} углов, {lesions.length} очагов</div>
				</div>

				{/* Actions */}
				<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
					<button
						type="button"
						onClick={onClose}
						style={{
							padding: "8px 14px",
							background: "var(--paper-strong, #21262d)",
							color: "var(--ink, #c9d1d9)",
							border: "1px solid var(--line, #30363d)",
							borderRadius: "6px",
							cursor: "pointer",
						}}
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={() => {
							onClose();
							onPrintProtocol();
						}}
						style={{
							padding: "8px 14px",
							background: "var(--teal, #0d9488)",
							color: "var(--paper, #ffffff)",
							border: "none",
							borderRadius: "6px",
							fontWeight: 600,
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "6px",
						}}
						title="Распечатать протокол с юридическим штампом и таблицей измерений"
					>
						<Printer size={15} /> Печать протокола
					</button>
					<button
						type="button"
						onClick={handleExecuteExport}
						style={{
							padding: "8px 16px",
							background: "var(--success, #238636)",
							color: "var(--paper, #ffffff)",
							border: "none",
							borderRadius: "6px",
							fontWeight: 600,
							cursor: isSaving ? "wait" : "pointer",
							display: "flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<Download size={15} /> {isSaving ? "Экспорт..." : "Экспортировать"}
					</button>
				</div>
			</div>
		</div>
	);
}
