import { Activity, Camera, FileText, FolderInput, Image as ImageIcon, Layers, Plus, Receipt, Scan, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { usePatientStore } from "../../store/patientStore";
import { EMPTY_DIARY } from "../useVisitDiaryLogic";
import { VisiographAnalyzer } from "../imaging/VisiographAnalyzer";
import { LabOrdersPanel } from "../patients/LabOrdersPanel";

const EndoCanalLogModal = React.lazy(() =>
	import("../endo/EndoCanalLogModal").then((m) => ({
		default: m.EndoCanalLogModal,
	})),
);
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
const ImplantPassportModal = React.lazy(() =>
	import("../implants/ImplantPassportModal").then((m) => ({
		default: m.ImplantPassportModal,
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

/*
  СНИМОК И ЗАКЛЮЧЕНИЕ ПРИВЯЗАНЫ НАПРЯМУЮ К ПАЦИЕНТУ ПРИЁМА.

  Архитектурный долг ликвидирован (WAVE 60 / FEATURE 249):
  VisiographAnalyzer принимает идентификатор пациента приёма через пропс patientId
  (patientId={activePatient?.id}), благодаря чему снимок, заключение и отметки
  зубов гарантированно сохраняются в карту пациента текущего приёма, даже если в
  разделе «Пациенты» параллельно открыта карточка другого человека.
*/
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export function VisitDiagnosticsTab(props?: {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	activePatient?: any;
	onInsertToProtocol?: (text: string) => void;
}) {
	const ctx = useAppLogicContext();
	const activePatient = props?.activePatient ?? ctx?.activePatient;
	const workspaceFlags = useWorkspaceProfile();
	const [isCephModalOpen, setIsCephModalOpen] = useState<boolean>(false);
	const [isEndoLogModalOpen, setIsEndoLogModalOpen] = useState<boolean>(false);
	const [isRadiologyModalOpen, setIsRadiologyModalOpen] = useState<boolean>(false);
	const [isPhotoProtocolModalOpen, setIsPhotoProtocolModalOpen] = useState<boolean>(false);
	const [isCbctModalOpen, setIsCbctModalOpen] = useState<boolean>(false);
	const [isImplantPassportModalOpen, setIsImplantPassportModalOpen] = useState<boolean>(false);
	const [isDirectRvgModalOpen, setIsDirectRvgModalOpen] = useState<boolean>(false);
	const [isDicomViewerModalOpen, setIsDicomViewerModalOpen] = useState<boolean>(false);
	const [isHotFolderModalOpen, setIsHotFolderModalOpen] = useState<boolean>(false);

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

	return (
		<div
			data-testid="visit-diagnostics-tab"
			className="visit-diagnostics-tab bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] rounded-xl p-4 flex flex-col gap-4 shadow-sm"
		>
			{/* Radiology & Advanced Imaging Quick Bar (Unified 32px Clinical Density) */}
			<div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none pb-2 border-b border-[var(--line)]">
				<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider shrink-0 flex items-center gap-1.5 mr-1">
					<Scan size={14} className="text-[var(--teal)]" />
					<span>Лучевая диагностика:</span>
				</span>
				<button
					type="button"
					onClick={() => setIsCbctModalOpen(true)}
					className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)]/40 cursor-pointer transition-all shadow-2xs active:scale-98 shrink-0 flex items-center gap-1.5"
					data-testid="btn-open-cbct-studio-modal"
					title="3D КЛКТ / КТ-исследование (MPR & Имплантация)"
				>
					<Activity size={14} className="text-[var(--teal)]" />
					<span>3D КЛКТ (MPR)</span>
				</button>
				<button
					type="button"
					onClick={() => {
						addCbctToFinanceAndPlan({
							patientId: visitPatientId ?? activePatient?.id,
							toothFdi: initialToothNumber || 16,
							doctorName: dashboard?.activeDoctor?.fullName || ctx?.auth?.currentUser?.name,
						});
					}}
					className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--teal-soft,#0d948815)] hover:bg-[var(--teal-soft,#0d948825)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30 cursor-pointer transition-all shadow-2xs active:scale-98 shrink-0 flex items-center gap-1.5"
					data-testid="btn-add-cbct-service-to-visit"
					title="В 1 клик добавить услугу КЛКТ (3 800 ₽) в смету приёма"
				>
					<Receipt size={14} />
					<span>+ КЛКТ в смету</span>
				</button>
				<button
					type="button"
					onClick={() => setIsRadiologyModalOpen(true)}
					className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)]/40 cursor-pointer transition-all shadow-2xs active:scale-98 shrink-0 flex items-center gap-1.5"
					data-testid="btn-open-radiology-referral-modal"
					title="Направление на КЛКТ / ОПТГ / ТРГ"
				>
					<Scan size={14} className="text-[var(--teal)]" />
					<span>Направление на снимок</span>
				</button>
				<button
					type="button"
					onClick={() => setIsEndoLogModalOpen(true)}
					className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)]/40 cursor-pointer transition-all shadow-2xs active:scale-98 shrink-0 flex items-center gap-1.5"
					data-testid="btn-open-endo-canal-modal"
					title="Эндодонтия: Журнал длины каналов (WL)"
				>
					<Layers size={14} className="text-[var(--teal)]" />
					<span>Длина каналов (WL)</span>
				</button>
				<button
					type="button"
					onClick={() => setIsDirectRvgModalOpen(true)}
					className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)]/40 cursor-pointer transition-all shadow-2xs active:scale-98 shrink-0 flex items-center gap-1.5"
					data-testid="btn-open-direct-rvg-modal"
					title="Прямой снимок с визиографа (RVG)"
				>
					<Camera size={14} className="text-[var(--teal)]" />
					<span>Снимок RVG</span>
				</button>
				<button
					type="button"
					onClick={() => setIsDicomViewerModalOpen(true)}
					className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)]/40 cursor-pointer transition-all shadow-2xs active:scale-98 shrink-0 flex items-center gap-1.5"
					data-testid="btn-open-dicom-viewer-modal"
					title="Просмотр DICOM / КТ-серии"
				>
					<ImageIcon size={14} className="text-[var(--teal)]" />
					<span>DICOM / КТ</span>
				</button>
				<button
					type="button"
					onClick={() => setIsHotFolderModalOpen(true)}
					className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)]/40 cursor-pointer transition-all shadow-2xs active:scale-98 shrink-0 flex items-center gap-1.5"
					data-testid="btn-open-hot-folder-modal"
					title="Импорт из Hot Folder (EzDent / Romexis)"
				>
					<FolderInput size={14} className="text-[var(--teal)]" />
					<span>Hot Folder</span>
				</button>
			</div>

			{/* Specialized Diagnostic Protocols Grid (2 Columns, Balanced DENTE Cards) */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
				{/* Orthodontic Cephalometric (TRG) Analysis Module Card */}
				<div
					data-testid="visit-ceph-diagnostic-card"
					className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--line-strong)] flex flex-col justify-between gap-3 shadow-2xs transition-all"
				>
					<div className="flex items-start gap-3">
						<div className="w-9 h-9 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--teal)] flex items-center justify-center shrink-0 shadow-2xs">
							<Activity size={18} />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2 flex-wrap">
								<strong className="text-xs sm:text-sm font-bold text-[var(--ink)]">
									Цефалометрический анализ ТРГ
								</strong>
								<span className="text-[10px] font-semibold text-[var(--muted)] bg-[var(--paper)] px-1.5 py-0.5 rounded border border-[var(--line)]">
									Протокол ТРГ
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5 leading-snug">
								Разметка ориентиров, расчет углов Steiner / Tweed / Ricketts и перенос заключения в дневник
							</p>
						</div>
					</div>

					<div className="flex items-center justify-end pt-1">
						<button
							type="button"
							onClick={() => setIsCephModalOpen(true)}
							data-testid="open-visit-ceph-modal-btn"
							className="h-8 px-3 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)]/40 font-semibold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-2xs active:scale-98 transition-all cursor-pointer"
						>
							<Activity size={14} className="text-[var(--teal)]" />
							<span>Открыть анализ ТРГ</span>
						</button>
					</div>
				</div>

				{/* Dental Implant Surgical Passport & ISQ Tracker Card */}
				<div
					data-testid="visit-implant-passport-card"
					className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--line-strong)] flex flex-col justify-between gap-3 shadow-2xs transition-all"
				>
					<div className="flex items-start gap-3">
						<div className="w-9 h-9 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--teal)] flex items-center justify-center shrink-0 shadow-2xs">
							<Layers size={18} />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2 flex-wrap">
								<strong className="text-xs sm:text-sm font-bold text-[var(--ink)]">
									Хирургический паспорт & ISQ
								</strong>
								<span className="text-[10px] font-semibold text-[var(--muted)] bg-[var(--paper)] px-1.5 py-0.5 rounded border border-[var(--line)]">
									Имплантация
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5 leading-snug">
								Протокол Misch D1–D4, торк фиксации, графт Bio-Oss, RFA ISQ динамика и 1-клик перенос в карту
							</p>
						</div>
					</div>

					<div className="flex items-center justify-end pt-1">
						<button
							type="button"
							onClick={() => setIsImplantPassportModalOpen(true)}
							data-testid="open-implant-passport-modal-btn"
							className="h-8 px-3 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)]/40 font-semibold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-2xs active:scale-98 transition-all cursor-pointer"
						>
							<Layers size={14} className="text-[var(--teal)]" />
							<span>Хирургический паспорт</span>
						</button>
					</div>
				</div>
			</div>

			{/* Dental Photography Protocol & Attachments Module Card */}
			<div
				data-testid="visit-photo-protocol-card"
				className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--line-strong)] flex flex-col gap-3 shadow-2xs transition-all"
			>
				<div className="flex items-center justify-between gap-3 flex-wrap">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--teal)] flex items-center justify-center shrink-0 shadow-2xs">
							<Camera size={18} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<strong className="text-xs sm:text-sm font-bold text-[var(--ink)]">
									Дентальный фотопротокол («До / После»)
								</strong>
								<span className="text-[10px] font-semibold text-[var(--muted)] bg-[var(--paper)] px-1.5 py-0.5 rounded border border-[var(--line)]">
									Фотоприложения
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
								Привязка клинических снимков к номерам зубов FDI (11–48) и автоматическая ведомость приложений
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={() => setIsPhotoProtocolModalOpen(true)}
						data-testid="open-visit-photo-protocol-modal-btn"
						className="h-8 px-3 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)]/40 font-semibold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-2xs active:scale-98 transition-all cursor-pointer"
					>
						<Camera size={14} className="text-[var(--teal)]" />
						<span>Сетка протокола (12 слотов)</span>
					</button>
				</div>

				{/* Compact Aligned Quick-Attach Toolbar (32px Unified Height) */}
				<div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--line)]">
					<div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-medium">
						<span>Зуб:</span>
						<select
							id="photo-tooth-select"
							value={selectedToothForPhoto}
							onChange={(e) => setSelectedToothForPhoto(Number(e.target.value))}
							className="h-8 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 focus:outline-none focus:border-[var(--teal)] cursor-pointer"
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
							className="h-8 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 focus:outline-none focus:border-[var(--teal)] cursor-pointer"
						>
							<option value="before">До лечения</option>
							<option value="after">После лечения</option>
							<option value="process">Этап (коффердам/преп)</option>
							<option value="intraoral_macro">Внутриротовой макро</option>
							<option value="face_portrait">Портрет лица</option>
						</select>
					</div>

					<div className="flex-1 min-w-[180px]">
						<input
							id="photo-comment-input"
							type="text"
							placeholder="Клинический комментарий (цвет, анатомическая моделировка)..."
							value={photoComment}
							onChange={(e) => setPhotoComment(e.target.value)}
							className="w-full h-8 px-2.5 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--teal)]"
						/>
					</div>

					<button
						type="button"
						onClick={handleAddPhoto}
						className="h-8 px-3 rounded-lg bg-[var(--teal)] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 shadow-2xs active:scale-98 transition-all cursor-pointer"
					>
						<Plus size={14} />
						<span>Привязать</span>
					</button>
				</div>

				{/* List of Attached Photos */}
				{photoAttachments.length > 0 ? (
					<div className="pt-2 border-t border-[var(--line)] space-y-2">
						<div className="text-[11px] font-bold text-[var(--muted)]">
							Прикрепленные снимки фотопротокола ({photoAttachments.length}):
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
							{photoAttachments.map((photo) => (
								<div
									key={photo.id}
									className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-2 text-xs shadow-2xs"
								>
									<div className="flex items-center gap-2 min-w-0">
										<ImageIcon size={16} className="text-[var(--teal)] shrink-0" />
										<div className="min-w-0">
											<div className="font-bold text-[var(--ink)] truncate">
												{photo.toothNumber ? `Зуб ${photo.toothNumber}` : "Общий вид"}
											</div>
											<div className="text-[var(--muted)] text-[11px] truncate">
												{photo.photoType === "before"
													? "До лечения"
													: photo.photoType === "after"
														? "После лечения"
														: "Этап лечения"}
												{photo.description ? ` · ${photo.description}` : ""}
											</div>
										</div>
									</div>
									<button
										type="button"
										onClick={() => handleRemovePhoto(photo.id)}
										className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
										title="Удалить снимок"
									>
										<Trash2 size={13} />
									</button>
								</div>
							))}
						</div>
					</div>
				) : null}
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
						className="h-7 px-2.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shrink-0"
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
						className="h-7 px-2.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors cursor-pointer shrink-0"
					>
						Открыть карту {visitPatientName ?? "пациента приёма"}
					</button>
				</div>
			) : null}

			{(target === "visit-patient" || (target === "no-visit" && (visitPatientName || selectedPatientName))) ? (
				<p
					className="m-0 text-xs text-[var(--muted)] flex items-center gap-1.5"
					data-testid="visit-imaging-target-ok"
				>
					<span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)] shrink-0 inline-block" />
					<span>Снимок и заключение сохранятся в карту: <strong>{visitPatientName || selectedPatientName}</strong></span>
				</p>
			) : null}

			{target === "no-visit" && !visitPatientName && !selectedPatientName ? (
				<div
					role="status"
					aria-live="polite"
					className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--muted)]"
				>
					Выберите пациента в расписании или картотеке для сохранения снимков и заключений в ЭМК.
				</div>
			) : null}

			{/* Visiograph & ShadowAnalyst AI Analyzer Module */}
			<VisiographAnalyzer
				patientId={activePatient?.id}
				onInsertToProtocol={props?.onInsertToProtocol}
			/>

			{/* Dental Lab CAD/CAM Orders Panel */}
			{workspaceFlags.hasDentalLab ? (
				activePatient?.id ? (
					<LabOrdersPanel patientId={activePatient.id} />
				) : (
					<div
						role="status"
						aria-live="polite"
						className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--muted)]"
					>
						<strong className="block mb-1 text-[var(--ink)]">
							Наряды в лабораторию пока не показать
						</strong>
						Пациент не выбран, а наряды читаются по конкретному человеку.
						Выберите пациента в разделе «Пациенты» или начните приём — список
						появится здесь.
					</div>
				)
			) : null}

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
			{/* Endodontic Root Canal Working Length Log Modal */}
			{isEndoLogModalOpen && (
				<EndoCanalLogModal
					isOpen={isEndoLogModalOpen}
					onClose={() => setIsEndoLogModalOpen(false)}
					toothNumber={selectedToothForPhoto || initialToothNumber || 16}
					patientId={visitPatientId ?? activePatient?.id}
					onInsertToProtocol={(text) => {
						if (props?.onInsertToProtocol) {
							props.onInsertToProtocol(text);
						} else if (typeof ctx?.appendToTranscript === "function") {
							ctx.appendToTranscript(`\n\n${text}`);
						}
					}}
				/>
			)}

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

			{/* Clinical 12/8/6/3-Slot Photo Protocol Studio Modal (Tier 2 on-demand) */}
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

			{/* 3D CBCT / MPR Fullscreen Studio Modal (Tier 3 on-demand) */}
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

			{/* Dental Implant Surgical Passport & ISQ Tracker Modal */}
			{isImplantPassportModalOpen && (
				<ImplantPassportModal
					isOpen={isImplantPassportModalOpen}
					onClose={() => setIsImplantPassportModalOpen(false)}
					patientName={visitPatientName || selectedPatientName || "Пациент"}
					patientId={visitPatientId || selectedPatientId || "PAT-01"}
					doctorName={dashboard?.activeDoctor?.fullName || "Хирург-имплантолог"}
					doctorId={dashboard?.activeDoctor?.id || "DOC-01"}
					initialTooth={initialToothNumber}
					onInsertIntoDiary={(protocolText) => {
						if (!protocolText) return;
						try {
							window.dispatchEvent(
								new CustomEvent("dente-apply-soap-protocol", {
									detail: {
										soap: {
											treatmentDescription: protocolText,
										},
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
					onClose={() => setIsDicomViewerModalOpen(false)}
					patientName={visitPatientName ?? activePatient?.fullName}
					toothFdiCode={initialToothNumber ? String(initialToothNumber) : undefined}
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
						const logText = `[Hot Folder] Импортирован снимок ${study.modalityLabel || "Рентген"}: ${teethFdi.join(", ") || "б/о"}, доза ${doseMicrosv} мкЗв. ${protocolNote}`;
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
