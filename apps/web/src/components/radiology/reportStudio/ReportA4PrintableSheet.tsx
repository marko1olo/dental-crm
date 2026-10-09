/**
 * DENTE CRM — Radiology Report Printable A4 Sheet (Layer 2)
 * Standards: Strict Clinical Medical Blank with patient meta, DAP dosimetry telemetry and signature stamp.
 */

import React from "react";
import type { ReportFrameItem, ReportPrintSettings } from "./types";
import { ReportClinicalConclusion } from "./ReportClinicalConclusion";
import { ReportDoctorSignatureStamp } from "./ReportDoctorSignatureStamp";

export interface ReportA4PrintableSheetProps {
	sheetRef: React.RefObject<HTMLDivElement | null>;
	settings: ReportPrintSettings;
	viewZoom: number;
	patientName: string;
	patientCardNumber: string;
	patientAge: string | number;
	patientGender: string;
	doctorName: string;
	clinicName: string;
	clinicPhone: string;
	clinicAddress: string;
	clinicWebsite: string;
	frames: ReportFrameItem[];
	selectedFrameId: string | null;
	conclusionText: string;
	onChangeConclusionText: (text: string) => void;
	onStartMove: (e: React.MouseEvent, frameId: string) => void;
	onStartResize: (e: React.MouseEvent, frameId: string, handle: string) => void;
}

export const ReportA4PrintableSheet: React.FC<ReportA4PrintableSheetProps> = ({
	sheetRef,
	settings,
	viewZoom,
	patientName,
	patientCardNumber,
	patientAge,
	patientGender,
	doctorName,
	clinicName,
	clinicPhone,
	clinicAddress,
	clinicWebsite,
	frames,
	selectedFrameId,
	conclusionText,
	onChangeConclusionText,
	onStartMove,
	onStartResize,
}) => {
	const getSheetAspectRatio = () => {
		if (settings.pageSize === "14x17_film") {
			return settings.orientation === "portrait" ? "14 / 17" : "17 / 14";
		}
		if (settings.pageSize === "A3") {
			return settings.orientation === "portrait" ? "297 / 420" : "420 / 297";
		}
		return settings.orientation === "portrait" ? "210 / 297" : "297 / 210";
	};

	return (
		<div
			ref={sheetRef}
			data-testid="radiology-virtual-sheet"
			style={{
				aspectRatio: getSheetAspectRatio(),
				width: `${Math.round(520 * (viewZoom / 100))}px`,
				maxWidth: "92vw",
			}}
			className="radiology-a4-sheet"
			onClick={(e) => e.stopPropagation()}
		>
			{/* Virtual Sheet Header */}
			<header className="radiology-a4-header">
				<div className="radiology-a4-topbar">
					{settings.header.showClinicLogo ? (
						<div className="radiology-clinic-brand">
							<div className="radiology-clinic-logo-emblem">D</div>
							<div>
								<div className="radiology-clinic-name">{clinicName}</div>
								<div className="radiology-clinic-requisites">
									{clinicAddress} · Тел: {clinicPhone} · {clinicWebsite}
								</div>
							</div>
						</div>
					) : (
						<div />
					)}

					<div className="radiology-report-headline">
						<div className="radiology-report-headline-title">
							Протокол рентгенологического исследования
						</div>
						{settings.header.showDate && (
							<div className="radiology-report-headline-date">
								Дата исследования: {new Date().toLocaleDateString("ru-RU")}
							</div>
						)}
					</div>
				</div>

				{/* Patient & Doctor metadata grid */}
				{settings.header.showPatientInfo && (
					<div className="radiology-patient-summary-grid">
						<div>
							<div className="radiology-meta-label">Пациент</div>
							<div className="radiology-meta-value text-xs">{patientName}</div>
							<div className="text-[10px] text-slate-500 font-mono mt-0.5">
								Карта: {patientCardNumber} · {patientGender} · {patientAge}
							</div>
						</div>

						<div>
							<div className="radiology-meta-label">Врач</div>
							<div className="radiology-meta-value text-[11px]">{doctorName}</div>
							<div className="text-[9.5px] text-slate-500">Стоматолог-терапевт</div>
						</div>

						<div>
							<div className="radiology-meta-label">Модальность</div>
							<div className="radiology-meta-value text-[11px]">Интраоральная визиография</div>
							<div className="text-[9.5px] text-emerald-700 font-semibold font-mono">
								Дентальный сенсор HD
							</div>
						</div>
					</div>
				)}
			</header>

			{/* Radiographic Frames Container */}
			<div className="radiology-frames-container">
				{frames.map((frame) => {
					const isSelected = frame.id === selectedFrameId;

					return (
						<div
							key={frame.id}
							style={{
								left: `${frame.x}%`,
								top: `${frame.y}%`,
								width: `${frame.width}%`,
								height: `${frame.height}%`,
							}}
							className={`radiology-study-frame ${isSelected ? "selected" : ""}`}
							onMouseDown={(e) => onStartMove(e, frame.id)}
							data-testid={`report-frame-${frame.id}`}
						>
							{/* Above Legend Option */}
							{settings.legendPlacement === "above" && frame.type === "image" && (
								<div className="text-[9.5px] font-mono text-slate-700 py-1 px-2 truncate bg-white border-b border-slate-200">
									Зуб #{frame.toothFdi} · {frame.modalityLabel} · {frame.capturedAt} · {frame.dapDoseDgyCm2?.toFixed(3) || "0.024"} dGy*cm² [DAP]
								</div>
							)}

							{/* Frame Image / Content */}
							<div className="radiology-frame-viewport">
								{frame.type === "image" ? (
									<img
										src={frame.imageUrl}
										alt={`Снимок зуба #${frame.toothFdi}`}
										className="radiology-frame-image"
										onError={(e) => {
											(e.target as HTMLImageElement).src =
												"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23050505'/><text x='50%25' y='50%25' fill='%2310b981' font-family='sans-serif' font-size='13' text-anchor='middle'>Дентальная визиография</text></svg>";
										}}
									/>
								) : (
									<div className="w-full h-full p-2.5 bg-slate-50 text-slate-900 text-xs leading-relaxed overflow-auto">
										{frame.textContent}
									</div>
								)}
							</div>

							{/* Below Legend (Clean Clinical Legend + Quiet DAP Telemetry) */}
							{settings.legendPlacement === "below" && frame.type === "image" && (
								<div className="radiology-frame-caption" data-testid="frame-telemetry-legend">
									<div className="radiology-caption-clinical">
										<span>Зуб #{frame.toothFdi} · Интраоральная визиография</span>
										<span className="font-mono text-[9.5px] text-slate-500 font-normal">
											{frame.capturedAt}
										</span>
									</div>
									<div className="radiology-caption-telemetry">
										<span>Ratio: {frame.zoomRatioPercent?.toFixed(2) || "100.00"}%</span>
										<span>{frame.dapDoseDgyCm2?.toFixed(3) || "0.024"} dGy*cm² [DAP]</span>
										<span className="truncate max-w-[130px]">{frame.modalityLabel}</span>
									</div>
								</div>
							)}

							{/* 8 Resize Handles (Subtle & elegant white/green dots, NOT fluorescent eyesores) */}
							{isSelected && (
								<>
									<div
										className="radiology-resize-handle -top-1 -left-1 cursor-nw-resize"
										onMouseDown={(e) => onStartResize(e, frame.id, "nw")}
										data-testid="resize-handle-nw"
									/>
									<div
										className="radiology-resize-handle -top-1 left-1/2 -translate-x-1/2 cursor-n-resize"
										onMouseDown={(e) => onStartResize(e, frame.id, "n")}
									/>
									<div
										className="radiology-resize-handle -top-1 -right-1 cursor-ne-resize"
										onMouseDown={(e) => onStartResize(e, frame.id, "ne")}
									/>
									<div
										className="radiology-resize-handle top-1/2 -translate-y-1/2 -right-1 cursor-e-resize"
										onMouseDown={(e) => onStartResize(e, frame.id, "e")}
									/>
									<div
										className="radiology-resize-handle -bottom-1 -right-1 cursor-se-resize"
										onMouseDown={(e) => onStartResize(e, frame.id, "se")}
										data-testid="resize-handle-se"
									/>
									<div
										className="radiology-resize-handle -bottom-1 left-1/2 -translate-x-1/2 cursor-s-resize"
										onMouseDown={(e) => onStartResize(e, frame.id, "s")}
									/>
									<div
										className="radiology-resize-handle -bottom-1 -left-1 cursor-sw-resize"
										onMouseDown={(e) => onStartResize(e, frame.id, "sw")}
									/>
									<div
										className="radiology-resize-handle top-1/2 -translate-y-1/2 -left-1 cursor-w-resize"
										onMouseDown={(e) => onStartResize(e, frame.id, "w")}
									/>
								</>
							)}
						</div>
					);
				})}
			</div>

			{/* 3. Clinical Conclusion / Doctor Findings Block */}
			<ReportClinicalConclusion
				conclusionText={conclusionText}
				onChangeConclusionText={onChangeConclusionText}
			/>

			{/* 4. Doctor Signature & Authentic Clinical Stamp */}
			<ReportDoctorSignatureStamp doctorName={doctorName} />

			{/* 5. Virtual Sheet Footer */}
			{(settings.footer.showClinicName || settings.footer.showPhone || settings.footer.showAddress) && (
				<div className="border-t border-slate-200 pt-2 mt-3 text-[9.5px] text-slate-500 flex items-center justify-between shrink-0">
					<div className="flex gap-3">
						{settings.footer.showClinicName && (
							<span className="font-semibold text-slate-800">{clinicName}</span>
						)}
						{settings.footer.showAddress && <span>{clinicAddress}</span>}
					</div>
					<div className="flex gap-3 font-mono">
						{settings.footer.showPhone && <span>{clinicPhone}</span>}
						{settings.footer.showWebsite && <span>{clinicWebsite}</span>}
					</div>
				</div>
			)}
		</div>
	);
};
