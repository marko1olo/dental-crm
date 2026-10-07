/**
 * DentalLabOrdersHubModal.tsx — Интерактивный хаб наряд-заказов зуботехнической лаборатории (ЗТЛ).
 * 
 * КЛИНИЧЕСКИЙ ФУНКЦИОНАЛ (WAVE 8):
 * • 4-колоночная канбан-доска стадий клинического цикла:
 *   1. Черновик (draft)
 *   2. Отправлено в ЗТЛ (sent_to_lab)
 *   3. Примерка назначена (fitting_scheduled)
 *   4. Сдано пациенту (installed_completed)
 * • Баннер детекции дедлайнов и критических задержек ЗТЛ (isDelayedAlert).
 * • Привязка даты примерки к расписанию приемов (fittingDate, appointmentId).
 * • Фильтры по лабораториям, статусам, типам конструкций и текстовый поиск.
 * • Создание новых нарядов с автоматическим расчетом себестоимости и ЗП врача в копейках.
 * • Экспорт в CSV (RFC 4180) и печать бланка наряда А4 для курьера лаборатории.
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import {
	FlaskConical, Plus, Download, X, Search, AlertTriangle, Printer, CheckCircle2, RefreshCw,
} from "lucide-react";
import "./dentalLabWorkflow.css";
import {
	ORTHOPEDIC_WORK_TYPES, type LabWorkflowStatus, LAB_WORKFLOW_STATUSES,
	type DentalLabWorkflowOrder, advanceLabOrderStage, advanceLabOrderTechStage,
	sendOrderToWarrantyRework, getNextLabProductionStage,
	generateDentalLabOrderA4PrintBlank, exportDentalLabOrdersToCsv,
} from "./dentalLabWorkflowEngine";
import {
	LAB_TECHNOLOGICAL_STAGES, LAB_TECHNOLOGICAL_STAGE_ORDER, type LabTechnologicalStageId,
} from "./orders/labWorkOrderPresets";
import { mapRawApiOrderToWorkflowOrder } from "./dentalLabApiMapper";
import { formatRuDate } from "./dentalLabOrderEngine";
import { DentalLabOrdersKanbanBoard } from "./DentalLabOrdersKanbanBoard";
import { DentalLabCreateOrderModal } from "./DentalLabCreateOrderModal";
import { DentalLabOrderDetailsModal, type ActionPromptState } from "./DentalLabOrderDetailsModal";
import { DentalLabReadyInClinicModal, type ReadyInClinicLabOrder } from "./DentalLabReadyInClinicModal";

export interface DentalLabOrdersHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialOrders?: readonly DentalLabWorkflowOrder[] | undefined;
	readonly onSaveOrder?: ((order: DentalLabWorkflowOrder) => void) | undefined;
	readonly currentDoctorName?: string | undefined;
	readonly currentPatientName?: string | undefined;
	readonly currentPatientId?: string | undefined;
	readonly currentToothNumber?: number | string | undefined;
	readonly treatmentPlanAgeDays?: number | undefined;
	readonly isPlanExpired?: boolean | undefined;
}

// ─── ДЕФОЛТНЫЕ КЛИНИЧЕСКИЕ ДАННЫЕ ДЛЯ РЕАЛИЗМА ────────────────────────────────

const SAMPLE_LABS = [
	"CAD/CAM Центр Дентал-Мастер",
	"ArtDent Премиум Лаб",
	"ZirconLab Pro",
	"Центральная зуботехническая лаборатория",
] as const;

export const DentalLabOrdersHubModal: React.FC<DentalLabOrdersHubModalProps> = ({
	isOpen,
	onClose,
	initialOrders,
	onSaveOrder,
	currentDoctorName,
	currentPatientName,
	currentPatientId,
	currentToothNumber,
	treatmentPlanAgeDays,
	isPlanExpired,
}) => {
	// Состояние реестра нарядов (Мандат 8y: Честный пустой продакшн vs Демо через живую БД)
	const [orders, setOrders] = useState<DentalLabWorkflowOrder[]>(() => {
		if (initialOrders && initialOrders.length > 0) {
			return [...initialOrders];
		}
		return [];
	});

	// Синхронизация при внешнем изменении initialOrders
	useEffect(() => {
		if (initialOrders) {
			setOrders([...initialOrders]);
		}
	}, [initialOrders]);

	// Live synchronization with PostgreSQL 18 lab orders (Mandates 8e, 8b, 8n)
	useEffect(() => {
		if (!isOpen || (initialOrders && initialOrders.length > 0)) return;
		let cancelled = false;

		async function loadLabOrders() {
			try {
				const query = currentPatientId ? `?patientId=${encodeURIComponent(currentPatientId)}` : "";
				const res = await fetch(`/api/dental-lab/orders${query}`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) {
					if (!cancelled) {
						setOrders([]);
					}
					return;
				}
				const data = await res.json();
				if (cancelled || !data) return;

				const list = Array.isArray(data)
					? data
					: Array.isArray(data?.orders)
					? data.orders
					: Array.isArray(data?.data)
					? data.data
					: [];

				if (list.length > 0) {
					const mapped: DentalLabWorkflowOrder[] = list.map((raw: any, idx: number) =>
						mapRawApiOrderToWorkflowOrder(raw, idx, currentPatientId, currentPatientName, currentDoctorName),
					);
					setOrders(mapped);
				} else {
					setOrders([]);
				}
			} catch (err) {
				console.warn("[DentalLabOrdersHubModal] Failed to load live lab orders:", err);
				if (!cancelled) {
					setOrders([]);
				}
			}
		}

		loadLabOrders();
		return () => {
			cancelled = true;
		};
	}, [isOpen, initialOrders, currentPatientId, currentPatientName, currentDoctorName]);

	// Фильтры и поиск
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedLab, setSelectedLab] = useState<string>("ALL");
	const [selectedWorkType, setSelectedWorkType] = useState<string>("ALL");
	const [selectedStage, setSelectedStage] = useState<string>("ALL");
	const [selectedDateRange, setSelectedDateRange] = useState<"ALL" | "today" | "week">("ALL");
	const [onlyDelayedFilter, setOnlyDelayedFilter] = useState<boolean>(false);

	// Модальные окна
	const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
	const [inspectingOrder, setInspectingOrder] = useState<DentalLabWorkflowOrder | null>(null);
	const [warrantyReworkOrder, setWarrantyReworkOrder] = useState<DentalLabWorkflowOrder | null>(null);
	const [actionPrompt, setActionPrompt] = useState<ActionPromptState | null>(null);
	const [activeCardMenuOrderId, setActiveCardMenuOrderId] = useState<string | null>(null);
	const [stageLimits, setStageLimits] = useState<Record<string, number>>({});

	// Ready in clinic 1-click schedule/SMS modal state (Mandates 8b, 8e, 8n)
	const [isReadyInClinicModalOpen, setIsReadyInClinicModalOpen] = useState<boolean>(false);
	const [readyInClinicOrder, setReadyInClinicOrder] = useState<ReadyInClinicLabOrder | null>(null);

	const handleOpenReadyInClinicPrompt = useCallback((order: DentalLabWorkflowOrder) => {
		const target: ReadyInClinicLabOrder = {
			id: order.id,
			orderNumber: order.orderNumber,
			patientId: order.patientId,
			patientName: order.patientName,
			doctorName: order.doctorName,
			toothFdi: Array.isArray(order.selectedTeeth) ? order.selectedTeeth.join(", ") : undefined,
			material: order.materialName,
			colorVita: order.shadeCode,
			constructionType: order.workTypeId,
			clinicName: order.clinicName || "DENTE",
		};
		setReadyInClinicOrder(target);
		setIsReadyInClinicModalOpen(true);
	}, []);

	// Всплывающие уведомления (Мандат 8e / Мгновенная обратная связь врачу)
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const showToast = useCallback((msg: string) => {
		setToastMessage(msg);
		setTimeout(() => setToastMessage(null), 3500);
	}, []);

	// Статистика и детекция
	const delayedOrders = useMemo(() => {
		return orders.filter((ord) => ord.isDelayedAlert || ord.delayAlert.isDelayedAlert);
	}, [orders]);

	const totalLabCostRub = useMemo(() => {
		return orders.reduce((sum, ord) => sum + ord.financials.labCostTotalRub, 0);
	}, [orders]);

	const totalPatientPriceRub = useMemo(() => {
		return orders.reduce((sum, ord) => sum + ord.financials.patientPriceTotalRub, 0);
	}, [orders]);

	// Фильтрация нарядов
	const filteredOrders = useMemo(() => {
		const todayIso = new Date().toISOString().slice(0, 10);
		const weekAheadDate = new Date();
		weekAheadDate.setDate(weekAheadDate.getDate() + 7);
		const weekAheadIso = weekAheadDate.toISOString().slice(0, 10);

		return orders.filter((ord) => {
			if (onlyDelayedFilter && !ord.isDelayedAlert && !ord.delayAlert.isDelayedAlert) {
				return false;
			}
			if (selectedLab !== "ALL" && ord.labName !== selectedLab) {
				return false;
			}
			if (selectedWorkType !== "ALL" && ord.workTypeId !== selectedWorkType) {
				return false;
			}
			if (selectedStage !== "ALL") {
				if (selectedStage === "in_work") {
					if (ord.currentStage !== "sent_to_lab") return false;
				} else if (ord.currentStage !== selectedStage) {
					return false;
				}
			}
			if (selectedDateRange === "today") {
				const isToday = ord.expectedLabDateIso === todayIso || ord.fittingDate === todayIso;
				if (!isToday) return false;
			} else if (selectedDateRange === "week") {
				const targetDate = ord.expectedLabDateIso || ord.fittingDate || "";
				if (!targetDate || targetDate < todayIso || targetDate > weekAheadIso) {
					return false;
				}
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const matchNum = ord.orderNumber.toLowerCase().includes(q);
				const matchPatient = ord.patientName.toLowerCase().includes(q);
				const matchDoctor = ord.doctorName.toLowerCase().includes(q);
				const matchTeeth = ord.selectedTeeth.some((t) => String(t).includes(q));
				const matchAppt = ord.appointmentId ? ord.appointmentId.toLowerCase().includes(q) : false;
				if (!matchNum && !matchPatient && !matchDoctor && !matchTeeth && !matchAppt) {
					return false;
				}
			}
			return true;
		});
	}, [orders, onlyDelayedFilter, selectedLab, selectedWorkType, selectedStage, selectedDateRange, searchQuery]);

	// Группировка по стадиям клинического цикла
	const ordersByStage = useMemo(() => {
		const map: Record<LabWorkflowStatus, DentalLabWorkflowOrder[]> = {
			draft: [],
			sent_to_lab: [],
			fitting_scheduled: [],
			installed_completed: [],
			warranty_rework: [],
		};

		for (const ord of filteredOrders) {
			if (map[ord.currentStage]) {
				map[ord.currentStage].push(ord);
			} else {
				map.draft.push(ord);
			}
		}
		return map;
	}, [filteredOrders]);

	// Перевод заказа на следующий этап с синхронизацией в БД через REST API (Мандат 8e, 8b, 8n)
	const handleAdvanceStage = useCallback((order: DentalLabWorkflowOrder) => {
		const nextStage = getNextLabProductionStage(order.currentStage);
		if (!nextStage) return;

		const updated = advanceLabOrderStage(
			order,
			nextStage,
			"Врач-ортопед",
			`Плановый перевод на статус ${LAB_WORKFLOW_STATUSES[nextStage].nameRu}`,
		);

		setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
		if (onSaveOrder) onSaveOrder(updated);
		showToast(`Наряд № ${order.orderNumber}: переведен в статус «${LAB_WORKFLOW_STATUSES[nextStage].nameRu}»`);

		// Real REST API PATCH request to PostgreSQL 18 backend (Mandates 8e, 8b, 8n)
		fetch(`/api/dental-lab/orders/${order.id}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify({
				stage: nextStage,
				notes: `Плановый перевод на статус ${LAB_WORKFLOW_STATUSES[nextStage].nameRu}`,
			}),
		}).catch((err) => {
			console.warn("[DentalLabOrdersHubModal] Failed to patch stage on server:", err);
		});

		if (nextStage === "fitting_scheduled") {
			handleOpenReadyInClinicPrompt(updated);
		}
	}, [handleOpenReadyInClinicPrompt, onSaveOrder, showToast]);

	// Перевод на технологический этап ЗТЛ (1..8) с сохранением в БД через REST API
	const handleAdvanceTechStage = useCallback((order: DentalLabWorkflowOrder, targetTechStage?: LabTechnologicalStageId) => {
		const stages = LAB_TECHNOLOGICAL_STAGE_ORDER;
		const currentIndex = stages.indexOf(order.techStage || "impression_scan");
		const nextTechStage = targetTechStage || (currentIndex >= 0 && currentIndex < stages.length - 1 ? stages[currentIndex + 1] : undefined);
		if (!nextTechStage) return;

		const updated = advanceLabOrderTechStage(
			order,
			nextTechStage,
			"Врач-ортопед",
			`Переход на технологический этап: ${LAB_TECHNOLOGICAL_STAGES[nextTechStage].nameRu}`,
		);

		setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
		if (inspectingOrder && inspectingOrder.id === order.id) setInspectingOrder(updated);
		if (onSaveOrder) onSaveOrder(updated);
		showToast(`Наряд № ${order.orderNumber}: этап ЗТЛ обновлен на «${LAB_TECHNOLOGICAL_STAGES[nextTechStage].shortTitleRu}»`);

		// Real REST API PATCH request to PostgreSQL 18 backend (Mandates 8e, 8b, 8n)
		fetch(`/api/dental-lab/orders/${order.id}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify({
				stage: nextTechStage,
				notes: `Переход на технологический этап: ${LAB_TECHNOLOGICAL_STAGES[nextTechStage].nameRu}`,
			}),
		}).catch((err) => {
			console.warn("[DentalLabOrdersHubModal] Failed to patch tech stage on server:", err);
		});

		if (nextTechStage === "ready_in_clinic") {
			handleOpenReadyInClinicPrompt(updated);
		}
	}, [handleOpenReadyInClinicPrompt, inspectingOrder, onSaveOrder, showToast]);

	// Отправка на гарантийную переделку / рекламацию в ЗТЛ с записью в БД
	const handleWarrantyReworkSubmit = useCallback((order: DentalLabWorkflowOrder, reason: string) => {
		const updated = sendOrderToWarrantyRework(
			order,
			reason,
			"Врач-ортопед",
		);

		setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
		if (onSaveOrder) onSaveOrder(updated);
		showToast(`Наряд № ${order.orderNumber}: оформлена гарантийная рекламация (0 ₽ для пациента)`);
		setWarrantyReworkOrder(null);

		// Real REST API PATCH request to PostgreSQL 18 backend (Mandates 8e, 8b, 8n)
		fetch(`/api/dental-lab/orders/${order.id}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify({
				stage: "warranty_rework",
				status: "refitting",
				notes: `Гарантийная рекламация: ${reason}`,
			}),
		}).catch((err) => {
			console.warn("[DentalLabOrdersHubModal] Failed to patch warranty rework on server:", err);
		});
	}, [onSaveOrder, showToast]);

	const handleAttachBitePhoto = useCallback((order: DentalLabWorkflowOrder) => {
		setActionPrompt({
			order,
			type: "bite_photo",
			title: `Прикрепить фото прикуса — Наряд № ${order.orderNumber}`,
			label: "URL фото окклюзии/прикуса или ссылка на снимок:",
			placeholder: "https://...",
		});
	}, []);

	const handleTechnicianComment = useCallback((order: DentalLabWorkflowOrder) => {
		setActionPrompt({
			order,
			type: "technician_comment",
			title: `Комментарий зубному технику — Наряд № ${order.orderNumber}`,
			label: "Клинические указания / уточнение для зубного техника:",
			placeholder: "Укажите особенности анатомии, прозрачности, контактных пунктов...",
		});
	}, []);

	const handleActionPromptSubmit = useCallback((order: DentalLabWorkflowOrder, type: "bite_photo" | "technician_comment", value: string) => {
		const prefix = type === "bite_photo" ? "[Фото прикуса]" : "[Технику]";
		const toastText = type === "bite_photo" ? "фото прикуса сохранено" : "комментарий технику сохранен";

		const updated: DentalLabWorkflowOrder = {
			...order,
			clinicalNotes: `${order.clinicalNotes ? `${order.clinicalNotes}\n` : ""}${prefix}: ${value}`,
		};

		setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
		if (inspectingOrder && inspectingOrder.id === order.id) setInspectingOrder(updated);
		if (onSaveOrder) onSaveOrder(updated);
		showToast(`Наряд № ${order.orderNumber}: ${toastText}`);
		setActionPrompt(null);

		// Real REST API PATCH request to PostgreSQL 18 backend (Mandates 8e, 8b, 8n)
		fetch(`/api/dental-lab/orders/${order.id}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify({
				notes: `${prefix}: ${value}`,
			}),
		}).catch((err) => {
			console.warn("[DentalLabOrdersHubModal] Failed to patch notes on server:", err);
		});
	}, [inspectingOrder, onSaveOrder, showToast]);

	const handleRepeatFitting = useCallback((order: DentalLabWorkflowOrder) => {
		const updated = advanceLabOrderStage(order, "fitting_scheduled", "Врач-ортопед", "Назначена повторная клиническая примерка");
		setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
		if (onSaveOrder) onSaveOrder(updated);
		showToast(`Наряд № ${order.orderNumber}: переведен на повторную примерку`);

		// Real REST API PATCH request to PostgreSQL 18 backend (Mandates 8e, 8b, 8n)
		fetch(`/api/dental-lab/orders/${order.id}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify({
				stage: "fitting_scheduled",
				status: "refitting",
				notes: "Назначена повторная клиническая примерка",
			}),
		}).catch((err) => {
			console.warn("[DentalLabOrdersHubModal] Failed to patch repeat fitting on server:", err);
		});
	}, [onSaveOrder, showToast]);

	// Создание нового наряда
	const handleCreateOrder = useCallback((created: DentalLabWorkflowOrder) => {
		setOrders((prev) => [created, ...prev]);
		if (onSaveOrder) onSaveOrder(created);
		const fittingMsg = created.fittingDate ? ` · Забронирован визит на примерку: ${formatRuDate(created.fittingDate)}` : "";
		showToast(`Наряд № ${created.orderNumber} успешно создан${fittingMsg}`);

		// Dispatch reactive event for CRM and chairside synchronization
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-created", { detail: created }),
			);
		}

		// Persist lab order to PostgreSQL 18 backend (Mandates 8e, 8b, 8n)
		fetch("/api/clinical/lab-orders", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify({
				orderNumber: created.orderNumber,
				patientId: created.patientId,
				patientName: created.patientName,
				doctorId: created.doctorId,
				doctorName: created.doctorName,
				clinicName: created.clinicName,
				labName: created.labName,
				workTypeId: created.workTypeId,
				materialName: created.materialName,
				toothFdi: created.selectedTeeth.join(","),
				shadeCode: created.shadeCode,
				stumpShadeCode: created.stumpShadeCode,
				priceRub: created.financials.patientPriceTotalRub,
				costRub: created.financials.labCostTotalRub,
				status: created.currentStage,
				expectedLabDate: created.expectedLabDateIso,
				fittingDate: created.fittingDate,
				appointmentId: created.appointmentId,
				clinicalNotes: created.clinicalNotes,
				implantPlatform: created.implantPlatform,
				abutmentType: created.abutmentType,
				fixationType: created.fixationType,
				techStage: created.techStage,
			}),
		}).catch((err) => {
			console.warn("[DentalLabOrdersHubModal] Failed to persist lab order to backend:", err);
		});
	}, [onSaveOrder, showToast]);

	// Печать строгого бланка А4
	const handlePrintBlank = useCallback((order: DentalLabWorkflowOrder) => {
		const html = generateDentalLabOrderA4PrintBlank(order);
		const win = window.open("", "_blank");
		if (win) {
			win.document.open();
			win.document.write(html);
			win.document.close();
			win.focus();
			setTimeout(() => {
				win.print();
			}, 300);
		}
	}, []);

	// Экспорт в CSV
	const handleExportCsv = useCallback(() => {
		const csvContent = exportDentalLabOrdersToCsv(filteredOrders);
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", `Наряды_ЗТЛ_DENTE_${new Date().toISOString().slice(0, 10)}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		showToast(`Экспортировано ${filteredOrders.length} нарядов в CSV`);
	}, [filteredOrders, showToast]);

	if (!isOpen) return null;

	return (
		<div className="ztl-modal-overlay">
			<div className="ztl-modal-container">
				{/* ─── ВСПЛЫВАЮЩИЙ ТОСТ МГНОВЕННОЙ ОБРАТНОЙ СВЯЗИ (МАНДАТ 8E) ─── */}
				{toastMessage && (
					<div className="ztl-toast" role="status">
						<CheckCircle2 size={16} />
						<span>{toastMessage}</span>
					</div>
				)}

				{/* ─── 1. ВЕРХНЯЯ ШАПКА ХАБА ЗТЛ ───────────────────────────────── */}
				<header className="ztl-modal-header">
					<div className="ztl-header-left">
						<div className="ztl-header-icon-badge">
							<FlaskConical size={20} />
						</div>
						<div>
							<h2 className="ztl-modal-title">
								Наряды в зуботехническую лабораторию (ЗТЛ)
							</h2>
							<p className="ztl-modal-subtitle">
								Клинический ортопедический протокол • Сверка дедлайнов • Контроль себестоимости и ЗП
							</p>
						</div>
					</div>

					<div className="ztl-header-kpi-strip">
						<div className="ztl-kpi-item">
							<span className="ztl-kpi-label">Всего нарядов</span>
							<span className="ztl-kpi-value">{orders.length}</span>
						</div>
						<div className="ztl-kpi-item">
							<span className="ztl-kpi-label">Задержки ЗТЛ</span>
							<span className={`ztl-kpi-value ${delayedOrders.length > 0 ? "has-alerts" : ""}`}>
								{delayedOrders.length}
							</span>
						</div>
						<div className="ztl-kpi-item">
							<span className="ztl-kpi-label">Затраты ЗТЛ</span>
							<span className="ztl-kpi-value">{totalLabCostRub.toLocaleString("ru-RU")} ₽</span>
						</div>
						<div className="ztl-kpi-item">
							<span className="ztl-kpi-label">Выручка клиники</span>
							<span className="ztl-kpi-value highlighted">
								{totalPatientPriceRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>
					</div>

					<div className="ztl-header-actions">
						<button
							type="button"
							className="ztl-btn-secondary"
							onClick={handleExportCsv}
							title="Экспорт реестра в CSV (Excel)"
						>
							<Download size={14} />
							<span>Экспорт CSV</span>
						</button>

						<button
							type="button"
							className="ztl-btn-primary"
							onClick={() => setIsCreateModalOpen(true)}
							title="Создать новый наряд в лабораторию"
						>
							<Plus size={14} />
							<span>Новый наряд ЗТЛ</span>
						</button>

						<button
							type="button"
							className="ztl-btn-icon"
							onClick={onClose}
							title="Закрыть окно"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* ─── КЛИНИЧЕСКИЙ РЕГЛАМЕНТ АВТОНОМИИ ВРАЧА (МАНДАТ 8E) ─── */}
				{(treatmentPlanAgeDays !== undefined && treatmentPlanAgeDays > 30) || isPlanExpired ? (
					<div
						style={{
							background: "rgba(16, 185, 129, 0.08)",
							border: "1px solid rgba(16, 185, 129, 0.3)",
							color: "var(--ok-fg, #059669)",
							padding: "6px 14px",
							borderRadius: "6px",
							fontSize: "12px",
							display: "flex",
							alignItems: "center",
							gap: "8px",
							margin: "0 1.25rem 0.5rem 1.25rem",
						}}
						role="note"
					>
						<CheckCircle2 size={15} style={{ color: "var(--ok-fg, #10b981)", flexShrink: 0 }} />
						<span>
							<strong>Клинический регламент:</strong> План составлен более 30 дней назад{treatmentPlanAgeDays !== undefined ? ` (${treatmentPlanAgeDays} дн.)` : ""}, цены могут быть скорректированы, но это <strong>не блокирует</strong> оформление нарядов ЗТЛ, оказание услуг или взаиморасчеты.
						</span>
					</div>
				) : null}

				{/* ─── 2. БАННЕР КРИТИЧЕСКИХ ЗАДЕРЖЕК ЗТЛ (isDelayedAlert) ────────── */}
				{delayedOrders.length > 0 && (
					<div className="ztl-delay-banner" role="alert">
						<div className="ztl-delay-banner-left">
							<AlertTriangle size={16} />
							<span>
								Обнаружено <strong>{delayedOrders.length}</strong> заказов с задержкой ЗТЛ или конфликтом даты примерки!
							</span>
							<span className="ztl-delay-badge-count">Задержка ({delayedOrders.length})</span>
						</div>
						<button
							type="button"
							className="ztl-btn-secondary min-h-[36px] sm:min-h-[32px] px-3 py-1.5 text-xs font-semibold"
							style={{ borderColor: "var(--bad-fg, #fca5a5)", color: "var(--bad-fg, #e11d48)" }}
							onClick={() => setOnlyDelayedFilter((prev) => !prev)}
						>
							{onlyDelayedFilter ? "Показать все заказы" : "Показать проблемные наряды"}
						</button>
					</div>
				)}

				{/* ─── 3. ПАНЕЛЬ ФИЛЬТРОВ И ПОИСКА ──────────────────────────────── */}
				{orders.length > 0 && (
					<section className="ztl-filter-bar" aria-label="Фильтры наряд-заказов">
						<div className="ztl-search-input-wrap">
							<Search size={14} className="ztl-search-icon" />
							<input
								type="text"
								className="ztl-search-input"
								placeholder="Поиск: номер наряда, пациент, врач, зуб, прием..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
							{searchQuery && (
								<button
									type="button"
									className="ztl-search-clear"
									onClick={() => setSearchQuery("")}
									aria-label="Очистить поиск"
								>
									<X size={12} />
								</button>
							)}
						</div>

						<select
							className="ztl-select"
							value={selectedLab}
							onChange={(e) => setSelectedLab(e.target.value)}
							aria-label="Фильтр по лаборатории"
						>
							<option value="ALL">Все лаборатории</option>
							{SAMPLE_LABS.map((lab) => (
								<option key={lab} value={lab}>
									{lab}
								</option>
							))}
						</select>

						<select
							className="ztl-select"
							value={selectedWorkType}
							onChange={(e) => setSelectedWorkType(e.target.value)}
							aria-label="Фильтр по конструкции"
						>
							<option value="ALL">Все виды конструкций</option>
							{Object.values(ORTHOPEDIC_WORK_TYPES).map((type) => (
								<option key={type.id} value={type.id}>
									{type.nameRu}
								</option>
							))}
						</select>

						<select
							className="ztl-select"
							value={selectedStage}
							onChange={(e) => setSelectedStage(e.target.value)}
							aria-label="Фильтр по этапу"
							title="Фильтр заказов по статусу (Закон Хика)"
						>
							<option value="ALL">Все этапы</option>
							<option value="sent_to_lab">Отправлен</option>
							<option value="in_work">В работе</option>
							<option value="draft">Принят</option>
							<option value="fitting_scheduled">Готов</option>
							<option value="installed_completed">Припасован</option>
							<option value="warranty_rework">Рекламация (0 ₽)</option>
						</select>

						<select
							className="ztl-select"
							value={selectedDateRange}
							onChange={(e) => setSelectedDateRange(e.target.value as "ALL" | "today" | "week")}
							aria-label="Фильтр по срокам"
						>
							<option value="ALL">Все сроки</option>
							<option value="today">Готовность сегодня</option>
							<option value="week">Ближайшие 7 дней</option>
						</select>

						<div className="dente-segmented-bar ztl-stage-chips-group" role="tablist">
							{[
								{ id: "ALL", label: "Все" },
								{ id: "sent_to_lab", label: "Отправлен" },
								{ id: "in_work", label: "В работе" },
								{ id: "draft", label: "Принят" },
								{ id: "fitting_scheduled", label: "Готов" },
								{ id: "installed_completed", label: "Припасован" },
							].map((st) => (
								<button
									key={st.id}
									type="button"
									role="tab"
									aria-selected={selectedStage === st.id}
									className={`dente-segmented-item ${selectedStage === st.id ? "active" : ""}`}
									onClick={() => setSelectedStage(st.id)}
									data-testid={`ztl-filter-stage-${st.id}`}
									title={`Фильтр статуса: ${st.label}`}
								>
									<span>{st.label}</span>
								</button>
							))}
						</div>

						<div className="ztl-filter-chips">
							<button
								type="button"
								className={`ztl-chip alert-chip ${onlyDelayedFilter ? "active" : ""}`}
								onClick={() => setOnlyDelayedFilter((prev) => !prev)}
							>
								<AlertTriangle size={12} />
								<span>Задержки ({delayedOrders.length})</span>
							</button>
							{(searchQuery || selectedLab !== "ALL" || selectedWorkType !== "ALL" || selectedStage !== "ALL" || selectedDateRange !== "ALL" || onlyDelayedFilter) && (
								<button
									type="button"
									className="ztl-chip"
									onClick={() => {
										setSearchQuery("");
										setSelectedLab("ALL");
										setSelectedWorkType("ALL");
										setSelectedStage("ALL");
										setSelectedDateRange("ALL");
										setOnlyDelayedFilter(false);
									}}
								>
									<RefreshCw size={11} />
									<span>Сброс</span>
								</button>
							)}
						</div>
					</section>
				)}

				{/* ─── 4. КАНБАН-ДОСКА ИЛИ ЧЕСТНЫЙ EMPTY STATE ─────────────────── */}
				{orders.length === 0 ? (
					<main className="ztl-empty-state" role="status">
						<div className="ztl-empty-icon-wrap">
							<FlaskConical size={36} />
						</div>
						<h3 className="ztl-empty-title">Нет нарядов в зуботехническую лабораторию</h3>
						<p className="ztl-empty-desc">
							Оформите первый заказ на изготовление коронок, мостовидных или съемных протезов для передачи в зуботехническую лабораторию (ЗТЛ).
						</p>
						<button
							type="button"
							className="ztl-btn-primary"
							onClick={() => setIsCreateModalOpen(true)}
							title="Создать наряд-заказ в лабораторию"
							data-testid="hub-empty-create-lab-order-btn"
						>
							<Plus size={14} />
							<span>+ Создать наряд-заказ в лабораторию</span>
						</button>
					</main>
				) : (
					<DentalLabOrdersKanbanBoard
						ordersByStage={ordersByStage}
						stageLimits={stageLimits}
						setStageLimits={setStageLimits}
						activeCardMenuOrderId={activeCardMenuOrderId}
						setActiveCardMenuOrderId={setActiveCardMenuOrderId}
						onInspectOrder={setInspectingOrder}
						onAdvanceStage={handleAdvanceStage}
						onPrintBlank={handlePrintBlank}
						onAttachBitePhoto={handleAttachBitePhoto}
						onTechnicianComment={handleTechnicianComment}
						onRepeatFitting={handleRepeatFitting}
						onRequestWarrantyRework={setWarrantyReworkOrder}
					/>
				)}

				{/* ─── 5. МОДАЛЬНОЕ ОКНО СОЗДАНИЯ НОВОГО НАКАЗА ──────────────────── */}
				<DentalLabCreateOrderModal
					isOpen={isCreateModalOpen}
					onClose={() => setIsCreateModalOpen(false)}
					onCreateOrder={handleCreateOrder}
					sampleLabs={SAMPLE_LABS}
					currentDoctorName={currentDoctorName}
					currentPatientName={currentPatientName}
					currentPatientId={currentPatientId}
					currentToothNumber={currentToothNumber}
				/>

				{/* ─── 6. ДЕТАЛИ НАКАЗА, РЕКЛАМАЦИЯ И ACTION PROMPT МОДАЛКИ ──────── */}
				<DentalLabOrderDetailsModal
					inspectingOrder={inspectingOrder}
					onCloseInspect={() => setInspectingOrder(null)}
					onPrintBlank={handlePrintBlank}
					onAdvanceTechStage={handleAdvanceTechStage}
					onOpenWarrantyRework={(ord) => {
						setInspectingOrder(null);
						setWarrantyReworkOrder(ord);
					}}
					warrantyReworkOrder={warrantyReworkOrder}
					onCloseWarrantyRework={() => setWarrantyReworkOrder(null)}
					onWarrantyReworkSubmit={handleWarrantyReworkSubmit}
					actionPrompt={actionPrompt}
					onCloseActionPrompt={() => setActionPrompt(null)}
					onActionPromptSubmit={handleActionPromptSubmit}
				/>

				{/* ─── 7. МОДАЛЬНОЕ ОКНО БЫСТРОЙ ЗАПИСИ И ШАБЛОНОВ SMS / WHATSAPP ─── */}
				<DentalLabReadyInClinicModal
					isOpen={isReadyInClinicModalOpen}
					onClose={() => setIsReadyInClinicModalOpen(false)}
					order={readyInClinicOrder}
				/>
			</div>
		</div>
	);
};
