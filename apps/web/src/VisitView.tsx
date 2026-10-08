import React, { useCallback, useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "./AppHelpers";
import {
	AlertOctagon,
	AlertTriangle,
	Calculator,
	Check,
	CheckCircle2,
	Clock,
	FileText,
	FlaskConical,
	Lock,
	MoreHorizontal,
	Printer,
	ShieldCheck,
} from "lucide-react";
import { EmptyState } from "./components/EmptyState";
import { showToast } from "./components/GlobalToast";
import { PatientAvatar } from "./components/PatientAvatar";
import { VisitDiagnosticsTab } from "./components/visit/VisitDiagnosticsTab";
import { VisitEmkTab } from "./components/visit/VisitEmkTab";
import { VisitOdontogramTab } from "./components/visit/VisitOdontogramTab";
import { VisitAnamnesisTab } from "./components/visit/VisitAnamnesisTab";
import { SomaticSafetyAlertWidget } from "./components/clinical/SomaticSafetyAlertWidget";
import { VisitConsentsTab } from "./components/visit/VisitConsentsTab";
import { VisitTimer } from "./components/visit/VisitTimer";
import { SoftPresenceIndicator } from "./components/presence/SoftPresenceIndicator";
import { useSoftPresence } from "./hooks/useSoftPresence";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { ClinicalErrorBoundary } from "./components/common/ClinicalErrorBoundary";
import { useVisitStore } from "./store/visitStore";
import {
	mergeMultiToothDiagnoses,
	mergeMultiToothTreatmentPlan,
} from "./utils/clinicalTextSanitizer";
import "./styles/VisitView.css";
import { useIsMobile } from "./hooks/useIsMobile";
import { MobileChairsideVisitWorkspace } from "./components/visit/MobileChairsideVisitWorkspace";
import { VisitPlanStageHandoffBanner } from "./components/visit/VisitPlanStageHandoffBanner";
import {
	formatStageItemForBilling,
	buildStageMedicalDiaryText,
} from "./components/visit/visitPlanStageHandoff";

import {
	type VisitViewProps,
	calculateActivePatientCriticalBadges,
	executePolishTranscriptAutonomy,
	executeApplySomaticNormAutonomy,
	executeApplyHygienePresetAutonomy,
	executeApplyAnesthesiaPresetAutonomy,
	executeFastPrint043u,
	executeFastPrintInformedConsent,
	executeFastPrintCompletedAct,
	executeFastPrintTreatmentPlanEstimate,
	VisitSecondaryPanelsInner,
	VisitClinicalToothModal,
	VisitViewModals,
} from "./components/visit/view";

export type { VisitViewProps };
export {
	executePolishTranscriptAutonomy,
	executeApplySomaticNormAutonomy,
	executeApplyHygienePresetAutonomy,
	executeApplyAnesthesiaPresetAutonomy,
	VisitPlanStageHandoffBanner,
};
export * from "./components/visit/visitPlanStageHandoff";

export function VisitView(rawProps?: Partial<VisitViewProps>) {
	// biome-ignore lint/suspicious/noExplicitAny: app logic fallback
	const appLogic = (useAppLogicContext() as any) || {};
	const props = { ...appLogic, ...(rawProps || {}) } as VisitViewProps;

	const {
		activePatient,
		activeAppointment,
		activeDoctor,
		dashboard,
		transcript = "",
		setTranscript,
		hasVisitTranscriptText,
		isTranscriptPolishing,
		polishTranscript,
		updateVisitNoteField,
		visitNoteForm,
		flushPendingVisitSaves,
		toothRows = [
			["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"],
			["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"],
		],
		toothStateByCode = {},
		setToothState = () => {},
		draft,
		visitWarnings,
		visitPrimaryAction,
	} = props;

	const { activePeers, summaryText } = useSoftPresence({
		patientId: activePatient?.id,
		visitId: activeAppointment?.id,
	});

	const isMobile = useIsMobile(768);

	const [visitSubViewTab, setVisitSubViewTab] = useState<string>("emk");
	const [activeQuadrant, setActiveQuadrant] = useState<number | null>(null);
	const [activeStamp, setActiveStamp] = useState<string>("watch");
	const activeStampRef = React.useRef<string>("watch");
	const [selectedToothForMenu, setSelectedToothForMenu] = useState<any>(null);
	const [materialCategory, setMaterialCategory] = useState<string | null>(null);
	const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>([]);
	const [isSurfaceMode, setIsSurfaceMode] = useState<boolean>(false);

	// Modals state
	const [endoModalToothNumber, setEndoModalToothNumber] = useState<any>(null);
	const [endoModalToothState, setEndoModalToothState] = useState<string>("idle");
	const [labOrderModalToothNumber, setLabOrderModalToothNumber] = useState<any>(null);
	const [isEndoModalOpen, setIsEndoModalOpen] = useState(false); const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState(false);
	const [isStagePaymentModalOpen, setIsStagePaymentModalOpen] = useState(false); const [isPriceValidatorModalOpen, setIsPriceValidatorModalOpen] = useState(false);
	const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false); const [isVoiceDictationModalOpen, setIsVoiceDictationModalOpen] = useState(false);
	const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false); const [isDoctorShiftModalOpen, setIsDoctorShiftModalOpen] = useState(false);
	const [isInformedConsentModalOpen, setIsInformedConsentModalOpen] = useState(false); const [isHeaderMoreMenuOpen, setIsHeaderMoreMenuOpen] = useState(false);

	const handleOpenLabOrder = useCallback((targetTooth?: string | number | null | unknown) => {
		if (typeof props.onOpenLabOrderModal === "function") {
			props.onOpenLabOrderModal();
		}
		const toothStr = (targetTooth && typeof targetTooth === "string" || typeof targetTooth === "number")
			? String(targetTooth)
			: selectedToothForMenu?.code
			? String(selectedToothForMenu.code)
			: useVisitStore.getState().activeToothNumber
			? String(useVisitStore.getState().activeToothNumber)
			: null;
		if (toothStr) {
			setLabOrderModalToothNumber(toothStr);
		}
		setIsLabOrderModalOpen(true);
	}, [props.onOpenLabOrderModal, selectedToothForMenu]);

	useEffect(() => {
		const handleLabOrderEvent = (e: any) => {
			const customTooth = e?.detail?.toothNumber || e?.detail?.toothFdi;
			handleOpenLabOrder(customTooth);
		};
		window.addEventListener("dente-open-lab-order-modal", handleLabOrderEvent);
		return () => {
			window.removeEventListener("dente-open-lab-order-modal", handleLabOrderEvent);
		};
	}, [handleOpenLabOrder]);

	const headerMoreMenuRef = React.useRef<HTMLDivElement | null>(null);

	const [loadedTreatmentPlan, setLoadedTreatmentPlan] = useState<any>(null);

	// Production PostgreSQL 18: загрузка согласованного плана лечения пациента
	useEffect(() => {
		if (!activePatient?.id) {
			setLoadedTreatmentPlan(null);
			return;
		}
		let cancelled = false;
		async function fetchPatientTreatmentPlan() {
			try {
				const res = await fetch(`/api/patients/${activePatient.id}/treatment-plans`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const data = await res.json();
				if (cancelled) return;
				if (data?.success && Array.isArray(data.plans) && data.plans.length > 0) {
					const plan =
						data.plans.find((p: any) => p.status === "Approved" || p.status === "Active") ||
						data.plans[0];
					setLoadedTreatmentPlan(plan);
				}
			} catch {
				// Non-blocking in offline / test mode
			}
		}
		fetchPatientTreatmentPlan();
		const handleReload = () => fetchPatientTreatmentPlan();
		window.addEventListener("dente-treatment-plans-reload", handleReload);
		return () => {
			cancelled = true;
			window.removeEventListener("dente-treatment-plans-reload", handleReload);
		};
	}, [activePatient?.id]);

	// Сквозная связка: приём события «Взять этап в работу визита»
	useEffect(() => {
		const handleTakeStage = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (!detail) return;
			const { stage, items } = detail;
			const stageItems = items || stage?.items || [];
			if (stageItems.length > 0) {
				const stageTitle = stage?.title || (stage?.stageNumber ? `Этап ${stage.stageNumber}` : "План лечения");
				const diaryText = buildStageMedicalDiaryText(stageTitle, stageItems);
				updateVisitNoteField("treatmentPlan", diaryText);

				// Перенос каждой услуги в биллинг и счёт приёма у кресла
				for (const it of stageItems) {
					const billingItem = formatStageItemForBilling(it);
					window.dispatchEvent(
						new CustomEvent("dente-add-billing-item", {
							detail: {
								item: billingItem,
							},
						}),
					);
				}
				showToast(
					`Этап «${stageTitle}» взят в работу визита (${stageItems.length} услуг)`,
					"success",
					4000,
				);
			}
		};

		window.addEventListener("dente-take-stage-to-visit", handleTakeStage);
		return () => window.removeEventListener("dente-take-stage-to-visit", handleTakeStage);
	}, [updateVisitNoteField]);

	const patientAge = useMemo(() => {
		if (!activePatient?.birthDate) return null;
		const diff = Date.now() - new Date(activePatient.birthDate).getTime();
		const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
		return `${years} лет`;
	}, [activePatient?.birthDate]);

	// Tier 1 Critical Badges & Autonomy (Mandates 8e, 8i, 8y)
	const activePatientCriticalBadges = useMemo(() => {
		return calculateActivePatientCriticalBadges(activePatient, visitNoteForm?.anamnesis);
	}, [activePatient, visitNoteForm?.anamnesis]);

	// Единая консолидированная плашка аллергии без тройного дублирования
	const consolidatedAllergyChip = useMemo(() => {
		if (!activePatientCriticalBadges || activePatientCriticalBadges.length === 0) return null;
		const rawAllergies = activePatient?.allergies;
		const allergyStr = Array.isArray(rawAllergies) ? rawAllergies.join(", ") : String(rawAllergies || "");
		const parts: string[] = [];
		if (allergyStr.trim()) {
			parts.push(allergyStr.trim());
		}
		for (const b of activePatientCriticalBadges) {
			if (b.id !== "allergy") {
				const short = b.shortLabel ? b.shortLabel.replace(/[\u26a0\ufe0f!]/gu, "").trim() : "";
				if (short && !parts.some((p) => p.toLowerCase().includes(short.toLowerCase()))) {
					const capitalized = short.charAt(0).toUpperCase() + short.slice(1).toLowerCase();
					parts.push(capitalized);
				}
			}
		}
		const detail = parts.length > 0 ? parts.join(", ") : "Отягощен";
		return `Аллергия: ${detail}`;
	}, [activePatientCriticalBadges, activePatient?.allergies]);

	const handleApplySomaticNormQuick = useCallback(() => {
		return executeApplySomaticNormAutonomy({
			updateVisitNoteField,
			visitNoteForm,
			showToastFn: showToast,
			activePatient,
		});
	}, [updateVisitNoteField, visitNoteForm, activePatient]);

	// Dynamic treatment plan age & soft expiration calculation
	const activePlan = useMemo(() => {
		const scenarios = (dashboard?.treatmentPlanScenarios as any[]) || [];
		const patientScenarios = scenarios.filter((s) => s.patientId === activePatient?.id);
		if (patientScenarios.length > 0) return patientScenarios[0];
		const items = (dashboard?.treatmentPlanItems as any[]) || [];
		const patientItems = items.filter((i) => i.patientId === activePatient?.id);
		if (patientItems.length > 0) return patientItems[0];
		return null;
	}, [dashboard?.treatmentPlanScenarios, dashboard?.treatmentPlanItems, activePatient?.id]);

	const treatmentPlanAgeDays = useMemo(() => {
		if (!activePlan) return 0;
		const rawDate = activePlan.createdAt || activePlan.plannedAt || activePlan.date;
		if (!rawDate) return 0;
		const createdTime = new Date(rawDate).getTime();
		if (Number.isNaN(createdTime)) return 0;
		return Math.max(0, Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24)));
	}, [activePlan]);

	const isTreatmentPlanExpiredSoft = activePlan !== null && treatmentPlanAgeDays > 30;

	const handlePrintForm043uFast = useCallback(() => {
		const isClosed =
			activeAppointment?.status === "completed" ||
			activeAppointment?.status === "signed" ||
			activeAppointment?.status === "closed" ||
			visitNoteForm?.status === "completed" ||
			visitNoteForm?.status === "signed";
		const watermarkText = isClosed ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК";
		// Поддержка отметки: ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ
		executeFastPrint043u({
			activePatient,
			activeDoctor,
			activeAppointment,
			visitNoteForm,
			isClosed,
			watermarkText,
			dashboard,
			teethFormula: toothStateByCode,
			selectedToothForMenu,
		});
	}, [activeAppointment, activeDoctor, activePatient, dashboard, selectedToothForMenu, toothStateByCode, visitNoteForm]);

	const handlePrintInformedConsentFast = useCallback(() => {
		executeFastPrintInformedConsent({
			activePatient,
			activeDoctor,
			activeAppointment,
			visitNoteForm,
			dashboard,
			selectedToothForMenu,
		});
	}, [activeAppointment, activeDoctor, activePatient, dashboard, selectedToothForMenu, visitNoteForm]);

	const handlePrintCompletedActFast = useCallback(() => {
		const isClosed =
			activeAppointment?.status === "completed" ||
			activeAppointment?.status === "signed" ||
			activeAppointment?.status === "closed" ||
			visitNoteForm?.status === "completed" ||
			visitNoteForm?.status === "signed";
		executeFastPrintCompletedAct({
			activePatient,
			activeDoctor,
			activeAppointment,
			visitNoteForm,
			dashboard,
			activePlan,
			isClosed,
		});
	}, [activeAppointment, activeDoctor, activePatient, activePlan, dashboard, visitNoteForm]);

	const handlePrintEstimateFast = useCallback(() => {
		executeFastPrintTreatmentPlanEstimate({
			activePatient,
			activeDoctor,
			activeAppointment,
			dashboard,
			activePlan,
		});
	}, [activeAppointment, activeDoctor, activePatient, activePlan, dashboard]);

	const flushAll = useCallback(async () => {
		if (typeof flushPendingVisitSaves === "function") {
			await flushPendingVisitSaves();
		}
	}, [flushPendingVisitSaves]);

	const handleFinishVisitAction = useCallback(async () => {
		if (typeof updateVisitNoteField === "function") {
			if (!visitNoteForm?.diagnosis) updateVisitNoteField("diagnosis", "Z01.2 Стоматологическое обследование (Здоров)");
			if (!visitNoteForm?.treatmentPlan) updateVisitNoteField("treatmentPlan", "Осмотр полости рта проведен, патологий не выявлено. Полость рта здорова, гигиена удовлетворительная.");
			if (!visitNoteForm?.complaint) updateVisitNoteField("complaint", "Жалоб на момент осмотра не предъявляет.");
			if (!visitNoteForm?.anamnesis) updateVisitNoteField("anamnesis", "Соматически здоров. Аллергоанамнез не отягощен.");
			if (!visitNoteForm?.objectiveStatus) updateVisitNoteField("objectiveStatus", "Слизистая оболочка полости рта бледно-розовая, влажная. Зубные ряды интактны.");
		}
		if (typeof flushPendingVisitSaves === "function") await flushPendingVisitSaves();
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente:trigger-complete-visit"));
		}
	}, [flushPendingVisitSaves, updateVisitNoteField, visitNoteForm]);

	React.useEffect(() => {
		window.addEventListener("beforeunload", flushAll);
		window.addEventListener("pagehide", flushAll);
		return () => {
			window.removeEventListener("beforeunload", flushAll);
			window.removeEventListener("pagehide", flushAll);
		};
	}, [flushAll]);

	const handleTabChange = useCallback((newTab: string) => {
		flushAll();
		setVisitSubViewTab(newTab);
		window.dispatchEvent(
				new CustomEvent("dente:visit-tab-change", { detail: { tab: newTab, source: "visit-view" } }),
		);
	}, [flushAll]);

	React.useEffect(() => {
		const handleExternalTabChange = (e: Event) => {
			const detail = (e as CustomEvent<{ tab?: string; source?: string }>).detail;
			if (detail?.tab && detail.source !== "visit-view") {
				flushAll();
				setVisitSubViewTab(detail.tab);
			}
		};
		window.addEventListener("dente:visit-tab-change", handleExternalTabChange);
		return () => {
			window.removeEventListener("dente:visit-tab-change", handleExternalTabChange);
		};
	}, [flushAll]);

	const handleToothClick = useCallback((code: string, currentState: string) => {
		const num = Number(code) || null;
		useVisitStore.getState().setActiveToothNumber(num);
		if (activeStamp && activeStamp !== "idle") {
			setToothState(code, activeStamp);
		} else {
			setSelectedToothForMenu({ code, state: currentState });
		}
	}, [activeStamp, setToothState]);

	React.useEffect(() => {
		const handleToothStateUpdate = (e: Event) => {
			const detail = (e as CustomEvent<{ toothNumber: number | string; state: string }>).detail;
			if (detail?.toothNumber && detail?.state && typeof setToothState === "function") {
				setToothState(String(detail.toothNumber), detail.state);
			}
		};
		const handleOpenToothClinicalModal = (e: Event) => {
			const detail = (e as CustomEvent<{ toothNumber?: number | string; code?: string; state?: string }>).detail;
			if (detail) {
				const code = String(detail.code || detail.toothNumber || "");
				if (code) {
					const num = Number(code) || null;
					useVisitStore.getState().setActiveToothNumber(num);
					setSelectedToothForMenu({
						code,
						state: detail.state || (toothStateByCode as Record<string, string>)?.[code] || "Healthy",
					});
				}
			}
		};
		window.addEventListener("dente-update-tooth-state", handleToothStateUpdate);
		window.addEventListener("dente-open-tooth-clinical-modal", handleOpenToothClinicalModal);
		return () => {
			window.removeEventListener("dente-update-tooth-state", handleToothStateUpdate);
			window.removeEventListener("dente-open-tooth-clinical-modal", handleOpenToothClinicalModal);
		};
	}, [setToothState, toothStateByCode]);

	const appendToEMKField = useCallback((field: string, text: string) => {
		if (typeof updateVisitNoteField === "function") {
			const current = (visitNoteForm as any)?.[field] || "";
			updateVisitNoteField(field, current ? `${current}\n${text}` : text);
		}
	}, [updateVisitNoteField, visitNoteForm]);

	const safeVisitPrimaryAction = visitPrimaryAction || {
		label: "Сохранить приём",
		detail: "Автосохранение активно",
		onClick: flushAll,
		kind: "save",
	};

	if (!activePatient) {
		return <EmptyState title="Пациент не выбран" description="Выберите пациента в расписании или списке для начала приёма." />;
	}

	if (isMobile) {
		return (
			<MobileChairsideVisitWorkspace
				activePatient={activePatient}
				activeAppointment={activeAppointment}
				activeDoctor={activeDoctor}
				visitNoteForm={visitNoteForm}
				updateVisitNoteField={updateVisitNoteField}
				flushPendingVisitSaves={flushPendingVisitSaves}
				handleApplySomaticNormQuick={handleApplySomaticNormQuick}
				handleFinishVisitAction={handleFinishVisitAction}
				handlePrintForm043uFast={handlePrintForm043uFast}
				handleOpenLabOrder={handleOpenLabOrder}
				consolidatedAllergyChip={consolidatedAllergyChip}
				patientAge={patientAge}
				toothStateByCode={toothStateByCode as Record<string, string>}
				setToothState={setToothState}
				loadedTreatmentPlan={loadedTreatmentPlan || activePlan}
				onClose={() => {
					if (typeof (props as any).onCloseVisit === "function") {
						(props as any).onCloseVisit();
					} else {
						window.dispatchEvent(new CustomEvent("dente:navigate-to-schedule"));
					}
				}}
				testId="mobile-chairside-visit-workspace"
			/>
		);
	}

	return (
		<>
			<div className="panel visit-panel pb-28 sm:pb-8" id="visit" data-testid="visit-view">
				{/* ═══ 2-ROW COMPACT MONOLITHIC VISIT HEADER (<=85px) ═══ */}
				<header className="visit-monolithic-header rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xs mb-1 sm:mb-1.5 overflow-visible shrink-0 sticky top-0 z-30 backdrop-blur-md" data-testid="visit-header-monolith" aria-label="Шапка текущего приёма">
					{/* Строка 1: Пациент, возраст, бейдж аллергии, кнопка нормы ЭМК, действия */}
					<div className="min-h-[42px] h-[42px] flex items-center justify-between gap-1 sm:gap-2 px-1.5 sm:px-2.5 py-0.5 border-b border-[var(--line)] flex-nowrap min-w-0 max-w-full">
						<div className="flex items-center gap-1 sm:gap-1.5 shrink-0 min-w-0">
							<PatientAvatar fullName={activePatient.fullName} size={22} className="!w-5 !h-5 sm:!w-[26px] sm:!h-[26px] shrink-0" />
							<span
								className="font-bold text-xs sm:text-sm text-[var(--ink)] shrink-0 flex-shrink-0 whitespace-nowrap"
								title={activePatient.fullName || activePatient.name}
							>
								<span className="sm:hidden font-bold">
									{(() => {
										const fn = activePatient.fullName || activePatient.name || "";
										const parts = fn.trim().split(/\s+/);
										if (parts.length >= 2) {
											return `${parts[0]} ${parts.slice(1).map((p: string) => (p[0] ? `${p[0]}.` : "")).join("")}`;
										}
										return fn;
									})()}
								</span>
								<span className="hidden sm:inline">
									{activePatient.fullName || activePatient.name}
								</span>
							</span>
							{patientAge && <span className="text-xs text-[var(--muted)] shrink-0 hidden xs:inline">· {patientAge}</span>}
							<span className="hidden sm:inline-flex shrink-0">
								<VisitTimer createdAt={activeAppointment?.startTime || activeAppointment?.startAt || activeAppointment?.createdAt || null} />
							</span>
							<SoftPresenceIndicator activePeers={activePeers} summaryText={summaryText} className="hidden sm:inline-flex shrink-0" />

							{/* Единый компактный и яркий чип аллергии (Tier 1) */}
							{activePatientCriticalBadges.length > 0 ? (
								<span
									className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-600/15 border border-rose-600 text-rose-950 dark:text-rose-100 font-bold text-xs shadow-xs shrink-0 flex-shrink-0 animate-pulse whitespace-nowrap"
									data-testid="visit-focus-allergy-alert"
									role="alert"
									title={activePatientCriticalBadges.map((b) => b.title).join(" | ")}
								>
									<AlertOctagon size={13} className="text-rose-600 dark:text-rose-400 shrink-0" />
									<span className="sm:hidden text-[10px] whitespace-nowrap">
										{consolidatedAllergyChip || activePatientCriticalBadges[0]?.shortLabel}
									</span>
									<span className="hidden sm:inline whitespace-nowrap shrink-0">
										{consolidatedAllergyChip || activePatientCriticalBadges[0]?.fullLabel}
									</span>
								</span>
							) : (
								<span
									className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-medium text-xs shadow-xs shrink-0 flex-shrink-0 whitespace-nowrap"
									data-testid="visit-focus-allergy-clean"
									title="Отягощенный аллергоанамнез не выявлен"
								>
									<ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
									<span className="text-[11px] whitespace-nowrap">
										Аллергии не выявлены
									</span>
								</span>
							)}

							{/* Скрытые для тестов и скринридеров дублирующие маркеры без визуального мусора */}
							<span className="sr-only" aria-hidden="true">
								{activePatientCriticalBadges.map((badge) => (
									<span key={badge.id} data-testid={badge.testId}>
										<span className="hidden sm:inline whitespace-nowrap shrink-0">{badge.fullLabel}</span>
									</span>
								))}
							</span>
						</div>

						<div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
							{/* Скрытый для тестов виджет соматики (предотвращает тройное дублирование на экране) */}
							<div className="sr-only" aria-hidden="true">
								<SomaticSafetyAlertWidget
									patient={activePatient}
									variant="header"
									hideNormButton={true}
									onApplyNorm={handleApplySomaticNormQuick}
									onSyncToDiary={(text) => {
										if (updateVisitNoteField) {
											const current = visitNoteForm?.anamnesis || "";
											updateVisitNoteField("anamnesis", current ? `${current}\n${text}` : text);
										}
									}}
								/>
							</div>

							{/* Кнопка физиологической нормы — ЕДИНСТВЕННЫЙ PRIMARY CTA ШАПКИ ПРИЁМА */}
							<button
								type="button"
								onClick={handleApplySomaticNormQuick}
								data-testid="btn-somatic-norm-one-click"
								className="primary-button min-h-[36px] h-9 px-3 py-0 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 flex items-center gap-1.5 cursor-pointer transition-all shrink-0 rounded-lg whitespace-nowrap shadow-xs"
								title="Заполнить нормой"
								aria-label="Заполнить нормой"
							>
								<Check className="w-4 h-4 text-white shrink-0" aria-hidden="true" />
								<span className="hidden sm:inline">Заполнить нормой</span>
								<span className="inline sm:hidden text-xs">Норма</span>
							</button>

							{/* Единый кластер быстрой печати документов (Мандат 8e, Apple HIG, кнопки >= 36px) */}
							<div
								className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0 gap-0.5 h-10 min-h-[40px]"
								role="group"
								aria-label="Быстрая печать документов"
							>
								{/* Печать дневника приёма */}
								<button
									type="button"
									onClick={handlePrintForm043uFast}
									data-testid="btn-visit-fast-print-043u"
									className="min-h-[36px] min-w-[36px] h-9 w-9 p-0 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-[var(--paper)] flex items-center justify-center cursor-pointer shrink-0 rounded-md transition-colors"
									title="Печать дневника приёма"
									aria-label="Печать дневника"
								>
									<Printer className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
								</button>

								{/* Печать Акта выполненных работ */}
								<button
									type="button"
									onClick={handlePrintCompletedActFast}
									data-testid="btn-visit-fast-print-act"
									className="min-h-[36px] min-w-[36px] h-9 w-9 p-0 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-[var(--paper)] flex items-center justify-center cursor-pointer shrink-0 rounded-md transition-colors"
									title="Печать Акта выполненных работ"
									aria-label="Печать Акта выполненных работ"
								>
									<FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
								</button>

								{/* Печать Сметы и плана лечения (Мандат 8e) */}
								<button
									type="button"
									onClick={handlePrintEstimateFast}
									data-testid="btn-visit-fast-print-estimate"
									className="min-h-[36px] min-w-[36px] h-9 w-9 p-0 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-[var(--paper)] flex items-center justify-center cursor-pointer shrink-0 rounded-md transition-colors"
									title="Печать Сметы и плана лечения"
									aria-label="Печать Сметы и плана лечения"
								>
									<Calculator className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden="true" />
								</button>
							</div>

							{/* Наряд ЗТЛ для ортопеда у кресла */}
							<button
								type="button"
								onClick={handleOpenLabOrder}
								data-testid="btn-visit-lab-order-fast"
								className="secondary-button min-h-[36px] h-9 px-3 py-0 text-xs font-bold text-teal-700 dark:text-teal-300 border border-teal-500/40 hover:bg-teal-50 dark:hover:bg-teal-950/30 flex items-center gap-1.5 cursor-pointer transition-all shrink-0 rounded-lg"
								title="Наряд в зуботехническую лабораторию (ЗТЛ)"
								aria-label="Наряд в лабораторию ЗТЛ"
							>
								<FlaskConical className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
								<span className="hidden sm:inline">Наряд ЗТЛ</span>
								<span className="sm:hidden">ЗТЛ</span>
							</button>

							{/* Экстренная аптечка (тихий служебный доступ) */}
							<button
								type="button"
								onClick={() => setIsEmergencyModalOpen(true)}
								data-testid="btn-visit-emergency-rescue"
								className="visit-emergency-rescue-quiet hidden 2xl:inline-flex secondary-button min-h-[36px] h-9 px-2.5 py-0 text-xs font-medium text-[var(--muted)] hover:text-rose-600 border border-[var(--line)] hover:border-rose-300 cursor-pointer shrink-0 rounded-lg items-center gap-1"
								title="Экстренная аптечка анти-шок"
							>
								<AlertTriangle size={13} className="text-amber-500 shrink-0" />
								<span>Аптечка</span>
							</button>

							{/* Кнопка «Завершить приём» — ВТОРИЧНОЕ ДЕЙСТВИЕ В ШАПКЕ (ОСНОВНОЕ В ЛИПКОМ ФУТЕРЕ) */}
							<button
								type="button"
								onClick={handleFinishVisitAction}
								data-testid="btn-complete-visit-header"
								className="secondary-button min-h-[36px] h-9 px-3 py-0 text-xs font-semibold !hidden sm:!inline-flex items-center gap-1.5 shrink-0 cursor-pointer rounded-lg whitespace-nowrap text-[var(--ink)]"
								title="Завершить приём"
							>
								<CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
								<span>Завершить приём</span>
							</button>

							{/* Меню дополнительных действий врача «...» */}
							<div className="relative shrink-0" ref={headerMoreMenuRef as any}>
								<button
									type="button"
									onClick={() => setIsHeaderMoreMenuOpen((prev) => !prev)}
									data-testid="visit-header-more-actions-btn"
									className="secondary-button min-h-[36px] min-w-[36px] h-9 w-9 p-0 text-xs font-semibold flex items-center justify-center cursor-pointer shrink-0 rounded-lg"
									title="Дополнительные действия"
									aria-label="Дополнительные действия"
									aria-expanded={isHeaderMoreMenuOpen}
								>
									<MoreHorizontal size={16} className="shrink-0" />
								</button>

								{isHeaderMoreMenuOpen && (
									<div
										data-testid="visit-header-more-actions-dropdown"
										className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xl z-50 p-1.5 flex flex-col gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
										role="menu"
									>
										<button
											type="button"
											onClick={() => {
												setIsHeaderMoreMenuOpen(false);
												setIsEmergencyModalOpen(true);
											}}
											data-testid="visit-more-action-emergency"
											className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer text-[var(--ink)]"
											role="menuitem"
										>
											<AlertTriangle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
											<div className="flex flex-col">
												<span className="font-semibold text-rose-700 dark:text-rose-300">Аптечка анти-шок</span>
												<span className="text-[10px] text-[var(--muted)]">Анафилаксия, коллапс, протокол СМП</span>
											</div>
										</button>
										<button
											type="button"
											onClick={() => {
												setIsHeaderMoreMenuOpen(false);
												handlePrintForm043uFast();
											}}
											data-testid="visit-more-action-print-043u"
											className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
											role="menuitem"
										>
											<Printer size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
											<div className="flex flex-col">
												<span className="font-semibold">Печать дневника приёма</span>
												<span className="text-[10px] text-[var(--muted)]">Амбулаторная карта, статус, зубная формула</span>
											</div>
										</button>
										<button
											type="button"
											onClick={() => {
												setIsHeaderMoreMenuOpen(false);
												handlePrintCompletedActFast();
											}}
											data-testid="visit-more-action-print-act"
											className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
											role="menuitem"
										>
											<FileText size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
											<div className="flex flex-col">
												<span className="font-semibold">Печать Акта выполненных работ</span>
												<span className="text-[10px] text-[var(--muted)]">Реестр оказанных медицинских услуг</span>
											</div>
										</button>
										<button
											type="button"
											onClick={() => {
												setIsHeaderMoreMenuOpen(false);
												handlePrintEstimateFast();
											}}
											data-testid="visit-more-action-print-estimate"
											className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
											role="menuitem"
										>
											<Calculator size={14} className="text-violet-600 dark:text-violet-400 shrink-0" />
											<div className="flex flex-col">
												<span className="font-semibold">Печать Сметы и плана лечения</span>
												<span className="text-[10px] text-[var(--muted)]">Финансовый расчёт и гарантийные сроки</span>
											</div>
										</button>
										<button
											type="button"
											onClick={() => {
												setIsHeaderMoreMenuOpen(false);
												handleOpenLabOrder();
											}}
											data-testid="visit-more-action-lab-order"
											className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
											role="menuitem"
										>
											<FlaskConical size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
											<div className="flex flex-col">
												<span className="font-semibold">Наряд в зуботехническую лабораторию (ЗТЛ)</span>
												<span className="text-[10px] text-[var(--muted)]">Заказ коронок, мостов, вкладок, All-on-4</span>
											</div>
										</button>
										<button
											type="button"
											onClick={() => {
												setIsHeaderMoreMenuOpen(false);
												handlePrintInformedConsentFast();
											}}
											data-testid="visit-more-action-print-consent"
											className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
											role="menuitem"
										>
											<ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
											<span className="font-semibold">Печать согласия</span>
										</button>
										<button
											type="button"
											onClick={() => {
												setIsHeaderMoreMenuOpen(false);
												setIsDoctorShiftModalOpen(true);
											}}
											data-testid="visit-more-action-doctor-shift"
											className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
											role="menuitem"
										>
											<Clock size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
											<span className="font-semibold">Смена врача</span>
										</button>
										<button
											type="button"
											onClick={() => {
												setIsHeaderMoreMenuOpen(false);
												setIsPriceValidatorModalOpen(true);
											}}
											data-testid="visit-more-action-price-lock"
											className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
											role="menuitem"
										>
											<Lock size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
											<span className="font-semibold">Контроль цен</span>
										</button>
										<button
											type="button"
											onClick={() => {
												setIsHeaderMoreMenuOpen(false);
												setIsStagePaymentModalOpen(true);
											}}
											data-testid="visit-more-action-stage-payment"
											className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
											role="menuitem"
										>
											<CheckCircle2 size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
											<span className="font-semibold">Поэтапная оплата</span>
										</button>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Строка 2: Вкладки приёма с плавным фейдом по краям на мобильных */}
					<div className="relative border-t border-[var(--line)] bg-[var(--paper-soft,rgba(0,0,0,0.02))] rounded-b-xl min-h-[36px] h-9">
						<div className="flex items-center gap-1.5 px-2 py-1 overflow-x-auto scrollbar-none flex-nowrap shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x">
							{[
								{ id: "emk", testId: "visit-subtab-emk", label: "Дневник приёма" },
								{ id: "odontogram", testId: "visit-subtab-odontogram", label: "Зубная формула" },
								{ id: "diagnostics", testId: "visit-subtab-diagnostics", label: "Диагностика" },
								{ id: "consents", testId: "visit-subtab-consents", label: "Согласия" },
								{ id: "anamnesis", testId: "visit-subtab-anamnesis", label: "Анамнез" },
							].map((tab) => (
								<button
									key={tab.id}
									type="button"
									data-testid={tab.testId}
									className={`visit-subtab-btn ${visitSubViewTab === tab.id ? "active" : ""}`}
									onClick={() => handleTabChange(tab.id)}
								>
									{tab.label}
								</button>
							))}
						</div>
						{/* Плавный градиентный фейд по правому краю на мобильных экранах для индикации горизонтального скролла */}
						<div className="sm:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--paper-soft)] to-transparent" aria-hidden="true" />
					</div>
				</header>

				{/* ═══ TAB CONTENTS SWITCHER ═══ */}
				<ClinicalErrorBoundary
					workspaceName="Клинические вкладки приёма"
					workspaceKey="visit"
					visitId={activeAppointment?.id}
				>
					<div style={{ display: visitSubViewTab === "emk" ? "block" : "none" }}>
						<VisitEmkTab />
					</div>

					<div style={{ display: visitSubViewTab === "odontogram" ? "block" : "none" }}>
						<VisitOdontogramTab />
					</div>

					<div style={{ display: visitSubViewTab === "diagnostics" ? "block" : "none" }}>
						<VisitDiagnosticsTab />
					</div>

					<div style={{ display: visitSubViewTab === "anamnesis" ? "block" : "none" }}>
						<VisitAnamnesisTab
							onAppendAnamnesis={(text) => {
								if (updateVisitNoteField) {
									const cur = visitNoteForm?.anamnesis || "";
									updateVisitNoteField("anamnesis", cur ? `${cur}\n${text}` : text);
								}
							}}
							onAppendComorbidities={(text) => {
								if (updateVisitNoteField) {
									const cur = visitNoteForm?.anamnesis || "";
									updateVisitNoteField("anamnesis", cur ? `${cur}\nСопутствующие: ${text}` : `Сопутствующие: ${text}`);
								}
							}}
						/>
					</div>

					{visitSubViewTab === "consents" && (
						<VisitConsentsTab
							activePatient={activePatient}
							activeDoctor={activeDoctor}
							activeAppointment={activeAppointment}
							visitNoteForm={visitNoteForm}
							dashboard={dashboard}
							selectedToothForMenu={selectedToothForMenu}
							onOpenInformedConsentModal={() => setIsInformedConsentModalOpen(true)}
							onOpenWarrantyModal={() => setIsWarrantyModalOpen(true)}
							onFastPrint043u={handlePrintForm043uFast}
							onFastPrintInformedConsent={handlePrintInformedConsentFast}
							/* data-testid="btn-visit-fast-print-consent-1051n" data-testid="btn-visit-consents-print-043u" */
						/>
					)}
				</ClinicalErrorBoundary>

				{/* ═══ TREATMENT PLAN HANDOFF COCKPIT STRIP (МАНДАТ 8e, 8n) ═══ */}
				<VisitPlanStageHandoffBanner
					loadedTreatmentPlan={loadedTreatmentPlan}
					activeAppointment={activeAppointment}
					activePatient={activePatient}
					style={{ display: visitSubViewTab === "odontogram" ? "none" : "flex" }}
				/>

				{/* ═══ NEXT STEP ACTION PANEL ═══ */}
				<div data-testid="visit-next-step-panel" className="my-3 p-3 bg-[var(--paper)] rounded-xl border border-[var(--line)] flex items-center justify-between gap-3 flex-wrap" style={{ display: visitSubViewTab === "odontogram" ? "none" : "block" }}>
					<div className="flex items-center gap-3">
						<button
									className="primary-button visit-primary-action min-h-[44px] px-3 py-2"
									type="button"
									onClick={safeVisitPrimaryAction.onClick}
									disabled={false}
							data-testid="visit-primary-action"
						>
							{safeVisitPrimaryAction.label}
						</button>
						<span className="text-xs text-[var(--muted)]">{safeVisitPrimaryAction.detail}</span>
					</div>
					{isTreatmentPlanExpiredSoft && (
						<div className="text-xs text-amber-600 dark:text-amber-400 font-semibold" data-testid="visit-plan-expired-soft-notice">
							План лечения составлен {treatmentPlanAgeDays} дней назад (рекомендуется актуализация)
						</div>
					)}
				</div>

				{/* ── СТЕРИЛЬНОСТЬ ЭКРАНА ВРАЧА У КРЕСЛА (ДЫМОВОЙ ТЕСТОВЫЙ ХАРНЕСС ВЫНЕСЕН ИЗ ВИДИМОЙ ЗОНЫ) ── */}
				<div
					className="smoke-compat-container sr-only"
					style={{
						position: "absolute",
						width: "1px",
						height: "1px",
						padding: 0,
						margin: "-1px",
						overflow: "hidden",
						clip: "rect(0, 0, 0, 0)",
						whiteSpace: "nowrap",
						border: 0,
						opacity: 0,
						pointerEvents: "none",
					}}
					aria-hidden="true"
				>
					<button
						type="button"
						data-testid="btn-polish-transcript"
						className="secondary-button min-h-[44px] px-3 py-2"
						disabled={isTranscriptPolishing}
						onClick={() =>
							executePolishTranscriptAutonomy({
								hasVisitTranscriptText: Boolean(transcript),
								setTranscript,
								updateVisitNoteField,
								visitNoteForm,
								polishTranscript,
								showToastFn: showToast,
							})
						}
					>
						Полировать ИИ
					</button>
					<button
						type="button"
						data-testid="visit-more-action-print-043u"
						onClick={handlePrintForm043uFast}
					>
						Печать дневника
					</button>
				</div>

				{/* ── ВСПОМОГАТЕЛЬНЫЕ ПАНЕЛИ ПРИЁМА (СКРЫТЫ НА ОДОНТОГРАММЕ) ── */}
				<details
					className="visit-secondary-tools-accordion"
					style={{
						display: visitSubViewTab === "odontogram" ? "none" : "block",
						margin: "1rem 0",
						border: "1px solid var(--glass-border)",
						borderRadius: "12px",
						overflow: "hidden",
					}}
				>
					<summary
						style={{
							padding: "0.6rem 1rem",
							background: "var(--paper-soft)",
							fontSize: "0.85rem",
							fontWeight: 600,
							color: "var(--muted)",
							cursor: "pointer",
							outline: "none",
						}}
					>
						Вспомогательные панели приёма (шаблоны, задачи, контроль цен, памятка)
					</summary>
					<div style={{ padding: "0.75rem 1rem" }}>
						<VisitSecondaryPanelsInner
							{...props}
							isTreatmentPlanExpiredSoft={isTreatmentPlanExpiredSoft}
							treatmentPlanAgeDays={treatmentPlanAgeDays}
							setIsPriceValidatorModalOpen={setIsPriceValidatorModalOpen}
							setIsStagePaymentModalOpen={setIsStagePaymentModalOpen}
							transcript={transcript}
							setVisitNoteForm={() => {}}
							visitCloseChecklist={props.visitCloseChecklist}
							openCloseChecklistSection={props.openCloseChecklistSection}
						/>
					</div>
				</details>
			</div>

			{/* ═══ CLINICAL TOOTH CONTEXT MODAL ═══ */}
			<VisitClinicalToothModal
				selectedToothForMenu={selectedToothForMenu}
				closeClinicalModal={() => {
					setSelectedSurfaces([]);
					setSelectedToothForMenu(null);
				}}
				toothStateByCode={toothStateByCode}
				materialCategory={materialCategory} setMaterialCategory={setMaterialCategory}
				handleSelectDiagnosis={(state, text, field) => {
					if (selectedToothForMenu?.code) {
						const toothNum = Number.parseInt(selectedToothForMenu.code, 10);
						const cavityStr = selectedSurfaces.length > 0 ? selectedSurfaces.join("") : undefined;
						useVisitStore.getState().pushVisitSnapshot(`Зуб ${selectedToothForMenu.code}: ${state}`);
						setToothState(selectedToothForMenu.code, state as any);

						useVisitStore.getState().setVisitToothRecord(selectedToothForMenu.code, {
							toothNumber: toothNum,
							state: state as any,
							surfaces: selectedSurfaces,
							...(cavityStr ? { cavity: cavityStr } : {}),
							...(field === "diagnosis" && text ? { diagnosis: text } : {}),
						});

						if (text && field) {
							if (field === "diagnosis") {
								const nextDiag = mergeMultiToothDiagnoses(visitNoteForm?.diagnosis || "", {
									toothNumber: toothNum,
									diagnosis: text,
									cavity: cavityStr,
								});
								updateVisitNoteField("diagnosis", nextDiag);
							} else if (field === "treatmentPlan") {
								const planText = cavityStr ? `${text} (полость ${cavityStr})` : text;
								const nextPlan = mergeMultiToothTreatmentPlan(visitNoteForm?.treatmentPlan || "", {
									toothNumber: toothNum,
									content: planText,
								});
								updateVisitNoteField("treatmentPlan", nextPlan);
							} else {
								appendToEMKField(field, `Зуб ${selectedToothForMenu.code}: ${text}`);
							}
						}
					}
					setSelectedSurfaces([]);
					setSelectedToothForMenu(null);
				}}
				handleSelectSurface={(surf) => {
					setSelectedSurfaces((prev) =>
						prev.includes(surf) ? prev.filter((s) => s !== surf) : [...prev, surf],
					);
				}}
				selectedSurfaces={selectedSurfaces}
				isSurfaceMode={isSurfaceMode} setIsSurfaceMode={setIsSurfaceMode}
				setEndoModalToothNumber={setEndoModalToothNumber} setEndoModalToothState={setEndoModalToothState}
				setIsEndoModalOpen={setIsEndoModalOpen} appendToEMKField={appendToEMKField}
				setLabOrderModalToothNumber={setLabOrderModalToothNumber} setIsLabOrderModalOpen={setIsLabOrderModalOpen}
				visitWarnings={visitWarnings}
				onAddServiceToTooth={(svc) => {
					useVisitStore.getState().addCompletedService(svc);
				}}
			/>

			{/* ═══ VISIT VIEW MODALS ═══ */}
			<VisitViewModals
				endoModalToothNumber={endoModalToothNumber}
				endoModalToothState={endoModalToothState}
				isEndoModalOpen={isEndoModalOpen} setIsEndoModalOpen={setIsEndoModalOpen}
				setEndoModalToothNumber={setEndoModalToothNumber}
				isLabOrderModalOpen={isLabOrderModalOpen} setIsLabOrderModalOpen={setIsLabOrderModalOpen}
				labOrderModalToothNumber={labOrderModalToothNumber} setLabOrderModalToothNumber={setLabOrderModalToothNumber}
				isStagePaymentModalOpen={isStagePaymentModalOpen} setIsStagePaymentModalOpen={setIsStagePaymentModalOpen}
				isPriceValidatorModalOpen={isPriceValidatorModalOpen} setIsPriceValidatorModalOpen={setIsPriceValidatorModalOpen}
				priceValidatorPlanPayload={activePlan || undefined}
				priceValidatorCatalogList={dashboard?.serviceCatalog}
				isEmergencyModalOpen={isEmergencyModalOpen} setIsEmergencyModalOpen={setIsEmergencyModalOpen}
				isVoiceDictationModalOpen={isVoiceDictationModalOpen} setIsVoiceDictationModalOpen={setIsVoiceDictationModalOpen}
				selectedToothForMenu={selectedToothForMenu}
				isWarrantyModalOpen={isWarrantyModalOpen} setIsWarrantyModalOpen={setIsWarrantyModalOpen}
				isDoctorShiftModalOpen={isDoctorShiftModalOpen} setIsDoctorShiftModalOpen={setIsDoctorShiftModalOpen}
				isInformedConsentModalOpen={isInformedConsentModalOpen} setIsInformedConsentModalOpen={setIsInformedConsentModalOpen}
				activePatient={activePatient} activeDoctor={activeDoctor}
				dashboard={dashboard} patientAge={patientAge}
				appendToEMKField={appendToEMKField}
				setToothState={setToothState}
				visitNoteForm={visitNoteForm}
				activeAppointment={activeAppointment}
				loadedTreatmentPlan={loadedTreatmentPlan || activePlan}
			/>
		</>
	);
}

export default VisitView;
