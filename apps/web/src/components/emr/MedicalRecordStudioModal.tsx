/**
 * apps/web/src/components/emr/MedicalRecordStudioModal.tsx
 *
 * Канонический SSOT-модуль медицинской карты приёма и клинического дневника DENTE CRM.
 * Автономия врача, Соло-врач, Единый дизайн-код Apple Mobile HIG, Живой русский язык.
 *
 * Sweet Spot: строго 380-450 строк.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
	ArrowLeft, Printer, Check, FileText, X, Maximize2, Minimize2, Sparkles, ZoomIn, ZoomOut, RotateCcw,
	User, HeartPulse, Activity, Calendar, Award, ShieldCheck, Loader2,
} from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { clientLogger } from "../../services/logging/clientLogger";
import type {
	MedicalRecordData, ClinicalVisitDiaryEntry, ClinicalPassportData, ClinicalAnamnesisData,
	RecordTabType, ExtendedMedicalRecordInitialData, MedicalRecordStudioModalProps,
} from "./types/recordDataTypes";
export type { RecordTabType, ExtendedMedicalRecordInitialData, MedicalRecordStudioModalProps };
import {
	DEFAULT_MEDICAL_CARD_DATA, resolveClinicRequisites, applyMedicalCardPhysiologicalNorm,
} from "./medicalCardCatalogData";
import {
	validateMedicalRecordCompleteness, formatPatientAge, calculateDmftIndex, calculateCpitnIndex, generateMedicalRecordPrintHtml,
} from "./clinicalDiaryMath";
import { generateUuidV7 } from "@dental/shared";
import {
	getSynchronousDraft,
	loadOfflineDraft,
	saveOfflineDraftDebounced,
} from "../../services/offline/storage/idbDraftOps";
import { useRecordExports } from "./record/useRecordExports";
import { useMedicalRecordSave } from "./record/useMedicalRecordSave";
import { RecordHeaderMoreMenu } from "./record/RecordHeaderMoreMenu";
import { ClinicalProtocolsCatalogModal } from "../visit/clinicalCatalog/ClinicalProtocolsCatalogModal";
import { RecordPassportTab } from "./record/tabs/RecordPassportTab";
import { RecordAnamnesisTab } from "./record/tabs/RecordAnamnesisTab";
import { RecordOdontogramTab } from "./record/tabs/RecordOdontogramTab";
import { RecordDiariesTab } from "./record/tabs/RecordDiariesTab";
import { RecordEpicrisisTab } from "./record/tabs/RecordEpicrisisTab";
import "./emrStudioStyles.css";

const RECORD_TABS: Array<{ id: RecordTabType; label: string; icon: React.FC<{ className?: string }> }> = [
	{ id: "overview", label: "Обзор и печать A4", icon: FileText }, { id: "passport", label: "1. Паспортная часть", icon: User },
	{ id: "anamnesis", label: "2. Жалобы и Анамнез", icon: HeartPulse }, { id: "odontogram", label: "3. Зубная формула", icon: Activity },
	{ id: "diaries", label: "4. Дневники визитов", icon: Calendar }, { id: "epicrisis", label: "5. Эпикриз и наблюдение", icon: Award },
];

function mergeRecordSections(base: MedicalRecordData, overlay?: ExtendedMedicalRecordInitialData | Partial<MedicalRecordData> | null): MedicalRecordData {
	if (!overlay) return base;
	return {
		...base,
		...overlay,
		clinic: { ...base.clinic, ...(overlay.clinic || {}) },
		passport: { ...base.passport, ...(overlay.passport || {}) },
		anamnesis: { ...base.anamnesis, ...(overlay.anamnesis || {}) },
		dentalStatus: { ...base.dentalStatus, ...(overlay.dentalStatus || {}) },
		visitDiaries: overlay.visitDiaries?.length ? overlay.visitDiaries : base.visitDiaries,
		epicrisis: { ...base.epicrisis, ...(overlay.epicrisis || {}) },
	};
}

export const MedicalRecordStudioModal: React.FC<MedicalRecordStudioModalProps> = React.memo(
	function MedicalRecordStudioModal({
		isOpen, onClose, onBack, backLabel, initialData, onSave, onOpenProtocolGenerator, isLocked, isDraft, status, initialTab,
		visitId, patientId, activeTooth,
	}) {
		const dashboard = useAppStore((s) => s.dashboard);
		const appActivePatientId = useAppStore((s) => s.activePatientId);
		const storeSelectedPatientId = usePatientStore((s) => s.selectedPatientId);
		const effectivePatientId = patientId || storeSelectedPatientId || appActivePatientId || undefined;
		const profile = dashboard?.clinicSettings?.profile;
		const staff = dashboard?.clinicSettings?.staff;
		const resolvedPatient = useMemo(
			() => (effectivePatientId ? dashboard?.patients?.find((p) => p.id === effectivePatientId) : undefined),
			[dashboard?.patients, effectivePatientId],
		);

		const initialIsLocked = initialData?.isLocked;
		const initialStatus = initialData?.status;

		const effectiveIsDraft = Boolean(
			isDraft || isLocked === false || status === "draft" ||
			initialIsLocked === false || initialStatus === "draft" ||
			!(isLocked || initialIsLocked || status === "signed" || initialStatus === "signed"),
		);

		const resolvedClinic = useMemo(
			() => resolveClinicRequisites(initialData?.clinic, profile, staff),
			[initialData?.clinic, profile, staff],
		);

		const buildInitialFormData = useCallback((): MedicalRecordData => {
			let draft: Partial<MedicalRecordData> | null = null;
			if (effectivePatientId) {
				const syncDraft = getSynchronousDraft<Partial<MedicalRecordData>>(`draft:emk:${effectivePatientId}`);
				if (syncDraft?.data) {
					draft = syncDraft.data;
				} else if (typeof sessionStorage !== "undefined") {
					try {
						const raw = sessionStorage.getItem(`dente:medical_card_autosave:${effectivePatientId}`);
						if (raw) draft = JSON.parse(raw);
					} catch (err) {
						clientLogger.warn("[MedicalRecordStudioModal] Ошибка разбора fallback-черновика из sessionStorage", err, {
							module: "MedicalRecordStudioModal",
							patientId: effectivePatientId,
						});
					}
				}
			}
			const patientOverlay: ExtendedMedicalRecordInitialData | undefined = resolvedPatient
				? {
						passport: {
							patientFullName: resolvedPatient.fullName || DEFAULT_MEDICAL_CARD_DATA.passport.patientFullName,
							patientBirthDate: resolvedPatient.birthDate || DEFAULT_MEDICAL_CARD_DATA.passport.patientBirthDate,
							patientPhone: resolvedPatient.phone || DEFAULT_MEDICAL_CARD_DATA.passport.patientPhone,
						},
				  }
				: undefined;
			const base = mergeRecordSections(
				mergeRecordSections(DEFAULT_MEDICAL_CARD_DATA, { clinic: resolvedClinic }),
				patientOverlay,
			);
			return mergeRecordSections(mergeRecordSections(base, draft), initialData);
		}, [initialData, resolvedClinic, resolvedPatient, effectivePatientId]);

		const [formData, setFormData] = useState<MedicalRecordData>(buildInitialFormData);

		// Async IndexedDB Draft Hydration: восстановление при сбое браузера / Ctrl+W / OOM
		useEffect(() => {
			if (!effectivePatientId) return;
			let cancelled = false;
			void loadOfflineDraft<Partial<MedicalRecordData>>(`draft:emk:${effectivePatientId}`).then((idbDraft) => {
				if (!cancelled && idbDraft?.data) setFormData((prev) => mergeRecordSections(prev, idbDraft.data));
			});
			return () => { cancelled = true; };
		}, [effectivePatientId]);

		// Zero-Leak Draft (Мандаты 8zq/8bn): Сброс и гидратация formData при смене effectivePatientId
		const lastPatientIdRef = useRef<string | undefined>(effectivePatientId);
		const buildInitialRef = useRef(buildInitialFormData);
		buildInitialRef.current = buildInitialFormData;
		useEffect(() => {
			if (lastPatientIdRef.current !== effectivePatientId) {
				lastPatientIdRef.current = effectivePatientId;
				setFormData(buildInitialRef.current());
			}
		}, [effectivePatientId]);

		const [activeTab, setActiveTab] = useState<RecordTabType>(initialTab || "overview");
		const [zoomScale, setZoomScale] = useState<number>(1.0);
		const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
		const [copiedToast, setCopiedToast] = useState<boolean>(false);
		const [isProtocolGeneratorOpen, setIsProtocolGeneratorOpen] = useState<boolean>(false);
		const [protocolGeneratorTooth, setProtocolGeneratorTooth] = useState<string | number>(() => {
			if (activeTooth) return activeTooth;
			return 11;
		});

		const handleOpenProtocolGenerator = useCallback((tooth?: string | number) => {
			setProtocolGeneratorTooth(tooth || activeTooth || formData.visitDiaries[0]?.toothNumber || 11);
			setIsProtocolGeneratorOpen(true);
		}, [activeTooth, formData.visitDiaries]);

		const validation = useMemo(() => validateMedicalRecordCompleteness(formData), [formData]);
		const dmft = useMemo(() => calculateDmftIndex(formData.dentalStatus.odontogramTeeth), [formData.dentalStatus.odontogramTeeth]);
		const cpitn = useMemo(() => calculateCpitnIndex(formData.dentalStatus.cpitnIndex), [formData.dentalStatus.cpitnIndex]);
		const ageText = useMemo(() => formatPatientAge(formData.passport.patientBirthDate, formData.passport.cardOpenedDate), [formData.passport.patientBirthDate, formData.passport.cardOpenedDate]);

		// Debounced 3-tier автосейв всей карты в IndexedDB + LocalStorage (Zero Keystroke Loss & Zero-Leak Draft)
		const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
		useEffect(() => {
			if (!effectivePatientId) return;
			if (autosaveRef.current) clearTimeout(autosaveRef.current);
			autosaveRef.current = setTimeout(() => {
				try {
					saveOfflineDraftDebounced(
						`draft:emk:${effectivePatientId}`,
						"DIARY_043_DRAFT",
						effectivePatientId,
						formData,
						profile?.organizationId,
						600,
					);
				} catch (err) {
					clientLogger.warn("Ошибка автосохранения в IndexedDB", err, { module: "MedicalRecordStudioModal" });
				}
			}, 600);
			return () => { if (autosaveRef.current) clearTimeout(autosaveRef.current); };
		}, [formData, effectivePatientId, profile?.organizationId]);

		const resetDraft = useCallback(() => setFormData(buildInitialRef.current()), []);

		// Zero-Leak Draft (Мандаты 8zq/8bn): сброс только при реальном unmount и переходе isOpen true -> false (не при ре-рендере родителя)
		const wasOpenRef = useRef<boolean>(isOpen);
		useEffect(() => {
			if (wasOpenRef.current && !isOpen) {
				resetDraft();
			}
			wasOpenRef.current = isOpen;
		}, [isOpen, resetDraft]);

		useEffect(() => () => {
			resetDraft();
		}, [resetDraft]);

		const handleClose = useCallback(() => {
			resetDraft();
			onClose();
		}, [resetDraft, onClose]);

		useEffect(() => {
			if (!isOpen) return;
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key !== "Escape") return;
				if (isProtocolGeneratorOpen) {
					setIsProtocolGeneratorOpen(false);
					return;
				}
				handleClose();
			};
			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, [isOpen, isProtocolGeneratorOpen, handleClose]);

		const { handlePrint, handleExportXml, handleExportJson, handleCopyText } = useRecordExports({ formData, effectiveIsDraft, setCopiedToast });
		const { isSaving, handleSaveForm } = useMedicalRecordSave({ formData, onSave, visitId, patientId: effectivePatientId, initialData: initialData as Record<string, unknown> | undefined, effectiveIsDraft });

		const applyFormUpdate = useCallback((updater: (prev: MedicalRecordData) => MedicalRecordData) => {
			setFormData((prev) => { const updated = updater(prev); onSave?.(updated); return updated; });
		}, [onSave]);
		const handleApplyNorm = useCallback(() => applyFormUpdate(applyMedicalCardPhysiologicalNorm), [applyFormUpdate]);
		const handleUpdatePassport = useCallback((patch: Partial<ClinicalPassportData>) => applyFormUpdate((p) => ({ ...p, passport: { ...p.passport, ...patch } })), [applyFormUpdate]);
		const handleUpdateAnamnesis = useCallback((patch: Partial<ClinicalAnamnesisData>) => applyFormUpdate((p) => ({ ...p, anamnesis: { ...p.anamnesis, ...patch } })), [applyFormUpdate]);
		const handleAddDiary = useCallback((newDiary: ClinicalVisitDiaryEntry) => applyFormUpdate((p) => ({ ...p, visitDiaries: [newDiary, ...p.visitDiaries] })), [applyFormUpdate]);
		const handleDeleteDiary = useCallback((index: number) => applyFormUpdate((p) => ({ ...p, visitDiaries: p.visitDiaries.filter((_, i) => i !== index) })), [applyFormUpdate]);

		if (!isOpen) return null;

		const numTooth = typeof protocolGeneratorTooth === "number" ? protocolGeneratorTooth : parseInt(String(protocolGeneratorTooth), 10) || 11;

		const modalElement = (
			<div
				className="emr-studio-backdrop" role="dialog" aria-modal="true"
				onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
			>
				<div
					className="emr-studio-modal emr-studio-window"
					style={{ maxWidth: isFullscreen ? "100%" : "1380px", ...(isFullscreen ? { height: "98vh" } : {}) }}
				>
					{/* Нативный Drag Handle для шторки смартфона (Apple HIG) */}
					<div className="emr-studio-drag-handle sm:hidden" aria-hidden="true" />

					{/* 1-строчная профессиональная шапка */}
					<header className={`emr-studio-header ${isProtocolGeneratorOpen ? "max-md:hidden" : ""}`}>
						<div className="emr-studio-title-group">
							{onBack && (
								<button type="button" onClick={onBack} data-testid="btn-emr-back-to-card" className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium inline-flex items-center gap-1.5 shrink-0 cursor-pointer">
									<ArrowLeft className="w-3.5 h-3.5 shrink-0" /><span>{backLabel || "Назад"}</span>
								</button>
							)}
							<span
								data-testid="badge-emr-draft-status"
								data-legacy-testid="badge-emr-draft-status"
								className={`px-2 py-0.5 rounded border text-[11px] font-medium flex items-center gap-1 shrink-0 ${
									effectiveIsDraft
										? "border-[var(--warning-line)] bg-[var(--warning-soft)] text-[var(--warning-ink)]"
										: "border-[var(--success-line)] bg-[var(--success-soft)] text-[var(--success-ink)]"
								}`}
							>
								{effectiveIsDraft ? <FileText className="w-3 h-3 text-current shrink-0" /> : <Check className="w-3 h-3 text-current shrink-0" />}
								{effectiveIsDraft ? "Черновик (приём не закрыт)" : "Подписано врачом"}
							</span>
							<span
								data-testid="badge-emr-completeness"
								title={validation.missingFields.length > 0 ? `Рекомендации: ${validation.missingFields.map((m) => m.label).join(", ")}` : "Карта заполнена полностью"}
								className={`px-2 py-0.5 rounded-full border text-[11px] font-medium inline-flex items-center gap-1 shrink-0 ${
									validation.completenessScore >= 80
										? "border-[var(--success-line)] bg-[var(--success-soft)] text-[var(--success-ink)]"
										: "border-[var(--warning-line)] bg-[var(--warning-soft)] text-[var(--warning-ink)]"
								}`}
							>
								<ShieldCheck className="w-3 h-3 text-current shrink-0" />
								<span className="tabular-nums font-semibold">{validation.completenessScore}%</span>
							</span>
							<div className="min-w-0 w-full">
								<h2 className="emr-studio-title truncate">
									Медицинская карта приёма № {formData.passport.medicalCardNumber || "—"}
								</h2>
								<div className="truncate text-xs text-[var(--muted,#64748b)]">
									Пациент: <strong>{formData.passport.patientFullName || "Пациент"}</strong> ({ageText}) • Врач:{" "}
									<strong>{formData.passport.attendingDoctorFullName || "Врач клиники"}</strong>
								</div>
							</div>
						</div>

						{/* Действия десктопной шапки */}
						<div className="emr-studio-actions">
							{activeTab === "overview" && (
								<div className="emr-studio-zoom-toolbar inline-flex items-center gap-1 border border-[var(--glass-border,#cbd5e1)] rounded-md px-1.5 py-0.5 bg-[var(--paper,#f8fafc)] h-8">
									<button type="button" onClick={() => setZoomScale((v) => Math.max(0.5, Number((v - 0.1).toFixed(1))))} disabled={zoomScale <= 0.5} title="Уменьшить масштаб" className="p-0.5 border-none bg-transparent cursor-pointer disabled:opacity-40">
										<ZoomOut className="w-3.5 h-3.5" />
									</button>
									<span className="text-[11px] font-bold min-w-9 text-center select-none">{Math.round(zoomScale * 100)}%</span>
									<button type="button" onClick={() => setZoomScale((v) => Math.min(1.5, Number((v + 0.1).toFixed(1))))} disabled={zoomScale >= 1.5} title="Увеличить масштаб" className="p-0.5 border-none bg-transparent cursor-pointer disabled:opacity-40">
										<ZoomIn className="w-3.5 h-3.5" />
									</button>
									{zoomScale !== 1.0 && (
										<button type="button" onClick={() => setZoomScale(1.0)} title="Сбросить масштаб" className="p-0.5 border-none bg-transparent cursor-pointer text-[var(--muted,#64748b)]">
											<RotateCcw className="w-3 h-3" />
										</button>
									)}
								</div>
							)}

							<button type="button" className="dente-btn dente-btn-secondary emr-studio-btn emr-studio-btn-secondary" onClick={handleApplyNorm} disabled={false} data-testid="btn-emr-apply-norm" title="Заполнить физиологической нормой / Интактные зубы">
								<Sparkles className="w-4 h-4 shrink-0 text-current" /><span className="hidden sm:inline">Физиологическая норма</span><span className="sm:hidden">Норма</span>
							</button>

							<button type="button" className="dente-btn dente-btn-secondary emr-studio-btn emr-studio-btn-secondary" onClick={handlePrint} disabled={false} data-testid="btn-emr-print-card" data-legacy-testid="btn-print-medical-record" title="Печать или экспорт в PDF (A4)">
								<Printer className="w-4 h-4 shrink-0 text-current" /><span className="hidden sm:inline">Печать A4</span><span className="sm:hidden">Печать</span>
							</button>

							{/* Меню дополнительных действий (createPortal против overflow-x клиппинга) */}
							<RecordHeaderMoreMenu
								copiedToast={copiedToast}
								onExportXml={handleExportXml}
								onExportJson={handleExportJson}
								onCopyText={handleCopyText}
							/>

							{/* Ровно ОДНА Primary CTA кнопка (#0d9488, var(--teal), НИКОГДА не disabled) */}
							<button
								type="button"
								className="dente-btn dente-btn-primary emr-studio-btn emr-studio-btn-primary"
								onClick={handleSaveForm}
								disabled={false}
								data-testid="btn-emr-save-card"
								title="Сохранить и подписать медицинскую карту приёма"
							>
								{isSaving ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <Check className="w-4 h-4 shrink-0" />}
								<span className="hidden sm:inline">{isSaving ? "Сохранение..." : "Сохранить и подписать"}</span>
								<span className="sm:hidden">{isSaving ? "Сохранение..." : "Сохранить"}</span>
							</button>

							<button type="button" className="emr-studio-btn emr-studio-btn-secondary emr-studio-btn-icon-only emr-studio-btn-fullscreen" onClick={() => setIsFullscreen((v) => !v)} title={isFullscreen ? "Свернуть" : "На весь экран"}>
								{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
							</button>
							<button type="button" className="emr-studio-btn emr-studio-btn-secondary emr-studio-btn-icon-only emr-studio-btn-close" onClick={handleClose} title="Закрыть окно">
								<X className="w-5 h-5" />
							</button>
						</div>
					</header>

					{/* Навигационные табы приёма */}
					<nav className={`emr-studio-nav ${isProtocolGeneratorOpen ? "max-md:hidden" : ""}`} style={{ flexWrap: "nowrap", width: "100%", padding: "4px 16px", gap: "6px", overflowX: "auto" }}>
						{RECORD_TABS.map((tab) => {
							const Icon = tab.icon;
							const isActive = activeTab === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									className={`emr-studio-tab-btn ${isActive ? "active" : ""}`}
									onClick={() => setActiveTab(tab.id)}
								>
									<Icon className="w-3.5 h-3.5 shrink-0" />
									<span>{tab.label}</span>
									{tab.id === "diaries" && (
										<span className="text-[11px] font-bold opacity-80">({formData.visitDiaries.length})</span>
									)}
								</button>
							);
						})}
					</nav>

					{/* Тело активной вкладки + встроенный боковой каталог протоколов без двойного дравера */}
					<div className="flex flex-1 min-h-0 overflow-hidden relative">
						<main className={`emr-studio-body flex-1 min-w-0 ${isProtocolGeneratorOpen ? "max-md:hidden" : ""}`}>
							{activeTab === "overview" && (
								<div className="emr-studio-preview-container flex flex-col items-center">
									<div
										className="emr-studio-a4-sheet print-paper-sheet pro-a4-physical-sheet"
										data-paper-sheet="true"
										data-preserve-white="true"
										style={{ transform: `scale(${zoomScale})`, transformOrigin: "top center" }}
										dangerouslySetInnerHTML={{ __html: generateMedicalRecordPrintHtml(formData, { isLocked: !effectiveIsDraft, isDraft: effectiveIsDraft, status: effectiveIsDraft ? "draft" : "signed" }) }}
									/>
								</div>
							)}
							{activeTab === "passport" && <RecordPassportTab formData={formData} ageText={ageText} onUpdatePassport={handleUpdatePassport} />}
							{activeTab === "anamnesis" && <RecordAnamnesisTab formData={formData} onApplyNorm={handleApplyNorm} onUpdateAnamnesis={handleUpdateAnamnesis} />}
							{activeTab === "odontogram" && <RecordOdontogramTab formData={formData} dmft={dmft} cpitn={cpitn} onApplyNorm={handleApplyNorm} />}
							{activeTab === "diaries" && <RecordDiariesTab formData={formData} activeTooth={activeTooth} onOpenProtocolGenerator={onOpenProtocolGenerator} onOpenInternalProtocolGenerator={handleOpenProtocolGenerator} onAddDiary={handleAddDiary} onDeleteDiary={handleDeleteDiary} />}
							{activeTab === "epicrisis" && <RecordEpicrisisTab formData={formData} />}
						</main>

						{isProtocolGeneratorOpen && (
							<ClinicalProtocolsCatalogModal
								embedded={true} isOpen={true} onClose={() => setIsProtocolGeneratorOpen(false)} activeTooth={numTooth}
								onApplyPatch={(patch) => {
									handleAddDiary({
										id: generateUuidV7(), entryDate: new Date().toISOString().split("T")[0] || "", entryTime: new Date().toTimeString().slice(0, 5),
										doctorFullName: formData.passport.attendingDoctorFullName || "Лечащий врач", doctorSpecialty: formData.passport.attendingDoctorSpecialty || "Стоматолог-терапевт",
										toothNumber: String(protocolGeneratorTooth || 11), subjectiveComplaints: patch.complaint || "", objectiveStatusLocalis: patch.objectiveStatus || "",
										assessmentDiagnosisText: patch.diagnosis || "", assessmentIcd10Code: (patch.diagnosis || "").split(" ")[0] || "K02.1",
										procedureProtocol: patch.treatmentPlan || "", homeCareRecommendations: patch.recommendations || "",
									});
									setIsProtocolGeneratorOpen(false);
								}}
							/>
						)}
					</div>

					{/* Мобильная нижняя плашка в Natural Thumb Zone (Apple HIG) */}
					{!isProtocolGeneratorOpen && (
						<footer className="emr-studio-bottom-bar sm:hidden">
							<button type="button" className="dente-btn dente-btn-secondary emr-studio-btn emr-studio-btn-secondary flex-1" onClick={handleApplyNorm} disabled={false} title="Физиологическая норма">
								<Sparkles className="w-4 h-4 shrink-0" /><span>Норма</span>
							</button>
							<button type="button" className="dente-btn dente-btn-primary emr-studio-btn emr-studio-btn-primary flex-[2]" onClick={handleSaveForm} disabled={false} title="Сохранить и подписать карту приёма">
								{isSaving ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <Check className="w-4 h-4 shrink-0" />}
								<span>{isSaving ? "Сохранение..." : "Подписать карту"}</span>
							</button>
						</footer>
					)}
				</div>
			</div>
		);

		return typeof document !== "undefined" ? createPortal(modalElement, document.body) : modalElement;
	},
);

export const DEFAULT_CLINICAL_RECORD_DATA = DEFAULT_MEDICAL_CARD_DATA;
export type ClinicalRecordPrintModalProps = MedicalRecordStudioModalProps;
export const ClinicalRecordPrintModal = MedicalRecordStudioModal;

export default MedicalRecordStudioModal;
