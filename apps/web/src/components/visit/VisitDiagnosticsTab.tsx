import { Activity, Camera, ChevronDown, ChevronRight, Eye, FileText, FolderInput, Image as ImageIcon, MoreHorizontal, Plus, Receipt, Scan, Trash2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientStore } from "../../store/patientStore";
import { EMPTY_DIARY } from "../useVisitDiaryLogic";
import { VisiographAnalyzer } from "../imaging/VisiographAnalyzer";

const ClinicalPhotoProtocolModal = React.lazy(() =>
	import("../photography/ClinicalPhotoProtocolModal").then((m) => ({
		default: m.ClinicalPhotoProtocolModal,
	})),
);
const CbctMprImplantStudioModal = React.lazy(() =>
	import("../radiology/CbctMprImplantStudioModal").then((m) => ({
		default: m.CbctMprImplantStudioModal,
	})),
);
const RadiologyReferralModal = React.lazy(() =>
	import("../radiology/RadiologyReferralModal").then((m) => ({
		default: m.RadiologyReferralModal,
	})),
);
const DirectRvgCaptureModal = React.lazy(() =>
	import("../radiology/DirectRvgCaptureModal").then((m) => ({
		default: m.DirectRvgCaptureModal,
	})),
);
const DicomViewerModal = React.lazy(() =>
	import("../imaging/DicomViewerModal").then((m) => ({
		default: m.DicomViewerModal,
	})),
);
const HotFolderIntakeModal = React.lazy(() =>
	import("../radiology/HotFolderIntakeModal").then((m) => ({
		default: m.HotFolderIntakeModal,
	})),
);
const CephalometricAnalysisModal = React.lazy(() =>
	import("../radiology/CephalometricAnalysisModal").then((m) => ({
		default: m.CephalometricAnalysisModal,
	})),
);
import { imagingWriteTarget, realVisitFieldId } from "./visitIdentity";
import { addCbctToFinanceAndPlan } from "../radiology/ctImplantIntegrationBridge";
import {
	type ClinicalPhotoAttachment,
	generatePhotoProtocolAttachmentsStatement,
} from "../../lib/clinicalProtocols043";
import { isDemoPatientId, isDemoShowcaseMode } from "../../lib/demoMode";

/*
  СНИМОК И ЗАКЛЮЧЕНИЕ ПРИВЯЗАНЫ НАПРЯМУЮ К ПАЦИЕНТУ ПРИЁМА.

  Прямая изоляция контекста пациента:
  VisiographAnalyzer принимает идентификатор пациента приёма через пропс patientId
  (patientId={activePatient?.id}), благодаря чему снимок, заключение и отметки
  зубов гарантированно сохраняются в карту пациента текущего приёма, даже если в
  разделе «Пациенты» параллельно открыта карточка другого человека.
*/
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export type DiagnosticTabMode = "rvg" | "photo" | "cbct";

export function VisitDiagnosticsTab(props?: {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	activePatient?: any;
	onInsertToProtocol?: (text: string) => void;
}) {
	const ctx = useAppLogicContext();
	const activePatient = props?.activePatient ?? ctx?.activePatient;
	const [diagnosticMode, setDiagnosticMode] = useState<DiagnosticTabMode>("rvg");
	const [isCephModalOpen, setIsCephModalOpen] = useState<boolean>(false);
	const [isRadiologyModalOpen, setIsRadiologyModalOpen] = useState<boolean>(false);
	const [isPhotoProtocolModalOpen, setIsPhotoProtocolModalOpen] = useState<boolean>(false);
	const [isCbctModalOpen, setIsCbctModalOpen] = useState<boolean>(false);
	const [isDirectRvgModalOpen, setIsDirectRvgModalOpen] = useState<boolean>(false);
	const [isDicomViewerModalOpen, setIsDicomViewerModalOpen] = useState<boolean>(false);
	const [selectedDicomImageSrc, setSelectedDicomImageSrc] = useState<string | undefined>(undefined);
	const [isHotFolderModalOpen, setIsHotFolderModalOpen] = useState<boolean>(false);
	const isOrthoContext =
		String(ctx?.dashboard?.activeDoctor?.specialty || "").toLowerCase().includes("ortho") ||
		String(ctx?.dashboard?.activeDoctor?.specialtyRu || "").toLowerCase().includes("ортодонт");
	const [isAdvancedDiagnosticsOpen, setIsAdvancedDiagnosticsOpen] = useState<boolean>(isOrthoContext);
	const [isPhotoAttachFormOpen, setIsPhotoAttachFormOpen] = useState<boolean>(false);
	const [isCbctMenuOpen, setIsCbctMenuOpen] = useState<boolean>(false);
	const cbctMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (cbctMenuRef.current && !cbctMenuRef.current.contains(event.target as Node)) {
				setIsCbctMenuOpen(false);
			}
		};
		if (isCbctMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isCbctMenuOpen]);

	const [photoAttachments, setPhotoAttachments] = useState<ClinicalPhotoAttachment[]>([]);
	const initialToothNumber = Number(ctx?.dashboard?.activeVisit?.diagnosisTooth) || 16;
	const [selectedToothForPhoto, setSelectedToothForPhoto] = useState<number>(initialToothNumber);
	const [selectedPhotoType, setSelectedPhotoType] = useState<"before" | "after" | "process" | "intraoral_macro" | "face_portrait">("before");
	const [photoComment, setPhotoComment] = useState<string>("");

	const handleAddPhoto = () => {
		const newPhoto: ClinicalPhotoAttachment = {
			id: `photo-${Date.now()}`,
			toothNumber: selectedToothForPhoto || undefined,
			photoType: selectedPhotoType,
			photoUrl: "",
			description: photoComment.trim() || undefined,
			capturedAtIso: new Date().toISOString(),
		};
		const updated = [...photoAttachments, newPhoto];
		setPhotoAttachments(updated);
		setPhotoComment("");

		const statement = generatePhotoProtocolAttachmentsStatement(updated);
		if (props?.onInsertToProtocol) {
			props.onInsertToProtocol(statement);
		} else {
			try {
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							soap: {
								treatmentDescription: statement,
							},
							mode: "smart_append",
						},
					}),
				);
			} catch {
				// ignore
			}
		}
	};

	const handleRemovePhoto = (id: string) => {
		const updated = photoAttachments.filter((p) => p.id !== id);
		setPhotoAttachments(updated);
	};

	const selectedPatientId = usePatientStore((state) => state.selectedPatientId);
	const setSelectedPatientId = usePatientStore(
		(state) => state.setSelectedPatientId,
	);

	const dashboard = ctx?.dashboard;
	const visitPatientId = realVisitFieldId(dashboard?.activeVisit?.patientId);
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const patients: any[] = Array.isArray(dashboard?.patients)
		? dashboard.patients
		: [];
	const nameOf = (patientId: string | null): string | null => {
		if (!patientId) return null;
		const found = patients.find((patient) => patient?.id === patientId);
		const fullName =
			typeof found?.fullName === "string" ? found.fullName.trim() : "";
		return fullName || null;
	};
	const visitPatientName =
		nameOf(visitPatientId) ??
		(typeof activePatient?.fullName === "string"
			? activePatient.fullName
			: null);
	const selectedPatientName = nameOf(realVisitFieldId(selectedPatientId));

	const effectiveTargetPatientId = activePatient?.id ?? selectedPatientId;
	const target = imagingWriteTarget(effectiveTargetPatientId, visitPatientId);

	const patientStudies = React.useMemo(() => {
		const all = (ctx?.dashboard?.imagingStudies ?? []) as any[];
		const targetId = effectiveTargetPatientId ?? visitPatientId;
		const filtered = targetId ? all.filter((s: any) => String(s?.patientId) === String(targetId)) : [];
		if (filtered.length > 0) return filtered;
		if (isDemoShowcaseMode() || isDemoPatientId(targetId)) {
			return [
				{
					id: `demo-visit-rvg-16-${targetId || "demo"}`,
					patientId: targetId,
					title: "Прицельный снимок зуба 1.6",
					kind: "periapical",
					toothCode: "16",
					previewUrl: "/radiology/sample_rvg_tooth16.jpg",
					viewerUrl: "/radiology/sample_rvg_tooth16.jpg",
					capturedAt: new Date().toISOString(),
					effectiveDoseMicrosv: 2,
					status: "available",
				},
				{
					id: `demo-visit-rvg-36-${targetId || "demo"}`,
					patientId: targetId,
					title: "Прицельный снимок зуба 3.6 (периапикальный)",
					kind: "periapical",
					toothCode: "36",
					previewUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
					viewerUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
					capturedAt: new Date(Date.now() - 86400000).toISOString(),
					effectiveDoseMicrosv: 3,
					status: "available",
				},
				{
					id: `demo-visit-cbct-${targetId || "demo"}`,
					patientId: targetId,
					title: "3D КЛКТ срез верхней челюсти",
					kind: "cbct",
					toothCode: "16",
					previewUrl: "/radiology/sample_rvg_pathology.jpg",
					viewerUrl: "/radiology/kavo_op300_cbct_slice.dcm",
					capturedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
					effectiveDoseMicrosv: 35,
					status: "available",
				},
				{
					id: `demo-visit-trg-${targetId || "demo"}`,
					patientId: targetId,
					title: "ТРГ боковая цефалограмма",
					kind: "cephalometric",
					toothCode: null,
					previewUrl: "/radiology/sample_trg_cephalogram.jpg",
					viewerUrl: "/radiology/sample_trg_cephalogram.jpg",
					capturedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
					effectiveDoseMicrosv: 12,
					status: "available",
				},
			];
		}
		return [];
	}, [ctx?.dashboard?.imagingStudies, effectiveTargetPatientId, visitPatientId]);

	return (
		<div
			data-testid="visit-diagnostics-tab"
			className="visit-diagnostics-tab bg-[var(--paper)] border border-[var(--line-subtle)] text-[var(--ink)] rounded-xl p-3.5 sm:p-4 flex flex-col gap-3.5 shadow-2xs"
		>
			{/* ═══════════════════════════════════════════════════════════════════════
			    КЛИНИЧЕСКИЙ КОКПИТ: СЕГМЕНТИРОВАННЫЙ ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМОВ ДИАГНОСТИКИ И НАПРАВЛЕНИЕ
			    ═══════════════════════════════════════════════════════════════════════ */}
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div
					className="inline-flex items-center p-[3px] rounded-[10px] bg-[var(--paper-soft)] border border-[var(--line-subtle)] gap-[2px] shadow-2xs"
					role="tablist"
					aria-label="Режимы визуальной диагностики"
				>
					<button
						type="button"
						role="tab"
						aria-selected={diagnosticMode === "rvg"}
						onClick={() => setDiagnosticMode("rvg")}
						data-testid="tab-diagnostic-mode-rvg"
						className={`h-8 px-3 rounded-[7px] text-[12.5px] flex items-center gap-1.5 transition-all cursor-pointer shrink-0 select-none ${
							diagnosticMode === "rvg"
								? "bg-[var(--paper)] text-[var(--teal,#0d9488)] border border-[var(--line-subtle)] shadow-xs font-semibold"
								: "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-medium"
						}`}
					>
						<Camera size={14} className={diagnosticMode === "rvg" ? "text-[var(--teal,#0d9488)]" : "text-[var(--muted)]"} />
						<span>Прицельные снимки (RVG)</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={diagnosticMode === "photo"}
						onClick={() => setDiagnosticMode("photo")}
						data-testid="tab-diagnostic-mode-photo"
						className={`h-8 px-3 rounded-[7px] text-[12.5px] flex items-center gap-1.5 transition-all cursor-pointer shrink-0 select-none ${
							diagnosticMode === "photo"
								? "bg-[var(--paper)] text-[var(--teal,#0d9488)] border border-[var(--line-subtle)] shadow-xs font-semibold"
								: "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-medium"
						}`}
					>
						<ImageIcon size={14} className={diagnosticMode === "photo" ? "text-[var(--teal,#0d9488)]" : "text-[var(--muted)]"} />
						<span>Фотопротокол</span>
						{photoAttachments.length > 0 ? (
							<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--teal)] text-white">
								{photoAttachments.length}
							</span>
						) : null}
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={diagnosticMode === "cbct"}
						onClick={() => setDiagnosticMode("cbct")}
						data-testid="tab-diagnostic-mode-cbct"
						className={`h-8 px-3 rounded-[7px] text-[12.5px] flex items-center gap-1.5 transition-all cursor-pointer shrink-0 select-none ${
							diagnosticMode === "cbct"
								? "bg-[var(--paper)] text-[var(--teal,#0d9488)] border border-[var(--line-subtle)] shadow-xs font-semibold"
								: "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-medium"
						}`}
					>
						<Activity size={14} className={diagnosticMode === "cbct" ? "text-[var(--teal,#0d9488)]" : "text-[var(--muted)]"} />
						<span>КЛКТ и ОПТГ</span>
					</button>
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					<button
						type="button"
						onClick={() => setIsRadiologyModalOpen(true)}
						className="h-8 px-3 rounded-lg text-[13px] font-semibold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line-subtle)] hover:border-[var(--teal)]/40 cursor-pointer transition-all shadow-2xs active:scale-98 flex items-center gap-1.5"
						data-testid="btn-open-radiology-referral-modal"
						title="Выписать направление на КЛКТ / ОПТГ / ТРГ"
					>
						<Plus size={14} className="text-[var(--teal)]" />
						<span>+ Направление на КЛКТ/ОПТГ</span>
					</button>
				</div>
			</div>

			{/* Target Patient Status Notice (Quiet, Non-blocking, No Clumsy Dashed Box) */}
			{target === "another-patient" ? (
				<div
					role="alert"
					aria-live="assertive"
					data-testid="visit-imaging-target-warning"
					className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between gap-3 flex-wrap"
				>
					<div>
						<strong className="font-bold">Снимок сохранится в карту другого пациента: </strong>
						<span>Приём у {visitPatientName ?? "пациента приёма"}, а открыта карта {selectedPatientName ?? "другого человека"}.</span>
					</div>
					<button
						type="button"
						onClick={() =>
							visitPatientId && setSelectedPatientId(visitPatientId)
						}
						className="h-8 px-3 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white border border-rose-600 transition-colors cursor-pointer shrink-0"
					>
						Писать в карту {visitPatientName ?? "пациента приёма"}
					</button>
				</div>
			) : null}

			{target === "nobody" ? (
				<div
					role="status"
					aria-live="polite"
					className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3 flex-wrap"
				>
					<span>Карта пациента не открыта: заключение потеряется после закрытия страницы.</span>
					<button
						type="button"
						onClick={() =>
							visitPatientId && setSelectedPatientId(visitPatientId)
						}
						className="h-8 px-3 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white border border-amber-600 transition-colors cursor-pointer shrink-0"
					>
						Открыть карту {visitPatientName ?? "пациента приёма"}
					</button>
				</div>
			) : null}

			{target === "no-visit" && !visitPatientName && !selectedPatientName ? (
				<div
					role="status"
					aria-live="polite"
					className="p-3 rounded-xl border border-[var(--glass-border)] bg-[var(--paper-soft)] text-xs text-[var(--muted)]"
				>
					Выберите пациента в расписании или картотеке для сохранения снимков и заключений в ЭМК.
				</div>
			) : null}

			{/* ═══════════════════════════════════════════════════════════════════════
			    ПРИКРЕПЛЕННЫЕ СНИМКИ И КТ-СРЕЗЫ ПАЦИЕНТА (КОМПАКТНАЯ ГАЛЕРЕЯ-СЕТКА)
			    Мгновенный визуальный доступ к RVG, 3D КЛКТ, ОПТГ и фотопротоколу
			    ═══════════════════════════════════════════════════════════════════════ */}
			<div
				data-testid="visit-diagnostics-attached-scans-gallery"
				className="p-3 sm:p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] shadow-2xs flex flex-col gap-2.5"
			>
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-2">
						<Scan size={16} className="text-[var(--teal)] shrink-0" />
						<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0">
							Прикрепленные снимки и КТ-срезы ({patientStudies.length + photoAttachments.length})
						</h4>
					</div>
					<span className="text-[11px] text-[var(--muted)]">
						Кликните по снимку для мгновенного открытия в просмотрщике
					</span>
				</div>

				{patientStudies.length === 0 && photoAttachments.length === 0 ? (
					<div
						data-testid="attached-scans-empty-placeholder"
						className="w-full py-6 px-4 rounded-xl border border-dashed border-[var(--line-subtle)] bg-[var(--paper)] flex flex-col items-center justify-center text-center text-xs text-[var(--muted)] gap-1.5 select-none"
					>
						<Camera size={24} className="text-[var(--muted)] opacity-50" />
						<span className="font-semibold text-[var(--ink)]">Снимки не прикреплены</span>
						<span className="text-[11px] text-[var(--muted)] max-w-sm">
							Сделайте захват с датчика визиографа, привяжите фотопротокол или импортируйте КТ / ОПТГ
						</span>
					</div>
				) : (
					<div
						data-testid="attached-scans-list"
						className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2.5 pt-0.5"
					>
						{patientStudies.map((study: any) => {
							const isCbct = study.kind === "cbct" || study.modality === "cbct_3d";
							const thumbSrc = study.previewUrl || study.viewerUrl || "/radiology/sample_rvg_tooth16.jpg";
							return (
								<div
									key={study.id}
									className="group relative rounded-xl overflow-hidden border border-[var(--line-subtle)] bg-[#030712] cursor-pointer shadow-2xs hover:border-[var(--teal)] hover:shadow-md transition-all aspect-square select-none"
									style={{ aspectRatio: "1 / 1" }}
									data-testid={`visit-scan-thumbnail-${study.id}`}
									onClick={() => {
										if (isCbct) {
											setIsCbctModalOpen(true);
										} else {
											setSelectedDicomImageSrc(thumbSrc);
											setIsDicomViewerModalOpen(true);
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
									{/* Modality, Tooth & Dose Badges */}
									<div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none gap-1">
										<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/80 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/40 shadow-xs backdrop-blur-xs leading-none">
											{study.kind === "cbct"
												? "3D КТ"
												: study.kind === "opg"
													? "ОПТГ"
													: study.kind === "cephalometric" || study.kind === "trg"
														? "ТРГ"
														: "RVG"}
											{study.toothCode ? ` #${study.toothCode}` : ""}
										</span>
										{study.effectiveDoseMicrosv ? (
											<span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-md bg-black/80 text-zinc-300 border border-white/15 shadow-xs leading-none">
												{study.effectiveDoseMicrosv} мкЗв
											</span>
										) : null}
									</div>
									{/* Bottom Overlay with Date and Action */}
									<div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/95 via-black/65 to-transparent flex items-center justify-between text-white text-[10px]">
										<span className="truncate max-w-[70px] opacity-90 text-[10px]">
											{study.capturedAt
												? new Date(study.capturedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
												: "Приём"}
										</span>
										<span className="text-[var(--teal,#0d9488)] font-semibold flex items-center gap-0.5 group-hover:text-white transition-colors">
											<Eye size={11} />
											<span className="text-[9.5px]">Открыть</span>
										</span>
									</div>
								</div>
							);
						})}

						{photoAttachments.map((photo) => (
							<div
								key={photo.id}
								className="group relative rounded-xl overflow-hidden border border-[var(--line-subtle)] bg-[#030712] cursor-pointer shadow-2xs hover:border-[var(--teal)] hover:shadow-md transition-all aspect-square select-none"
								style={{ aspectRatio: "1 / 1" }}
								data-testid={`visit-scan-thumbnail-${photo.id}`}
								onClick={() => setIsPhotoProtocolModalOpen(true)}
								title="Открыть фотопротокол"
							>
								{photo.photoUrl ? (
									<img
										src={photo.photoUrl}
										alt={`Фото: ${photo.toothNumber ? `зуб ${photo.toothNumber}` : "общий"}`}
										loading="lazy"
										decoding="async"
										className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
										style={{ width: "100%", height: "100%", objectFit: "cover" }}
									/>
								) : (
									<div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-xs text-[var(--muted)] gap-1">
										<ImageIcon size={22} className="text-[var(--teal)] opacity-70" />
										<span className="font-semibold text-white text-[11px]">Фотопротокол</span>
										<span className="text-[9.5px] text-zinc-400">
											{photo.photoType === "before"
												? "До лечения"
												: photo.photoType === "after"
													? "После"
													: "В процессе"}
										</span>
									</div>
								)}
								<div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none">
									<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/80 text-amber-400 border border-amber-400/40 shadow-xs backdrop-blur-xs leading-none">
										Фото{photo.toothNumber ? ` #${photo.toothNumber}` : ""}
									</span>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											handleRemovePhoto(photo.id);
										}}
										className="pointer-events-auto p-1 rounded-md bg-black/70 hover:bg-rose-600 text-rose-300 hover:text-white transition-colors cursor-pointer"
										title="Удалить снимок"
									>
										<Trash2 size={11} />
									</button>
								</div>
								<div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/95 via-black/65 to-transparent flex items-center justify-between text-white text-[10px]">
									<span className="truncate max-w-[70px] opacity-90 text-[10px]">
										{photo.description || (photo.photoType === "before" ? "До" : photo.photoType === "after" ? "После" : "В процессе")}
									</span>
									<span className="text-[var(--teal,#0d9488)] font-semibold flex items-center gap-0.5 group-hover:text-white transition-colors">
										<Eye size={11} />
										<span className="text-[9.5px]">Открыть</span>
									</span>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* ═══════════════════════════════════════════════════════════════════════
			    РЕЖИМ 1: РАДИОВИЗИОГРАФИЯ (ПРИЦЕЛЬНЫЕ СНИМКИ)
			    Строка быстрых действий текущего зуба & VisiographAnalyzer
			    ═══════════════════════════════════════════════════════════════════════ */}
			<div className={diagnosticMode === "rvg" ? "flex flex-col gap-3" : "hidden"}>
				<div className="flex items-center justify-between gap-3 flex-wrap p-2.5 sm:p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] shadow-2xs">
					<div className="flex items-center gap-2.5 flex-wrap">
						<span className="text-xs font-bold text-[var(--teal)] bg-[var(--teal-soft,#0d948815)] px-2.5 py-1 rounded-lg border border-[var(--teal)]/20 shadow-2xs flex items-center gap-1.5">
							<Scan size={14} />
							<span>Зуб {initialToothNumber || 16}</span>
						</span>
						{(target === "visit-patient" || (target === "no-visit" && (visitPatientName || selectedPatientName))) ? (
							<span
								className="text-xs text-[var(--muted)] flex items-center gap-1.5"
								data-testid="visit-imaging-target-ok"
							>
								<span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)] shrink-0 inline-block" />
								<span>Карта: <strong className="text-[var(--ink)]">{visitPatientName || selectedPatientName}</strong></span>
							</span>
						) : null}
					</div>

					<div className="flex items-center gap-1.5 flex-wrap">
						<button
							type="button"
							onClick={() => setIsDirectRvgModalOpen(true)}
							data-testid="btn-open-direct-rvg-modal"
							className="h-8 px-3 rounded-lg text-[13px] font-semibold bg-[var(--teal)] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] border border-[var(--teal)] shadow-2xs active:scale-98 transition-all cursor-pointer flex items-center gap-1.5"
							title="Прямой захват снимка с датчика визиографа"
						>
							<Camera size={14} />
							<span>+ Захват с визиографа</span>
						</button>
						<button
							type="button"
							onClick={() => setIsHotFolderModalOpen(true)}
							data-testid="btn-open-hot-folder-modal"
							className="h-8 px-2.5 rounded-lg text-[13px] font-medium bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line-subtle)] hover:border-[var(--teal)]/40 cursor-pointer transition-all shadow-2xs active:scale-98 flex items-center gap-1.5"
							title="Папка автозахвата снимков: автоматический импорт из каталога визиографа"
						>
							<FolderInput size={14} className="text-[var(--teal)]" />
							<span>Папка автозахвата</span>
						</button>
						<button
							type="button"
							onClick={() => setIsDicomViewerModalOpen(true)}
							data-testid="btn-open-dicom-viewer-modal"
							className="h-8 px-2.5 rounded-lg text-[13px] font-medium bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line-subtle)] hover:border-[var(--teal)]/40 cursor-pointer transition-all shadow-2xs active:scale-98 flex items-center gap-1.5"
							title="Открыть DICOM / ОПТГ панораму"
						>
							<ImageIcon size={14} className="text-[var(--teal)]" />
							<span>DICOM / ОПТГ</span>
						</button>
					</div>
				</div>

				{/* Модуль визиографа и рентген-анализа ИИ */}
				<VisiographAnalyzer
					patientId={activePatient?.id}
					toothCode={initialToothNumber ? String(initialToothNumber) : undefined}
					onInsertToProtocol={props?.onInsertToProtocol}
					onConnectRvg={() => setIsDirectRvgModalOpen(true)}
					onReferToRadiology={() => setIsRadiologyModalOpen(true)}
					onUploadDicom={() => setIsDicomViewerModalOpen(true)}
				/>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════════
			    РЕЖИМ 2: ДЕНТАЛЬНЫЙ ФОТОПРОТОКОЛ («ДО / ПОСЛЕ»)
			    Сетка протокола (12 слотов), прикрепленные фото и форма добавления
			    ═══════════════════════════════════════════════════════════════════════ */}
			<div className={diagnosticMode === "photo" ? "flex flex-col gap-3" : "hidden"}>
				<div
					data-testid="visit-photo-protocol-card"
					className="p-3.5 sm:p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] hover:border-[var(--teal)]/40 flex flex-col gap-3 shadow-2xs transition-all"
				>
					<div className="flex items-center justify-between gap-3 flex-wrap">
						<div className="flex items-center gap-3">
							<div className="w-9 h-9 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)] text-[var(--teal)] flex items-center justify-center shrink-0 shadow-2xs">
								<Camera size={18} />
							</div>
							<div>
								<div className="flex items-center gap-2 flex-wrap">
									<strong className="text-xs sm:text-sm font-bold text-[var(--ink)]">
										Дентальный фотопротокол («До / После»)
									</strong>
									<span className="text-[10px] font-semibold text-[var(--muted)] bg-[var(--paper)] px-1.5 py-0.5 rounded border border-[var(--line-subtle)]">
										Фотоприложения
									</span>
								</div>
								<p className="text-xs text-[var(--muted)] m-0 mt-0.5 leading-snug">
									Клиническая макросъемка, контроль препарирования, привязка к зубной формуле (11–48) и ведомость приложений к медицинской карте
								</p>
							</div>
						</div>

						<div className="flex items-center gap-1.5 shrink-0">
							<button
								type="button"
								onClick={() => setIsPhotoProtocolModalOpen(true)}
								data-testid="open-visit-photo-protocol-modal-btn"
								className="h-8 px-3.5 rounded-lg bg-[var(--teal)] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] border border-[var(--teal)] font-semibold text-[13px] flex items-center justify-center gap-1.5 shrink-0 shadow-2xs active:scale-98 transition-all cursor-pointer"
								title="Сетка фотопротокола (12 слотов)"
							>
								<Camera size={14} />
								<span>Сетка протокола (12 слотов)</span>
							</button>
						</div>
					</div>

					{/* Quick-Attach Form */}
					<div className="pt-2.5 border-t border-[var(--line-subtle)] flex flex-wrap items-center gap-2">
						<div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-medium">
							<span>Зуб:</span>
							<select
								id="photo-tooth-select"
								value={selectedToothForPhoto}
								onChange={(e) => setSelectedToothForPhoto(Number(e.target.value))}
								className="h-8 text-xs font-semibold rounded-lg border border-[var(--line-subtle)] bg-[var(--paper)] text-[var(--ink)] px-2 focus:outline-none focus:border-[var(--teal)] cursor-pointer"
							>
								<option value={0}>Общий вид</option>
								{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
									<option key={t} value={t}>
										Зуб {t}
									</option>
								))}
							</select>
						</div>

						<div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-medium">
							<span>Этап:</span>
							<select
								id="photo-stage-select"
								value={selectedPhotoType}
								onChange={(e) => setSelectedPhotoType(e.target.value as any)}
								className="h-8 text-xs font-semibold rounded-lg border border-[var(--line-subtle)] bg-[var(--paper)] text-[var(--ink)] px-2 focus:outline-none focus:border-[var(--teal)] cursor-pointer"
							>
								<option value="before">До лечения</option>
								<option value="process">В процессе (коффердам/преп)</option>
								<option value="after">После лечения (контроль)</option>
								<option value="intraoral_macro">Внутриротовой макро</option>
								<option value="face_portrait">Портрет лица</option>
							</select>
						</div>

						<div className="flex-1 min-w-[200px]">
							<input
								id="photo-comment-input"
								type="text"
								placeholder="Клинический комментарий (цвет, анатомическая моделировка)..."
								value={photoComment}
								onChange={(e) => setPhotoComment(e.target.value)}
								className="w-full h-8 px-2.5 text-xs font-medium rounded-lg border border-[var(--line-subtle)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--teal)]"
							>
							</input>
						</div>

						<button
							type="button"
							onClick={handleAddPhoto}
							className="h-8 px-3.5 rounded-lg bg-[var(--teal)] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] border border-[var(--teal)] text-[13px] font-semibold flex items-center justify-center gap-1.5 shrink-0 shadow-2xs active:scale-98 transition-all cursor-pointer"
						>
							<Plus size={14} />
							<span>Привязать</span>
						</button>
					</div>

					{/* List of Attached Photos or Quiet State */}
					{photoAttachments.length > 0 ? (
						<div className="pt-2 border-t border-[var(--line-subtle)] space-y-2">
							<div className="text-[11px] font-bold text-[var(--muted)]">
								Прикрепленные снимки фотопротокола ({photoAttachments.length}):
							</div>
							<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 pt-1">
								{photoAttachments.map((photo) => (
									<div
										key={photo.id}
										className="group relative rounded-xl overflow-hidden border border-[var(--line-subtle)] bg-[#030712] shadow-2xs hover:border-[var(--teal)] hover:shadow-md transition-all cursor-pointer aspect-square select-none"
										style={{ aspectRatio: "1 / 1" }}
										onClick={() => setIsPhotoProtocolModalOpen(true)}
										title="Нажмите для открытия сетки фотопротокола"
										data-testid={`photo-attachment-card-${photo.id}`}
									>
										{photo.photoUrl ? (
											<img
												src={photo.photoUrl}
												alt={`Фото: ${photo.toothNumber ? `Зуб ${photo.toothNumber}` : "Общий вид"}`}
												loading="lazy"
												decoding="async"
												className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
												style={{ width: "100%", height: "100%", objectFit: "cover" }}
											/>
										) : (
											<div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-xs text-[var(--muted)] gap-1 select-none">
												<Camera size={22} className="text-[var(--teal)] opacity-70" />
												<span className="font-semibold text-white text-[11px]">
													{photo.toothNumber ? `Зуб ${photo.toothNumber}` : "Общий вид"}
												</span>
												<span className="text-[9.5px] text-zinc-400">
													{photo.photoType === "before"
														? "До лечения"
														: photo.photoType === "after"
															? "После лечения"
															: photo.photoType === "process"
																? "В процессе"
																: photo.photoType === "intraoral_macro"
																	? "Внутриротовой макро"
																	: "Портрет лица"}
												</span>
											</div>
										)}
										<div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none">
											<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/80 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/40 shadow-xs backdrop-blur-xs leading-none">
												{photo.photoType === "before"
													? "До лечения"
													: photo.photoType === "after"
														? "После"
														: photo.photoType === "process"
															? "В процессе"
															: "Макро"}
											</span>
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													handleRemovePhoto(photo.id);
												}}
												className="pointer-events-auto p-1 rounded-md bg-black/70 hover:bg-rose-600 text-rose-300 hover:text-white transition-colors cursor-pointer"
												title="Удалить снимок"
											>
												<Trash2 size={11} />
											</button>
										</div>
										<div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/95 via-black/65 to-transparent flex items-center justify-between text-white text-[10px]">
											<span className="truncate max-w-[70px] opacity-90 text-[10px]">
												{photo.description || (photo.toothNumber ? `Зуб ${photo.toothNumber}` : "Снимок")}
											</span>
											<span className="text-[var(--teal,#0d9488)] font-semibold flex items-center gap-0.5 group-hover:text-white transition-colors">
												<Eye size={11} />
												<span className="text-[9.5px]">Открыть</span>
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					) : (
						<div className="pt-2 border-t border-[var(--line-subtle)] text-[11px] text-[var(--muted)] flex items-center justify-between">
							<span>Снимки не прикреплены. Заполните форму выше для быстрой привязки к зубу или откройте сетку на 12 слотов.</span>
						</div>
					)}
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════════
			    РЕЖИМ 3: 3D КЛКТ И ОПТГ ПАНОРАМА
			    3D КЛКТ Studio, выписка направлений, MPR-срезы, добавление в смету
			    ═══════════════════════════════════════════════════════════════════════ */}
			<div className={diagnosticMode === "cbct" ? "flex flex-col gap-3" : "hidden"}>
				<div
					data-testid="visit-cbct-optg-card"
					className="p-3.5 sm:p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] hover:border-[var(--teal)]/40 flex flex-col gap-3 shadow-2xs transition-all relative"
				>
					<div className="flex items-start justify-between gap-3 flex-wrap">
						<div className="flex items-start gap-3">
							<div className="w-10 h-10 rounded-xl bg-[var(--paper)] border border-[var(--line-subtle)] text-[var(--teal)] flex items-center justify-center shrink-0 shadow-2xs">
								<Activity size={20} />
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2 flex-wrap">
									<strong className="text-xs sm:text-sm font-bold text-[var(--ink)]">
										3D КЛКТ / ОПТГ панорама
									</strong>
								</div>
								<p className="text-xs text-[var(--muted)] m-0 mt-0.5 leading-snug">
									MPR-срезы, денситометрия Hounsfield, имплантологическая линейка, панорамная реконструкция ОПТГ и направления
								</p>
							</div>
						</div>

						<div className="flex items-center gap-1.5 shrink-0">
							<button
								type="button"
								onClick={() => setIsRadiologyModalOpen(true)}
								className="h-8 px-3 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line-subtle)] hover:border-[var(--teal)]/40 font-medium text-[13px] flex items-center gap-1.5 shadow-2xs active:scale-98 transition-all cursor-pointer"
								title="Выписать направление на КЛКТ / ОПТГ / ТРГ"
							>
								<Scan size={14} className="text-[var(--teal)]" />
								<span>Направление на снимок</span>
							</button>
						</div>
					</div>

					<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)] flex flex-col sm:flex-row items-center justify-between gap-2.5">
						<div className="text-xs text-[var(--ink)]">
							<span className="font-semibold block sm:inline">3D КЛКТ и MPR-просмотр:</span>
							<span className="text-[var(--muted)] ml-0 sm:ml-1">Полноэкранный мультипланарный анализ (аксиальный, сагиттальный, корональный срезы).</span>
						</div>

						<div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap" ref={cbctMenuRef}>
							<button
								type="button"
								onClick={() => {
									addCbctToFinanceAndPlan({
										patientId: visitPatientId ?? activePatient?.id,
										toothFdi: initialToothNumber || 16,
										doctorName: dashboard?.activeDoctor?.fullName || ctx?.auth?.currentUser?.name,
									});
								}}
								data-testid="btn-add-cbct-service-to-visit"
								className="h-8 px-2.5 rounded-lg bg-[var(--teal-soft,#0d948815)] hover:bg-[var(--teal-soft,#0d948825)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30 font-medium text-[13px] flex items-center gap-1 shrink-0 shadow-2xs active:scale-98 transition-all cursor-pointer"
								title="Добавить услугу КЛКТ (3 800 ₽) в смету приёма"
							>
								<Receipt size={13} />
								<span>+ КЛКТ в смету (3 800 ₽)</span>
							</button>

							<button
								type="button"
								onClick={() => setIsDicomViewerModalOpen(true)}
								className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line-subtle)] hover:border-[var(--teal)]/40 font-medium text-[13px] flex items-center gap-1 shrink-0 shadow-2xs active:scale-98 transition-all cursor-pointer"
								title="Просмотр DICOM / КТ-серии"
							>
								<ImageIcon size={13} className="text-[var(--teal)]" />
								<span>Просмотр DICOM</span>
							</button>

							<button
								type="button"
								onClick={() => setIsCbctModalOpen(true)}
								data-testid="btn-open-cbct-studio-modal"
								id="open-visit-cbct-studio-btn"
								className="h-8 px-3.5 rounded-lg bg-[var(--teal)] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] border border-[var(--teal)] font-semibold text-[13px] flex items-center gap-1.5 shadow-2xs active:scale-98 transition-all cursor-pointer"
								title="3D КЛКТ (MPR-срезы и имплантация)"
							>
								<Activity size={14} />
								<span>Открыть 3D КЛКТ</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════════
			    СПЕЦИАЛИЗИРОВАННАЯ ДИАГНОСТИКА:
			    Ортодонтия и цефалометрия ТРГ (сворачиваемая секция)
			    ═══════════════════════════════════════════════════════════════════════ */}
			<div className="border border-[var(--line-subtle)] rounded-xl overflow-hidden bg-[var(--paper-soft)] hover:border-[var(--teal)]/40 shadow-2xs transition-all">
				<button
					type="button"
					onClick={() => setIsAdvancedDiagnosticsOpen((prev) => !prev)}
					data-testid="toggle-advanced-diagnostics-btn"
					className="w-full p-3 flex items-center justify-between gap-3 text-left bg-transparent border-0 hover:bg-[var(--paper)]/50 transition-colors cursor-pointer"
					aria-expanded={isAdvancedDiagnosticsOpen}
				>
					<div className="flex items-center gap-2.5">
						<div className="w-6 h-6 rounded-md bg-[var(--paper)] border border-[var(--line-subtle)] text-[var(--muted)] flex items-center justify-center shrink-0">
							{isAdvancedDiagnosticsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
						</div>
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-xs font-bold text-[var(--ink)]">
								Расширенная и ортодонтическая диагностика (ТРГ / Цефалометрия)
							</span>
							<span className="text-[10px] font-semibold text-[var(--muted)] bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line-subtle)]">
								Для ортодонтии и челюстно-лицевой хирургии
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-[11px] text-[var(--muted)] shrink-0 hidden sm:inline">
							{isAdvancedDiagnosticsOpen ? "Свернуть секцию" : "Развернуть протокол ТРГ"}
						</span>
					</div>
				</button>

				<div
					data-testid="visit-ceph-diagnostic-card"
					className={`p-3 pt-0 border-t border-[var(--line-subtle)] ${isAdvancedDiagnosticsOpen ? "block" : "hidden"}`}
				>
					<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)] hover:border-[var(--teal)]/40 flex flex-col justify-between gap-2.5 shadow-2xs transition-all mt-2">
						<div className="flex items-start gap-3">
							<div className="w-9 h-9 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle)] text-[var(--teal)] flex items-center justify-center shrink-0 shadow-2xs">
								<Activity size={18} />
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2 flex-wrap">
									<strong className="text-xs sm:text-sm font-bold text-[var(--ink)]">
										Цефалометрический анализ ТРГ
									</strong>
									<span className="text-[10px] font-semibold text-[var(--muted)] bg-[var(--paper-soft)] px-1.5 py-0.5 rounded border border-[var(--line-subtle)]">
										Протокол ТРГ
									</span>
								</div>
								<p className="text-xs text-[var(--muted)] m-0 mt-0.5 leading-snug">
									Разметка анатомических ориентиров (S, N, A, B, Pog, Go, Gn), расчет угловых и линейных параметров Steiner / Tweed / Ricketts / McNamara, определение типа роста и перенос ортодонтического заключения в дневник приёма.
								</p>
							</div>
						</div>

						<div className="flex items-center justify-end pt-1 border-t border-[var(--line-subtle)]">
							<button
								type="button"
								onClick={() => setIsCephModalOpen(true)}
								data-testid="open-visit-ceph-modal-btn"
								className="h-8 px-3.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line-subtle)] hover:border-[var(--teal)]/40 font-semibold text-[13px] flex items-center justify-center gap-1.5 shrink-0 shadow-2xs active:scale-98 transition-all cursor-pointer"
							>
								<Activity size={14} className="text-[var(--teal)]" />
								<span>Открыть анализ ТРГ</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Orthodontic Cephalometric Modal */}
			<CephalometricAnalysisModal
				isOpen={isCephModalOpen}
				onClose={() => setIsCephModalOpen(false)}
				patientId={visitPatientId ?? activePatient?.id}
				patientName={visitPatientName ?? activePatient?.fullName}
				onInsertToProtocol={(text) => {
					if (props?.onInsertToProtocol) {
						props.onInsertToProtocol(text);
					} else if (typeof ctx?.appendToTranscript === "function") {
						ctx.appendToTranscript(`\n\n${text}`);
					}
				}}
			/>

		<React.Suspense fallback={null}>
			{/* Dental Radiology Referral Printable Modal */}
			{isRadiologyModalOpen && (
				<RadiologyReferralModal
					isOpen={isRadiologyModalOpen}
					onClose={() => setIsRadiologyModalOpen(false)}
					patient={activePatient}
					diary={EMPTY_DIARY}
					doctorName={ctx?.auth?.currentUser?.name || "Лечащий врач стоматолог"}
					clinicName={dashboard?.clinicSettings?.profile?.brandName || "Клиника ДЕНТЕ"}
				/>
			)}

			{/* Clinical 12/8/6/3-Slot Photo Protocol Studio Modal */}
			{isPhotoProtocolModalOpen && (
				<ClinicalPhotoProtocolModal
					isOpen={isPhotoProtocolModalOpen}
					onClose={() => setIsPhotoProtocolModalOpen(false)}
					patientId={visitPatientId ?? activePatient?.id}
					patientName={visitPatientName ?? activePatient?.fullName}
					doctorName={ctx?.auth?.currentUser?.name || "Лечащий врач стоматолог"}
					clinicName={dashboard?.clinicSettings?.profile?.brandName || "Клиника ДЕНТЕ"}
					onSaveProtocol={(slots) => {
						const newAttachments: ClinicalPhotoAttachment[] = Object.entries(slots)
							.filter(([_, rec]) => typeof rec.imageUrl === "string" && rec.imageUrl.length > 0)
							.map(([slotId, rec]) => ({
								id: `photo-slot-${slotId}-${Date.now()}`,
								photoType: rec.stage === "after" ? "after" : "before",
								photoUrl: rec.imageUrl || "",
								description: `Слот: ${slotId}`,
								capturedAtIso: rec.uploadedAt ?? new Date().toISOString(),
							}));
						if (newAttachments.length > 0) {
							const updated = [...photoAttachments, ...newAttachments];
							setPhotoAttachments(updated);
							const statement = generatePhotoProtocolAttachmentsStatement(updated);
							if (props?.onInsertToProtocol) {
								props.onInsertToProtocol(statement);
							} else {
								try {
									window.dispatchEvent(
										new CustomEvent("dente-apply-soap-protocol", {
											detail: {
												soap: {
													treatmentDescription: statement,
												},
												mode: "smart_append",
											},
										}),
									);
								} catch {
									// ignore
								}
							}
						}
						setIsPhotoProtocolModalOpen(false);
					}}
				/>
			)}

			{/* 3D CBCT / MPR Fullscreen Studio Modal */}
			{isCbctModalOpen && (
				<CbctMprImplantStudioModal
					isOpen={isCbctModalOpen}
					onClose={() => setIsCbctModalOpen(false)}
					patientName={visitPatientName ?? activePatient?.fullName ?? undefined}
					patientId={visitPatientId ?? activePatient?.id ?? undefined}
					onApplyToDiary043={(diaryText) => {
						if (!diaryText) return;
						if (props?.onInsertToProtocol) {
							props.onInsertToProtocol(diaryText);
						}
						try {
							window.dispatchEvent(
								new CustomEvent("dente-apply-soap-protocol", {
									detail: {
										soap: {
											treatmentDescription: diaryText,
										},
										immediate: true,
										mode: "smart_append",
									},
								}),
							);
						} catch {
							// ignore
						}
					}}
				/>
			)}

			{/* Direct Visiograph (RVG) Sensor Capture Modal */}
			{isDirectRvgModalOpen && (
				<DirectRvgCaptureModal
					isOpen={isDirectRvgModalOpen}
					onClose={() => setIsDirectRvgModalOpen(false)}
					patientId={visitPatientId ?? activePatient?.id}
					patientName={visitPatientName ?? activePatient?.fullName}
					patientCardNumber={activePatient?.cardNumber || activePatient?.medCardNumber}
					doctorName={dashboard?.activeDoctor?.fullName || "Врач-стоматолог"}
					initialToothFdi={initialToothNumber ? String(initialToothNumber) : undefined}
					onSaveToEmr={(study) => {
						const toothStr = study.teethFdi?.[0] || (initialToothNumber ? String(initialToothNumber) : "—");
						const logText = `[Визиограф RVG] Снимок зуба #${toothStr}: доза ${study.effectiveDoseMicrosv || 0} мкЗв. Сохранен в ЭМК.`;
						if (props?.onInsertToProtocol) {
							props.onInsertToProtocol(logText);
						} else if (typeof ctx?.appendToTranscript === "function") {
							ctx.appendToTranscript(`\n\n${logText}`);
						}
					}}
				/>
			)}

			{/* DICOM / CT Series Examination Modal */}
			{isDicomViewerModalOpen && (
				<DicomViewerModal
					isOpen={isDicomViewerModalOpen}
					onClose={() => {
						setIsDicomViewerModalOpen(false);
						setSelectedDicomImageSrc(undefined);
					}}
					imageSrc={
						selectedDicomImageSrc ??
						(isDemoShowcaseMode() || isDemoPatientId(visitPatientId ?? activePatient?.id)
							? (initialToothNumber === 16
								? "/radiology/sample_rvg_tooth16.jpg"
								: "/radiology/sample_rvg_tooth36_periapical.jpg")
							: undefined)
					}
					patientName={visitPatientName ?? activePatient?.fullName}
					patientId={visitPatientId ?? activePatient?.id}
					toothFdiCode={initialToothNumber ? String(initialToothNumber) : "36"}
					onConnectRvg={() => {
						setIsDicomViewerModalOpen(false);
						setIsDirectRvgModalOpen(true);
					}}
					onReferToRadiology={() => {
						setIsDicomViewerModalOpen(false);
						setIsRadiologyModalOpen(true);
					}}
					onInsertToProtocol={(text) => {
						if (props?.onInsertToProtocol) {
							props.onInsertToProtocol(text);
						} else if (typeof ctx?.appendToTranscript === "function") {
							ctx.appendToTranscript(`\n\n${text}`);
						}
					}}
				/>
			)}

			{/* Hot Folder Radiology Auto-Intake Modal */}
			{isHotFolderModalOpen && (
				<HotFolderIntakeModal
					isOpen={isHotFolderModalOpen}
					onClose={() => setIsHotFolderModalOpen(false)}
					patientId={visitPatientId ?? activePatient?.id}
					patientName={visitPatientName ?? activePatient?.fullName}
					patientCardNumber={activePatient?.cardNumber || activePatient?.medCardNumber}
					doctorName={dashboard?.activeDoctor?.fullName || "Врач-стоматолог"}
					onAttachToEmr={({ study, teethFdi, protocolNote, doseMicrosv }) => {
						const logText = `[Автоимпорт] Импортирован снимок ${study.modalityLabel || "Рентген"}: ${teethFdi.join(", ") || "б/о"}, доза ${doseMicrosv} мкЗв. ${protocolNote}`;
						if (props?.onInsertToProtocol) {
							props.onInsertToProtocol(logText);
						} else if (typeof ctx?.appendToTranscript === "function") {
							ctx.appendToTranscript(`\n\n${logText}`);
						}
					}}
				/>
			)}
		</React.Suspense>
	</div>
);
}
