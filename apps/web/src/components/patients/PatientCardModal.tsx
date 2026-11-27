/**
 * PatientCardModal.tsx — Единый канонический мастер-компонент карточки пациента (SSOT, Мандат 8b, 8e, 8n, 8am).
 *
 * АРХИТЕКТУРА & ИНВАРИАНТЫ (THE HAMMER SUPREMACY):
 * 1. SSOT Консолидация: объединяет создание, просмотр и редактирование пациента без дублирующих модалок.
 * 2. Автономия врача (Мандат 8e): кнопки сохранения НИКОГДА не блокируются (disabled={false}).
 * 3. Единый дизайн-код (Мандат 8am): ровно ОДНА Primary CTA кнопка var(--primary). Все остальные — secondary.
 * 4. Apple HIG Mobile: на смартфонах (390×844) Bottom Sheet с тач-таргетами >= 44×44px, Floating Bar в Зоне большого пальца, 0px horizontal scroll.
 * 5. Sweet Spot по Мандату 8b: модульная декомпозиция <= 380 строк.
 * 6. Zero-Leak Draft Invariant (Мандат 8d/8zq, 8bn): сброс черновика resetDraft() и очистка localStorage при закрытии.
 */

import React, { useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { kopecksToRubles, rublesToKopecks, type WorkspaceOverlayStudio } from "@dental/shared";
import {
	Activity, Camera, ChevronRight, ClipboardList, FileCheck, FileText, FlaskConical,
	HeartPulse, History, Scan, ShieldAlert, ShieldCheck, Users, Wallet,
} from "lucide-react";
import { emitClinicEvent, navigateToStudio } from "../../lib/clinicEventBus";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { clientLogger } from "../../services/logging/clientLogger";
import { deleteOfflineDraft } from "../../services/offline/storage/idbDraftOps";
import { ToothMolar } from "../icons/DentalIcons";
import { SomaticAnamnesisCard } from "../clinical/SomaticAnamnesisCard";
import { PerioStudioModal } from "../perio/PerioStudioModal";
import { PatientGeneralInfoTab } from "./tabs/PatientGeneralInfoTab";
import { PatientFinanceTab } from "./tabs/PatientFinanceTab";
import { PatientRadiologyTab } from "./tabs/PatientRadiologyTab";
import { PatientDentalFormulaTab } from "./formula/PatientDentalFormulaTab";
import { PatientDocumentsTab } from "./tabs/PatientDocumentsTab";
import { PatientPhotosTab } from "./tabs/PatientPhotosTab";
import { TreatmentPlansTab } from "./tabs/TreatmentPlansTab";
import { PatientHistoryTab } from "./PatientHistoryTab";
import { PatientFamilyAndInsuranceWidget } from "./PatientFamilyAndInsuranceWidget";
import { PatientReclamationsHistoryTab } from "./tabs/PatientReclamationsHistoryTab";
import { LabOrdersPanel } from "./LabOrdersPanel";
import { PatientCardModalHeader } from "./patientCardModalModules/PatientCardModalHeader";
import { PatientCardModalFooter } from "./patientCardModalModules/PatientCardModalFooter";
import { PatientCardSomaticAlert } from "./patientCardModalModules/PatientCardSomaticAlert";
import { usePatientCardModalState } from "./patientCardModalModules/usePatientCardModalState";
import { usePatientCreationForm } from "./patientCreation/usePatientCreationForm";
import { PatientCreationModalBody } from "./patientCreation/PatientCreationModalBody";
export * from "./patientCardModalModules/patientCardModalTypes";
import type { PatientCardTab, PatientModalMode, PatientCardModalProps } from "./patientCardModalModules/patientCardModalTypes";
import { toCanonicalPatient, createPatientCreationOptions } from "./patientCardModalModules/patientCardModalTypes";

const TABS = [
	{ id: "general", testId: "tab-patient-general", label: "Паспортные данные", Icon: FileText },
	{ id: "anamnesis", testId: "tab-patient-anamnesis", label: "Анамнез", Icon: HeartPulse },
	{ id: "treatmentPlans", testId: "tab-patient-treatment-plans", label: "План лечения", Icon: ClipboardList },
	{ id: "labOrders", testId: "tab-patient-lab-orders", label: "Лаборатория (ЗТЛ)", Icon: FlaskConical },
	{ id: "visits", testId: "tab-patient-visits", label: "Визиты и файлы", Icon: History },
	{ id: "finance", testId: "tab-patient-finance", label: "Счета и баланс", Icon: Wallet },
	{ id: "radiology", testId: "tab-patient-radiology", label: "Снимки и КТ", Icon: Scan },
	{ id: "photos", testId: "tab-patient-photos", label: "Фотопротокол", Icon: Camera },
	{ id: "formula", testId: "tab-patient-formula", label: "Формула", Icon: ToothMolar },
	{ id: "perio", testId: "tab-patient-perio", label: "Пародонтология", Icon: Activity },
	{ id: "documents", testId: "tab-patient-documents", label: "Документы", Icon: FileCheck },
	{ id: "reclamations", testId: "tab-patient-reclamations", label: "Рекламации", Icon: ShieldAlert },
	{ id: "family", testId: "tab-patient-family", label: "Семья", Icon: Users },
] as const;

export const PatientCardModal: React.FC<PatientCardModalProps> = React.memo(function PatientCardModal(props) {
	const {
		isOpen,
		onClose,
		isOverlayHosted = false,
		mode = "view",
		initialMode,
		disabled = false,
		onNavigateToVisit,
		onNewAppointment,
		className = "",
		createPatient,
		updatePatientCoreDraft,
		customRequirements,
		initialBirthDate,
		initialIsChild,
		patientId: propPatientId,
		initialPatientId,
	} = props;

	const effectiveInitialMode = initialMode || mode;
	const [activeMode, setActiveMode] = React.useState<PatientModalMode>(effectiveInitialMode);
	React.useEffect(() => {
		if (effectiveInitialMode) setActiveMode(effectiveInitialMode);
	}, [effectiveInitialMode]);

	const isCreateMode = activeMode === "create" || Boolean(createPatient);
	const { hasDentalLab } = useWorkspaceProfile();
	const showDentalLabTab = hasDentalLab || isDemoShowcaseMode();
	const visibleTabs = useMemo(
		() => (showDentalLabTab ? TABS : TABS.filter((tab) => tab.id !== "labOrders")),
		[showDentalLabTab],
	);

	// Состояние для режима карты пациента
	const cardState = usePatientCardModalState(props);
	const {
		patientData, safetyProfile, setSafetyProfile, activeTab, setActiveTab,
		isChildPatient, safetyEvaluation, isDirty, setIsDirty, saveState,
		handleUpdatePatientField, handleApplyNorm, handlePrint, handleSave, resetLocalDraft,
	} = cardState;

	const tabsScrollRef = useRef<HTMLDivElement | null>(null);
	const navigatingFlatRef = useRef(false);

	const clearPersistedDraft = React.useCallback(() => {
		const targetPatientId = patientData?.id || propPatientId || initialPatientId;
		if (targetPatientId) {
			const draftKey = `dente_patient_card_draft_${targetPatientId}`;
			void deleteOfflineDraft(draftKey);
			try {
				localStorage.removeItem(draftKey);
			} catch (err) {
				clientLogger.debug("[PatientCardModal] Failed to clear localStorage draft", err, {
					module: "PatientCard",
				});
			}
		}
		try {
			usePatientStore.getState().resetDraft();
		} catch (err) {
			clientLogger.debug("[PatientCardModal] Failed to reset patient store draft", err, {
				module: "PatientCard",
			});
		}
		resetLocalDraft();
	}, [patientData?.id, propPatientId, initialPatientId, resetLocalDraft]);

	// Каноническое закрытие с очисткой черновика (Мандат 8d/8zq, 8bn — Zero-Leak Draft Invariant)
	const handleClose = React.useCallback(() => {
		navigatingFlatRef.current = false;
		clearPersistedDraft();
		onClose();
	}, [clearPersistedDraft, onClose]);

	// Очистка черновика при внешнем закрытии (isOpen: true -> false) и размонтировании (кроме плоского перехода в студию)
	const wasOpenRef = useRef(isOpen);
	React.useEffect(() => {
		if (wasOpenRef.current && !isOpen && !navigatingFlatRef.current) {
			clearPersistedDraft();
		}
		if (isOpen) {
			navigatingFlatRef.current = false;
		}
		wasOpenRef.current = isOpen;
	}, [isOpen, clearPersistedDraft]);

	React.useEffect(() => {
		return () => {
			if (!navigatingFlatRef.current) {
				try {
					usePatientStore.getState().resetDraft();
				} catch (err) {
					clientLogger.debug("[PatientCardModal] Failed to reset patient store draft on unmount", err, {
						module: "PatientCard",
					});
				}
			}
		};
	}, []);

	// Плоская навигация в соседнюю студию без вложенных матрёшек (Max Modal Depth = 1)
	const openFlatStudio = React.useCallback(
		(nextStudio: WorkspaceOverlayStudio) => {
			const currentPatientId = patientData?.id || propPatientId || initialPatientId || undefined;
			const returnStudio: WorkspaceOverlayStudio = {
				kind: "patient_card",
				...(currentPatientId ? { patientId: currentPatientId } : {}),
				mode: activeMode,
				initialTab: activeTab,
			};
			navigatingFlatRef.current = true;
			navigateToStudio(nextStudio, returnStudio);
			if (!isOverlayHosted) {
				onClose();
			}
		},
		[patientData?.id, propPatientId, initialPatientId, activeMode, activeTab, isOverlayHosted, onClose],
	);

	// Global Escape listener
	React.useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				handleClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, handleClose]);

	// Состояние для режима создания пациента (стабильные зависимости, без inline props объекта)
	const creationOptions = useMemo(
		() =>
			createPatientCreationOptions(
				{
					isOpen,
					onClose,
					createPatient,
					updatePatientCoreDraft,
					customRequirements,
					initialBirthDate,
					initialIsChild,
				},
				isOpen,
				onClose,
			),
		[isOpen, onClose, createPatient, updatePatientCoreDraft, customRequirements, initialBirthDate, initialIsChild],
	);
	const creationForm = usePatientCreationForm(creationOptions);
	const canonicalPatient = useMemo(() => toCanonicalPatient(patientData), [patientData]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none print:p-0 print:bg-white print:static overflow-x-clip"
			role="dialog"
			aria-modal="true"
			aria-labelledby="patient-card-modal-title"
			data-testid="patient-card-modal-backdrop"
			onClick={(e) => {
				if (e.target === e.currentTarget) handleClose();
			}}
		>
			<div
				data-testid="patient-card-modal"
				className={`bg-[var(--paper-strong)] border border-[var(--glass-border)] rounded-t-[24px] sm:rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden text-[var(--ink)] print:border-none print:shadow-none print:max-h-none print:rounded-none ${className}`}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Алиас контейнера для канонической студии картотеки пациентов (SSOT) */}
				<div data-testid="patient-studio-modal" style={{ display: "contents" }}>
					{/* Мобильный хэндл шторки (Apple HIG Bottom Sheet: 36x4px / w-9 h-1) */}
					<div className="sm:hidden w-9 h-1 bg-[var(--line-strong)] rounded-full mx-auto my-2 shrink-0" aria-hidden="true" />

					{/* ── ШАПКА КАРТОЧКИ ПАЦИЕНТА (Мандат 8b: декомпозированный компонент) ── */}
					<PatientCardModalHeader
						isCreateMode={isCreateMode}
						mode={mode}
						patientData={patientData}
						isChildPatient={isChildPatient}
						isAnySubModalOpen={false}
						onSetActiveMode={setActiveMode}
						onOpenDiplomaModal={() => openFlatStudio({ kind: "pediatric", patientId: patientData.id ?? undefined, mode: "diploma" })}
						onOpenPhotoModal={() => openFlatStudio({ kind: "photo_protocol", patientId: patientData.id ?? undefined, mode: "grid" })}
						onOpenTaxDeductionModal={() =>
							openFlatStudio({
								kind: "consents",
								patientId: patientData.id ?? undefined,
								docId: "tax_deduction:form",
							})
						}
						onOpenMedicalRecordStudio={() =>
							openFlatStudio({ kind: "emr_record", patientId: patientData.id ?? undefined, initialTab: "overview" })
						}
						onPrintBlankContract={creationForm.handlePrintBlankContract}
						onPrintPatientCard={handlePrint}
						onClose={handleClose}
					/>

					{/* ── СОМАТИЧЕСКИЙ АЛЕРТ (Мандат 8y — Пассивная безопасность, sentence case) ── */}
					{!isCreateMode && (
						<PatientCardSomaticAlert safetyEvaluation={safetyEvaluation} onOpenAnamnesis={setActiveTab} />
					)}

					{/* ── ТАБЫ НАВИГАЦИИ КАРТОЧКИ (СТРОГО 1 СТРОКА БЕЗ ПЕРЕНОСА И КЛИППИНГА) ── */}
					{!isCreateMode && (
						<div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 border-b border-[var(--glass-border)] bg-[var(--paper-soft)]/60 flex-nowrap overflow-hidden print:hidden">
							<div
								ref={tabsScrollRef}
								role="tablist"
								aria-label="Разделы карты пациента"
								className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto flex-nowrap scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth pr-4 [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]"
							>
								{visibleTabs.map((tab) => {
									const isActive = activeTab === tab.id;
									const Icon = tab.Icon;
									return (
										<button
											key={tab.id}
											type="button"
											role="tab"
											aria-selected={isActive}
											data-testid={tab.testId}
											className={`min-h-[44px] sm:min-h-[32px] h-8 px-2.5 text-xs rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none border ${
												isActive
													? "border-[var(--primary)]/40 bg-[var(--paper)] text-[var(--primary)] shadow-2xs font-semibold"
													: "border-transparent bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/70 font-medium"
											}`}
											onClick={(e) => {
												setActiveTab(tab.id as PatientCardTab);
												e.currentTarget.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
											}}
										>
											<Icon className="w-3.5 h-3.5 shrink-0" />
											<span>{tab.label}</span>
										</button>
									);
								})}
							</div>

							<button
								type="button"
								onClick={() => {
									tabsScrollRef.current?.scrollBy({ left: 220, behavior: "smooth" });
								}}
								className="hidden sm:inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
								title="Прокрутить вкладки"
								aria-label="Прокрутить вкладки вправо"
							>
								<ChevronRight className="w-4 h-4 shrink-0" />
							</button>

							{/* Физиологическая норма */}
							<button
								type="button"
								data-testid="btn-somatic-healthy-norm"
								className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium rounded-lg px-2.5 shadow-2xs hover:bg-[var(--paper-soft)] transition-colors min-h-[44px] sm:min-h-[32px] h-8 text-xs inline-flex items-center gap-1.5 cursor-pointer active:scale-98 shrink-0 whitespace-nowrap select-none"
								onClick={handleApplyNorm}
								title="Зафиксировать физиологическую норму: соматически здоров / интактные зубы"
							>
								<ShieldCheck className="w-4 h-4 text-current shrink-0" />
								<span className="shrink-0 whitespace-nowrap">Норма</span>
							</button>
						</div>
					)}

					{/* ── ТЕЛО МОДАЛКИ (ОСНОВНОЙ КОНТЕНТ) ── */}
					<div
						data-testid={isCreateMode ? "patient-express-registration-form" : "patient-studio-detail-view"}
						className="p-3 sm:p-5 pb-[calc(100px+env(safe-area-inset-bottom,0px))] sm:pb-5 overflow-y-auto flex-1"
					>
						{isCreateMode ? (
							<PatientCreationModalBody
								form={creationForm}
								updatePatientCoreDraft={updatePatientCoreDraft}
								onClose={handleClose}
							/>
						) : activeTab === "treatmentPlans" ? (
							<TreatmentPlansTab
								patient={patientData}
								patientId={patientData.id ?? undefined}
								onOpenPlanPresenter={() => {
									if (patientData.id) {
										usePatientStore.getState().setSelectedPatientId(patientData.id);
										useAppStore.getState().setActivePatientId(patientData.id);
									}
									useAppStore.getState().clearStudioBackStack();
									emitClinicEvent("workspace:navigate", {
										view: "treatment_plans",
										entityId: patientData.id ?? undefined,
									});
									useAppStore.getState().setCurrentView("pipeline");
									onClose();
								}}
								onSendToCheckout={(_tierId, amountRub, amountKopecks) => {
									const kopecks =
										typeof amountKopecks === "number" && amountKopecks > 0
											? amountKopecks
											: rublesToKopecks(amountRub);
									openFlatStudio({
										kind: "cashbox",
										mode: "checkout",
										patientId: patientData.id ?? undefined,
										patientName: patientData.fullName ?? undefined,
										amountKopecks: kopecks,
										serviceTitle: "Оплата по плану лечения",
									});
								}}
								onPrintPlan={handlePrint}
							/>
						) : activeTab === "labOrders" && showDentalLabTab ? (
							<div className="p-2 sm:p-3">
								<LabOrdersPanel patientId={patientData.id ?? undefined} />
							</div>
						) : activeTab === "finance" ? (
							<PatientFinanceTab
								patient={patientData}
								onUpdateBalance={(newBalRub) => {
									handleUpdatePatientField("balanceKopecks", rublesToKopecks(newBalRub));
									handleUpdatePatientField("patientBalanceRub", newBalRub);
								}}
								onNavigateToVisit={onNavigateToVisit}
								onNewAppointment={onNewAppointment}
								onOpenTaxCertificate={() =>
									openFlatStudio({
										kind: "consents",
										patientId: patientData.id ?? undefined,
										docId: "tax_deduction:form",
									})
								}
								onOpenFamilyTaxCertificate={() =>
									openFlatStudio({
										kind: "consents",
										patientId: patientData.id ?? undefined,
										docId: "tax_deduction:family",
									})
								}
								disabled={disabled}
							/>
						) : activeTab === "documents" ? (
							<PatientDocumentsTab patient={canonicalPatient} onPrintOutpatientCard={handlePrint} />
						) : activeTab === "photos" ? (
							<PatientPhotosTab
								patientId={patientData.id}
								patientName={patientData.fullName}
								cardNumber={patientData.cardNumber || patientData.medicalCardNumber}
								onOpenPhotoStudio={() =>
									openFlatStudio({
										kind: "photo_protocol",
										patientId: patientData.id ?? undefined,
										mode: "grid",
									})
								}
							/>
						) : activeTab === "perio" ? (
							<PerioStudioModal
								key={`perio-${patientData.id || "draft"}`}
								isModal={false}
								patientId={patientData.id ?? undefined}
								patientName={patientData.fullName ?? undefined}
							/>
						) : activeTab === "formula" ? (
							<PatientDentalFormulaTab patientId={patientData.id || ""} patientBirthDate={patientData.birthDate ?? undefined} patientName={patientData.fullName ?? undefined} />
						) : activeTab === "radiology" ? (
							<PatientRadiologyTab patientId={patientData.id ?? undefined} patientName={patientData.fullName ?? undefined} patientBirthDate={patientData.birthDate ?? undefined} />
						) : activeTab === "anamnesis" ? (
							<div className="p-1 sm:p-2 space-y-4">
								<SomaticAnamnesisCard
									initialProfile={safetyProfile}
									patientId={patientData.id}
									patientName={patientData.fullName}
									onSave={(newProfile) => { setSafetyProfile(newProfile); setIsDirty(true); }}
									onApplyNorm={(normProfile) => { setSafetyProfile(normProfile); handleApplyNorm(); }}
									onSyncToDiary={(diarySnippet) => {
										emitClinicEvent("emk:insert-protocol", {
											text: diarySnippet,
											target: "notes",
										});
										if (typeof window !== "undefined") {
											window.dispatchEvent(
												new CustomEvent("dente-apply-soap-protocol", {
													detail: {
														patientId: patientData.id,
														anamnesis: diarySnippet,
														soap: { anamnesis: diarySnippet },
													},
												}),
											);
										}
									}}
								/>
							</div>
						) : activeTab === "visits" ? (
							<PatientHistoryTab
								patientId={patientData.id}
								patientName={patientData.fullName}
								visits={props.visits}
								dashboard={props.dashboard}
								onNavigateToVisit={onNavigateToVisit}
								onNewAppointment={onNewAppointment}
							/>
						) : activeTab === "reclamations" ? (
							<PatientReclamationsHistoryTab
								patientId={patientData.id}
								patientName={patientData.fullName}
								doctorName={props.doctorName}
								doctorId={props.doctorId}
								onOpenWarrantyPassport={props.onOpenWarrantyPassport}
							/>
						) : activeTab === "family" ? (
							<div className="p-2 sm:p-3 space-y-4">
								<PatientFamilyAndInsuranceWidget
									patient={canonicalPatient}
									patientBalance={
										typeof patientData.balanceKopecks === "number"
											? kopecksToRubles(patientData.balanceKopecks)
											: Number(patientData.patientBalanceRub ?? 0) || 0
									}
									insurancePolicyNumber={patientData.omsPolicyNumber || undefined}
									onUpdateInsurancePolicy={(p) => handleUpdatePatientField("omsPolicyNumber", p)}
								/>
							</div>
						) : (
							<PatientGeneralInfoTab
								patient={patientData}
								safetyProfile={safetyProfile}
								onUpdatePatient={handleUpdatePatientField}
								onUpdateSafetyProfile={(s) => { setSafetyProfile(s); setIsDirty(true); }}
								onApplySomaticNorm={handleApplyNorm}
								disabled={disabled}
								activeSection="general"
								onNavigateToVisit={onNavigateToVisit}
								onNewAppointment={onNewAppointment}
								onOpenDmsLetters={() =>
									openFlatStudio({ kind: "dms", patientId: patientData.id ?? undefined })
								}
								onOpenTaxCertificate={() =>
									openFlatStudio({
										kind: "consents",
										patientId: patientData.id ?? undefined,
										docId: "tax_deduction:form",
									})
								}
							/>
						)}
					</div>

					{/* ── ЕДИНЫЙ ФУТЕР МОДАЛКИ (1 ЗАКРЕПЛЁННЫЙ ФУТЕР, РОВНО 1 PRIMARY CTA) ── */}
					<PatientCardModalFooter
						isCreateMode={isCreateMode}
						creationForm={creationForm}
						isDirty={isDirty}
						saveState={saveState}
						onClose={handleClose}
						onSave={handleSave}
					/>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body ? createPortal(modalContent, document.body) : modalContent;
});

export default PatientCardModal;
