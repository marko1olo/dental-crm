import {
	Activity,
	AlertTriangle,
	BarChart2,
	Check,
	CheckCircle2,
	ChevronDown,
	Clock,
	FileText,
	Lock,
	MoreHorizontal,
	Printer,
	Search,
	ShieldCheck,
	Sparkles,
	X,
} from "lucide-react";
import type React from "react";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { ICD10_DICTIONARY } from "../../lib/icd10";
import { PanelLoadFailure } from "../PanelLoadFailure";
import { useVisitDiaryLogic } from "../useVisitDiaryLogic";
import { type DiaryPrintPhoto } from "../VisitDiaryPhotoUpload";
import { DENTAL_ANESTHETICS, type AnestheticDrugId } from "../anesthesia/anesthesiaCatalog";
import { CryptoProSigner } from "./CryptoProSigner";
import "../../styles/visit-diary-043.css";

// Re-export all types and helper functions for full backwards compatibility
export * from "./diary/visitDiaryTypes";

import {
	type VisitDiarySectionProps,
	COMPLAINT_QUICK_CHIPS,
} from "./diary/visitDiaryTypes";
import { useVisitDiaryPatientInfo } from "./diary/useVisitDiaryPatientInfo";
import { VisitDiarySoapFields } from "./diary/VisitDiarySoapFields";
import { VisitDiaryModals } from "./diary/VisitDiaryModals";
import { VisitDiaryRevisionsHistory } from "./diary/VisitDiaryRevisionsHistory";
import { VisitDiaryAnesthesiaBar } from "./diary/VisitDiaryAnesthesiaBar";
import { VisitDiaryPerioPediatricPresets } from "./diary/VisitDiaryPerioPediatricPresets";
import { VisitDiaryHeaderMoreMenu } from "./diary/VisitDiaryHeaderMoreMenu";
import { useVisitDiarySectionIcd } from "./diary/useVisitDiarySectionIcd";
import { useVisitDiarySectionPerio } from "./diary/useVisitDiarySectionPerio";
import { VisitDiaryReviseAndLockFooters } from "./diary/VisitDiaryReviseAndLockFooters";

// Lazy-loaded heavy secondary modal strictly isolated (0 KB initial bundle cost)
const PeriodontogramChart = lazy(() =>
	import("../perio/PeriodontogramChart").then((m) => ({ default: m.PeriodontogramChart }))
);

export const VisitDiarySection: React.FC<VisitDiarySectionProps> = ({
	visitId,
	patientId,
	teethData = [],
}) => {
	const {
		diary,
		setDiary,
		diaryId,
		loadState,
		loadStateText,
		diarySubject,
		reloadDiary,
		isLocked,
		lockedAt,
		diaryHash,
		hasCryptoSignature,
		diaryDoctorFullName,
		diaryDoctorSpecialty,
		lastSavedAt,
		localDraftSavedAt,
		revisionCount,
		diaryRevisions,
		isSaving,
		showIcdDropdown,
		setShowIcdDropdown,
		icdSearch,
		setIcdSearch,
		showPreview,
		setShowPreview,
		doSave,
		ensureDraftSavedForSigning,
		doLock,
		isRevising,
		revisionReason,
		setRevisionReason,
		isRevisingBusy,
		beginRevise,
		cancelRevise,
		doRevise,
		icdRef,
		populateFromOdontogram,
		applyAnesthesiaPreset,
		applyClinicalPreset,
		scheduleDebouncedSave,
		pendingSoapSuggestion,
		applyPendingSoapSuggestion,
		dismissPendingSoapSuggestion,
	} = useVisitDiaryLogic(visitId, patientId);

	const [fieldInterimMap, setFieldInterimMap] = useState<{
		anamnesis?: string;
		statusLocalis?: string;
		treatmentDescription?: string;
		complications?: string;
	}>({});

	const [printPhotos, setPrintPhotos] = useState<readonly DiaryPrintPhoto[]>([]);
	const [showSummaryModal, setShowSummaryModal] = useState(false);
	const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
	const [showRadiologyReferralModal, setShowRadiologyReferralModal] = useState(false);
	const [showEgiszModal, setShowEgiszModal] = useState(false);
	const [showTemplatesModal, setShowTemplatesModal] = useState(false);
	const [showBrandingCustomizer, setShowBrandingCustomizer] = useState(false);

	const [isExtraActionsOpen, setIsExtraActionsOpen] = useState(false);
	const moreActionsRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!isExtraActionsOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (moreActionsRef.current && !moreActionsRef.current.contains(e.target as Node)) {
				setIsExtraActionsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isExtraActionsOpen]);

	const [isTier3PerioModalOpen, setIsTier3PerioModalOpen] = useState(false);
	const [showPerioPathologyMenu, setShowPerioPathologyMenu] = useState(false);
	const perioMenuRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!showPerioPathologyMenu) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (perioMenuRef.current && !perioMenuRef.current.contains(e.target as Node)) {
				setShowPerioPathologyMenu(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [showPerioPathologyMenu]);

	const ctx = useAppLogicContext();
	const activePatient = ctx.activePatient;
	const activeDoctor = ctx.activeDoctor;
	const clinicSettings = ctx.clinicSettings;

	const {
		activeTeeth,
		radiologySnapshots,
		printPatient,
		patientFullName,
		patientBirthDate,
		patientCardNumber,
		patientPassport,
		patientOms,
		patientSnils,
		patientPhone,
		patientAddress,
		clinicName,
		sessionDoctorName,
		doctorName,
		doctorSpecialty,
	} = useVisitDiaryPatientInfo({
		patientId,
		visitId,
		initialTeethData: teethData,
		activePatient,
		activeDoctor,
		clinicSettings,
		diaryDoctorFullName,
		diaryDoctorSpecialty,
		ctxDashboard: ctx.dashboard,
	});

	// Мандат 8e: Врачебная автономия — поля дневника никогда не блокируются
	const fieldsDisabled = false;

	const ensureRevisingIfLocked = () => {
		if (isLocked && !isRevising) {
			beginRevise();
		}
	};

	const { filteredIcd, handleIcdSelect, commitIcdInput } = useVisitDiarySectionIcd({
		icdSearch,
		setIcdSearch,
		setDiary,
		setShowIcdDropdown,
		ensureRevisingIfLocked,
		scheduleDebouncedSave,
	});

	const handleAutoResize = (
		e:
			| React.ChangeEvent<HTMLTextAreaElement>
			| React.FocusEvent<HTMLTextAreaElement>,
	) => {
		e.target.style.height = "auto";
		e.target.style.height = `${e.target.scrollHeight}px`;
	};

	const {
		handleInsertPerioStatus,
		handleApplyPerioPathology,
		handleInsertPediatricStatus,
		handleAddComplaintChip,
	} = useVisitDiarySectionPerio({
		ensureRevisingIfLocked,
		setDiary,
		scheduleDebouncedSave,
		setIcdSearch,
		diary,
		doctorName,
		patientBirthDate,
		activeTeeth,
		setShowPerioPathologyMenu,
		ctxToast: ctx.showToast,
	});

	const handleApplyFullPhysiologicalNorm = () => {
		ensureRevisingIfLocked();
		setDiary((prev) => ({
			...prev,
			anamnesis:
				"Жалоб на момент приёма не предъявляет (профилактический осмотр). Соматически здоров. Хронические заболевания, сердечно-сосудистые патологии и аллергологический статус со слов отрицает. Опыт анестезии положительный, без осложнений.",
			statusLocalis:
				"Конфигурация лица не изменена. Регионарные лимфоузлы не увеличены, безболезненны при пальпации. Открывание рта в полном объеме, свободное, без щелчков. Слизистая оболочка полости рта бледно-розовая, влажная, без патологических изменений. Зубные ряды интактны, прикус физиологический. Пародонт: десна бледно-розовая, плотная, патологических зубодесневых карманов нет.",
			diagnosisIcd10: "Z01.2",
			diagnosisTooth: "",
			treatmentDescription:
				"Проведён плановый осмотр полости рта и онкоскрининг слизистой оболочки. Проведена контролируемая гигиена полости рта, даны индивидуальные рекомендации. Рекомендован плановый осмотр через 6 месяцев.",
			complications: "Осложнений нет.",
			comorbidities: "Соматически здоров, противопоказаний нет.",
		}));
		setIcdSearch("Z01.2");
		scheduleDebouncedSave();
		showToast("Применена норма: соматически здоров / осмотр в норме", "success", 4000);
	};



	const handleDisposalCarpules = (count: number, drugId: AnestheticDrugId | string) => {
		ensureRevisingIfLocked();
		const drugName =
			DENTAL_ANESTHETICS[drugId as AnestheticDrugId]?.tradeNamesRu[0] ?? "Анестетик";
		const disposalNote = `Утилизация: списана пустая карпула ${drugName} (${count} шт., отходы Класса Б, дезинфекция 1 клик без комиссии, списание по FEFO в 1 клик без комиссии).`;
		applyAnesthesiaPreset(disposalNote);

		// Автоматическое списание со склада по FEFO (Мандат 8e, 8v, 8n)
		// Без необходимости ручного выбора партии врачом у кресла и с мягким овердрафтом
		try {
			fetch("/api/inventory/deduct", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					visitId,
					items: [{ name: drugName, quantity: count }],
					reason: `Списание карпулы анестетика у кресла (отходы Класса Б, визит ${visitId})`,
				}),
			}).catch((err) => {
				console.warn("[VisitDiary] Inventory deduct fallback warning:", err);
			});
		} catch (err) {
			console.warn("[VisitDiary] Inventory deduct error:", err);
		}
	};

	const icdEntry = (ICD10_DICTIONARY ?? []).find(
		(i) => i?.code === diary?.diagnosisIcd10,
	);

	return (
		<div
			className="vde-043 no-print"
			data-testid="visit-diary-editor"
			data-form="043u"
		>
			<div className="vde-043__glow" aria-hidden="true" />

			{/* ── Header ── */}
			<div className="vde-043__header">
				<div className="vde-043__header-title-wrap">
					<div className="vde-043__form-badge">ЭМК</div>
					<h3 className="vde-043__title">Дневник приёма</h3>
					{lastSavedAt ? (
						<span
							className="vde-043__saved-badge"
							title={`Дневник сохранён: ${new Date(lastSavedAt).toLocaleTimeString("ru-RU")}`}
						>
							<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
							<span>{new Date(lastSavedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
						</span>
					) : (
						<span
							className="vde-043__saved-badge opacity-60"
							title="Черновик ещё не сохранён на сервере"
						>
							<Clock className="w-3.5 h-3.5 text-amber-500" />
							<span>Черновик</span>
						</span>
					)}
					{isSaving && (
						<span className="vde-043__saving-indicator">
							<span className="vde-043__saving-spinner" />
							<span>Сохраняю...</span>
						</span>
					)}
				</div>

				<div className="vde-043__header-actions">
					<button
						type="button"
						data-testid="open-1click-templates-btn"
						className="vde-043__btn vde-043__btn--primary text-xs font-bold px-3 py-1.5 min-h-[38px] flex items-center gap-1.5"
						onClick={() => setShowTemplatesModal(true)}
						title="Открыть каталог 1-клик клинических протоколов и шаблонов дневника"
					>
						<Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
						<span>Клинические протоколы</span>
					</button>
					<button
						type="button"
						id="diary-norm-direct-btn"
						data-testid="diary-norm-direct-btn"
						onClick={() => {
							if (isLocked && !isRevising) {
								beginRevise();
							}
							handleApplyFullPhysiologicalNorm();
						}}
						className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl bg-[var(--ok-bg)] hover:opacity-90 text-[var(--ok-fg)] font-bold text-xs transition-all touch-manipulation cursor-pointer border border-[var(--ok-border,transparent)]"
						title="1-клик норма для осмотра: соматически здоров, зубные ряды санированы/интактны, онкоскрининг в норме"
					>
						<CheckCircle2 className="w-3.5 h-3.5 text-[var(--ok-fg)] shrink-0" />
						<span>Норма</span>
					</button>
					<button
						type="button"
						data-testid="diary-print-043"
						className="vde-043__btn"
						onClick={() => setShowPreview(true)}
						title="Предпросмотр и печать медицинской карты"
					>
						<Printer className="w-4 h-4" />
						<span className="hidden sm:inline">Печать карты</span>
					</button>
					<div className="relative inline-block" ref={moreActionsRef} style={{ position: "relative" }}>
						<button
							type="button"
							data-testid="diary-more-actions-btn"
							className="vde-043__btn"
							onClick={() => setIsExtraActionsOpen((v) => !v)}
							title="Дополнительные документы и бланки"
							aria-label="Дополнительные действия дневника"
							aria-expanded={isExtraActionsOpen}
						>
							<MoreHorizontal className="w-4 h-4" />
						</button>
						<VisitDiaryHeaderMoreMenu
							isOpen={isExtraActionsOpen}
							onClose={() => setIsExtraActionsOpen(false)}
							onOpenSummary={() => setShowSummaryModal(true)}
							onOpenPrescription={() => setShowPrescriptionModal(true)}
							onOpenRadiology={() => setShowRadiologyReferralModal(true)}
							onOpenTier3Perio={() => setIsTier3PerioModalOpen(true)}
							onOpenEgisz={() => setShowEgiszModal(true)}
							onOpenBranding={() => setShowBrandingCustomizer(true)}
						>
							<button
								type="button"
								id="diary-1click-norm-btn"
								data-testid="diary-1click-norm-btn"
								onClick={() => {
									setIsExtraActionsOpen(false);
									if (isLocked && !isRevising) {
										beginRevise();
									}
									handleApplyFullPhysiologicalNorm();
								}}
								className="sm:hidden flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] text-left cursor-pointer border-none bg-transparent"
								title="Заполнить физиологической нормой в 1 клик (Соматически здоров / норма). Врач правит только патологию"
							>
								<CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
								<span>Норма / Здоров</span>
							</button>
						</VisitDiaryHeaderMoreMenu>
					</div>
					{isLocked && (
						isRevising ? (
							<span className="vde-043__badge vde-043__badge--revise">
								<AlertTriangle className="w-4 h-4" /> ПРАВКА
							</span>
						) : (
							<div className="flex items-center gap-1.5">
								<span className="vde-043__badge vde-043__badge--locked">
									<Lock className="w-4 h-4" /> ПОДПИСАНО
								</span>
								<button
									type="button"
									id="diary-top-revise-btn"
									data-testid="diary-top-revise-btn"
									onClick={() => beginRevise()}
									className="vde-043__btn vde-043__btn--amber text-xs py-1 px-2.5 font-bold flex items-center gap-1"
									title="Внести исправление в закрытый дневник («Исправленному верить»)"
								>
									<FileText className="w-3.5 h-3.5" /> Внести исправление («Исправленному верить»)
								</button>
							</div>
						)
					)}
				</div>
			</div>

			{/* ── 1-Click Fast Clinical Presets Accordion (Tier 2 Warm Context) ── */}
			{!fieldsDisabled && (
				<details
					open
					className="group rounded-xl border border-[var(--glass-border)] bg-[var(--paper-soft)] p-3 text-xs mb-1"
					data-testid="fast-clinical-presets-bar"
				>
					<summary className="cursor-pointer font-bold text-xs text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-between select-none list-none">
						<span className="flex items-center gap-1.5">
							<Sparkles className="w-3.5 h-3.5 text-[var(--teal)]" />
							<span>1-Click Клинические протоколы и формулы (PSR, Дети, Кариес...)</span>
						</span>
						<span className="text-[10px] font-normal text-[var(--muted)] group-open:hidden">Развернуть &darr;</span>
						<span className="text-[10px] font-normal text-[var(--muted)] hidden group-open:inline">Свернуть &uarr;</span>
					</summary>
					<div className="pt-2.5 flex flex-col gap-2">
						{activeTeeth && activeTeeth.length > 0 && (
							<div className="flex items-center justify-end gap-2 flex-wrap">
								<button
									type="button"
									onClick={() => populateFromOdontogram(activeTeeth)}
									className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[48px] rounded-xl bg-[var(--teal-surface)] text-[var(--teal-dark)] hover:bg-[var(--teal-soft)] border border-[var(--teal)] text-xs sm:text-sm font-bold transition-colors shadow-xs touch-manipulation min-w-0 break-words cursor-pointer"
									title="Сформировать структурированный дневник из отметок на зубной формуле"
									data-testid="populate-diary-from-odontogram-btn"
								>
									<FileText size={15} className="shrink-0" />
									<span className="min-w-0 break-words">Заполнить дневник из формулы</span>
								</button>
							</div>
						)}
						<div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 scrollbar-none overscroll-x-contain min-w-0">
							{/* 1-Click Physiological Norm Button */}
							<button
								type="button"
								onClick={() => {
									if (isLocked && !isRevising) {
										beginRevise();
									}
									handleApplyFullPhysiologicalNorm();
								}}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] h-[44px] sm:min-h-[38px] sm:h-[38px] rounded-xl bg-[var(--ok-bg)] hover:opacity-90 text-[var(--ok-fg)] font-bold text-xs transition-all touch-manipulation cursor-pointer min-w-0 shrink-0 border border-[var(--ok-border,transparent)]"
								title="Заполнить дневник физиологической нормой в 1 клик (соматически здоров, патологий не выявлено)"
								data-testid="diary-norm-043-btn"
							>
								<ShieldCheck className="w-3.5 h-3.5 text-[var(--ok-fg)] shrink-0" />
								<span className="whitespace-nowrap">Норма</span>
							</button>

							<VisitDiaryPerioPediatricPresets
								perioMenuRef={perioMenuRef}
								showPerioPathologyMenu={showPerioPathologyMenu}
								setShowPerioPathologyMenu={setShowPerioPathologyMenu}
								handleInsertPerioStatus={handleInsertPerioStatus}
								handleApplyPerioPathology={handleApplyPerioPathology}
								handleInsertPediatricStatus={handleInsertPediatricStatus}
								applyClinicalPreset={applyClinicalPreset}
								onOpenTemplatesModal={() => setShowTemplatesModal(true)}
								isLocked={isLocked}
								isRevising={isRevising}
								beginRevise={beginRevise}
								setDiary={setDiary}
								setIcdSearch={setIcdSearch}
								scheduleDebouncedSave={scheduleDebouncedSave}
							/>
						</div>
					</div>
				</details>
			)}

			{/* ── Anesthesia Quick Bar & Dosage Calculator (Tier 2 Warm Context) ── */}
			<VisitDiaryAnesthesiaBar
				fieldsDisabled={fieldsDisabled}
				activePatient={activePatient}
				diary={diary}
				doctorName={doctorName}
				isLocked={isLocked}
				isRevising={isRevising}
				beginRevise={beginRevise}
				applyAnesthesiaPreset={applyAnesthesiaPreset}
				onDisposalCarpules={handleDisposalCarpules}
			/>

			{/* ── Load States ── */}
			{loadState.phase === "loading" && loadStateText && (
				<div
					className="vde-043__load-banner"
					data-testid="diary-load-loading"
					role="status"
					aria-live="polite"
				>
					<div className="font-semibold">{loadStateText.title}</div>
					{loadStateText.hint ? (
						<div className="mt-0.5">{loadStateText.hint}</div>
					) : null}
				</div>
			)}
			{loadState.phase === "failed" && (
				<div
					className="vde-043__load-banner"
					data-testid="diary-load-failed"
				>
					<PanelLoadFailure
						subject={diarySubject}
						status={loadState.status}
						onRetry={reloadDiary}
					/>
				</div>
			)}

			{/* ── Ненавязчивый СтАР Автопилот: Мягкая плашка-чип предложения протокола ── */}
			{pendingSoapSuggestion && !fieldsDisabled && (
				<div
					className="p-3.5 rounded-2xl bg-[var(--teal-surface)] border-2 border-[var(--teal)] text-[var(--ink)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-200"
					data-testid="soap-suggestion-banner"
				>
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)] flex items-center justify-center shrink-0">
							<Sparkles size={22} className="text-[var(--teal,var(--brand-primary))]" />
						</div>
						<div className="min-w-0">
							<div className="text-sm sm:text-base font-black text-[var(--ink)] flex items-center gap-2 flex-wrap">
								<span>Подставить клинический протокол в дневник?</span>
								<span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)] truncate">
									{pendingSoapSuggestion.title}
								</span>
							</div>
							<div className="text-xs text-[var(--muted)] mt-0.5 truncate">
								{pendingSoapSuggestion.source}: Жалобы, осмотр, диагноз, план лечения
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={() => {
								ensureRevisingIfLocked();
								applyPendingSoapSuggestion();
							}}
							className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] font-black text-sm sm:text-base shadow-sm transition-all flex items-center gap-2 cursor-pointer touch-manipulation active:scale-[0.98]"
							data-testid="btn-apply-soap-suggestion"
							title="Внести клинический протокол в дневник приёма"
						>
							<Check size={18} />
							<span>Применить (1 клик)</span>
						</button>
						<button
							type="button"
							onClick={dismissPendingSoapSuggestion}
							className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--border)] font-bold text-sm transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation"
							title="Скрыть предложение и продолжить ручной ввод"
							data-testid="btn-dismiss-soap-suggestion"
						>
							<X size={18} />
							<span>Скрыть</span>
						</button>
					</div>
				</div>
			)}

			{/* ── 043/у Fields grid ── */}
			<VisitDiarySoapFields
				diary={diary}
				setDiary={setDiary}
				fieldsDisabled={fieldsDisabled}
				fieldInterimMap={fieldInterimMap}
				setFieldInterimMap={setFieldInterimMap}
				ensureRevisingIfLocked={ensureRevisingIfLocked}
				scheduleDebouncedSave={scheduleDebouncedSave}
				handleAutoResize={handleAutoResize}
				handleAddComplaintChip={handleAddComplaintChip}
				icdRef={icdRef}
				icdSearch={icdSearch}
				setIcdSearch={setIcdSearch}
				showIcdDropdown={showIcdDropdown}
				setShowIcdDropdown={setShowIcdDropdown}
				filteredIcd={filteredIcd}
				handleIcdSelect={handleIcdSelect}
				commitIcdInput={commitIcdInput}
				visitId={visitId}
				diaryId={diaryId}
				isLocked={isLocked}
				handlePrintPhotosChange={(p) => setPrintPhotos(p)}
			/>

			{/* ── Actions Footer ── */}
			{!isLocked ? (
				<div className="vde-043__footer">
					<span className="vde-043__footer-hint">
						<AlertTriangle className="w-3 h-3" /> Автосохранение (300 мс)
					</span>
					<button
						type="button"
						id="diary-save-btn"
						data-testid="diary-save-btn"
						onClick={() => doSave(false)}
						className="vde-043__btn"
					>
						{isSaving ? "Сохраняю..." : "Сохранить черновик"}
					</button>
					<CryptoProSigner
						diaryHash={diaryHash}
						isLocked={isLocked}
						lockedAt={lockedAt}
						ensureDraftSaved={() => ensureDraftSavedForSigning()}
						onLock={async (thumbprint, signature, alreadySavedId) => {
							await doLock(thumbprint, signature, alreadySavedId);
						}}
					/>
				</div>
			) : (
				<VisitDiaryReviseAndLockFooters
					isRevising={isRevising}
					revisionReason={revisionReason}
					setRevisionReason={setRevisionReason}
					cancelRevise={cancelRevise}
					isRevisingBusy={isRevisingBusy}
					doRevise={doRevise}
					beginRevise={beginRevise}
					diaryDoctorFullName={diaryDoctorFullName}
					lockedAt={lockedAt}
					hasCryptoSignature={hasCryptoSignature}
					diaryHash={diaryHash}
					revisionCount={revisionCount}
					setShowPreview={setShowPreview}
				/>
			)}

			{/* ── Forensic Revisions History ── */}
			<VisitDiaryRevisionsHistory
				revisionCount={revisionCount}
				diaryRevisions={diaryRevisions}
			/>

			{/* ── Heavy Modals & Print Preview ── */}
			<VisitDiaryModals
				showSummaryModal={showSummaryModal}
				setShowSummaryModal={setShowSummaryModal}
				showPrescriptionModal={showPrescriptionModal}
				setShowPrescriptionModal={setShowPrescriptionModal}
				showRadiologyReferralModal={showRadiologyReferralModal}
				setShowRadiologyReferralModal={setShowRadiologyReferralModal}
				showEgiszModal={showEgiszModal}
				setShowEgiszModal={setShowEgiszModal}
				showTemplatesModal={showTemplatesModal}
				setShowTemplatesModal={setShowTemplatesModal}
				showBrandingCustomizer={showBrandingCustomizer}
				setShowBrandingCustomizer={setShowBrandingCustomizer}
				showPreview={showPreview}
				setShowPreview={setShowPreview}
				diary={diary}
				setDiary={setDiary}
				isLocked={isLocked}
				isRevising={isRevising}
				beginRevise={beginRevise}
				scheduleDebouncedSave={scheduleDebouncedSave}
				setIcdSearch={setIcdSearch}
				doSave={doSave}
				doctorName={doctorName}
				doctorSpecialty={doctorSpecialty}
				patientFullName={patientFullName}
				patientBirthDate={patientBirthDate}
				patientCardNumber={patientCardNumber}
				patientPassport={patientPassport}
				patientOms={patientOms}
				patientSnils={patientSnils}
				patientPhone={patientPhone}
				patientAddress={patientAddress}
				clinicName={clinicName}
				activePatient={activePatient}
				printPatient={printPatient}
				lockedAt={lockedAt}
				diaryHash={diaryHash}
				hasCryptoSignature={hasCryptoSignature}
				activeTeeth={activeTeeth}
				radiologySnapshots={radiologySnapshots}
				lastSavedAt={lastSavedAt}
				icdEntry={icdEntry}
				revisionCount={revisionCount}
			/>

			{/* Specialized Periodontology Studio Modal (Tier 3 Deep Workspace) */}
			{isTier3PerioModalOpen &&
				typeof window !== "undefined" &&
				createPortal(
					<div
						className="fixed inset-0 z-[9995] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
						role="dialog"
						aria-modal="true"
						aria-label="Кабинет врача-пародонтолога"
					>
						<div className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[var(--paper,#0f172a)] border border-[var(--line,#334155)] p-4 sm:p-6 shadow-2xl flex flex-col gap-4">
							<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#334155)]">
								<div className="flex items-center gap-2">
									<BarChart2 className="w-5 h-5 text-teal-400" />
									<h3 className="text-base font-bold text-[var(--ink,#f8fafc)]">
										Пародонтологическая карта (6 точек зондирования & Статус)
									</h3>
								</div>
								<button
									type="button"
									onClick={() => setIsTier3PerioModalOpen(false)}
									className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer font-bold flex items-center justify-center"
									title="Закрыть кабинет пародонтологии"
									aria-label="Закрыть кабинет пародонтологии"
								>
									<X size={16} />
								</button>
							</div>
							<Suspense
								fallback={
									<div className="p-8 text-center text-sm text-[var(--muted)] flex items-center justify-center gap-2">
										<BarChart2 className="w-5 h-5 animate-pulse text-teal-400" />
										<span>Загрузка кабинета пародонтологии...</span>
									</div>
								}
							>
								<PeriodontogramChart
									patientId={patientId}
									patientName={patientFullName || "Пациент"}
									organizationId={undefined}
									doctorName={diaryDoctorFullName || sessionDoctorName || undefined}
									onInsertToProtocol={(protocolText) => {
										setDiary((prev) => ({
											...prev,
											statusLocalis: prev.statusLocalis
												? `${prev.statusLocalis}\n\n${protocolText}`
												: protocolText,
										}));
										scheduleDebouncedSave();
										setIsTier3PerioModalOpen(false);
										ctx.showToast?.("Пародонтограмма перенесена в дневник приёма", "success");
									}}
								/>
							</Suspense>
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
};
