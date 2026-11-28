/**
 * apps/web/src/components/lab/DentalLabStudioModal.tsx
 *
 * DENTE Dental CRM — Каноническая студия зуботехнической лаборатории и заказ-нарядов (SSOT).
 * Единый Sweet Spot мастер-компонент: 3 сквозные вкладки (1. Новый заказ-наряд, 2. Реестр нарядов, 3. Печатный бланк),
 * экспресс-наряд за 10 сек, зубы FDI 11-48, палитра VITA A1-D4 + Bleach BL1-BL4, 5 этапов изготовления,
 * себестоимость в копейках, быстрые действия ортопеда, ровно 1 Primary CTA #0d9488 и Apple HIG (Мандаты 8b: 400–480 строк, 8e, 8am, 8ze).
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Award } from "lucide-react";
if (typeof document !== "undefined") { void import("./styles/dentalLabStudio.css"); }
import { generateUuidV7, rublesToKopecks, kopecksToRubles, formatDateKeyInTimeZone, shiftCalendarDay, todayDateKeyInTimeZone } from "@dental/shared";
import {
	CANONICAL_LAB_STAGES, CANONICAL_LAB_MATERIALS, VITA_SHADES_SSOT,
	getClinicLaboratories, getPartnerLaboratories,
	UPPER_JAW_TEETH, LOWER_JAW_TEETH, SEED_LAB_ORDERS, type DentalLabOrderEntry, type DentalLabStage,
	addWorkingDaysRu, formatKopecksToRubles, calcNetRevenueKopecks, getStageMeta, getMaterialMeta, isOrderOverdue,
	mapDbStatusToStage, STAGE_TO_DB_STATUS,
} from "./dentalLabCatalogData";
import { DentalLabStudioPrintTab } from "./printBlankModules/DentalLabStudioPrintTab";
import { DentalLabRegistryOrderCard } from "./ordersView/DentalLabRegistryOrderCard";
import { DentalLabCreateOrderSection } from "./DentalLabCreateOrderSection";
import { DentalLabReadyInClinicModal, type ReadyInClinicLabOrder } from "./DentalLabReadyInClinicModal";
import { IntraoralScan3DViewerModal } from "../radiology/IntraoralScan3DViewerModal";
import { OrthopedicPassportA4Modal, type ProstheticWarrantyPassport } from "../orthopedics/OrthopedicPassportA4Modal";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import { denteClinicalMutationHeaders, denteClinicalReadHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { clientLogger } from "../../services/logging/clientLogger";
import { showToast } from "../GlobalToast";
import type { DentalLabOrderData } from "./labMath";

export type LabFilterTab = "all" | "in_work" | "in_clinic" | "overdue";
export type LabStudioMainTab = "new_order" | "registry" | "print_blank";

export { buildLabOrderMessengerSummary, type LabOrderMessengerParams } from "./dentalLabDefinitions";
export * from "./dentalLabCatalogData";
export * from "./labMath";

export interface DentalLabStudioModalProps {
	readonly isOpen: boolean; readonly onClose: () => void;
	readonly initialToothFdi?: string | number | undefined; readonly patientName?: string | undefined; readonly doctorName?: string | undefined;
	readonly patientId?: string | undefined; readonly doctorId?: string | undefined;
	readonly initialTab?: LabStudioMainTab | "main" | "shades" | "stages" | "print" | undefined;
	readonly onOrderCreated?: ((order: DentalLabOrderEntry) => void) | undefined;
	readonly onOrderSaved?: ((order?: DentalLabOrderData | DentalLabOrderEntry) => void) | undefined; readonly onSaveOrder?: ((order?: DentalLabOrderData | DentalLabOrderEntry) => void) | undefined;
	readonly initialOrder?: DentalLabOrderData | DentalLabOrderEntry | null | undefined; readonly editingOrder?: DentalLabOrderData | DentalLabOrderEntry | null | undefined;
	readonly treatmentPlanId?: string | undefined; readonly stageId?: string | undefined;
	readonly stageNumber?: number | undefined; readonly stageTitle?: string | undefined; readonly stageTotalRub?: number | undefined; readonly initialTeeth?: number[] | undefined; readonly scheduledVisitDate?: string | undefined;
	readonly patientChartNumber?: string | undefined; readonly currentToothNumber?: string | number | undefined;
}

export type { DentalLabOrderData } from "./labMath";
import {
	getLabApiBaseUrl,
	parseOrderTeeth,
	resolveOrderMaterialId,
	resolveOrderShade,
	resolveOrderLab,
	resolveOrderDueDate,
	resolveOrderNotes,
} from "./orderHelpers/dentalLabOrderMappers";

export const DentalLabStudioModal: React.FC<DentalLabStudioModalProps> = ({
	isOpen, onClose, initialToothFdi = "16", patientName, doctorName, patientId, doctorId, initialTab = "new_order",
	onOrderCreated, onOrderSaved, onSaveOrder, initialTeeth, currentToothNumber,
	initialOrder, editingOrder,
}) => {
	const targetOrder = editingOrder || initialOrder || null;
	const { hasDentalLab } = useWorkspaceProfile();
	const storeActivePatientId = useAppStore((s) => s.activePatientId);
	const storeSelectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const storeActiveDoctorName = useAppStore((s) => s.activeDoctorName);
	const dashboard = useAppStore((s) => s.dashboard);

	// Канонический ID и профиль врача: из пропсов, дашборда или активного профиля ортопеда (Мандат 8e)
	const currentAuthDoctor = useMemo(() => {
		const rawDoc = (dashboard as { activeDoctor?: { id?: string; fullName?: string; name?: string } | null })?.activeDoctor;
		if (rawDoc?.id) return rawDoc;
		const docsList = (dashboard as { doctors?: Array<{ id?: string; fullName?: string; name?: string }> })?.doctors;
		return (Array.isArray(docsList) && docsList.length > 0 && docsList[0]?.id) ? docsList[0] : null;
	}, [dashboard]);

	const effectivePatientId = patientId || storeActivePatientId || storeSelectedPatientId || undefined;
	const activePatient = useMemo(() => (!effectivePatientId || !dashboard?.patients) ? null :
		(dashboard.patients as Array<{ id: string; fullName?: string; name?: string }>).find((p) => p.id === effectivePatientId) || null, [effectivePatientId, dashboard]);
	const effectivePatientName = targetOrder?.patientName || patientName || activePatient?.fullName || activePatient?.name || (isDemoShowcaseMode() ? "Ковалев Дмитрий Сергеевич" : "");
	const effectiveDoctorName = (targetOrder as DentalLabOrderData)?.doctorName || doctorName || currentAuthDoctor?.fullName || currentAuthDoctor?.name || storeActiveDoctorName || (isDemoShowcaseMode() ? "Д-р Смирнова Е. В. (Ортопед)" : "");
	const effectiveDoctorId = (targetOrder as DentalLabOrderData)?.doctorId || doctorId || currentAuthDoctor?.id || undefined;
	const clinicTimezone = dashboard?.clinicSettings?.profile?.timezone;

	const [patientInput, setPatientInput] = useState<string>(() => targetOrder?.patientName || effectivePatientName);
	const lastPatientContextRef = useRef<string>(`${effectivePatientId || ""}|${effectivePatientName || ""}|${targetOrder?.id || ""}`);
	useEffect(() => {
		const nextContextKey = `${effectivePatientId || ""}|${effectivePatientName || ""}|${targetOrder?.id || ""}`;
		const contextChanged = lastPatientContextRef.current !== nextContextKey;
		if (contextChanged) {
			lastPatientContextRef.current = nextContextKey;
		}
		if (targetOrder) {
			const ordPatName = targetOrder.patientName || (targetOrder as DentalLabOrderData).patient_name;
			if (typeof ordPatName === "string" && ordPatName.trim()) {
				setPatientInput(ordPatName.trim());
				return;
			}
		}
		if (contextChanged) {
			setPatientInput(effectivePatientName || "");
		} else if (effectivePatientName && !patientInput) {
			setPatientInput(effectivePatientName);
		}
	}, [targetOrder, effectivePatientId, effectivePatientName, patientInput]);

	const availablePatients = useMemo(() => (!dashboard?.patients || !Array.isArray(dashboard.patients)) ? [] :
		(dashboard.patients as Array<{ id: string; fullName?: string; name?: string; lastName?: string; firstName?: string }>)
			.map((p) => ({ id: p.id, fullName: p.fullName || p.name || `${p.lastName || ""} ${p.firstName || ""}`.trim() }))
			.filter((p) => Boolean(p.fullName)), [dashboard?.patients]);

	const matchedPatient = useMemo(() => !patientInput ? null : availablePatients.find((p) => p.fullName.toLowerCase() === patientInput.trim().toLowerCase()) || null, [patientInput, availablePatients]);
	const currentPatientName = patientInput.trim() || effectivePatientName || (isDemoShowcaseMode() ? "Ковалев Дмитрий Сергеевич" : "Пациент");
	const currentPatientId = matchedPatient?.id || effectivePatientId;

	const [customLabs, setCustomLabs] = useState<string[]>(() => {
		if (typeof window === "undefined" || typeof localStorage === "undefined") return [];
		try {
			const saved = localStorage.getItem("dente_custom_lab_names");
			return saved ? JSON.parse(saved) : [];
		} catch (err) {
			clientLogger.warn("[DentalLabStudioModal] Failed to parse custom labs from localStorage", err, { module: "DentalLab" });
			return [];
		}
	});

	const [orders, setOrders] = useState<DentalLabOrderEntry[]>(() => isDemoShowcaseMode() ? [...SEED_LAB_ORDERS] : []);

	const existingOrderLabs = useMemo(() => {
		const set = new Set<string>();
		orders.forEach((o) => {
			if (o.laboratoryName && typeof o.laboratoryName === "string" && o.laboratoryName.trim()) {
				set.add(o.laboratoryName.trim());
			}
		});
		return Array.from(set);
	}, [orders]);

	const baseClinicLabs = useMemo(() => {
		const clinicLabs = getClinicLaboratories();
		if (clinicLabs.length > 0) return clinicLabs;
		return getPartnerLaboratories().map((p) => p.name);
	}, []);

	const allLaboratories = useMemo(() => {
		const combined = [...baseClinicLabs, ...existingOrderLabs, ...customLabs].filter(Boolean);
		const unique = Array.from(new Set(combined));
		if (unique.length === 0) {
			return ["Собственная лаборатория клиники"];
		}
		return unique;
	}, [baseClinicLabs, existingOrderLabs, customLabs]);
	const normalizedInitialTab: LabStudioMainTab = initialTab === "print" || initialTab === "print_blank" ? "print_blank" : initialTab === "registry" ? "registry" : "new_order";
	const [activeMainTab, setActiveMainTab] = useState<LabStudioMainTab>(normalizedInitialTab);
	useEffect(() => {
		if (initialTab) {
			const norm: LabStudioMainTab = initialTab === "print" || initialTab === "print_blank" ? "print_blank" : initialTab === "registry" ? "registry" : "new_order";
			setActiveMainTab(norm);
		}
	}, [initialTab]);

	const [activeFilter, setActiveFilter] = useState<LabFilterTab>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<DentalLabOrderEntry | null>(null);
	const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
	const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const showTimedFeedback = useCallback((message: string, durationMs = 2500) => {
		if (feedbackTimerRef.current !== null) {
			clearTimeout(feedbackTimerRef.current);
		}
		setFeedbackToast(message);
		feedbackTimerRef.current = setTimeout(() => {
			setFeedbackToast(null);
			feedbackTimerRef.current = null;
		}, durationMs);
	}, []);

	useEffect(() => {
		return () => {
			if (feedbackTimerRef.current !== null) {
				clearTimeout(feedbackTimerRef.current);
				feedbackTimerRef.current = null;
			}
		};
	}, []);

	const targetOrderTeeth = useMemo(() => parseOrderTeeth(targetOrder), [targetOrder]);
	const initialToothNum = Number(initialToothFdi || currentToothNumber) || (isDemoShowcaseMode() ? 16 : 0);
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>(() => {
		if (targetOrderTeeth.length > 0) return targetOrderTeeth;
		if (initialTeeth && Array.isArray(initialTeeth) && initialTeeth.length > 0) return initialTeeth;
		return initialToothNum ? [initialToothNum] : [];
	});
	const [selectedMaterialId, setSelectedMaterialId] = useState<string>(() => resolveOrderMaterialId(targetOrder) || "zirconia_multilayer");
	const [selectedShade, setSelectedShade] = useState<string>(() => resolveOrderShade(targetOrder) || "A2");
	const [selectedLab, setSelectedLab] = useState<string>(() => {
		const orderLab = resolveOrderLab(targetOrder);
		if (orderLab) return orderLab;
		if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
			try {
				const savedDefault = localStorage.getItem("dente_default_lab_name");
				if (savedDefault) return savedDefault;
			} catch (storageErr) {
				clientLogger.warn("[DentalLabStudioModal] Could not read default lab from storage", storageErr, { module: "DentalLab" });
			}
		}
		const defaultClinicLabs = getClinicLaboratories();
		if (defaultClinicLabs.length > 0) return defaultClinicLabs[0] ?? "";
		return "";
	});

	useEffect(() => {
		if (!selectedLab && allLaboratories.length > 0) {
			setSelectedLab(allLaboratories[0] ?? "");
		}
	}, [allLaboratories, selectedLab]);
	const [isUrgent, setIsUrgent] = useState(() => Boolean(targetOrder?.isUrgent));
	const [isWarrantyRework, setIsWarrantyRework] = useState(() => Boolean(targetOrder?.isWarrantyRework || targetOrder?.isWarranty || (targetOrder as DentalLabOrderData)?.isWarrantyRemake));
	const [isPassportModalOpen, setIsPassportModalOpen] = useState(false);
	const [livePassport, setLivePassport] = useState<ProstheticWarrantyPassport | null>(null);

	const isInstalled = Boolean(
		targetOrder && (
			(targetOrder as DentalLabOrderData).status === "installed" ||
			(targetOrder as DentalLabOrderData).status === "completed" ||
			(targetOrder as DentalLabOrderData).isLockedInstalled ||
			(targetOrder as DentalLabOrderEntry).stage === "seated"
		)
	);

	const handleOpenPassport = useCallback(async (order: DentalLabOrderData | DentalLabOrderEntry) => {
		setIsPassportModalOpen(true);
		try {
			const res = await fetch(
				`/api/lab/orders/${encodeURIComponent(order.id || "")}/warranty-passport`,
				{ headers: denteClinicalReadHeaders() },
			);
			if (res.ok) {
				const raw = (await res.json()) as { data?: { passport?: ProstheticWarrantyPassport }; passport?: ProstheticWarrantyPassport };
				const passport = raw?.data?.passport ?? raw?.passport;
				if (passport) {
					setLivePassport(passport);
				}
			} else {
				clientLogger.warn("[DentalLabStudioModal] Сервер вернул ошибку при загрузке гарантийного паспорта", { status: res.status }, { module: "DentalLab" });
			}
		} catch (err) {
			clientLogger.warn("[DentalLabStudioModal] Не удалось загрузить серверный гарантийный паспорт", err, { module: "DentalLab" });
		}
	}, []);
	const [readyInClinicOrder, setReadyInClinicOrder] = useState<ReadyInClinicLabOrder | null>(null);
	const [isReadyInClinicOpen, setIsReadyInClinicOpen] = useState(false);
	const [is3DViewerOpen, setIs3DViewerOpen] = useState(false);
	const [scanViewerOrder, setScanViewerOrder] = useState<DentalLabOrderEntry | null>(null);
	const [notes, setNotes] = useState(() => resolveOrderNotes(targetOrder) || "");

	useEffect(() => {
		if (targetOrder) {
			const teeth = parseOrderTeeth(targetOrder);
			if (teeth.length > 0) setSelectedTeeth(teeth);
			const matId = resolveOrderMaterialId(targetOrder);
			if (matId) setSelectedMaterialId(matId);
			const s = resolveOrderShade(targetOrder);
			if (s) setSelectedShade(s);
			const lab = resolveOrderLab(targetOrder);
			if (lab) {
				setSelectedLab(lab);
				setCustomLabs((prev) => (prev.includes(lab) || getClinicLaboratories().includes(lab) ? prev : [...prev, lab]));
			}
			const date = resolveOrderDueDate(targetOrder);
			if (date) setCustomDueDate(date);
			const n = resolveOrderNotes(targetOrder);
			if (n != null) setNotes(n);
			if (typeof targetOrder.isUrgent === "boolean") setIsUrgent(targetOrder.isUrgent);
			setIsWarrantyRework(Boolean(targetOrder.isWarrantyRework || targetOrder.isWarranty || (targetOrder as DentalLabOrderData)?.isWarrantyRemake));
		}
	}, [targetOrder]);

	useEffect(() => {
		if (typeof window === "undefined" || typeof localStorage === "undefined") return;
		try {
			const saved = localStorage.getItem("dente_active_lab_shade_preset");
			if (saved) {
				const p = JSON.parse(saved);
				const s = p?.shade || p?.afterShade || p?.shadeCode || p?.color;
				if (s) setSelectedShade(String(s));
			}
		} catch (err) {
			clientLogger.warn("[DentalLabStudioModal] Ошибка разбора сохраненного пресета оттенка", err, { module: "DentalLab" });
		}
		const handleShadeEvent = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			const shade = detail?.shade || detail?.afterShade || detail?.shadeCode || detail?.color;
			if (shade) setSelectedShade(String(shade));
		};
		window.addEventListener("dente-apply-lab-shade", handleShadeEvent);
		return () => window.removeEventListener("dente-apply-lab-shade", handleShadeEvent);
	}, []);

	const selectedMaterial = useMemo(() => getMaterialMeta(selectedMaterialId), [selectedMaterialId]);
	const calculatedDueDate = useMemo(
		() => formatDateKeyInTimeZone(addWorkingDaysRu(new Date(), selectedMaterial.defaultDurationDays), clinicTimezone),
		[selectedMaterial, clinicTimezone],
	);

	const [customDueDate, setCustomDueDate] = useState<string>(() => resolveOrderDueDate(targetOrder) || "");
	const effectiveDueDate = customDueDate || calculatedDueDate;
	const teethCount = selectedTeeth.length > 0 ? selectedTeeth.length : 1;
	const totalLabCostKopecks = selectedMaterial.baseLabCostKopecks * teethCount;
	const rawPatientPriceKopecks = selectedMaterial.defaultPatientPriceKopecks * teethCount;
	const totalPatientPriceKopecks = isWarrantyRework ? 0 : rawPatientPriceKopecks;
	const netClinicRevenueKopecks = calcNetRevenueKopecks(totalPatientPriceKopecks, totalLabCostKopecks);

	useEffect(() => {
		if (targetOrder) {
			const mappedEntry: DentalLabOrderEntry = {
				id: String(targetOrder.id || "edit-order"),
				orderNumber: String(targetOrder.orderNumber ?? "ЗТЛ-НОВЫЙ"),
				patientName: String(targetOrder.patientName || effectivePatientName || "Пациент"),
				doctorName: String(targetOrder.doctorName || effectiveDoctorName || ""),
				teeth: parseOrderTeeth(targetOrder),
				materialId: resolveOrderMaterialId(targetOrder) || selectedMaterialId,
				shadeCode: resolveOrderShade(targetOrder) || selectedShade,
				stage: (targetOrder as DentalLabOrderEntry).stage || mapDbStatusToStage((targetOrder as DentalLabOrderData).status),
				labCostKopecks: Number((targetOrder as DentalLabOrderEntry).labCostKopecks || (targetOrder as DentalLabOrderData).costKopecks || totalLabCostKopecks),
				patientPriceKopecks: Number((targetOrder as DentalLabOrderEntry).patientPriceKopecks || (targetOrder as DentalLabOrderData).patientPriceKopecks || totalPatientPriceKopecks),
				laboratoryName: resolveOrderLab(targetOrder) || selectedLab,
				createdAt: String((targetOrder as DentalLabOrderEntry).createdAt || new Date().toISOString()),
				dueDate: resolveOrderDueDate(targetOrder) || calculatedDueDate,
				notes: resolveOrderNotes(targetOrder) || undefined,
				isUrgent: Boolean(targetOrder.isUrgent),
				isWarranty: Boolean(targetOrder.isWarranty || targetOrder.isWarrantyRework),
				isWarrantyRework: Boolean(targetOrder.isWarrantyRework || targetOrder.isWarranty),
			};
			setSelectedOrderForPrint(mappedEntry);
		}
	}, [targetOrder, effectivePatientName, effectiveDoctorName, calculatedDueDate, selectedMaterialId, selectedShade, totalLabCostKopecks, totalPatientPriceKopecks, selectedLab]);

	useEffect(() => {
		if (!isOpen || typeof window === "undefined") return;
		let isCancelled = false;
		const abortController = new AbortController();
		async function loadLiveOrders() {
			try {
				const res = await fetch(`${getLabApiBaseUrl()}/api/lab/orders`, {
					headers: denteClinicalReadHeaders(),
					signal: abortController.signal,
				});
				if (!res.ok) return;
				const data = await res.json();
				const payload = data?.data ?? data;
				const list = Array.isArray(payload) ? payload : (Array.isArray(data?.orders) ? data.orders : []);
				if (Array.isArray(list) && list.length > 0 && !isCancelled) {
					setOrders((list as Array<Record<string, unknown>>).map((item, idx: number) => {
						const itemMaterialId = String(item.materialId || item.workTypeId || "zirconia_multilayer");
						const rawTeeth = Array.isArray(item.teethFdi) ? item.teethFdi : item.toothFdi ? [item.toothFdi] : [];
						const itemTeeth: readonly number[] = (rawTeeth as unknown[]).map((t) => typeof t === "number" ? t : Number(t)).filter((t): t is number => !Number.isNaN(t) && t > 0);
						const fallbackCost = getMaterialMeta(itemMaterialId).baseLabCostKopecks * (itemTeeth.length > 0 ? itemTeeth.length : 1);
						const rawLabCost = Number(item.labCostKopecks || (item.labCostRub ? rublesToKopecks(Number(item.labCostRub)) : 0));
						const rawStatus = typeof item.status === "string" ? item.status : typeof item.stage === "string" ? item.stage : null;
						return {
							id: String(item.id || `live-ord-${idx}`), orderNumber: String(item.orderNumber || item.gostOrderNumber || `ЗТЛ-${100 + idx}`),
							patientName: String(item.patientName || effectivePatientName || "Пациент"), doctorName: String(item.doctorName || effectiveDoctorName || "Врач"),
							teeth: itemTeeth, materialId: itemMaterialId,
							shadeCode: String(item.shadeVita || item.shadeCode || item.colorVita || "A2"), stage: mapDbStatusToStage(rawStatus),
							labCostKopecks: rawLabCost > 0 ? rawLabCost : fallbackCost,
							patientPriceKopecks: Number(item.patientPriceKopecks || (item.priceRub ? rublesToKopecks(Number(item.priceRub)) : 0)),
							laboratoryName: String(item.laboratoryName || item.labName || "Лаборатория"), createdAt: String(item.createdAt || new Date().toISOString()),
							dueDate: String(item.dueDate || calculatedDueDate), notes: String(item.notes || item.clinicalNotes || item.comment || "") || undefined, isUrgent: Boolean(item.isUrgent || item.urgent),
							isWarranty: Boolean(item.isWarranty || item.isWarrantyRework),
							isWarrantyRework: Boolean(item.isWarrantyRework || item.isWarranty),
							attachedImageUrl: typeof item.attachedImageUrl === "string" ? item.attachedImageUrl : typeof item.scanUrl === "string" ? item.scanUrl : undefined,
							patientPhone: typeof item.patientPhone === "string" ? item.patientPhone : undefined,
							doctorId: typeof item.doctorId === "string" ? item.doctorId : undefined,
						};
					}));
					const firstItem: unknown = list[0];
					const firstLab =
						typeof firstItem === "object" && firstItem !== null
							? ("laboratoryName" in firstItem && typeof firstItem.laboratoryName === "string"
								? firstItem.laboratoryName
								: "labName" in firstItem && typeof firstItem.labName === "string"
									? firstItem.labName
									: "")
							: "";
					if (firstLab.trim()) {
						setSelectedLab((prev) => prev || firstLab.trim());
					}
				}
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") return;
				clientLogger.error("[DentalLabStudioModal] Failed to load live lab orders", err, { module: "DentalLab" });
			}
		}
		void loadLiveOrders();
		return () => {
			isCancelled = true;
			abortController.abort();
		};
	}, [isOpen, effectivePatientName, effectiveDoctorName, calculatedDueDate]);

	const toggleTooth = useCallback((tooth: number) => {
		setSelectedTeeth((prev) => prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b));
	}, []);

	const resetDraftFields = useCallback(() => {
		setPatientInput("");
		setSelectedTeeth([16]);
		setSelectedMaterialId("zirconia_multilayer");
		setSelectedShade("A2");
		setNotes("");
		setCustomDueDate("");
		setIsUrgent(false);
		setIsWarrantyRework(false);
	}, []);

	const handleCloseModal = useCallback(() => {
		setPatientInput("");
		setNotes("");
		setSelectedTeeth([16]);
		setIsUrgent(false);
		resetDraftFields();
		onClose();
		useUiSurfaceStore.getState().closePrimaryModal("lab_order");
		useUiSurfaceStore.getState().closePrimaryModal("dental_lab");
		useUiSurfaceStore.getState().closePrimaryModal("lab");
	}, [onClose, resetDraftFields]);

	useEffect(() => {
		if (!isOpen || typeof window === "undefined") return;
		const hasSubModalOpen = Boolean(
			(isReadyInClinicOpen && readyInClinicOrder) || is3DViewerOpen || (isPassportModalOpen && targetOrder),
		);
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !hasSubModalOpen) {
				handleCloseModal();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, isReadyInClinicOpen, readyInClinicOrder, is3DViewerOpen, isPassportModalOpen, targetOrder, handleCloseModal]);

	// Создание/сохранение наряда — кнопка НИКОГДА не заблокирована (Мандат 8e: Автономия врача)
	const handleCreateOrder = useCallback(async () => {
		const teethToSave = selectedTeeth.length > 0 ? selectedTeeth : [];
		const isEditMode = Boolean(targetOrder?.id);
		const effectiveOrderNumber = isEditMode && targetOrder?.orderNumber
			? String(targetOrder.orderNumber)
			: `ЗТЛ-${100 + orders.length + 1}`;
		const effectiveName = currentPatientName;
		const effectiveId = currentPatientId;
		const effectiveEntryId = isEditMode && targetOrder?.id ? String(targetOrder.id) : generateUuidV7();
		const effectiveCreatedAt = isEditMode && (targetOrder as DentalLabOrderEntry)?.createdAt
			? String((targetOrder as DentalLabOrderEntry).createdAt)
			: new Date().toISOString();
		const effectiveStage: DentalLabStage = isEditMode && (targetOrder as DentalLabOrderEntry)?.stage
			? (targetOrder as DentalLabOrderEntry).stage
			: "scan_sent";

		const newEntry: DentalLabOrderEntry = {
			id: effectiveEntryId,
			orderNumber: effectiveOrderNumber,
			patientName: effectiveName,
			doctorName: effectiveDoctorName,
			doctorId: effectiveDoctorId,
			patientPhone: activePatient ? (activePatient as { phone?: string })?.phone : undefined,
			teeth: teethToSave,
			materialId: selectedMaterialId,
			shadeCode: selectedShade,
			stage: effectiveStage,
			labCostKopecks: totalLabCostKopecks,
			patientPriceKopecks: totalPatientPriceKopecks,
			laboratoryName: selectedLab,
			createdAt: effectiveCreatedAt,
			dueDate: effectiveDueDate,
			notes: notes.trim() || undefined,
			isUrgent,
			isWarranty: isWarrantyRework,
			isWarrantyRework,
		};

		try {
			const trimmedNotes = notes.trim();
			const combinedClinicalNotes = [isUrgent ? "[СРОЧНО]" : "", trimmedNotes].filter(Boolean).join(" ").trim();
			const commonPayload = {
				orderNumber: newEntry.orderNumber,
				...(effectiveDoctorId ? { doctorId: effectiveDoctorId } : {}),
				teethFdi: teethToSave.join(","),
				materialId: selectedMaterialId,
				shadeCode: selectedShade,
				dueDate: effectiveDueDate,
				labCostKopecks: totalLabCostKopecks,
				patientPriceKopecks: totalPatientPriceKopecks,
				isWarranty: isWarrantyRework,
				isWarrantyRework,
				...(combinedClinicalNotes ? { clinicalNotes: combinedClinicalNotes } : {}),
				status: isEditMode ? ((targetOrder as DentalLabOrderData)?.status || "sent") : "sent",
			};
			const payload = isEditMode
				? commonPayload
				: {
						...commonPayload,
						...(effectiveId ? { patientId: effectiveId } : {}),
						...(effectiveName ? { patientName: effectiveName } : {}),
						...(effectiveDoctorName ? { doctorName: effectiveDoctorName } : {}),
						...(selectedLab ? { laboratoryName: selectedLab } : {}),
					};
			const endpoint = isEditMode
				? `${getLabApiBaseUrl()}/api/lab/orders/${effectiveEntryId}`
				: `${getLabApiBaseUrl()}/api/lab/orders`;
			const method = isEditMode ? "PUT" : "POST";
			const reqOpts = {
				method,
				headers: {
					...denteClinicalMutationHeaders(),
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				},
				body: JSON.stringify(payload),
			};
			const res = await fetch(endpoint, reqOpts);
			if (res.ok) {
				interface LabOrderSaveResponse {
					data?: { id?: string; [key: string]: unknown };
					order?: { id?: string };
					id?: string;
					[key: string]: unknown;
				}
				let responseData: LabOrderSaveResponse | null = null;
				try {
					responseData = (await res.json()) as LabOrderSaveResponse;
				} catch (parseErr) {
					clientLogger.warn("[DentalLabStudioModal] Не удалось разобрать JSON ответа сохранения наряда", parseErr, { module: "DentalLab" });
				}
				const resPayload = responseData?.data ?? responseData;
				const realId = resPayload?.id || responseData?.order?.id || responseData?.id;
				const effectiveSavedId = String(realId || newEntry.id);
				const confirmedEntry: DentalLabOrderEntry = { ...newEntry, id: effectiveSavedId };
				setOrders((prev) =>
					isEditMode
						? prev.map((ord) => (ord.id === effectiveEntryId || ord.orderNumber === confirmedEntry.orderNumber ? confirmedEntry : ord))
						: [confirmedEntry, ...prev],
				);
				setSelectedOrderForPrint(confirmedEntry);
				if (selectedLab && selectedLab.trim()) {
					if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
						try {
							localStorage.setItem("dente_default_lab_name", selectedLab.trim());
							if (!customLabs.includes(selectedLab.trim())) {
								const updated = [...customLabs, selectedLab.trim()];
								setCustomLabs(updated);
								localStorage.setItem("dente_custom_lab_names", JSON.stringify(updated));
							}
						} catch (storageErr) {
							clientLogger.warn("[DentalLabStudioModal] Could not save default lab to storage", storageErr, { module: "DentalLab" });
						}
					}
				}
				onOrderCreated?.(confirmedEntry);
				onOrderSaved?.(confirmedEntry);
				onSaveOrder?.(confirmedEntry);
				if (typeof window !== "undefined") {
					const eventDetail = { ...(resPayload && typeof resPayload === "object" ? resPayload : {}), id: effectiveSavedId };
					// Единая каноническая шина событий ЗТЛ (Мандат 8zq / SSOT)
					window.dispatchEvent(new CustomEvent(isEditMode ? "dente:lab:order-status-changed" : "dente:lab:order-created", { detail: eventDetail }));
				}
				showTimedFeedback(`Заказ-наряд ${confirmedEntry.orderNumber} успешно ${isEditMode ? "обновлен" : "создан"} и сохранен в базе данных`, 3500);
			} else {
				let errBody: { message?: string; error?: string } = {};
				try {
					errBody = (await res.json()) as { message?: string; error?: string };
				} catch (parseErr) {
					clientLogger.warn("[DentalLabStudioModal] Не удалось разобрать JSON ошибки сохранения наряда", { status: res.status, error: parseErr }, { module: "DentalLab" });
				}
				const errMsg = errBody?.message || errBody?.error || `Ошибка ${isEditMode ? "обновления" : "создания"} наряда ${newEntry.orderNumber} на сервере (HTTP ${res.status})`;
				showTimedFeedback(errMsg, 3500);
				showToast(errMsg, "error");
			}
		} catch (err) {
			clientLogger.error("[DentalLabStudioModal] Failed to save lab order", err, { module: "DentalLab" });
			const errMsg = `Сетевая ошибка при отправке наряда ${newEntry.orderNumber}`;
			showTimedFeedback(errMsg, 3500);
			showToast(errMsg, "error");
		}
	}, [selectedTeeth, targetOrder, orders.length, currentPatientName, effectiveDoctorName, currentPatientId, effectiveDoctorId, selectedMaterialId,
		selectedShade, totalLabCostKopecks, totalPatientPriceKopecks, selectedLab, effectiveDueDate, notes, isUrgent, isWarrantyRework, activePatient, onOrderCreated, onOrderSaved, onSaveOrder, showTimedFeedback]);

	const handleAdvanceStage = useCallback(async (orderId: string) => {
		const previousOrders = orders;
		const foundOrder = orders.find((ord) => ord.id === orderId);
		if (!foundOrder) return;
		const curIdx = CANONICAL_LAB_STAGES.findIndex((s) => s.id === foundOrder.stage);
		const nextIdx = Math.min(CANONICAL_LAB_STAGES.length - 1, (curIdx >= 0 ? curIdx : 0) + 1);
		const nextStage = CANONICAL_LAB_STAGES[nextIdx]?.id ?? "seated";
		setOrders((prev) => prev.map((ord) => (ord.id === orderId ? { ...ord, stage: nextStage } : ord)));
		showTimedFeedback(`Статус обновлен: ${CANONICAL_LAB_STAGES[nextIdx]?.labelRu ?? "Зафиксировано"}`, 2500);
		if (typeof window !== "undefined") {
			const evtDetail = { orderId, stage: nextStage, status: STAGE_TO_DB_STATUS[nextStage] || "in_progress" };
			window.dispatchEvent(new CustomEvent("dente:lab:order-status-changed", { detail: evtDetail }));
		}
		try {
			const res = await fetch(`${getLabApiBaseUrl()}/api/lab/orders/${orderId}/status`, {
				method: "PATCH",
				headers: { ...denteClinicalMutationHeaders(), "Content-Type": "application/json", "Idempotency-Key": generateUuidV7() },
				body: JSON.stringify({ status: STAGE_TO_DB_STATUS[nextStage] || "in_progress", stage: nextStage }),
			});
			if (!res.ok) {
				clientLogger.warn(`[DentalLabStudioModal] Failed to advance lab order status on server: ${res.status}`, { orderId, status: res.status }, { module: "DentalLab" });
				setOrders(previousOrders);
				showToast("Не удалось обновить этап наряда на сервере", "error");
			}
		} catch (err) {
			clientLogger.error("[DentalLabStudioModal] Error advancing stage", err, { module: "DentalLab" });
			setOrders(previousOrders);
			showToast("Сетевая ошибка при смене этапа наряда", "error");
		}
	}, [orders, showTimedFeedback]);

	const handleMarkInClinic = useCallback(async (orderId: string) => {
		const previousOrders = orders;
		const foundOrder = orders.find((ord) => ord.id === orderId);
		setOrders((prev) => prev.map((ord) => (ord.id === orderId ? { ...ord, stage: "in_clinic" } : ord)));
		showTimedFeedback("Заказ отмечен: готов в клинике", 2500);
		if (typeof window !== "undefined") {
			const evtDetail = { orderId, stage: "in_clinic", status: "received" };
			window.dispatchEvent(new CustomEvent("dente:lab:order-status-changed", { detail: evtDetail }));
		}
		if (foundOrder) {
			setReadyInClinicOrder({
				id: foundOrder.id, orderNumber: String(foundOrder.orderNumber ?? ""), patientName: foundOrder.patientName,
				patientPhone: foundOrder.patientPhone, doctorName: foundOrder.doctorName, doctorId: foundOrder.doctorId,
				toothFdi: Array.isArray(foundOrder.teeth) ? foundOrder.teeth.join(", ") : "", material: getMaterialMeta(foundOrder.materialId).titleRu,
				colorVita: foundOrder.shadeCode, patientPriceKopecks: foundOrder.patientPriceKopecks, priceRub: kopecksToRubles(foundOrder.patientPriceKopecks), isWarrantyRework: Boolean(foundOrder.isWarrantyRework || foundOrder.isWarranty),
			});
			setIsReadyInClinicOpen(true);
		}
		try {
			const res = await fetch(`${getLabApiBaseUrl()}/api/lab/orders/${orderId}/status`, {
				method: "PATCH",
				headers: { ...denteClinicalMutationHeaders(), "Content-Type": "application/json", "Idempotency-Key": generateUuidV7() },
				body: JSON.stringify({ status: "received", stage: "in_clinic" }),
			});
			if (!res.ok) {
				clientLogger.warn(`[DentalLabStudioModal] Failed to mark lab order in clinic on server: ${res.status}`, { orderId, status: res.status }, { module: "DentalLab" });
				setOrders(previousOrders);
				showToast("Не удалось зафиксировать поступление работы в клинику", "error");
			}
		} catch (err) {
			clientLogger.error("[DentalLabStudioModal] Error marking in clinic", err, { module: "DentalLab" });
			setOrders(previousOrders);
			showToast("Сетевая ошибка при обновлении статуса наряда", "error");
		}
	}, [orders, showTimedFeedback]);

	// Честное открытие шторки уведомления пациента (WhatsApp/SMS и запись на примерку)
	const handleCallPatient = useCallback((order: DentalLabOrderEntry) => {
		setReadyInClinicOrder({
			id: order.id, orderNumber: String(order.orderNumber ?? ""), patientName: order.patientName, patientPhone: order.patientPhone,
			doctorName: order.doctorName, doctorId: order.doctorId, toothFdi: Array.isArray(order.teeth) ? order.teeth.join(", ") : "",
			material: getMaterialMeta(order.materialId).titleRu, colorVita: order.shadeCode, patientPriceKopecks: order.patientPriceKopecks, priceRub: kopecksToRubles(order.patientPriceKopecks),
			isWarrantyRework: Boolean(order.isWarrantyRework || order.isWarranty),
		});
		setIsReadyInClinicOpen(true);
		if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("dente-open-patient-card", { detail: { patientName: order.patientName } }));
		showTimedFeedback(`Открыто уведомление пациента: ${order.patientName}`, 2500);
	}, [showTimedFeedback]);

	const handleView3DScan = useCallback((order: DentalLabOrderEntry) => { setScanViewerOrder(order); setIs3DViewerOpen(true); }, []);
	const handleOpenNewOrder3DScan = useCallback(() => { setScanViewerOrder(null); setIs3DViewerOpen(true); }, []);

	const handlePrintOrder = useCallback((order: DentalLabOrderEntry) => { setSelectedOrderForPrint(order); setActiveMainTab("print_blank"); showTimedFeedback(`Печать заказ-наряда: ${order.orderNumber}`, 2500); }, [showTimedFeedback]);
	const handlePrintA5Blank = useCallback(() => { setActiveMainTab("print_blank"); showTimedFeedback("Формирование бланка наряда А5 для лаборатории", 2500); if (typeof window !== "undefined") window.print?.(); }, [showTimedFeedback]);
	const handleCourierBlank = useCallback(() => { setActiveMainTab("print_blank"); showTimedFeedback("Накладная курьеру для передачи в лабораторию", 2500); if (typeof window !== "undefined") window.print?.(); }, [showTimedFeedback]);

	const filteredOrders = useMemo(() => {
		return orders.filter((ord) => {
			const query = searchQuery.trim().toLowerCase();
			const matchesSearch = !query || ord.patientName.toLowerCase().includes(query) ||
				Boolean(ord.orderNumber && String(ord.orderNumber).toLowerCase().includes(query)) || ord.laboratoryName.toLowerCase().includes(query);
			if (!matchesSearch) return false;
			if (activeFilter === "in_work") return ord.stage === "scan_sent" || ord.stage === "in_production" || ord.stage === "fitting_ready";
			if (activeFilter === "in_clinic") return ord.stage === "in_clinic";
			if (activeFilter === "overdue") return isOrderOverdue(ord);
			return true;
		});
	}, [orders, activeFilter, searchQuery]);

	const fallbackDraftOrder: DentalLabOrderEntry = useMemo(() => {
		const todayKey = todayDateKeyInTimeZone(clinicTimezone);
		return {
			id: "draft-print-order", orderNumber: "НЗ-ЧЕРНОВИК",
			patientName: currentPatientName || "Пациент", doctorName: effectiveDoctorName || "",
			laboratoryName: selectedLab || "Зуботехническая лаборатория", teeth: selectedTeeth.length > 0 ? selectedTeeth : [16],
			materialId: selectedMaterialId, shadeCode: selectedShade, createdAt: todayKey,
			dueDate: shiftCalendarDay(todayKey, 5), stage: "scan_sent",
			labCostKopecks: totalLabCostKopecks, patientPriceKopecks: totalPatientPriceKopecks,
			notes: notes || "Анатомическая окклюзия, плотный апроксимальный контакт.", isUrgent,
		};
	}, [clinicTimezone, currentPatientName, effectiveDoctorName, selectedLab, selectedTeeth, selectedMaterialId, selectedShade, totalLabCostKopecks, totalPatientPriceKopecks, notes, isUrgent]);

	const currentPrintOrder: DentalLabOrderEntry = selectedOrderForPrint || orders[0] || (isDemoShowcaseMode() && SEED_LAB_ORDERS[0] ? SEED_LAB_ORDERS[0] : fallbackDraftOrder);
	const printMaterial = getMaterialMeta(currentPrintOrder.materialId);

	if (!isOpen || (!hasDentalLab && !isDemoShowcaseMode())) return null;

	if (isReadyInClinicOpen && readyInClinicOrder) {
		return <DentalLabReadyInClinicModal isOpen={true} onClose={() => setIsReadyInClinicOpen(false)} order={readyInClinicOrder} />;
	}
	if (is3DViewerOpen) {
		return <IntraoralScan3DViewerModal isOpen={true} onClose={() => setIs3DViewerOpen(false)} modelUrl={scanViewerOrder?.attachedImageUrl || undefined} patientName={scanViewerOrder?.patientName || currentPatientName} toothCode={scanViewerOrder?.teeth?.[0] || selectedTeeth[0]} orderId={scanViewerOrder?.id} scanTitle={scanViewerOrder ? `3D-скан челюсти: ${scanViewerOrder.orderNumber} (${scanViewerOrder.patientName})` : `3D-скан челюсти: ${currentPatientName}`} />;
	}
	if (isPassportModalOpen && targetOrder) {
		const fixationDateKey = todayDateKeyInTimeZone(clinicTimezone);
		return (
			<OrthopedicPassportA4Modal
				isOpen={true}
				onClose={() => { setIsPassportModalOpen(false); setLivePassport(null); }}
				passport={livePassport || {
					orderNumber: String(targetOrder.orderNumber || (targetOrder.id ? `ЗТЛ-${targetOrder.id.slice(0, 8).toUpperCase()}` : "Б/Н")),
					batchCode: `LOT-${fixationDateKey.slice(0, 4)}-${targetOrder.id ? targetOrder.id.slice(0, 6).toUpperCase() : "0001"}`,
					patientFullName: currentPatientName, clinicName: "Стоматологическая клиника «DENTE»", doctorFullName: effectiveDoctorName, technicianLabName: selectedLab,
					toothFdi: Array.isArray(selectedTeeth) && selectedTeeth.length > 0 ? selectedTeeth.join(", ") : (currentToothNumber ? String(currentToothNumber) : "—"),
					restorationType: selectedMaterial.titleRu, frameworkMaterial: selectedMaterial.titleRu, shade: selectedShade, shadeStump: null,
					cementationProtocol: "Адгезивный протокол двойного отверждения (композитный цемент)", warrantyYears: 2,
					fixationDate: fixationDateKey, expirationDate: shiftCalendarDay(fixationDateKey, 730),
					gostStandard: "ГОСТ Р 51087-97 / ГОСТ 31576-2012 / Клинические рекомендации СтАР",
					sanpinDisinfectionMark: "СанПиН 3.3686-21: Оттиски, прикусные блоки и конструкции дезинфицированы",
				}}
			/>
		);
	}

	const renderRegistryPanel = (sectionClassName: string, listClassName: string) => (
		<section className={sectionClassName} data-testid="lab-orders-registry-panel">
			<div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2${activeMainTab === "registry" ? " mb-3" : ""}`}>
				<div className="inline-flex items-center gap-1 p-1 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] overflow-x-auto scrollbar-none">
					{(["all", "in_work", "in_clinic", "overdue"] as const).map((tab) => {
						const labels: Record<LabFilterTab, string> = { all: "Все заказы", in_work: "В лаборатории", in_clinic: "Готово в клинике", overdue: "Просроченные" };
						return (
							<button key={tab} type="button" data-testid={`filter-tab-${tab}`} onClick={() => setActiveFilter(tab)}
								className={`h-8 px-3 rounded-lg text-xs whitespace-nowrap shrink-0 transition-all cursor-pointer ${activeFilter === tab ? "bg-[var(--paper)] text-[var(--ink)] font-medium shadow-xs" : "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>{labels[tab]}</button>
						);
					})}
				</div>
				<div className="relative w-full sm:w-64 shrink-0">
					<svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<input type="search" data-testid="lab-orders-search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск по пациенту, номеру наряда..." className="dental-lab-search-input w-full text-xs py-2 pl-10 pr-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]" />
				</div>
			</div>
			<div className={listClassName}>
				{filteredOrders.length === 0 ? (
					<div className="text-center py-12 text-[var(--ink-muted)] border border-dashed border-[var(--line)] rounded-2xl">
						<p className="text-sm font-semibold">Нарядов в выбранной категории не найдено</p>
						<p className="text-xs pt-1">Оформите новый заказ-наряд у кресла</p>
					</div>
				) : (
					filteredOrders.map((ord) => (
						<DentalLabRegistryOrderCard key={ord.id} ord={ord} onMarkInClinic={handleMarkInClinic} onCallPatient={handleCallPatient} onPrintOrder={handlePrintOrder} onAdvanceStage={handleAdvanceStage} onView3DScan={handleView3DScan} />
					))
				)}
			</div>
		</section>
	);

	return (
		<div
			data-testid="dental-lab-studio-modal-root"
			className="dental-lab-modal-backdrop"
			onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
		>
			<div className="dental-lab-modal-container max-sm:rounded-t-[24px]" data-testid="dental-lab-order-drawer">
				<div className="sm:hidden flex justify-center pt-2">
					<div className="dental-lab-drag-handle w-9 h-1 rounded-full bg-[var(--line-strong,#94a3b8)]" />
				</div>
				<header className="dental-lab-header">
					<div className="flex items-center justify-between w-full">
						<div className="min-w-0 flex-1">
							<h2 className="dental-lab-header-title">
								<span className="hidden sm:inline">Зуботехническая лаборатория и заказ-наряды</span>
								<span className="sm:hidden font-bold text-sm">Наряды в лабораторию</span>
								<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 shrink-0">Ортопедия</span>
							</h2>
							<div className="dental-lab-header-meta">
								<span className="break-words">Пациент: <strong className="text-[var(--ink)]">{currentPatientName || "Не выбран"}</strong></span> <span className="break-words hidden sm:inline">Врач: <strong className="text-[var(--ink)]">{effectiveDoctorName || "Не назначен"}</strong></span>
							</div>
						</div>
						<div className="flex items-center gap-2 shrink-0 ml-2">
							{isInstalled && targetOrder && (
								<button
									type="button"
									onClick={() => void handleOpenPassport(targetOrder)}
									className="min-h-[36px] h-9 px-3 text-xs font-semibold rounded-lg border border-[var(--primary)]/40 bg-[var(--paper)] text-[var(--primary)] hover:bg-[var(--paper-soft)] shadow-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
									data-testid="lab-order-installed-warranty-passport-btn"
								>
									<Award className="w-4 h-4 shrink-0 text-[var(--primary)]" />
									<span className="hidden sm:inline">Гарантийный паспорт</span>
									<span className="sm:hidden">Паспорт</span>
								</button>
							)}
							<button type="button" data-testid="lab-modal-close-button" onClick={handleCloseModal}
								className="w-9 h-9 max-sm:w-11 max-sm:h-11 rounded-full border border-[var(--line)] bg-transparent hover:bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] flex items-center justify-center font-bold text-sm cursor-pointer shrink-0" title="Закрыть (Esc)">&#215;</button>
						</div>
					</div>
					<nav className="w-full sm:w-auto flex items-center gap-1 bg-[var(--paper-soft)] p-1 rounded-xl border border-[var(--line)] shrink-0" aria-label="Вкладки студии">
						<button type="button" data-testid="tab-new-order" onClick={() => setActiveMainTab("new_order")}
							className={`flex-1 sm:flex-initial px-3 py-1.5 sm:py-1 max-sm:min-h-[44px] rounded-lg text-xs font-semibold cursor-pointer transition-all text-center whitespace-nowrap border ${activeMainTab === "new_order" ? "bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--line)] shadow-xs" : "bg-transparent border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}><span className="hidden sm:inline">1. Новый заказ-наряд</span><span className="sm:hidden">1. Наряд</span></button>
						<button type="button" data-testid="tab-registry" onClick={() => setActiveMainTab("registry")}
							className={`flex-1 sm:flex-initial px-3 py-1.5 sm:py-1 max-sm:min-h-[44px] rounded-lg text-xs font-semibold cursor-pointer transition-all text-center whitespace-nowrap border ${activeMainTab === "registry" ? "bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--line)] shadow-xs" : "bg-transparent border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}><span className="hidden sm:inline">2. Реестр нарядов</span><span className="sm:hidden">2. Реестр</span></button>
						<button type="button" data-testid="tab-print-blank" onClick={() => setActiveMainTab("print_blank")}
							className={`flex-1 sm:flex-initial px-3 py-1.5 sm:py-1 max-sm:min-h-[44px] rounded-lg text-xs font-semibold cursor-pointer transition-all text-center whitespace-nowrap border ${activeMainTab === "print_blank" ? "bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--line)] shadow-xs" : "bg-transparent border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}><span className="hidden sm:inline">3. Печатный бланк</span><span className="sm:hidden">3. Бланк</span></button>
					</nav>
				</header>
				{feedbackToast && (
					<div className="bg-[var(--primary)] text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm">
						<span>✓ {feedbackToast}</span>
						<button type="button" onClick={() => setFeedbackToast(null)} className="text-white font-bold opacity-80 hover:opacity-100">&#215;</button>
					</div>
				)}
				{activeMainTab === "print_blank" ? (
					<DentalLabStudioPrintTab currentPrintOrder={currentPrintOrder} printMaterial={printMaterial} onBackToRegistry={() => setActiveMainTab("registry")} />
				) : activeMainTab === "registry" ? (
					<div className="w-full p-4 overflow-y-auto max-h-[78vh]">
						{renderRegistryPanel("dental-lab-right-column w-full border-0 p-0", "space-y-3")}
					</div>
				) : (
					<div className="dental-lab-body-grid">
						<DentalLabCreateOrderSection
							activeMainTab={activeMainTab} patientInput={patientInput} setPatientInput={setPatientInput} availablePatients={availablePatients}
							selectedTeeth={selectedTeeth} setSelectedTeeth={setSelectedTeeth} toggleTooth={toggleTooth} selectedMaterialId={selectedMaterialId} setSelectedMaterialId={setSelectedMaterialId}
							selectedShade={selectedShade} setSelectedShade={setSelectedShade} selectedLab={selectedLab} setSelectedLab={setSelectedLab}
							allLaboratories={allLaboratories} customLabs={customLabs} setCustomLabs={setCustomLabs} effectiveDueDate={effectiveDueDate} setCustomDueDate={setCustomDueDate}
							isUrgent={isUrgent} setIsUrgent={setIsUrgent} isWarrantyRework={isWarrantyRework} setIsWarrantyRework={setIsWarrantyRework} onOpen3DScan={handleOpenNewOrder3DScan} notes={notes} setNotes={setNotes}
							teethCount={teethCount} totalLabCostKopecks={totalLabCostKopecks} totalPatientPriceKopecks={totalPatientPriceKopecks} netClinicRevenueKopecks={netClinicRevenueKopecks}
							handleCreateOrder={handleCreateOrder} handlePrintA5Blank={handlePrintA5Blank} handleCourierBlank={handleCourierBlank}
						/>
						{/* ПРАВАЯ КОЛОНКА: Оперативный реестр последних нарядов */}
						{renderRegistryPanel("dental-lab-right-column mobile-hidden", "space-y-3 overflow-y-auto max-h-[64vh] pr-1")}
					</div>
				)}
			</div>
		</div>
	);
};

export default DentalLabStudioModal;
