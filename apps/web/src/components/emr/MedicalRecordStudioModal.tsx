/**
 * apps/web/src/components/emr/MedicalRecordStudioModal.tsx
 *
 * Канонический SSOT-модуль медицинской карты приёма и клинического дневника DENTE CRM.
 * Автономия врача, Соло-врач, Единый дизайн-код Apple Mobile HIG, Живой русский язык.
 *
 * Sweet Spot: строго 380-450 строк.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
	Printer, Check, FileText, X, Maximize2, Minimize2, Sparkles, ZoomIn, ZoomOut, RotateCcw,
	User, HeartPulse, Activity, Calendar, Award, ShieldCheck, MoreHorizontal, Download, Copy,
} from "lucide-react";
import { useAppStore } from "../../store/appStore";
import type { MedicalRecordData, ClinicalVisitDiaryEntry } from "./types/recordDataTypes";
import {
	DEFAULT_MEDICAL_CARD_DATA,
	resolveClinicRequisites,
	applyMedicalCardPhysiologicalNorm,
} from "./medicalCardCatalogData";
import {
	validateMedicalRecordCompleteness,
	formatPatientAge,
	calculateDmftIndex,
	calculateCpitnIndex,
	generateMedicalRecordPrintHtml,
} from "./clinicalDiaryMath";
import { useRecordExports } from "./record/useRecordExports";
import { EmrProtocolGeneratorModal } from "./protocolGenerator/EmrProtocolGeneratorModal";
import { RecordPassportTab } from "./record/tabs/RecordPassportTab";
import { RecordAnamnesisTab } from "./record/tabs/RecordAnamnesisTab";
import { RecordOdontogramTab } from "./record/tabs/RecordOdontogramTab";
import { RecordDiariesTab } from "./record/tabs/RecordDiariesTab";
import { RecordEpicrisisTab } from "./record/tabs/RecordEpicrisisTab";
import "./emrStudioStyles.css";

export type RecordTabType = "overview" | "passport" | "anamnesis" | "odontogram" | "diaries" | "epicrisis";

export interface ExtendedMedicalRecordInitialData extends Partial<MedicalRecordData> {
	readonly isLocked?: boolean | undefined;
	readonly status?: string | undefined;
}

export interface MedicalRecordStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialData?: ExtendedMedicalRecordInitialData | undefined;
	readonly onSave?: ((updated: MedicalRecordData) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly onOpenProtocolGenerator?: (() => void) | undefined;
	readonly isLocked?: boolean | undefined;
	readonly isDraft?: boolean | undefined;
	readonly status?: string | undefined;
}

const RECORD_TABS: Array<{ id: RecordTabType; label: string; icon: React.FC<{ className?: string }> }> = [
	{ id: "overview", label: "Обзор и печать A4", icon: FileText },
	{ id: "passport", label: "1. Паспортная часть", icon: User },
	{ id: "anamnesis", label: "2. Жалобы и Анамнез", icon: HeartPulse },
	{ id: "odontogram", label: "3. Зубная формула", icon: Activity },
	{ id: "diaries", label: "4. Дневники визитов", icon: Calendar },
	{ id: "epicrisis", label: "5. Эпикриз и наблюдение", icon: Award },
];

export const MedicalRecordStudioModal: React.FC<MedicalRecordStudioModalProps> = React.memo(
	function MedicalRecordStudioModal({
		isOpen, onClose, initialData, onSave, onOpenProtocolGenerator, isLocked, isDraft, status,
	}) {
		const dashboard = useAppStore((s) => s.dashboard);
		const profile = dashboard?.clinicSettings?.profile;
		const staff = dashboard?.clinicSettings?.staff;

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

		const [formData, setFormData] = useState<MedicalRecordData>(() => ({
			...DEFAULT_MEDICAL_CARD_DATA,
			...initialData,
			clinic: { ...DEFAULT_MEDICAL_CARD_DATA.clinic, ...resolvedClinic, ...(initialData?.clinic || {}) },
			passport: { ...DEFAULT_MEDICAL_CARD_DATA.passport, ...(initialData?.passport || {}) },
			anamnesis: { ...DEFAULT_MEDICAL_CARD_DATA.anamnesis, ...(initialData?.anamnesis || {}) },
			dentalStatus: { ...DEFAULT_MEDICAL_CARD_DATA.dentalStatus, ...(initialData?.dentalStatus || {}) },
			epicrisis: { ...DEFAULT_MEDICAL_CARD_DATA.epicrisis, ...(initialData?.epicrisis || {}) },
		}));

		const [activeTab, setActiveTab] = useState<RecordTabType>("overview");
		const [zoomScale, setZoomScale] = useState<number>(1.0);
		const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
		const [copiedToast, setCopiedToast] = useState<boolean>(false);
		const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
		const [isProtocolGeneratorOpen, setIsProtocolGeneratorOpen] = useState<boolean>(false);
		const moreMenuRef = useRef<HTMLDivElement>(null);

		const validation = useMemo(() => validateMedicalRecordCompleteness(formData), [formData]);
		const dmft = useMemo(() => calculateDmftIndex(formData.dentalStatus.odontogramTeeth), [formData.dentalStatus.odontogramTeeth]);
		const cpitn = useMemo(() => calculateCpitnIndex(formData.dentalStatus.cpitnIndex), [formData.dentalStatus.cpitnIndex]);
		const ageText = useMemo(
			() => formatPatientAge(formData.passport.patientBirthDate, formData.passport.cardOpenedDate),
			[formData.passport.patientBirthDate, formData.passport.cardOpenedDate],
		);

		// Debounced автосейв всей карты на лету (Zero Keystroke Loss)
		const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
		useEffect(() => {
			if (autosaveRef.current) clearTimeout(autosaveRef.current);
			autosaveRef.current = setTimeout(() => {
				try {
					if (typeof sessionStorage !== "undefined") {
						const draftKey = `dente:medical_card_autosave:${formData.passport.medicalCardNumber || "common"}`;
						sessionStorage.setItem(draftKey, JSON.stringify(formData));
					}
				} catch (err) {
					console.warn("MedicalRecordStudioModal: ошибка автосохранения в sessionStorage", err);
				}
			}, 600);
			return () => { if (autosaveRef.current) clearTimeout(autosaveRef.current); };
		}, [formData]);

		// Закрытие выпадающего меню по клику вне
		useEffect(() => {
			if (!isMoreMenuOpen) return;
			const handleClickOutside = (e: MouseEvent) => {
				if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setIsMoreMenuOpen(false);
			};
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}, [isMoreMenuOpen]);

		const { handlePrint, handleExportXml, handleExportJson, handleCopyText } = useRecordExports({
			formData, effectiveIsDraft, setCopiedToast,
		});

		const handleApplyNorm = useCallback(() => {
			setFormData((prev) => {
				const updated = applyMedicalCardPhysiologicalNorm(prev);
				onSave?.(updated);
				return updated;
			});
		}, [onSave]);

		const handleSaveForm = useCallback(() => onSave?.(formData), [onSave, formData]);

		const handleAddDiary = useCallback((newDiary: ClinicalVisitDiaryEntry) => {
			setFormData((prev) => {
				const updated = { ...prev, visitDiaries: [newDiary, ...prev.visitDiaries] };
				onSave?.(updated);
				return updated;
			});
		}, [onSave]);

		const handleDeleteDiary = useCallback((index: number) => {
			setFormData((prev) => {
				const updated = { ...prev, visitDiaries: prev.visitDiaries.filter((_, i) => i !== index) };
				onSave?.(updated);
				return updated;
			});
		}, [onSave]);

		if (!isOpen) return null;

		if (isProtocolGeneratorOpen) {
			return (
				<EmrProtocolGeneratorModal
					isOpen={true}
					onClose={() => setIsProtocolGeneratorOpen(false)}
					patientFullName={formData.passport.patientFullName}
					patientBirthDate={formData.passport.patientBirthDate}
					medicalCardNumber={formData.passport.medicalCardNumber}
					doctorFullName={formData.passport.attendingDoctorFullName}
					doctorSpecialty={formData.passport.attendingDoctorSpecialty}
					odontogramTeeth={formData.dentalStatus.odontogramTeeth}
					onApplyDiary={(newDiary) => { handleAddDiary(newDiary as ClinicalVisitDiaryEntry); setIsProtocolGeneratorOpen(false); }}
					onApplyBatchDiaries={(newDiaries) => {
						setFormData((prev) => {
							const updated = { ...prev, visitDiaries: [...(newDiaries as ClinicalVisitDiaryEntry[]), ...prev.visitDiaries] };
							onSave?.(updated);
							return updated;
						});
						setIsProtocolGeneratorOpen(false);
					}}
				/>
			);
		}

		return (
			<div className="emr-studio-backdrop emr043-modal-backdrop" role="dialog" aria-modal="true">
				<div
					className="emr-studio-modal emr-studio-window emr043-modal-window"
					style={{ maxWidth: isFullscreen ? "100%" : "1240px", height: isFullscreen ? "98vh" : "94vh" }}
				>
					{/* Нативный Drag Handle для шторки смартфона (Apple HIG) */}
					<div className="emr-studio-drag-handle sm:hidden" aria-hidden="true" />

					{/* 1-строчная профессиональная шапка */}
					<header className="emr-studio-header">
						<div className="emr-studio-title-group">
							<span
								data-testid="badge-emr-draft-status"
								data-legacy-testid="badge-043-draft-status"
								className={`px-2 py-0.5 rounded border text-[11px] font-bold tracking-wider uppercase flex items-center gap-1 shrink-0 ${
									effectiveIsDraft
										? "border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
										: "border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
								}`}
							>
								{effectiveIsDraft ? <FileText className="w-3 h-3 text-amber-600" /> : <Check className="w-3 h-3 text-emerald-600" />}
								{effectiveIsDraft ? "ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)" : "ПОДПИСАНО ВРАЧОМ"}
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
									<button
										type="button"
										onClick={() => setZoomScale((v) => Math.max(0.5, Number((v - 0.1).toFixed(1))))}
										disabled={zoomScale <= 0.5}
										title="Уменьшить масштаб"
										className="p-0.5 border-none bg-transparent cursor-pointer disabled:opacity-40"
									>
										<ZoomOut className="w-3.5 h-3.5" />
									</button>
									<span className="text-[11px] font-bold min-w-9 text-center select-none">{Math.round(zoomScale * 100)}%</span>
									<button
										type="button"
										onClick={() => setZoomScale((v) => Math.min(1.5, Number((v + 0.1).toFixed(1))))}
										disabled={zoomScale >= 1.5}
										title="Увеличить масштаб"
										className="p-0.5 border-none bg-transparent cursor-pointer disabled:opacity-40"
									>
										<ZoomIn className="w-3.5 h-3.5" />
									</button>
									{zoomScale !== 1.0 && (
										<button type="button" onClick={() => setZoomScale(1.0)} title="Сбросить масштаб" className="p-0.5 border-none bg-transparent cursor-pointer text-[var(--muted,#64748b)]">
											<RotateCcw className="w-3 h-3" />
										</button>
									)}
								</div>
							)}

							<button
								type="button"
								className="emr-studio-btn emr-studio-btn-secondary"
								onClick={handleApplyNorm}
								disabled={false}
								data-testid="btn-emr-apply-norm"
								title="Заполнить физиологической нормой / Интактные зубы"
							>
								<Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
								<span>Норма в 1 клик</span>
							</button>

							<button
								type="button"
								className="emr-studio-btn emr-studio-btn-secondary"
								onClick={handlePrint}
								disabled={false}
								data-testid="btn-emr-print-card"
								data-legacy-testid="btn-print-043-card"
								title="Печать или экспорт в PDF (A4)"
							>
								<Printer className="w-4 h-4 shrink-0 text-slate-600 dark:text-slate-300" />
								<span className="hidden sm:inline">Печать A4</span>
								<span className="sm:hidden">Печать</span>
							</button>

							{/* Меню дополнительных действий */}
							<div className="relative inline-flex items-center" ref={moreMenuRef}>
								<button
									type="button"
									className="emr-studio-btn emr-studio-btn-secondary emr-studio-btn-icon-only"
									onClick={() => setIsMoreMenuOpen((v) => !v)}
									title="Дополнительные действия"
									data-testid="btn-emr-more-actions"
								>
									<MoreHorizontal className="w-4 h-4" />
								</button>
								{isMoreMenuOpen && (
									<div className="absolute right-0 top-full mt-1 w-56 bg-[var(--paper-strong,#ffffff)] dark:bg-slate-900 border border-[var(--glass-border,#cbd5e1)] dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 text-xs text-[var(--ink,#0f172a)] dark:text-slate-100 min-w-[210px]">
										<button type="button" className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer" onClick={() => { handleApplyNorm(); setIsMoreMenuOpen(false); }}>
											<Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" /><span>Физиологическая норма</span>
										</button>
										<button type="button" title="Экспорт в XML для электронной медкарты (Госуслуги)" className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-800" onClick={() => { handleExportXml(); setIsMoreMenuOpen(false); }}>
											<Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" /><span>Электронная медкарта (XML)</span>
										</button>
										<button type="button" className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer" onClick={() => { handleExportJson(); setIsMoreMenuOpen(false); }}>
											<Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" /><span>Экспорт в JSON</span>
										</button>
										<button type="button" className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-800" onClick={() => { handleCopyText(); setIsMoreMenuOpen(false); }}>
											{copiedToast ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />}
											<span>{copiedToast ? "Скопировано!" : "Копировать текст карты"}</span>
										</button>
									</div>
								)}
							</div>

							{/* Ровно ОДНА Primary CTA кнопка (#0d9488, var(--teal), НИКОГДА не disabled) */}
							<button
								type="button"
								className="emr-studio-btn emr-studio-btn-primary"
								onClick={handleSaveForm}
								disabled={false}
								data-testid="btn-emr-save-card"
								title="Сохранить и подписать медицинскую карту приёма"
							>
								<Check className="w-4 h-4 shrink-0" />
								<span className="hidden sm:inline">Сохранить и подписать карту приёма</span>
								<span className="sm:hidden">Сохранить</span>
							</button>

							<button type="button" className="emr-studio-btn emr-studio-btn-secondary emr-studio-btn-icon-only emr-studio-btn-fullscreen" onClick={() => setIsFullscreen((v) => !v)} title={isFullscreen ? "Свернуть" : "На весь экран"}>
								{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
							</button>
							<button type="button" className="emr-studio-btn emr-studio-btn-secondary emr-studio-btn-icon-only emr-studio-btn-close" onClick={onClose} title="Закрыть окно">
								<X className="w-5 h-5" />
							</button>
						</div>
					</header>

					{/* Навигационные табы приёма */}
					<nav className="emr-studio-nav" style={{ flexWrap: "nowrap", width: "100%", padding: "4px 16px", gap: "6px", overflowX: "auto" }}>
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

					{/* Шкала полноты карты приёма */}
					<div className="emr-studio-completeness emr-studio-non-printable">
						<ShieldCheck className={`w-5 h-5 ${validation.isComplete ? "text-emerald-600" : "text-amber-500"}`} />
						<div className="text-xs font-semibold">Заполненность карты: <strong>{validation.completenessScore}%</strong></div>
						<div className="emr-studio-progress-track">
							<div
								className={`emr-studio-progress-fill ${validation.completenessScore >= 80 ? "green" : "yellow"}`}
								style={{ width: `${validation.completenessScore}%` }}
							/>
						</div>
						{validation.missingFields.length > 0 && (
							<div className="flex items-center gap-2 flex-wrap">
								<span className="text-[11px] text-[var(--muted,#64748b)]">
									Рекомендации: {validation.missingFields.map((m) => m.label).join(", ")}
								</span>
								<button
									type="button"
									onClick={handleApplyNorm}
									disabled={false}
									data-testid="btn-emr-completeness-norm"
									className="text-[11px] text-[var(--teal,#0d9488)] bg-transparent border-none underline cursor-pointer font-semibold p-0"
									title="Заполнить незаполненные показатели физиологической нормой"
								>
									Норма в 1 клик
								</button>
							</div>
						)}
					</div>

					{/* Тело активной вкладки */}
					<main className="emr-studio-body">
						{activeTab === "overview" && (
							<div className="emr-studio-preview-container flex flex-col items-center">
								<div
									className="emr-studio-a4-sheet print-paper-sheet pro-a4-physical-sheet"
									data-paper-sheet="true"
									data-preserve-white="true"
									style={{ transform: `scale(${zoomScale})`, transformOrigin: "top center" }}
									dangerouslySetInnerHTML={{
										__html: generateMedicalRecordPrintHtml(formData, {
											isLocked: !effectiveIsDraft,
											isDraft: effectiveIsDraft,
											status: effectiveIsDraft ? "draft" : "signed",
										}),
									}}
								/>
							</div>
						)}
						{activeTab === "passport" && <RecordPassportTab formData={formData} ageText={ageText} />}
						{activeTab === "anamnesis" && <RecordAnamnesisTab formData={formData} onApplyNorm={handleApplyNorm} />}
						{activeTab === "odontogram" && <RecordOdontogramTab formData={formData} dmft={dmft} cpitn={cpitn} onApplyNorm={handleApplyNorm} />}
						{activeTab === "diaries" && (
							<RecordDiariesTab
								formData={formData}
								onOpenProtocolGenerator={onOpenProtocolGenerator}
								onOpenInternalProtocolGenerator={() => setIsProtocolGeneratorOpen(true)}
								onAddDiary={handleAddDiary}
								onDeleteDiary={handleDeleteDiary}
							/>
						)}
						{activeTab === "epicrisis" && <RecordEpicrisisTab formData={formData} />}
					</main>

					{/* Мобильная нижняя плашка в Natural Thumb Zone (Apple HIG) */}
					<footer className="emr-studio-bottom-bar sm:hidden">
						<button type="button" className="emr-studio-btn emr-studio-btn-secondary flex-1" onClick={handleApplyNorm} disabled={false} title="Норма в 1 клик">
							<Sparkles className="w-4 h-4 text-emerald-600 shrink-0" /><span>Норма</span>
						</button>
						<button type="button" className="emr-studio-btn emr-studio-btn-primary flex-[2]" onClick={handleSaveForm} disabled={false} title="Сохранить и подписать карту приёма">
							<Check className="w-4 h-4 shrink-0" /><span>Подписать карту</span>
						</button>
					</footer>
				</div>
			</div>
		);
	},
);

export const DEFAULT_043_DATA = DEFAULT_MEDICAL_CARD_DATA;
export type Form043PrintModalProps = MedicalRecordStudioModalProps;
export const Form043PrintModal = MedicalRecordStudioModal;

export default MedicalRecordStudioModal;
