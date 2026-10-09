import React, { memo, useMemo } from "react";
import {
	Download,
	Eye,
	FileText,
	RotateCcw,
	Share2,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type { PatientImagingScan } from "./types";

export interface CabinetImagingTabProps {
	readonly imagingList: readonly PatientImagingScan[];
	readonly selectedScanId: string;
	readonly onSelectScanId: (id: string) => void;
	readonly zoomLevel: number;
	readonly onZoomChange: (zoom: number) => void;
	readonly isInverted: boolean;
	readonly onToggleInvert: () => void;
	readonly showDoctorNotes: boolean;
	readonly onToggleDoctorNotes: () => void;
	readonly onShare: () => void;
	readonly onTriggerHaptic?: (style?: "light" | "medium" | "heavy") => void;
}

export const CabinetImagingTab: React.FC<CabinetImagingTabProps> = memo(({
	imagingList,
	selectedScanId,
	onSelectScanId,
	zoomLevel,
	onZoomChange,
	isInverted,
	onToggleInvert,
	showDoctorNotes,
	onToggleDoctorNotes,
	onShare,
	onTriggerHaptic,
}) => {
	const activeScan = useMemo(
		() => imagingList.find((s) => s.id === selectedScanId) ?? imagingList[0] ?? null,
		[imagingList, selectedScanId],
	);

	return (
		<main className="tg-tab-content">
			<div className="tg-section-header">
				<div>
					<h2 className="tg-section-title">Цифровая диагностика & КТ</h2>
					<p className="tg-section-desc">
						Рентгенограммы высокого разрешения с заключениями вашего врача
					</p>
				</div>
			</div>

			{/* Горизонтальная карусель выбора снимка или честный EmptyState */}
			{imagingList.length === 0 ? (
				<div className="tg-empty-card">
					<Eye size={32} className="text-slate-400 mb-2" />
					<div className="text-sm font-bold">Снимки отсутствуют</div>
					<div className="text-xs text-slate-400 mt-1">
						После проведения радиовизиографии или КТ врач прикрепит диагностические снимки к вашей карте
					</div>
				</div>
			) : (
				<div className="tg-scans-carousel">
					{imagingList.map((scan) => {
						const isSel = scan.id === selectedScanId;
						return (
							<button
								key={scan.id}
								type="button"
								className={`tg-scan-card-thumb ${isSel ? "active" : ""}`}
								onClick={() => {
									onSelectScanId(scan.id);
									onZoomChange(1);
									onTriggerHaptic?.("light");
								}}
							>
								<div className="tg-thumb-icon">
									{scan.scanType === "cbct_3d" ? "🧊" : "🦷"}
								</div>
								<div className="tg-thumb-info">
									<div className="tg-thumb-title">{scan.title}</div>
									<div className="tg-thumb-date">{scan.dateStr}</div>
								</div>
								{isSel && <div className="tg-thumb-active-dot" />}
							</button>
						);
					})}
				</div>
			)}

			{/* Интерактивный визиограф / КТ-вьювер на смартфоне */}
			{activeScan && (
				<div className="tg-grouped-card tg-viewer-container">
					{/* Верхний тулбар вьювера: зум, инверсия, резкость */}
					<div className="tg-viewer-toolbar">
						<div className="flex items-center gap-1.5">
							<span className="tg-viewer-badge">{activeScan.scanTypeLabel}</span>
							<span className="text-[11px] text-slate-400">
								Доза: {activeScan.radiationDoseMsv} мЗв
							</span>
						</div>

						<div className="flex items-center gap-1">
							<button
								type="button"
								className={`tg-viewer-tool-btn ${isInverted ? "active" : ""}`}
								onClick={() => {
									onToggleInvert();
									onTriggerHaptic?.("light");
								}}
								title="Инверсия негатив/позитив"
							>
								<RotateCcw size={15} />
								<span className="text-[10px] font-bold">Инв.</span>
							</button>

							<button
								type="button"
								className={`tg-viewer-tool-btn ${zoomLevel > 1 ? "active" : ""}`}
								onClick={() => {
									onZoomChange(zoomLevel >= 2 ? 1 : zoomLevel + 0.5);
									onTriggerHaptic?.("light");
								}}
								title="Масштабирование"
							>
								{zoomLevel === 1 ? <ZoomIn size={15} /> : <ZoomOut size={15} />}
								<span className="text-[10px] font-bold">{zoomLevel}x</span>
							</button>

							<button
								type="button"
								className={`tg-viewer-tool-btn ${showDoctorNotes ? "active" : ""}`}
								onClick={() => {
									onToggleDoctorNotes();
									onTriggerHaptic?.("light");
								}}
								title="Показать пометки врача"
							>
								<Eye size={15} />
							</button>
						</div>
					</div>

					{/* Экран снимка с интерактивным масштабированием */}
					<div className="tg-canvas-viewport">
						<div
							className={`tg-scan-display ${isInverted ? "inverted" : ""}`}
							style={{ transform: `scale(${zoomLevel})` }}
						>
							{/* Симуляция рентгенограммы анатомически достоверной структуры */}
							<svg
								viewBox="0 0 360 260"
								className="w-full h-auto tg-radiology-svg"
								xmlns="http://www.w3.org/2000/svg"
							>
								<defs>
									<radialGradient id="boneGlow" cx="50%" cy="50%" r="50%">
										<stop offset="0%" stopColor="#2a384c" />
										<stop offset="70%" stopColor="#141c27" />
										<stop offset="100%" stopColor="#080c12" />
									</radialGradient>
									<linearGradient id="toothGradient" x1="0%" y1="0%" x2="0%" y2="100%">
										<stop offset="0%" stopColor="#dce7f5" />
										<stop offset="50%" stopColor="#9fb4ce" />
										<stop offset="100%" stopColor="#5d728e" />
									</linearGradient>
									<linearGradient id="pulpGradient" x1="0%" y1="0%" x2="0%" y2="100%">
										<stop offset="0%" stopColor="#37475d" />
										<stop offset="100%" stopColor="#1c2533" />
									</linearGradient>
								</defs>

								{/* Фон рентген-детектора */}
								<rect width="360" height="260" fill="url(#boneGlow)" rx="12" />

								{/* Трабекулярная сетка костной ткани */}
								<g opacity="0.35" stroke="#718ba7" strokeWidth="0.5" strokeDasharray="2,3">
									<path d="M 10 40 Q 90 20 180 35 T 350 40" fill="none" />
									<path d="M 10 100 Q 90 85 180 110 T 350 95" fill="none" />
									<path d="M 10 180 Q 90 170 180 190 T 350 180" fill="none" />
									<path d="M 10 230 Q 90 220 180 240 T 350 230" fill="none" />
								</g>

								{/* Анатомический контур зуба и корней */}
								{activeScan.scanType === "cbct_3d" ? (
									/* Срез 3D имплантата */
									<g transform="translate(140, 50)">
										{/* Имплантат Straumann */}
										<rect x="25" y="40" width="30" height="85" rx="4" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
										{/* Резьба имплантата */}
										<line x1="20" y1="55" x2="60" y2="55" stroke="#94a3b8" strokeWidth="2" />
										<line x1="20" y1="70" x2="60" y2="70" stroke="#94a3b8" strokeWidth="2" />
										<line x1="20" y1="85" x2="60" y2="85" stroke="#94a3b8" strokeWidth="2" />
										<line x1="20" y1="100" x2="60" y2="100" stroke="#94a3b8" strokeWidth="2" />
										{/* Абатмент и формирователь десны */}
										<path d="M 28 40 L 32 15 L 48 15 L 52 40 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
										<text x="40" y="145" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">
											Straumann 4.1×10mm
										</text>
									</g>
								) : (
									/* RVG коронка и корневые каналы */
									<g transform="translate(130, 30)">
										{/* Коронковая часть */}
										<path
											d="M 15 45 Q 50 20 85 45 Q 95 90 80 120 L 20 120 Q 5 90 15 45 Z"
											fill="url(#toothGradient)"
											stroke="#cbd5e1"
											strokeWidth="1.5"
										/>
										{/* Корни (медиальный и дистальный) */}
										<path
											d="M 20 120 Q 15 170 30 205 Q 38 205 42 170 L 48 120 Z"
											fill="url(#toothGradient)"
											stroke="#94a3b8"
											strokeWidth="1.2"
										/>
										<path
											d="M 52 120 L 58 170 Q 62 205 70 205 Q 85 170 80 120 Z"
											fill="url(#toothGradient)"
											stroke="#94a3b8"
											strokeWidth="1.2"
										/>
										{/* Пульповая камера и каналы */}
										<path
											d="M 35 60 Q 50 50 65 60 Q 62 90 50 100 Q 38 90 35 60 Z"
											fill="url(#pulpGradient)"
										/>
										<path d="M 40 100 L 32 195" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
										<path d="M 60 100 L 68 195" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />

										{/* Дефект: кариозное затемнение (для зуба 16) */}
										{activeScan.id === "scan-rvg-16" && (
											<path
												d="M 18 52 Q 28 62 25 75 Q 16 70 18 52 Z"
												fill="#0a0f16"
												opacity="0.85"
											/>
										)}
									</g>
								)}

								{/* Диагностическая метка врача */}
								{showDoctorNotes && activeScan.markerCoords && (
									<g transform={`translate(${activeScan.markerCoords.x * 3.6}, ${activeScan.markerCoords.y * 2.6})`}>
										<circle cx="0" cy="0" r="14" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="3,2" />
										<circle cx="0" cy="0" r="3" fill="#ef4444" />
										<rect x="18" y="-12" width="115" height="22" rx="6" fill="rgba(15, 23, 42, 0.9)" stroke="#ef4444" strokeWidth="1" />
										<text x="25" y="3" fill="#fecaca" fontSize="9" fontWeight="bold">
											{activeScan.diagnosisBadge}
										</text>
									</g>
								)}
							</svg>
						</div>
					</div>

					{/* Заключение доктора под снимком */}
					<div className="tg-viewer-footer">
						<div className="flex items-center justify-between mb-1.5">
							<div className="tg-doctor-name flex items-center gap-1.5">
								<FileText size={13} className="text-teal-400" />
								<span>Заключение: {activeScan.doctorName}</span>
							</div>
							<span className="text-[11px] font-bold text-teal-400">
								{activeScan.diagnosisBadge}
							</span>
						</div>

						<p className="tg-doctor-notes-box">
							{activeScan.doctorNotes}
						</p>

						<div className="mt-3 flex gap-2">
							<button
								type="button"
								className="flex-1 py-2.5 px-3 rounded-xl bg-teal-600/15 border border-teal-500/30 text-teal-600 dark:text-teal-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
								onClick={() => onTriggerHaptic?.("light")}
							>
								<Download size={14} />
								<span>Скачать снимок (DICOM/PNG)</span>
							</button>
							<button
								type="button"
								className="py-2.5 px-3 rounded-xl bg-teal-600/15 border border-teal-500/30 text-teal-600 dark:text-teal-300 text-xs font-bold flex items-center justify-center transition-all"
								onClick={onShare}
								title="Поделиться"
							>
								<Share2 size={14} />
							</button>
						</div>
					</div>
				</div>
			)}
		</main>
	);
});

CabinetImagingTab.displayName = "CabinetImagingTab";
