import React, { useCallback, useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { showToast } from "../../GlobalToast";
import { useSoftPresence } from "../../../hooks/useSoftPresence";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { useVisitStore } from "../../../store/visitStore";
import {
	mergeMultiToothDiagnoses,
	mergeMultiToothTreatmentPlan,
} from "../../../utils/clinicalTextSanitizer";
import { useIsMobile } from "../../../hooks/useIsMobile";
import {
	formatStageItemForBilling,
	buildStageMedicalDiaryText,
} from "../visitPlanStageHandoff";
import { calculateActivePatientCriticalBadges } from "./visitCriticalBadges";
import { executeApplySomaticNormAutonomy } from "./visitViewAutonomyActions";
import {
	executeFastPrint043u,
	executeFastPrintInformedConsent,
	executeFastPrintCompletedAct,
	executeFastPrintTreatmentPlanEstimate,
} from "./visitFastPrint";
import type { VisitLoadedTreatmentPlan, VisitViewProps } from "./types";
import {
	loadStoredTeethData,
	saveStoredTeethData,
} from "../../odontogram/odontogramStorage";
import { dispatchOdontogramSoapAndBundle } from "../../odontogram/odontogramModuleConstants";
import type { ToothData, ToothState } from "../../odontogram/ToothChart";
import type { VisitToothUiState } from "../../../store/visit/types";
import { completeClinicalVisitAndAssembleEstimate } from "../clinicalVisitWorkflow";
import { assembleVisitStoreCompletedServices } from "../useVisitCompletion";

export function useVisitViewState(rawProps?: Partial<VisitViewProps>) {
	const appLogic = (useAppLogicContext() as Partial<VisitViewProps>) || {};
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
		setSelectedPatientId,
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
	const [selectedToothForMenu, setSelectedToothForMenu] = useState<{
		code: string;
		label?: string;
		state?: string;
	} | null>(null);
	const [materialCategory, setMaterialCategory] = useState<string | null>(null);
	const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>([]);
	const [isSurfaceMode, setIsSurfaceMode] = useState<boolean>(false);
	const [isQueueCockpitForced, setIsQueueCockpitForced] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return (
			window.location.hash.includes("queue") ||
			window.location.hash.includes("cockpit") ||
			window.location.search.includes("cockpit=true") ||
			window.location.search.includes("queue=true")
		);
	});

	useEffect(() => {
		const handleHashOrStateChange = () => {
			if (
				window.location.hash.includes("queue") ||
				window.location.hash.includes("cockpit") ||
				window.location.search.includes("cockpit=true") ||
				window.location.search.includes("queue=true")
			) {
				setIsQueueCockpitForced(true);
			}
		};
		window.addEventListener("hashchange", handleHashOrStateChange);
		window.addEventListener("popstate", handleHashOrStateChange);
		return () => {
			window.removeEventListener("hashchange", handleHashOrStateChange);
			window.removeEventListener("popstate", handleHashOrStateChange);
		};
	}, []);

	// Modals state
	const [endoModalToothNumber, setEndoModalToothNumber] = useState<
		number | string | null
	>(null);
	const [endoModalToothState, setEndoModalToothState] = useState<string>("idle");
	const [labOrderModalToothNumber, setLabOrderModalToothNumber] = useState<
		number | string | null
	>(null);
	const [isEndoModalOpen, setIsEndoModalOpen] = useState(false);
	const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState(false);
	const [isStagePaymentModalOpen, setIsStagePaymentModalOpen] = useState(false);
	const [isPriceValidatorModalOpen, setIsPriceValidatorModalOpen] = useState(false);
	const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
	const [isVoiceDictationModalOpen, setIsVoiceDictationModalOpen] = useState(false);
	const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
	const [isDoctorShiftModalOpen, setIsDoctorShiftModalOpen] = useState(false);
	const [isInformedConsentModalOpen, setIsInformedConsentModalOpen] = useState(false);
	const [isVisiographComparisonModalOpen, setIsVisiographComparisonModalOpen] = useState(false);
	const [isHeaderMoreMenuOpen, setIsHeaderMoreMenuOpen] = useState(false);

	useEffect(() => {
		const handleOpenComp = () => setIsVisiographComparisonModalOpen(true);
		window.addEventListener("dente-open-visiograph-comparison", handleOpenComp);
		return () => window.removeEventListener("dente-open-visiograph-comparison", handleOpenComp);
	}, []);

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
		const handleLabOrderEvent = (e: Event) => {
			const customEvent = e as CustomEvent<{
				toothNumber?: number | string;
				toothFdi?: number | string;
			}>;
			const customTooth =
				customEvent?.detail?.toothNumber || customEvent?.detail?.toothFdi;
			handleOpenLabOrder(customTooth);
		};
		window.addEventListener("dente-open-lab-order-modal", handleLabOrderEvent);
		return () => {
			window.removeEventListener("dente-open-lab-order-modal", handleLabOrderEvent);
		};
	}, [handleOpenLabOrder]);

	const headerMoreMenuRef = React.useRef<HTMLDivElement | null>(null);

	const [loadedTreatmentPlan, setLoadedTreatmentPlan] =
		useState<VisitLoadedTreatmentPlan | null>(null);

	// Production PostgreSQL 18: загрузка согласованного плана лечения пациента
	useEffect(() => {
		if (!activePatient?.id) {
			setLoadedTreatmentPlan(null);
			return;
		}
		const patientId = activePatient.id;
		let cancelled = false;
		async function fetchPatientTreatmentPlan() {
			try {
				const res = await fetch(`/api/patients/${patientId}/treatment-plans`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const data = await res.json();
				if (cancelled) return;
				if (data?.success && Array.isArray(data.plans) && data.plans.length > 0) {
					const plan =
						data.plans.find(
							(p: VisitLoadedTreatmentPlan) =>
								p.status === "Approved" || p.status === "Active",
						) || data.plans[0];
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

				// Перенос каждой услуги в стор визита, одонтограмму и биллинг у кресла
				const store = useVisitStore.getState();
				const formattedItems = stageItems.map((it: Record<string, unknown>) =>
					formatStageItemForBilling(it),
				);
				for (const [idx, billingItem] of formattedItems.entries()) {
					const toothNum =
						(billingItem as { toothNumber?: number }).toothNumber ??
						(billingItem.toothCode ? Number.parseInt(String(billingItem.toothCode), 10) || undefined : undefined);
					const alreadyInStore = store.completedServices.some(
						(s) =>
							s.code804n === billingItem.code804n &&
							String(s.toothNumber ?? s.toothCode ?? "") === String(toothNum ?? billingItem.toothCode ?? ""),
					);
					if (!alreadyInStore) {
						store.addCompletedService({
							serviceId: String(stageItems[idx]?.id || `stage-srv-${Date.now()}-${idx}`),
							code804n: billingItem.code804n,
							name: billingItem.title,
							priceRub: billingItem.unitPriceRub,
							priceKopecks: Math.round(billingItem.unitPriceRub * 100),
							quantity: billingItem.quantity || 1,
							category: String(stageItems[idx]?.category || "therapy"),
							...(toothNum !== undefined ? { toothNumber: toothNum } : {}),
							...(billingItem.toothCode ? { toothCode: String(billingItem.toothCode) } : {}),
						});
					}
					window.dispatchEvent(
						new CustomEvent("dente-add-billing-item", {
							detail: {
								item: billingItem,
							},
						}),
					);
				}
				store.applyServicesToToothState({
					patientId: activePatient?.id,
					services: formattedItems.map((b) => ({
						code804n: b.code804n,
						title: b.title,
						price: b.unitPriceRub,
						toothNumber: (b as { toothNumber?: number }).toothNumber,
						toothCode: b.toothCode,
					})),
				});
				showToast(
					`Этап «${stageTitle}» взят в работу визита (${stageItems.length} услуг)`,
					"success",
					4000,
				);
			}
		};

		window.addEventListener("dente-take-stage-to-visit", handleTakeStage);
		return () => window.removeEventListener("dente-take-stage-to-visit", handleTakeStage);
	}, [updateVisitNoteField, activePatient?.id]);

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
			const cleaned = allergyStr.trim().replace(/^аллерги[яи][: \t-]*/i, "").replace(/^на\s+/i, "").trim();
			if (cleaned) parts.push(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
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
		const scenarios = dashboard?.treatmentPlanScenarios || [];
		const patientScenarios = scenarios.filter((s) => s.patientId === activePatient?.id);
		if (patientScenarios.length > 0) return patientScenarios[0];
		const items = dashboard?.treatmentPlanItems || [];
		const patientItems = items.filter((i) => i.patientId === activePatient?.id);
		if (patientItems.length > 0) return patientItems[0];
		return null;
	}, [dashboard?.treatmentPlanScenarios, dashboard?.treatmentPlanItems, activePatient?.id]);

	const treatmentPlanAgeDays = useMemo(() => {
		if (!activePlan) return 0;
		const rawDate =
			("createdAt" in activePlan ? activePlan.createdAt : undefined) ||
			("plannedAt" in (activePlan as Record<string, unknown>)
				? String((activePlan as Record<string, unknown>).plannedAt)
				: undefined) ||
			("completedAt" in activePlan ? activePlan.completedAt : undefined) ||
			undefined;
		if (!rawDate) return 0;
		const createdTime = new Date(String(rawDate)).getTime();
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
		if (typeof flushPendingVisitSaves === "function") await flushPendingVisitSaves();
	}, [flushPendingVisitSaves]);

	const handleFinishVisitAction = useCallback(async () => {
		if (typeof updateVisitNoteField === "function") {
			if (!visitNoteForm?.diagnosis) updateVisitNoteField("diagnosis", "Z01.2 Стоматологическое обследование (Здоров)");
			if (!visitNoteForm?.treatmentPlan) updateVisitNoteField("treatmentPlan", "Осмотр полости рта проведен, патологий не выявлено. Полость рта здорова, гигиена удовлетворительная.");
			if (!visitNoteForm?.complaint) updateVisitNoteField("complaint", "Жалоб на момент осмотра не предъявляет.");
			if (!visitNoteForm?.anamnesis) updateVisitNoteField("anamnesis", "Соматически здоров. Аллергоанамнез не отягощен.");
			if (!visitNoteForm?.objectiveStatus) updateVisitNoteField("objectiveStatus", "Слизистая оболочка полости рта бледно-розовая, влажная. Зубные ряды интактны.");
		}
		if (typeof flushPendingVisitSaves === "function") {
			await flushPendingVisitSaves();
		}

		if (typeof window !== "undefined") {
			const triggerDetail: { promise?: Promise<boolean>; handled?: boolean } = {};
			window.dispatchEvent(
				new CustomEvent("dente:trigger-complete-visit", { detail: triggerDetail }),
			);

			if (triggerDetail.handled && triggerDetail.promise) {
				const ok = await triggerDetail.promise;
				if (ok && window.location.hash !== "#finance") {
					window.location.hash = "finance";
				}
				return;
			}

			try {
				// Если вкладка ЭМК не смонтирована, собираем реальную смету визита и сохраняем её до перехода в кассу
				const effectiveVisitId =
					activeAppointment?.id ||
					(dashboard as { activeVisit?: { id?: string } })?.activeVisit?.id ||
					"no-active-visit";
				const additionalServices = assembleVisitStoreCompletedServices();
				const result = await completeClinicalVisitAndAssembleEstimate({
					visitId: effectiveVisitId,
					patientId: activePatient?.id || "pat-default",
					patientName: activePatient?.fullName || activePatient?.name || "Пациент",
					doctorName:
						activeDoctor?.fullName ||
						(dashboard as { activeDoctor?: { fullName?: string } })?.activeDoctor?.fullName ||
						"Лечащий врач",
					diary: {
						anamnesis: visitNoteForm?.anamnesis || "Соматически здоров. Аллергоанамнез не отягощен.",
						statusLocalis: visitNoteForm?.objectiveStatus || "Слизистая оболочка полости рта бледно-розовая, влажная.",
						diagnosisIcd10: visitNoteForm?.diagnosis || "Z01.2 Стоматологическое обследование (Здоров)",
						treatmentDescription: visitNoteForm?.treatmentPlan || "План оздоровления и гигиены",
					},
					additionalServices,
				});

				const pendingCheckout = {
					patientId: activePatient?.id || "pat-default",
					patientName: activePatient?.fullName || activePatient?.name || "Пациент",
					visitId: effectiveVisitId,
					services: result.items,
					totalDueRub: result.totalNetRub,
					receiptNumber: result.receiptNumber,
					timestamp: Date.now(),
				};

				try {
					sessionStorage.setItem("dente_pending_checkout", JSON.stringify(pendingCheckout));
					localStorage.setItem("dente_pending_checkout", JSON.stringify(pendingCheckout));
				} catch (err) {
					console.warn("[VisitViewState] Failed to write pending checkout to storage:", err);
				}

				window.dispatchEvent(
					new CustomEvent("dente:pending-checkout-ready", { detail: pendingCheckout }),
				);
				if (window.location.hash !== "#finance") {
					window.location.hash = "finance";
				}
			} catch (err) {
				console.error("[VisitViewState] Ошибка расчёта сметы при закрытии приёма:", err);
				showToast("Не удалось сформировать смету приёма. Повторите попытку.", "error", 5000);
			}
		}
	}, [flushPendingVisitSaves, updateVisitNoteField, visitNoteForm, activePatient, activeAppointment, activeDoctor, dashboard, showToast]);

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
			const current =
				((visitNoteForm as unknown) as Record<string, string | undefined>)?.[field] ||
				"";
			updateVisitNoteField(field, current ? `${current}\n${text}` : text);
		}
	}, [updateVisitNoteField, visitNoteForm]);

	const safeVisitPrimaryAction = visitPrimaryAction || {
		label: "Сохранить приём",
		detail: "Автосохранение активно",
		onClick: flushAll,
		kind: "save",
	};

	// ─── Автоподхват активного приёма смены (Continuity Intake) ───────────
	useEffect(() => {
		if (activePatient || isQueueCockpitForced) return;
		const selectFn = setSelectedPatientId || (appLogic as { setSelectedPatientId?: (id: string) => void })?.setSelectedPatientId;
		if (typeof selectFn !== "function") return;

		// 1. Приоритет: текущий активный визит в dashboard
		const activeVisitPatientId = (dashboard as { activeVisit?: { patientId?: string } })?.activeVisit?.patientId;
		if (activeVisitPatientId) {
			selectFn(activeVisitPatientId);
			return;
		}

		// 2. Визит со статусом in_chair / in_progress на сегодня
		const todayIso = (dashboard as { todayIso?: string })?.todayIso || new Date().toISOString().slice(0, 10);
		const inProgressApp = (dashboard?.appointments || []).find((a) => {
			const st = String(a.status || "").toLowerCase();
			const dt = (a.startsAt || "").slice(0, 10);
			return (!dt || dt === todayIso) && (st === "in_chair" || st === "in_progress");
		});
		if (inProgressApp?.patientId) {
			selectFn(inProgressApp.patientId);
			return;
		}

		// 3. Запланированная запись на сегодня
		const scheduledApp = (dashboard?.appointments || []).find((a) => {
			const dt = (a.startsAt || "").slice(0, 10);
			return (!dt || dt === todayIso) && a.patientId;
		});
		if (scheduledApp?.patientId) {
			selectFn(scheduledApp.patientId);
			return;
		}

		// 4. Первый пациент клиники из картотеки (Мандат 8e: ноль паралича)
		if (dashboard?.patients && dashboard.patients.length > 0 && dashboard.patients[0]?.id) {
			selectFn(dashboard.patients[0].id);
		}
	}, [activePatient, isQueueCockpitForced, dashboard, setSelectedPatientId, appLogic]);

	const handleToothDiagnosisSelect = useCallback((state: string, text?: string, field?: string) => {
		if (selectedToothForMenu?.code) {
			const toothNum = Number.parseInt(selectedToothForMenu.code, 10);
			const cavityStr = selectedSurfaces.length > 0 ? selectedSurfaces.join("") : undefined;
			useVisitStore.getState().pushVisitSnapshot(`Зуб ${selectedToothForMenu.code}: ${state}`);
			setToothState(selectedToothForMenu.code, state as ToothState);

			useVisitStore.getState().setVisitToothRecord(selectedToothForMenu.code, {
				toothNumber: toothNum,
				state: state as VisitToothUiState,
				surfaces: selectedSurfaces,
				...(cavityStr ? { cavity: cavityStr } : {}),
				...(field === "diagnosis" && text ? { diagnosis: text } : {}),
			});

			// Бесшовный мост в одонтограмму и сметчик (SSOT & Doctor Autonomy)
			if (activePatient?.id && Number.isFinite(toothNum)) {
				const existingTeeth = loadStoredTeethData(activePatient.id) ?? [];
				const updatedTeeth: ToothData[] = [...existingTeeth];
				const idx = updatedTeeth.findIndex((t) => t.toothNumber === toothNum);
				const nowIso = new Date().toISOString();
				const surfacesProp = selectedSurfaces.length > 0 ? { surfaces: selectedSurfaces } : {};
				if (idx >= 0 && updatedTeeth[idx]) {
					updatedTeeth[idx] = {
						...updatedTeeth[idx],
						toothNumber: toothNum,
						state: state as ToothState,
						...surfacesProp,
						updatedAt: nowIso,
					};
				} else {
					updatedTeeth.push({
						toothNumber: toothNum,
						state: state as ToothState,
						...surfacesProp,
						updatedAt: nowIso,
					});
				}

				saveStoredTeethData(activePatient.id, updatedTeeth, true);

				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-odontogram-update", {
							detail: {
								patientId: activePatient.id,
								states: updatedTeeth,
								teeth: updatedTeeth,
							},
						}),
					);
				}

				dispatchOdontogramSoapAndBundle({
					targets: [toothNum],
					state: state as ToothState,
					findings: [
						{
							toothNumber: toothNum,
							state: state as ToothState,
							...surfacesProp,
						},
					],
					patientId: activePatient.id,
				});
			}

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
	}, [selectedToothForMenu, selectedSurfaces, setToothState, activePatient, visitNoteForm, updateVisitNoteField, appendToEMKField]);

	const handleSelectSurface = useCallback((surf: string) => {
		setSelectedSurfaces((prev) =>
			prev.includes(surf) ? prev.filter((s) => s !== surf) : [...prev, surf],
		);
	}, []);

	const onAddServiceToTooth = useCallback(
		(
			svc: Parameters<
				ReturnType<typeof useVisitStore.getState>["addCompletedService"]
			>[0],
		) => {
			useVisitStore.getState().addCompletedService(svc);
		},
		[],
	);

	return {
		props,
		appLogic,
		activePatient,
		activeAppointment,
		activeDoctor,
		dashboard,
		transcript,
		setTranscript,
		hasVisitTranscriptText,
		isTranscriptPolishing,
		polishTranscript,
		updateVisitNoteField,
		visitNoteForm,
		flushPendingVisitSaves,
		toothRows,
		toothStateByCode,
		setToothState,
		draft,
		visitWarnings,
		visitPrimaryAction,
		setSelectedPatientId,
		activePeers,
		summaryText,
		isMobile,
		visitSubViewTab,
		setVisitSubViewTab,
		activeQuadrant,
		setActiveQuadrant,
		activeStamp,
		setActiveStamp,
		activeStampRef,
		selectedToothForMenu,
		setSelectedToothForMenu,
		materialCategory,
		setMaterialCategory,
		selectedSurfaces,
		setSelectedSurfaces,
		isSurfaceMode, setIsSurfaceMode,
		isQueueCockpitForced, setIsQueueCockpitForced,
		endoModalToothNumber, setEndoModalToothNumber,
		endoModalToothState, setEndoModalToothState,
		labOrderModalToothNumber, setLabOrderModalToothNumber,
		isEndoModalOpen, setIsEndoModalOpen,
		isLabOrderModalOpen, setIsLabOrderModalOpen,
		isStagePaymentModalOpen, setIsStagePaymentModalOpen,
		isPriceValidatorModalOpen, setIsPriceValidatorModalOpen,
		isEmergencyModalOpen, setIsEmergencyModalOpen,
		isVoiceDictationModalOpen, setIsVoiceDictationModalOpen,
		isWarrantyModalOpen, setIsWarrantyModalOpen,
		isDoctorShiftModalOpen, setIsDoctorShiftModalOpen,
		isInformedConsentModalOpen, setIsInformedConsentModalOpen,
		isVisiographComparisonModalOpen, setIsVisiographComparisonModalOpen,
		isHeaderMoreMenuOpen, setIsHeaderMoreMenuOpen,
		handleOpenLabOrder,
		headerMoreMenuRef,
		loadedTreatmentPlan,
		patientAge,
		activePatientCriticalBadges,
		consolidatedAllergyChip,
		handleApplySomaticNormQuick,
		activePlan,
		treatmentPlanAgeDays,
		isTreatmentPlanExpiredSoft,
		handlePrintForm043uFast,
		handlePrintInformedConsentFast,
		handlePrintCompletedActFast,
		handlePrintEstimateFast,
		flushAll,
		handleFinishVisitAction,
		handleTabChange,
		handleToothClick,
		appendToEMKField,
		safeVisitPrimaryAction,
		handleToothDiagnosisSelect,
		handleSelectSurface,
		onAddServiceToTooth,
	};
}
