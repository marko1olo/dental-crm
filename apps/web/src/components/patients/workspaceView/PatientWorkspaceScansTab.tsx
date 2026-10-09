import { Activity, Camera, Eye, Scan } from "lucide-react";
import React from "react";
import { usePatientStore } from "../../../store/patientStore";
import type { ImagingStudyItem } from "./types";

export interface PatientWorkspaceScansTabProps {
	patientId: string;
	patientStudies: ImagingStudyItem[] | any[];
	appLogic?: any;
	setIsCbctModalOpen: (v: boolean) => void;
	setIsPhotoProtocolOpen: (v: boolean) => void;
	setSelectedScanForDicom: (scan: {
		url: string;
		tooth?: string | null;
		title?: string | null;
	} | null) => void;
	setIsDicomModalOpen: (v: boolean) => void;
}

export const PatientWorkspaceScansTab: React.FC<PatientWorkspaceScansTabProps> = React.memo(
	({
		patientId,
		patientStudies,
		appLogic,
		setIsCbctModalOpen,
		setIsPhotoProtocolOpen,
		setSelectedScanForDicom,
		setIsDicomModalOpen,
	}) => {
		return (
			<div className="flex flex-col gap-3" data-testid="patient-scans-gallery">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div>
						<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] m-0">
							Рентгенологические снимки и КТ-исследования ({patientStudies.length})
						</h4>
						<p className="text-[11px] text-[var(--muted)] m-0 mt-0.5">
							Мгновенный просмотр 200×200px без задержки и сдвига макета (CLS = 0)
						</p>
					</div>
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={() => {
								if (patientId) {
									appLogic?.setSelectedPatientId?.(patientId);
									usePatientStore.getState().setSelectedPatientId(patientId);
								}
								window.location.hash = "imaging";
							}}
							className="secondary-button min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
							title="Перейти в полный рентген-кокпит"
							data-testid="btn-patient-open-imaging-view"
						>
							<Scan size={14} className="text-[var(--teal)]" />
							<span>Рентген-кокпит</span>
						</button>
						<button
							type="button"
							onClick={() => setIsCbctModalOpen(true)}
							className="secondary-button min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
							title="Открыть 3D КЛКТ MPR студию"
							data-testid="btn-patient-open-cbct-studio"
						>
							<Activity size={14} className="text-cyan-500" />
							<span>3D КЛКТ Студия</span>
						</button>
						<button
							type="button"
							onClick={() => setIsPhotoProtocolOpen(true)}
							className="secondary-button min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
							title="Клинический фотопротокол (12/8/6/3 слота) и сравнение До/После со шкалой VITA"
							data-testid="btn-patient-open-photo-protocol"
						>
							<Camera size={14} className="text-emerald-500" />
							<span>Фотопротокол & До/После</span>
						</button>
					</div>
				</div>

				{patientStudies.length === 0 ? (
					<div
						data-testid="patient-scans-empty-state"
						className="p-8 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] flex flex-col items-center justify-center gap-2"
					>
						<Camera size={32} className="text-[var(--muted)] opacity-50" />
						<div className="font-bold text-[var(--ink)]">Снимки и КТ-исследования пока не прикреплены</div>
						<p className="max-w-md m-0">
							В карте пациента пока нет загруженных радиовизиографических или томографических снимков.
							Вы можете прикрепить снимок в приёме врача или импортировать DICOM через рентген-кокпит.
						</p>
					</div>
				) : (
					<div
						data-testid="patient-scans-grid"
						className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 flex-wrap sm:flex-nowrap"
					>
						{patientStudies.map((study: any) => {
							const isCbct = study.kind === "cbct" || study.modality === "cbct_3d";
							const thumbSrc = study.previewUrl || study.viewerUrl || "/radiology/sample_rvg_tooth16.jpg";
							return (
								<div
									key={study.id}
									className="group relative rounded-xl overflow-hidden border border-[var(--line)] bg-[#030712] cursor-pointer shrink-0 shadow-xs hover:border-[var(--teal)] transition-all"
									style={{
										width: "200px",
										height: "200px",
										minWidth: "200px",
										minHeight: "200px",
										maxWidth: "200px",
										maxHeight: "200px",
										aspectRatio: "1 / 1",
									}}
									data-testid={`patient-scan-card-${study.id}`}
									onClick={() => {
										if (isCbct) {
											setIsCbctModalOpen(true);
										} else {
											setSelectedScanForDicom({
												url: thumbSrc,
												tooth: study.toothCode,
												title: study.title,
											});
											setIsDicomModalOpen(true);
										}
									}}
									title={isCbct ? "Открыть в 3D КЛКТ Студии" : "Открыть в DICOM / RVG просмотрщике"}
								>
									<img
										src={thumbSrc}
										alt={study.title || "Рентген-снимок"}
										loading="lazy"
										decoding="async"
										className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
										style={{ width: "100%", height: "100%", objectFit: "cover" }}
									/>
									{/* Top Badges */}
									<div className="absolute top-2 left-2 flex flex-col gap-1 items-start pointer-events-none">
										<span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/75 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/40 shadow-xs backdrop-blur-xs">
											{study.kind === "cbct"
												? "3D КЛКТ"
												: study.kind === "opg"
													? "ОПТГ"
													: study.kind === "cephalometric" || study.kind === "trg"
														? "ТРГ"
														: "RVG"}
										</span>
										{study.toothCode && (
											<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/75 text-white border border-white/20 shadow-xs">
												#{study.toothCode}
											</span>
										)}
									</div>
									{/* Bottom Overlay */}
									<div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between text-white text-[10px]">
										<span className="truncate max-w-[110px] opacity-90">
											{study.capturedAt ? new Date(study.capturedAt).toLocaleDateString("ru-RU") : "Архив"}
											{study.effectiveDoseMicrosv ? ` · ${study.effectiveDoseMicrosv} мкЗв` : ""}
										</span>
										<span className="text-[var(--teal,#0d9488)] font-semibold flex items-center gap-0.5 group-hover:underline">
											<Eye size={12} />
											<span>Открыть</span>
										</span>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		);
	},
);
PatientWorkspaceScansTab.displayName = "PatientWorkspaceScansTab";
