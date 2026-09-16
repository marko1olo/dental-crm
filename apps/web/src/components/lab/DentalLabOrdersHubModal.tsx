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
 * • 1-клик экспорт в CSV (RFC 4180) и печать бланка наряда А4 для курьера лаборатории.
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	FlaskConical,
	Plus,
	Download,
	X,
	Search,
	AlertTriangle,
	Printer,
	ChevronRight,
	Calendar,
	Camera,
	CheckCircle2,
	Eye,
	RefreshCw,
	Building2,
	Coins,
	FileText,
	Clock,
	Truck,
	RotateCcw,
	Send,
	MessageSquare,
	MoreHorizontal,
	MoreVertical,
} from "lucide-react";
import "./dentalLabWorkflow.css";
import {
	OrthopedicWorkTypeId,
	ORTHOPEDIC_WORK_TYPES,
	LabWorkflowStatus,
	LAB_WORKFLOW_STATUSES,
	LAB_WORKFLOW_STATUS_ORDER,
	ALL_LAB_WORKFLOW_STATUSES,
	DentalLabWorkflowOrder,
	createDentalLabOrder,
	advanceLabOrderStage,
	advanceLabOrderTechStage,
	sendOrderToWarrantyRework,
	getNextLabProductionStage,
	generateDentalLabOrderA4PrintBlank,
	exportDentalLabOrdersToCsv,
	formatRussianDate,
} from "./dentalLabWorkflowEngine";
import {
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	VITA_BLEACH_SHADES,
	STUMP_SHADES_ND,
	IMPLANT_PLATFORMS,
	ABUTMENT_TYPE_OPTIONS,
	FIXATION_TYPES,
	LAB_TECHNOLOGICAL_STAGES,
	LAB_TECHNOLOGICAL_STAGE_ORDER,
	ImplantPlatformType,
	AbutmentCategoryType,
	FixationType,
	LabTechnologicalStageId,
} from "./orders/labWorkOrderPresets";

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
];

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
	// Состояние реестра нарядов
	const [orders, setOrders] = useState<DentalLabWorkflowOrder[]>(() => {
		return initialOrders && initialOrders.length > 0
			? [...initialOrders]
			: [];
	});

	// Синхронизация при внешнем изменении initialOrders
	React.useEffect(() => {
		if (initialOrders) {
			setOrders([...initialOrders]);
		}
	}, [initialOrders]);

	// Фильтры
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedLab, setSelectedLab] = useState<string>("ALL");
	const [selectedWorkType, setSelectedWorkType] = useState<string>("ALL");
	const [onlyDelayedFilter, setOnlyDelayedFilter] = useState<boolean>(false);

	// Модалка создания / деталей наряда
	const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
	const [inspectingOrder, setInspectingOrder] = useState<DentalLabWorkflowOrder | null>(null);
	const [warrantyReworkOrder, setWarrantyReworkOrder] = useState<DentalLabWorkflowOrder | null>(null);
	const [warrantyReason, setWarrantyReason] = useState<string>("Скол керамической облицовки");
	const [activeCardMenuOrderId, setActiveCardMenuOrderId] = useState<string | null>(null);

	// Неблокирующие диалоги ввода (Мандат 8e / Anti-Blocking Prompt)
	const [actionPrompt, setActionPrompt] = useState<{
		order: DentalLabWorkflowOrder;
		type: "bite_photo" | "technician_comment";
		title: string;
		label: string;
		placeholder: string;
	} | null>(null);
	const [actionPromptValue, setActionPromptValue] = useState<string>("");

	React.useEffect(() => {
		if (!activeCardMenuOrderId) return;
		const handleOutside = () => setActiveCardMenuOrderId(null);
		document.addEventListener("click", handleOutside);
		return () => document.removeEventListener("click", handleOutside);
	}, [activeCardMenuOrderId]);

	// Форма создания нового наряда
	const [newPatientName, setNewPatientName] = useState<string>(() => currentPatientName || "");
	const [newChartNumber, setNewChartNumber] = useState<string>("");
	const [newDoctorName, setNewDoctorName] = useState<string>(() => currentDoctorName || "");
	const [newLabName, setNewLabName] = useState<string>(SAMPLE_LABS[0] ?? "CAD/CAM Центр Дентал-Мастер");
	const [newWorkType, setNewWorkType] = useState<OrthopedicWorkTypeId>("crown_emax");
	const [newTeethInput, setNewTeethInput] = useState<string>(() =>
		currentToothNumber ? String(currentToothNumber) : ""
	);

	// Синхронизация полей формы при изменении входящих контекстных пропсов
	React.useEffect(() => {
		if (currentPatientName !== undefined) setNewPatientName(currentPatientName);
		if (currentDoctorName !== undefined) setNewDoctorName(currentDoctorName);
		if (currentToothNumber !== undefined) setNewTeethInput(String(currentToothNumber));
	}, [currentPatientName, currentDoctorName, currentToothNumber]);
	const [newShade, setNewShade] = useState<string>("A2");
	const [newStumpShade, setNewStumpShade] = useState<string>("ND2");
	const [newPriceRub, setNewPriceRub] = useState<number>(24000);
	const [newCostRub, setNewCostRub] = useState<number>(8000);
	const [newDoctorPercent, setNewDoctorPercent] = useState<number>(20);
	const [newInitialStatus, setNewInitialStatus] = useState<LabWorkflowStatus>("draft");
	const [newExpectedLabDate, setNewExpectedLabDate] = useState<string>(() => {
		const d = new Date();
		d.setDate(d.getDate() + 5);
		return d.toISOString().slice(0, 10);
	});
	const [newFittingDate, setNewFittingDate] = useState<string>(() => {
		const d = new Date();
		d.setDate(d.getDate() + 6);
		return d.toISOString().slice(0, 10);
	});
	const [newAppointmentId, setNewAppointmentId] = useState<string>("");
	const [newClinicalNotes, setNewClinicalNotes] = useState<string>("");
	const [newImplantPlatform, setNewImplantPlatform] = useState<ImplantPlatformType | "">("");
	const [newAbutmentType, setNewAbutmentType] = useState<AbutmentCategoryType | "">("");
	const [newFixationType, setNewFixationType] = useState<FixationType | "">("");
	const [newTechStage, setNewTechStage] = useState<LabTechnologicalStageId>("impression_scan");

	// Всплывающие уведомления (Мандат 8e / Мгновенная обратная связь врачу)
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const showToast = useCallback((msg: string) => {
		setToastMessage(msg);
		setTimeout(() => setToastMessage(null), 3500);
	}, []);

	// ─── СТАТИСТИКА И ДЕТЕКЦИЯ ───────────────────────────────────────────────

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
	}, [orders, onlyDelayedFilter, selectedLab, selectedWorkType, searchQuery]);

	// Группировка по стадиям клинического цикла (включая гарантийную переделку)
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
				// Fallback для неизвестных статусов
				map.draft.push(ord);
			}
		}
		return map;
	}, [filteredOrders]);

	// Перевод заказа на следующий этап
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
	}, [onSaveOrder, showToast]);

	// Перевод на технологический этап ЗТЛ (1..8)
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
	}, [inspectingOrder, onSaveOrder, showToast]);

	// Отправка на гарантийную переделку / рекламацию в ЗТЛ
	const handleWarrantyReworkSubmit = useCallback((e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!warrantyReworkOrder) return;

		const updated = sendOrderToWarrantyRework(
			warrantyReworkOrder,
			warrantyReason || "Гарантийная рекламация: скол / завышение прикуса",
			"Врач-ортопед",
		);

		setOrders((prev) => prev.map((o) => (o.id === warrantyReworkOrder.id ? updated : o)));
		if (onSaveOrder) onSaveOrder(updated);
		showToast(`Наряд № ${warrantyReworkOrder.orderNumber}: оформлена гарантийная рекламация (0 ₽ для пациента)`);
		setWarrantyReworkOrder(null);
	}, [warrantyReworkOrder, warrantyReason, onSaveOrder, showToast]);

	const handleAttachBitePhoto = useCallback((order: DentalLabWorkflowOrder) => {
		setActionPrompt({
			order,
			type: "bite_photo",
			title: `Прикрепить фото прикуса — Наряд № ${order.orderNumber}`,
			label: "URL фото окклюзии/прикуса или ссылка на снимок:",
			placeholder: "https://...",
		});
		setActionPromptValue("");
	}, []);

	const handleTechnicianComment = useCallback((order: DentalLabWorkflowOrder) => {
		setActionPrompt({
			order,
			type: "technician_comment",
			title: `Комментарий зубному технику — Наряд № ${order.orderNumber}`,
			label: "Клинические указания / уточнение для зубного техника:",
			placeholder: "Укажите особенности анатомии, прозрачности, контактных пунктов...",
		});
		setActionPromptValue("");
	}, []);

	const handleActionPromptSubmit = useCallback((e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!actionPrompt || !actionPromptValue.trim()) return;

		const { order, type } = actionPrompt;
		const prefix = type === "bite_photo" ? "[Фото прикуса]" : "[Технику]";
		const toastText = type === "bite_photo" ? "фото прикуса сохранено" : "комментарий технику сохранен";

		const updated: DentalLabWorkflowOrder = {
			...order,
			clinicalNotes: `${order.clinicalNotes ? `${order.clinicalNotes}\n` : ""}${prefix}: ${actionPromptValue.trim()}`,
		};

		setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
		if (inspectingOrder && inspectingOrder.id === order.id) setInspectingOrder(updated);
		if (onSaveOrder) onSaveOrder(updated);
		showToast(`Наряд № ${order.orderNumber}: ${toastText}`);
		setActionPrompt(null);
		setActionPromptValue("");
	}, [actionPrompt, actionPromptValue, inspectingOrder, onSaveOrder, showToast]);

	const handleRepeatFitting = useCallback((order: DentalLabWorkflowOrder) => {
		const updated = advanceLabOrderStage(order, "fitting_scheduled", "Врач-ортопед", "Назначена повторная клиническая примерка");
		setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
		if (onSaveOrder) onSaveOrder(updated);
		showToast(`Наряд № ${order.orderNumber}: переведен на повторную примерку`);
	}, [onSaveOrder, showToast]);

	// Создание нового наряда
	const handleCreateOrderSubmit = useCallback((e: React.FormEvent) => {
		e.preventDefault();
		if (!newPatientName.trim()) return;

		const teeth = newTeethInput
			.split(",")
			.map((s) => parseInt(s.trim(), 10))
			.filter((n) => !isNaN(n) && n >= 11 && n <= 48);

		const defaultTeeth = currentToothNumber && !isNaN(Number(currentToothNumber))
			? [Number(currentToothNumber)]
			: [11];

		const created = createDentalLabOrder({
			patientId: currentPatientId || `pat-${Date.now()}`,
			patientName: newPatientName.trim(),
			patientChartNumber: newChartNumber.trim() || "043/у",
			doctorId: "doc-current",
			doctorName: newDoctorName.trim() || currentDoctorName?.trim() || "Врач-ортопед",
			clinicName: "Стоматологическая клиника DENTE",
			labName: newLabName,
			workTypeId: newWorkType,
			selectedTeeth: teeth.length > 0 ? teeth : defaultTeeth,
			shadeCode: newShade,
			stumpShadeCode: newStumpShade,
			pricePerUnitRub: newPriceRub,
			costPerUnitRub: newCostRub,
			doctorPercent: newDoctorPercent,
			initialStatus: newInitialStatus,
			expectedLabDate: newExpectedLabDate,
			fittingDate: newFittingDate,
			appointmentId: newAppointmentId.trim() || undefined,
			clinicalNotes: newClinicalNotes.trim() || undefined,
			implantPlatform: newImplantPlatform || undefined,
			abutmentType: newAbutmentType || undefined,
			fixationType: newFixationType || undefined,
			techStage: newTechStage,
		});

		setOrders((prev) => [created, ...prev]);
		if (onSaveOrder) onSaveOrder(created);
		showToast(`Наряд № ${created.orderNumber} успешно создан`);

		// Сброс формы
		setIsCreateModalOpen(false);
		setNewPatientName(currentPatientName || "");
		setNewChartNumber("");
		setNewDoctorName(currentDoctorName || "");
		setNewTeethInput(currentToothNumber ? String(currentToothNumber) : "");
		setNewAppointmentId("");
		setNewClinicalNotes("");
		setNewImplantPlatform("");
		setNewAbutmentType("");
		setNewFixationType("");
		setNewTechStage("impression_scan");
	}, [
		newPatientName,
		newChartNumber,
		newDoctorName,
		newLabName,
		newWorkType,
		newTeethInput,
		newShade,
		newStumpShade,
		newPriceRub,
		newCostRub,
		newDoctorPercent,
		newInitialStatus,
		newExpectedLabDate,
		newFittingDate,
		newAppointmentId,
		newClinicalNotes,
		newImplantPlatform,
		newAbutmentType,
		newFixationType,
		newTechStage,
		currentPatientId,
		currentDoctorName,
		currentPatientName,
		currentToothNumber,
		onSaveOrder,
		showToast,
	]);

	// Экспорт в CSV
	const handleExportCsv = useCallback(() => {
		const csvContent = exportDentalLabOrdersToCsv(filteredOrders);
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `ZTL_Orders_Registry_${new Date().toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}, [filteredOrders]);

	// Печать бланка А4 для курьера
	const handlePrintBlank = useCallback((order: DentalLabWorkflowOrder) => {
		const html = generateDentalLabOrderA4PrintBlank(order);
		const printWin = window.open("", "_blank", "width=850,height=1100");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		}
	}, []);

	if (!isOpen) return null;

	return (
		<div className="ztl-hub-backdrop" role="dialog" aria-modal="true" aria-labelledby="ztl-hub-title">
			<div className="ztl-hub-modal">
				{toastMessage && (
					<div
						style={{
							position: "absolute",
							top: "4.5rem",
							right: "2rem",
							zIndex: 10001,
							background: "var(--ink, #0f172a)",
							color: "var(--paper, #ffffff)",
							padding: "0.5rem 1rem",
							borderRadius: "8px",
							boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							fontSize: "0.8125rem",
							fontWeight: 600,
						}}
					>
						<CheckCircle2 size={16} style={{ color: "var(--ok-fg, #10b981)" }} />
						<span>{toastMessage}</span>
					</div>
				)}
				{/* ─── 1. ШАПКА ХАБА ────────────────────────────────────────────── */}
				<header className="ztl-hub-header">
					<div className="ztl-hub-title-group">
						<div className="ztl-hub-icon-wrap">
							<FlaskConical size={20} />
						</div>
						<div>
							<h2 id="ztl-hub-title" className="ztl-hub-title">
								Центр наряд-заказов зуботехнической лаборатории (ЗТЛ)
							</h2>
							<p className="ztl-hub-subtitle">
								4 клинических статуса, сверка даты примерки с расписанием и целочисленный учет себестоимости
							</p>
						</div>
					</div>

					<div className="ztl-hub-stats-ribbon">
						<div className="ztl-stat-pill">
							<span>Всего:</span>
							<span className="ztl-stat-value">{orders.length}</span>
						</div>
						<div className="ztl-stat-pill">
							<span>В работе:</span>
							<span className="ztl-stat-value">
								{orders.filter((o) => o.currentStage !== "installed_completed").length}
							</span>
						</div>
						<div className="ztl-stat-pill">
							<span className={delayedOrders.length > 0 ? "ztl-stat-alert" : ""}>Задержек:</span>
							<span className={delayedOrders.length > 0 ? "ztl-stat-value ztl-stat-alert" : "ztl-stat-value"}>
								{delayedOrders.length}
							</span>
						</div>
						<div className="ztl-stat-pill">
							<span>Себестоимость:</span>
							<span className="ztl-stat-value">{totalLabCostRub.toLocaleString("ru-RU")} ₽</span>
						</div>
					</div>

					<div className="ztl-hub-actions">
						<button
							type="button"
							className="ztl-btn-primary"
							onClick={() => setIsCreateModalOpen(true)}
							title="Создать новый наряд-заказ в ЗТЛ"
						>
							<Plus size={14} />
							<span>Новый наряд</span>
						</button>
						<button
							type="button"
							className="ztl-btn-secondary"
							onClick={handleExportCsv}
							title="Экспортировать наряды в Excel CSV"
						>
							<Download size={14} />
							<span>CSV</span>
						</button>
						<button
							type="button"
							className="ztl-btn-icon"
							onClick={onClose}
							aria-label="Закрыть окно"
							title="Закрыть"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* ─── 1b. МАНДАТ 8e: АВТОНОМИЯ ВРАЧА ПРИ ИСТЕЧЕНИИ ПЛАНА ЛЕЧЕНИЯ (>30 ДНЕЙ) ─── */}
				{(isPlanExpired || (treatmentPlanAgeDays !== undefined && treatmentPlanAgeDays > 30)) && (
					<div
						style={{
							background: "rgba(16, 185, 129, 0.08)",
							border: "1px solid rgba(16, 185, 129, 0.3)",
							color: "#065f46",
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
						<CheckCircle2 size={15} style={{ color: "#10b981", flexShrink: 0 }} />
						<span>
							<strong>Клинический регламент:</strong> Срок плана лечения{treatmentPlanAgeDays !== undefined ? ` (${treatmentPlanAgeDays} дн.)` : ""} превысил 30 дней, но это <strong>не блокирует</strong> оформление нарядов ЗТЛ, оказание услуг или взаиморасчеты.
						</span>
					</div>
				)}

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
							style={{ borderColor: "#fca5a5", color: "#991b1b" }}
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

						<div className="ztl-filter-chips">
							<button
								type="button"
								className={`ztl-chip alert-chip ${onlyDelayedFilter ? "active" : ""}`}
								onClick={() => setOnlyDelayedFilter((prev) => !prev)}
							>
								<AlertTriangle size={12} />
								<span>Задержки ({delayedOrders.length})</span>
							</button>
							{(searchQuery || selectedLab !== "ALL" || selectedWorkType !== "ALL" || onlyDelayedFilter) && (
								<button
									type="button"
									className="ztl-chip"
									onClick={() => {
										setSearchQuery("");
										setSelectedLab("ALL");
										setSelectedWorkType("ALL");
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

				{/* ─── 4. КАНБАН-ДОСКА (КЛИНИЧЕСКИЙ ЦИКЛ + ГАРАНТИЙНАЯ ПЕРЕДЕЛКА) ИЛИ ЧЕСТНЫЙ EMPTY STATE ──── */}
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
							title="Создать наряд ЗТЛ"
						>
							<Plus size={14} />
							<span>Создать наряд ЗТЛ</span>
						</button>
					</main>
				) : (
					<main className="ztl-kanban-board">
						{ALL_LAB_WORKFLOW_STATUSES.map((stageId) => {
							const stageDef = LAB_WORKFLOW_STATUSES[stageId];
							const stageOrders = ordersByStage[stageId] || [];

							return (
								<div key={stageId} className="ztl-kanban-column">
									<div className="ztl-column-header">
										<div className="ztl-column-title-wrap">
											<span className="ztl-column-icon">
												{stageId === "draft" && <FileText size={16} />}
												{stageId === "sent_to_lab" && <Truck size={16} />}
												{stageId === "fitting_scheduled" && <Calendar size={16} />}
												{stageId === "installed_completed" && <CheckCircle2 size={16} />}
												{stageId === "warranty_rework" && <RotateCcw size={16} />}
											</span>
											<h3 className="ztl-column-title">{stageDef.nameRu}</h3>
										</div>
										<span className={`ztl-column-count ${stageOrders.length > 0 ? "has-items" : ""}`}>
											{stageOrders.length}
										</span>
									</div>

									<div className="ztl-column-cards">
										{stageOrders.map((order) => {
											const hasDelay = order.isDelayedAlert || order.delayAlert.isDelayedAlert;
											const preset = ORTHOPEDIC_WORK_TYPES[order.workTypeId] || ORTHOPEDIC_WORK_TYPES.crown_emax;

											return (
												<article
													key={order.id}
													className={`ztl-order-card ${hasDelay ? "has-delay-alert" : ""}`}
												>
													<div className="ztl-card-top-row">
														<span className="ztl-card-order-num">{order.orderNumber}</span>
														<span className="ztl-card-teeth-badge">
															Зубы: {order.selectedTeeth.join(", ")}
														</span>
													</div>

													{order.isWarrantyRework && (
														<div style={{ marginTop: "4px", fontSize: "10.5px", color: "#e11d48", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
															<RotateCcw size={11} />
															<span>ГАРАНТИЙНАЯ ПЕРЕДЕЛКА (0 ₽){order.originalOrderNumber ? ` • исх. № ${order.originalOrderNumber}` : ""}</span>
														</div>
													)}

													<h4 className="ztl-card-patient-name" title={order.patientName}>
														{order.patientName}
													</h4>

													<p className="ztl-card-doctor">
														{order.doctorName}
													</p>

													<div className="ztl-card-work-type">
														{preset.shortNameRu} ({order.shadeCode})
													</div>

													<div className="ztl-card-lab-name">
														<Building2 size={11} />
														<span className="truncate">{order.labName}</span>
													</div>

													{/* 8 технологических этапов ЗТЛ */}
													<div style={{ marginTop: "4px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
														<span
															style={{
																fontSize: "10.5px",
																fontWeight: 700,
																color: LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]?.colorToken || "#3b82f6",
																background: "rgba(59, 130, 246, 0.08)",
																padding: "2px 6px",
																borderRadius: "4px",
																display: "inline-flex",
																alignItems: "center",
																gap: "4px",
															}}
															title={`Этап ${LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]?.stepNumber || 1} из 8: ${LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]?.departmentRu || ""}`}
														>
															<span>Этап {LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]?.stepNumber || 1}/8:</span>
															<span>{LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]?.shortTitleRu || order.techStage}</span>
														</span>
													</div>

													{/* Платформа имплантата / Абатмент / Фиксация */}
													{(order.implantPlatform || order.abutmentType || order.fixationType) && (
														<div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px", fontSize: "10px" }}>
															{order.implantPlatform && (
																<span style={{ background: "#e0f2fe", color: "#0369a1", padding: "1px 5px", borderRadius: "3px", fontWeight: 600 }}>
																	{order.implantPlatform === "conical" ? "Конус Морзе" : "Hex"}
																</span>
															)}
															{order.abutmentType && (
																<span style={{ background: "#f3e8ff", color: "#6b21a8", padding: "1px 5px", borderRadius: "3px", fontWeight: 600 }}>
																	{ABUTMENT_TYPE_OPTIONS.find((a) => a.id === order.abutmentType)?.nameRu.split(" ")[0] || order.abutmentType}
																</span>
															)}
															{order.fixationType && (
																<span style={{ background: "#fef3c7", color: "#92400e", padding: "1px 5px", borderRadius: "3px", fontWeight: 600 }}>
																	{order.fixationType === "screw_retained" ? "Винтовая" : "Цементная"}
																</span>
															)}
														</div>
													)}

													{/* Блок задержки ЗТЛ */}
													{hasDelay && (
														<div className="ztl-card-alert-badge" role="alert">
															{order.delayAlert.alertMessageRu}
														</div>
													)}

													{/* Даты готовности и примерки */}
													<div className="ztl-card-dates-row">
														<span title="Срок готовности из лаборатории">
															ЗТЛ: <strong>{formatRussianDate(order.expectedLabDateIso)}</strong>
														</span>
														<span title="Дата назначенной примерки в расписании">
															Примерка: <strong>{order.fittingDate ? formatRussianDate(order.fittingDate) : (order.scheduledVisitDateIso ? formatRussianDate(order.scheduledVisitDateIso) : "—")}</strong>
														</span>
													</div>

													{/* Финансы: цена / себестоимость в копейках */}
													<div className="ztl-card-price-row">
														<span title="Стоимость для пациента" style={order.isWarrantyRework ? { color: "#10b981", fontWeight: 700 } : undefined}>
															{order.isWarrantyRework ? "0 ₽ (Гарантия)" : `${order.financials.patientPriceTotalRub.toLocaleString("ru-RU")} ₽`}
														</span>
														<span style={{ color: "var(--muted, #64748b)", fontSize: "10px" }} title="Себестоимость ЗТЛ">
															Себест: {order.financials.labCostTotalRub.toLocaleString("ru-RU")} ₽
														</span>
													</div>

													{/* Кнопки действий (Мандат 8d грех 3 — строго 2 кнопки прямого действия: Печать ЗТЛ-1 + Сменить этап/статус) */}
													<div className="ztl-card-actions-row" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
														<button
															type="button"
															className="ztl-btn-card-action min-h-[36px] sm:min-h-0"
															onClick={() => handlePrintBlank(order)}
															title="Распечатать бланк наряда ЗТЛ-1 для курьера лаборатории"
															data-testid={`ztl-card-print-a4-${order.id}`}
														>
															<Printer size={13} />
															<span>Печать ЗТЛ-1</span>
														</button>
														{order.currentStage === "installed_completed" ? (
															<button
																type="button"
																className="ztl-btn-card-action min-h-[36px] sm:min-h-0"
																style={{ color: "#059669", borderColor: "#a7f3d0", background: "rgba(16, 185, 129, 0.08)", fontWeight: 700 }}
																onClick={() => setInspectingOrder(order)}
																title="Работа зафиксирована и сдана пациенту"
															>
																<CheckCircle2 size={13} />
																<span>Сдано</span>
															</button>
														) : order.currentStage === "warranty_rework" ? (
															<button
																type="button"
																className="ztl-btn-card-action ztl-btn-advance min-h-[36px] sm:min-h-0"
																onClick={() => handleAdvanceStage(order)}
																title="Отправить работу повторно в ЗТЛ"
															>
																<Send size={13} />
																<span>В ЗТЛ</span>
															</button>
														) : order.currentStage === "draft" ? (
															<button
																type="button"
																className="ztl-btn-card-action ztl-btn-advance min-h-[36px] sm:min-h-0"
																onClick={() => handleAdvanceStage(order)}
																title="Передать наряд и слепки в ЗТЛ"
															>
																<Send size={13} />
																<span>В ЗТЛ</span>
															</button>
														) : order.currentStage === "sent_to_lab" ? (
															<button
																type="button"
																className="ztl-btn-card-action ztl-btn-advance min-h-[36px] sm:min-h-0"
																onClick={() => handleAdvanceStage(order)}
																title="Назначить клиническую примерку"
															>
																<Calendar size={13} />
																<span>Примерка</span>
															</button>
														) : order.currentStage === "fitting_scheduled" ? (
															<button
																type="button"
																className="ztl-btn-card-action ztl-btn-advance min-h-[36px] sm:min-h-0"
																onClick={() => handleAdvanceStage(order)}
																title="Зафиксировать и сдать работу пациенту"
															>
																<CheckCircle2 size={13} />
																<span>Сдать</span>
															</button>
														) : (
															<button
																type="button"
																className="ztl-btn-card-action ztl-btn-advance min-h-[36px] sm:min-h-0"
																onClick={() => handleAdvanceStage(order)}
																title="Передвинуть на следующий клинический статус"
															>
																<ChevronRight size={13} />
																<span>Далее</span>
															</button>
														)}

														{/* Контекстное меню вторичных действий (...) */}
														<div style={{ position: "relative", flexShrink: 0 }}>
															<button
																type="button"
																className="ztl-btn-card-action min-h-[36px] sm:min-h-0 px-2"
																style={{ minWidth: "32px", padding: "0 6px", flex: "none" }}
																onClick={(e) => {
																	e.stopPropagation();
																	setActiveCardMenuOrderId((prev) => (prev === order.id ? null : order.id));
																}}
																title="Вторичные действия (Миллер: фото прикуса, комментарий технику, повторная примерка, рекламация)"
																aria-expanded={activeCardMenuOrderId === order.id}
																data-testid={`ztl-card-menu-btn-${order.id}`}
															>
																<MoreHorizontal size={13} />
															</button>

															{activeCardMenuOrderId === order.id && (
																<div
																	style={{
																		position: "absolute",
																		right: 0,
																		bottom: "calc(100% + 4px)",
																		background: "var(--paper, #ffffff)",
																		border: "1px solid var(--line, #e2e8f0)",
																		borderRadius: "8px",
																		boxShadow: "0 10px 25px -5px rgba(0,0,0,0.18)",
																		padding: "4px",
																		zIndex: 50,
																		minWidth: "210px",
																		display: "flex",
																		flexDirection: "column",
																		gap: "2px",
																	}}
																	role="menu"
																	onClick={(e) => e.stopPropagation()}
																>
																	<button
																		type="button"
																		style={{
																			display: "flex",
																			alignItems: "center",
																			gap: "8px",
																			padding: "8px 10px",
																			borderRadius: "6px",
																			border: "none",
																			background: "transparent",
																			color: "var(--ink, #0f172a)",
																			fontSize: "12px",
																			fontWeight: 500,
																			cursor: "pointer",
																			width: "100%",
																			textAlign: "left",
																			minHeight: "36px",
																		}}
																		onClick={() => {
																			setInspectingOrder(order);
																			setActiveCardMenuOrderId(null);
																		}}
																		title="Просмотреть детали и спецификацию наряда"
																		role="menuitem"
																	>
																		<Eye size={14} className="shrink-0 text-teal-600" />
																		<span>Детали наряда</span>
																	</button>

																	<button
																		type="button"
																		style={{
																			display: "flex",
																			alignItems: "center",
																			gap: "8px",
																			padding: "8px 10px",
																			borderRadius: "6px",
																			border: "none",
																			background: "transparent",
																			color: "var(--ink, #0f172a)",
																			fontSize: "12px",
																			fontWeight: 500,
																			cursor: "pointer",
																			width: "100%",
																			textAlign: "left",
																			minHeight: "36px",
																		}}
																		onClick={() => {
																			handleAttachBitePhoto(order);
																			setActiveCardMenuOrderId(null);
																		}}
																		title="Прикрепить ссылку на фото окклюзии или прикуса"
																		role="menuitem"
																	>
																		<Camera size={14} className="shrink-0 text-sky-600" />
																		<span>Прикрепить фото прикуса</span>
																	</button>

																	<button
																		type="button"
																		style={{
																			display: "flex",
																			alignItems: "center",
																			gap: "8px",
																			padding: "8px 10px",
																			borderRadius: "6px",
																			border: "none",
																			background: "transparent",
																			color: "var(--ink, #0f172a)",
																			fontSize: "12px",
																			fontWeight: 500,
																			cursor: "pointer",
																			width: "100%",
																			textAlign: "left",
																			minHeight: "36px",
																		}}
																		onClick={() => {
																			handleTechnicianComment(order);
																			setActiveCardMenuOrderId(null);
																		}}
																		title="Добавить заметку или уточнение технику"
																		role="menuitem"
																	>
																		<MessageSquare size={14} className="shrink-0 text-emerald-600" />
																		<span>Комментарий технику</span>
																	</button>

																	<button
																		type="button"
																		style={{
																			display: "flex",
																			alignItems: "center",
																			gap: "8px",
																			padding: "8px 10px",
																			borderRadius: "6px",
																			border: "none",
																			background: "transparent",
																			color: "var(--ink, #0f172a)",
																			fontSize: "12px",
																			fontWeight: 500,
																			cursor: "pointer",
																			width: "100%",
																			textAlign: "left",
																			minHeight: "36px",
																		}}
																		onClick={() => {
																			handleRepeatFitting(order);
																			setActiveCardMenuOrderId(null);
																		}}
																		title="Назначить повторную примерку каркаса или реставрации"
																		role="menuitem"
																	>
																		<RotateCcw size={14} className="shrink-0 text-orange-600" />
																		<span>Повторная примерка</span>
																	</button>

																	{order.techStage !== "patient_fixation" && (
																		<button
																			type="button"
																			style={{
																				display: "flex",
																				alignItems: "center",
																				gap: "8px",
																				padding: "8px 10px",
																				borderRadius: "6px",
																				border: "none",
																				background: "transparent",
																				color: "var(--ink, #0f172a)",
																				fontSize: "12px",
																				fontWeight: 500,
																				cursor: "pointer",
																				width: "100%",
																				textAlign: "left",
																				minHeight: "36px",
																			}}
																			onClick={() => {
																				handleAdvanceTechStage(order);
																				setActiveCardMenuOrderId(null);
																			}}
																			title="Перевести на следующий технологический этап ЗТЛ (1..8)"
																			role="menuitem"
																			data-testid={`ztl-card-tech-stage-${order.id}`}
																		>
																			<RefreshCw size={14} className="shrink-0 text-blue-600" />
																			<span>Этап ЗТЛ (+1)</span>
																		</button>
																	)}

																	<button
																		type="button"
																		style={{
																			display: "flex",
																			alignItems: "center",
																			gap: "8px",
																			padding: "8px 10px",
																			borderRadius: "6px",
																			border: "none",
																			background: "transparent",
																			color: "#e11d48",
																			fontSize: "12px",
																			fontWeight: 500,
																			cursor: "pointer",
																			width: "100%",
																			textAlign: "left",
																			minHeight: "36px",
																		}}
																		onClick={() => {
																			setWarrantyReason("Скол керамической облицовки / несоответствие прикуса");
																			setWarrantyReworkOrder(order);
																			setActiveCardMenuOrderId(null);
																		}}
																		title="Отправить на гарантийную переделку / рекламацию (0 ₽)"
																		role="menuitem"
																		data-testid={`ztl-card-warranty-${order.id}`}
																	>
																		<RotateCcw size={14} className="shrink-0 text-rose-600" />
																		<span>Рекламация (0 ₽)</span>
																	</button>
																</div>
															)}
														</div>
													</div>
												</article>
											);
										})}
										{stageOrders.length === 0 && (
											<div style={{ textAlign: "center", padding: "24px 8px", color: "var(--muted, #94a3b8)", fontSize: "11px" }}>
												Нет нарядов в этом статусе
											</div>
										)}
									</div>
								</div>
							);
						})}
					</main>
				)}

				{/* ─── 5. МОДАЛЬНОЕ ОКНО СОЗДАНИЯ НОВОГО НАКАЗА ──────────────────── */}
				{isCreateModalOpen && (
					<div className="ztl-detail-overlay">
						<div className="ztl-detail-card">
							<header className="ztl-detail-header">
								<h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
									Оформление наряд-заказа в зуботехническую лабораторию (ЗТЛ)
								</h3>
								<button
									type="button"
									className="ztl-btn-icon"
									onClick={() => setIsCreateModalOpen(false)}
								>
									<X size={16} />
								</button>
							</header>

							<form onSubmit={handleCreateOrderSubmit}>
								<div className="ztl-detail-body">
									<div className="ztl-form-grid-2">
										<div className="ztl-form-group">
											<label className="ztl-form-label">Пациент (Ф.И.О.) *</label>
											<input
												type="text"
												className="ztl-form-input"
												required
												placeholder="Ф.И.О. пациента"
												value={newPatientName}
												onChange={(e) => setNewPatientName(e.target.value)}
											/>
										</div>
										<div className="ztl-form-group">
											<label className="ztl-form-label">№ Медкарты</label>
											<input
												type="text"
												className="ztl-form-input"
												placeholder="043/у-1234"
												value={newChartNumber}
												onChange={(e) => setNewChartNumber(e.target.value)}
											/>
										</div>
									</div>

									<div className="ztl-form-grid-2">
										<div className="ztl-form-group">
											<label className="ztl-form-label">Врач-ортопед</label>
											<input
												type="text"
												className="ztl-form-input"
												placeholder="Ф.И.О. врача-ортопеда"
												value={newDoctorName}
												onChange={(e) => setNewDoctorName(e.target.value)}
											/>
										</div>
										<div className="ztl-form-group">
											<label className="ztl-form-label">Лаборатория (ЗТЛ)</label>
											<select
												className="ztl-select"
												style={{ width: "100%" }}
												value={newLabName}
												onChange={(e) => setNewLabName(e.target.value)}
											>
												{SAMPLE_LABS.map((lab) => (
													<option key={lab} value={lab}>
														{lab}
													</option>
												))}
											</select>
										</div>
									</div>

									<div className="ztl-form-grid-2">
										<div className="ztl-form-group">
											<label className="ztl-form-label">Вид конструкции</label>
											<select
												className="ztl-select"
												style={{ width: "100%" }}
												value={newWorkType}
												onChange={(e) => {
													const val = e.target.value as OrthopedicWorkTypeId;
													setNewWorkType(val);
													const preset = ORTHOPEDIC_WORK_TYPES[val];
													if (preset) {
														setNewPriceRub(preset.defaultPriceKopecks / 100);
														setNewCostRub(preset.defaultCostKopecks / 100);
													}
												}}
											>
												{Object.values(ORTHOPEDIC_WORK_TYPES).map((t) => (
													<option key={t.id} value={t.id}>
														{t.nameRu}
													</option>
												))}
											</select>
										</div>
										<div className="ztl-form-group">
											<label className="ztl-form-label">Зубы по формуле FDI (через запятую)</label>
											<input
												type="text"
												className="ztl-form-input"
												placeholder="например: 11, 21"
												value={newTeethInput}
												onChange={(e) => setNewTeethInput(e.target.value)}
											/>
										</div>
									</div>

									<div className="ztl-form-grid-2">
										<div className="ztl-form-group">
											<label className="ztl-form-label">Оттенок (VITA Classical / Bleach / 3D-Master)</label>
											<div style={{ display: "flex", gap: "6px" }}>
												<input
													type="text"
													className="ztl-form-input"
													placeholder="A2, BL1, OM2, 2M2..."
													value={newShade}
													onChange={(e) => setNewShade(e.target.value.toUpperCase())}
													list="vita-shades-datalist"
													style={{ flex: 1 }}
												/>
												<select
													className="ztl-select"
													style={{ width: "140px" }}
													value={newShade}
													onChange={(e) => setNewShade(e.target.value)}
												>
													<optgroup label="VITA Classical (A1..D4)">
														{VITA_CLASSICAL_SHADES.map((s) => (
															<option key={s.code} value={s.code}>
																{s.code} ({s.groupRu.split(":")[0]})
															</option>
														))}
													</optgroup>
													<optgroup label="VITA Bleach (OM / BL)">
														{VITA_BLEACH_SHADES.map((s) => (
															<option key={s.code} value={s.code}>
																{s.code} (Bleach)
															</option>
														))}
													</optgroup>
													<optgroup label="VITA 3D-Master">
														{VITA_3D_MASTER_SHADES.map((s) => (
															<option key={s.code} value={s.code}>
																{s.code}
															</option>
														))}
													</optgroup>
												</select>
												<datalist id="vita-shades-datalist">
													{VITA_CLASSICAL_SHADES.concat(VITA_BLEACH_SHADES, VITA_3D_MASTER_SHADES).map((s) => (
														<option key={s.code} value={s.code} />
													))}
												</datalist>
											</div>
										</div>
										<div className="ztl-form-group">
											<label className="ztl-form-label">Оттенок культи (ND1-ND9)</label>
											<select
												className="ztl-select"
												style={{ width: "100%" }}
												value={newStumpShade}
												onChange={(e) => setNewStumpShade(e.target.value)}
											>
												{STUMP_SHADES_ND.map((nd) => (
													<option key={nd.code} value={nd.code}>
														{nd.code} — {nd.descriptionRu}
													</option>
												))}
											</select>
										</div>
									</div>

									<div className="ztl-form-grid-2">
										<div className="ztl-form-group">
											<label className="ztl-form-label">Платформа имплантата</label>
											<select
												className="ztl-select"
												style={{ width: "100%" }}
												value={newImplantPlatform}
												onChange={(e) => setNewImplantPlatform(e.target.value as ImplantPlatformType | "")}
											>
												<option value="">— Без имплантата (естественный зуб) —</option>
												{IMPLANT_PLATFORMS.map((p) => (
													<option key={p.id} value={p.id}>
														{p.nameRu}
													</option>
												))}
											</select>
										</div>
										<div className="ztl-form-group">
											<label className="ztl-form-label">Тип абатмента</label>
											<select
												className="ztl-select"
												style={{ width: "100%" }}
												value={newAbutmentType}
												onChange={(e) => setNewAbutmentType(e.target.value as AbutmentCategoryType | "")}
											>
												<option value="">— Стандартный / не требуется —</option>
												{ABUTMENT_TYPE_OPTIONS.map((a) => (
													<option key={a.id} value={a.id}>
														{a.nameRu} {a.angle > 0 ? `(${a.angle}°)` : ""}
													</option>
												))}
											</select>
										</div>
									</div>

									<div className="ztl-form-grid-2">
										<div className="ztl-form-group">
											<label className="ztl-form-label">Тип фиксации</label>
											<select
												className="ztl-select"
												style={{ width: "100%" }}
												value={newFixationType}
												onChange={(e) => setNewFixationType(e.target.value as FixationType | "")}
											>
												<option value="">— Не выбрано —</option>
												{FIXATION_TYPES.map((f) => (
													<option key={f.id} value={f.id}>
														{f.nameRu}
													</option>
												))}
											</select>
										</div>
										<div className="ztl-form-group">
											<label className="ztl-form-label">Первичный технологический этап ЗТЛ (1..8)</label>
											<select
												className="ztl-select"
												style={{ width: "100%" }}
												value={newTechStage}
												onChange={(e) => setNewTechStage(e.target.value as LabTechnologicalStageId)}
											>
												{LAB_TECHNOLOGICAL_STAGE_ORDER.map((stageKey) => {
													const sDef = LAB_TECHNOLOGICAL_STAGES[stageKey];
													return (
														<option key={stageKey} value={stageKey}>
															Этап {sDef.stepNumber}: {sDef.nameRu} ({sDef.departmentRu})
														</option>
													);
												})}
											</select>
										</div>
									</div>

									<div className="ztl-form-grid-2">
										<div className="ztl-form-group">
											<label className="ztl-form-label">План готовности из ЗТЛ</label>
											<input
												type="date"
												className="ztl-form-input"
												value={newExpectedLabDate}
												onChange={(e) => setNewExpectedLabDate(e.target.value)}
											/>
										</div>
										<div className="ztl-form-group">
											<label className="ztl-form-label">Дата примерки в расписании (fittingDate)</label>
											<input
												type="date"
												className="ztl-form-input"
												value={newFittingDate}
												onChange={(e) => setNewFittingDate(e.target.value)}
											/>
										</div>
									</div>

									<div className="ztl-form-grid-2">
										<div className="ztl-form-group">
											<label className="ztl-form-label">ID приема в расписании (appointmentId)</label>
											<input
												type="text"
												className="ztl-form-input"
												placeholder="appt-8041"
												value={newAppointmentId}
												onChange={(e) => setNewAppointmentId(e.target.value)}
											/>
										</div>
										<div className="ztl-form-group">
											<label className="ztl-form-label">Начальный статус</label>
											<select
												className="ztl-select"
												style={{ width: "100%" }}
												value={newInitialStatus}
												onChange={(e) => setNewInitialStatus(e.target.value as LabWorkflowStatus)}
											>
												{LAB_WORKFLOW_STATUS_ORDER.map((st) => (
													<option key={st} value={st}>
														{LAB_WORKFLOW_STATUSES[st].nameRu}
													</option>
												))}
											</select>
										</div>
									</div>

									<div className="ztl-form-grid-2" style={{ background: "var(--paper-strong, #f8fafc)", padding: "10px", borderRadius: "6px" }}>
										<div className="ztl-form-group">
											<label className="ztl-form-label">Стоимость за ед. (руб)</label>
											<input
												type="number"
												className="ztl-form-input"
												value={newPriceRub}
												onChange={(e) => setNewPriceRub(Number(e.target.value))}
											/>
										</div>
										<div className="ztl-form-group">
											<label className="ztl-form-label">Себестоимость ЗТЛ за ед. (руб)</label>
											<input
												type="number"
												className="ztl-form-input"
												value={newCostRub}
												onChange={(e) => setNewCostRub(Number(e.target.value))}
											/>
										</div>
									</div>

									<div className="ztl-form-group">
										<label className="ztl-form-label">Клинические указания врачу и технику</label>
										<textarea
											className="ztl-form-input"
											style={{ height: "60px", padding: "6px 10px", resize: "none" }}
											placeholder="Особенности краевого прилегания, прозрачность, прикус..."
											value={newClinicalNotes}
											onChange={(e) => setNewClinicalNotes(e.target.value)}
										/>
									</div>
								</div>

								<footer className="ztl-detail-footer">
									<button
										type="button"
										className="ztl-btn-secondary"
										onClick={() => setIsCreateModalOpen(false)}
									>
										Отмена
									</button>
									<button type="submit" className="ztl-btn-primary">
										<CheckCircle2 size={14} />
										<span>Сформировать наряд</span>
									</button>
								</footer>
							</form>
						</div>
					</div>
				)}

				{/* ─── 6. МОДАЛКА ПРОСМОТРА ДЕТАЛЕЙ НАКАЗА ───────────────────────── */}
				{inspectingOrder && (
					<div className="ztl-detail-overlay">
						<div className="ztl-detail-card">
							<header className="ztl-detail-header">
								<h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
									Детали наряд-заказа № {inspectingOrder.orderNumber}
								</h3>
								<button
									type="button"
									className="ztl-btn-icon"
									onClick={() => setInspectingOrder(null)}
								>
									<X size={16} />
								</button>
							</header>

							<div className="ztl-detail-body">
								{inspectingOrder.isWarrantyRework && (
									<div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#9f1239", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
										<RotateCcw size={16} color="#e11d48" />
										<div>
											<strong>Гарантийная рекламация!</strong> Исходный наряд: <strong>№ {inspectingOrder.originalOrderNumber || inspectingOrder.originalOrderId}</strong>
											{inspectingOrder.reworkReason && <div style={{ fontSize: "11px", marginTop: "2px" }}>Причина: {inspectingOrder.reworkReason}</div>}
										</div>
									</div>
								)}

								<div className="ztl-form-grid-2">
									<div>
										<p style={{ margin: "0 0 2px 0", fontSize: "11px", color: "var(--muted, #64748b)" }}>Пациент:</p>
										<p style={{ margin: 0, fontWeight: 700 }}>{inspectingOrder.patientName}</p>
									</div>
									<div>
										<p style={{ margin: "0 0 2px 0", fontSize: "11px", color: "var(--muted, #64748b)" }}>Врач-ортопед:</p>
										<p style={{ margin: 0, fontWeight: 700 }}>{inspectingOrder.doctorName}</p>
									</div>
								</div>

								<div className="ztl-form-grid-2">
									<div>
										<p style={{ margin: "0 0 2px 0", fontSize: "11px", color: "var(--muted, #64748b)" }}>Лаборатория:</p>
										<p style={{ margin: 0, fontWeight: 600 }}>{inspectingOrder.labName}</p>
									</div>
									<div>
										<p style={{ margin: "0 0 2px 0", fontSize: "11px", color: "var(--muted, #64748b)" }}>Конструкция:</p>
										<p style={{ margin: 0, fontWeight: 600 }}>{inspectingOrder.materialName}</p>
									</div>
								</div>

								<div className="ztl-form-grid-2">
									<div>
										<p style={{ margin: "0 0 2px 0", fontSize: "11px", color: "var(--muted, #64748b)" }}>Срок готовности ЗТЛ:</p>
										<p style={{ margin: 0, fontWeight: 700, color: "var(--teal, #0d9488)" }}>{formatRussianDate(inspectingOrder.expectedLabDateIso)}</p>
									</div>
									<div>
										<p style={{ margin: "0 0 2px 0", fontSize: "11px", color: "var(--muted, #64748b)" }}>Дата примерки / Прием:</p>
										<p style={{ margin: 0, fontWeight: 700 }}>
											{inspectingOrder.fittingDate ? formatRussianDate(inspectingOrder.fittingDate) : "—"}
											{inspectingOrder.appointmentId ? ` (${inspectingOrder.appointmentId})` : ""}
										</p>
									</div>
								</div>

								{/* Параметры имплантации и фиксации */}
								{(inspectingOrder.implantPlatform || inspectingOrder.abutmentType || inspectingOrder.fixationType) && (
									<div style={{ background: "var(--paper-strong, #f8fafc)", padding: "10px", borderRadius: "6px" }}>
										<h4 style={{ margin: "0 0 6px 0", fontSize: "12px", fontWeight: 700 }}>
											Параметры имплантологической конструкции:
										</h4>
										<div className="ztl-form-grid-2" style={{ fontSize: "12px" }}>
											{inspectingOrder.implantPlatform && (
												<div>
													Платформа имплантата: <strong>{inspectingOrder.implantPlatform === "conical" ? "Конус Морзе (Morse Taper)" : "Шестигранник (Hex)"}</strong>
												</div>
											)}
											{inspectingOrder.abutmentType && (
												<div>
													Тип абатмента: <strong>{ABUTMENT_TYPE_OPTIONS.find((a) => a.id === inspectingOrder.abutmentType)?.nameRu || inspectingOrder.abutmentType}</strong>
												</div>
											)}
											{inspectingOrder.fixationType && (
												<div>
													Тип фиксации: <strong>{inspectingOrder.fixationType === "screw_retained" ? "Винтовая (Screw-retained)" : "Цементная (Cement-retained)"}</strong>
												</div>
											)}
										</div>
									</div>
								)}

								{/* Маршрутный лист 8 технологических этапов ЗТЛ */}
								<div style={{ background: "var(--paper-strong, #f8fafc)", padding: "10px", borderRadius: "6px" }}>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
										<h4 style={{ margin: 0, fontSize: "12px", fontWeight: 700 }}>
											Маршрутный лист 8 технологических этапов ЗТЛ:
										</h4>
										<span style={{ fontSize: "11px", fontWeight: 600, color: "var(--teal, #0d9488)" }}>
											Текущий: {LAB_TECHNOLOGICAL_STAGES[inspectingOrder.techStage || "impression_scan"]?.shortTitleRu || inspectingOrder.techStage}
										</span>
									</div>
									<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
										{LAB_TECHNOLOGICAL_STAGE_ORDER.map((stageKey) => {
											const sDef = LAB_TECHNOLOGICAL_STAGES[stageKey];
											const currentStep = LAB_TECHNOLOGICAL_STAGES[inspectingOrder.techStage || "impression_scan"]?.stepNumber ?? 1;
											const isDone = sDef.stepNumber < currentStep;
											const isCurrent = sDef.stepNumber === currentStep;

											return (
												<button
													key={stageKey}
													type="button"
													onClick={() => handleAdvanceTechStage(inspectingOrder, stageKey)}
													style={{
														padding: "6px",
														borderRadius: "6px",
														border: isCurrent ? "2px solid var(--teal, #0d9488)" : "1px solid var(--line, #e2e8f0)",
														background: isCurrent ? "#f0fdfa" : isDone ? "#f8fafc" : "var(--paper, #fff)",
														color: isCurrent ? "#0f766e" : isDone ? "#64748b" : "#0f172a",
														textAlign: "left",
														cursor: "pointer",
														fontSize: "10.5px",
													}}
													title={`${sDef.nameRu}\nЦех: ${sDef.departmentRu}\n${sDef.descriptionRu}`}
												>
													<div style={{ fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
														<span>№{sDef.stepNumber}</span>
														<span style={{ fontSize: "9.5px", color: isDone ? "#059669" : isCurrent ? "#0d9488" : "#94a3b8" }}>
															{isDone ? "✓" : isCurrent ? "В РАБОТЕ" : "ОЖИДАНИЕ"}
														</span>
													</div>
													<div style={{ marginTop: "2px", fontWeight: isCurrent ? 700 : 500 }} className="truncate">
														{sDef.shortTitleRu}
													</div>
												</button>
											);
										})}
									</div>
								</div>

								<div style={{ background: "var(--paper-strong, #f8fafc)", padding: "10px", borderRadius: "6px" }}>
									<h4 style={{ margin: "0 0 6px 0", fontSize: "12px", fontWeight: 700 }}>
										Финансовый расчет (в копейках):
									</h4>
									<div className="ztl-form-grid-2" style={{ fontSize: "12px" }}>
										<div>Стоимость пациента: <strong>{inspectingOrder.financials.patientPriceTotalRub.toLocaleString("ru-RU")} ₽</strong></div>
										<div>Себестоимость ЗТЛ: <strong>{inspectingOrder.financials.labCostTotalRub.toLocaleString("ru-RU")} ₽</strong></div>
										<div>Маржа клиники: <strong style={{ color: "var(--teal, #0d9488)" }}>{inspectingOrder.financials.clinicGrossMarginRub.toLocaleString("ru-RU")} ₽</strong></div>
										<div>ЗП врача ({inspectingOrder.financials.doctorPercent}%): <strong>{inspectingOrder.financials.doctorWageRub.toLocaleString("ru-RU")} ₽</strong></div>
									</div>
								</div>

								{/* История стадий */}
								<div>
									<h4 style={{ margin: "0 0 6px 0", fontSize: "12px", fontWeight: 700 }}>
										История статусов клинического цикла:
									</h4>
									<div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px" }}>
										{inspectingOrder.stageHistory.map((hist, i) => (
											<div key={i} style={{ borderLeft: "2px solid var(--teal, #0d9488)", paddingLeft: "8px" }}>
												<span style={{ fontWeight: 700 }}>{LAB_WORKFLOW_STATUSES[hist.stage]?.nameRu || hist.stage}</span>
												<span style={{ color: "var(--muted, #64748b)", marginLeft: "8px" }}>
													{hist.timestampIso.slice(0, 16).replace("T", " ")} ({hist.authorName})
												</span>
												{hist.note && <div style={{ color: "var(--muted, #64748b)" }}>{hist.note}</div>}
											</div>
										))}
									</div>
								</div>
							</div>

							<footer className="ztl-detail-footer">
								{inspectingOrder.currentStage === "installed_completed" && (
									<button
										type="button"
										className="ztl-btn-secondary"
										style={{ color: "#e11d48", borderColor: "#fecdd3", fontWeight: 700 }}
										onClick={() => {
											const target = inspectingOrder;
											setInspectingOrder(null);
											setWarrantyReason("Скол керамической облицовки");
											setWarrantyReworkOrder(target);
										}}
										title="Оформить рекламацию и отправить на гарантийную переделку"
									>
										<RotateCcw size={14} />
										<span>Рекламация</span>
									</button>
								)}
								<button
									type="button"
									className="ztl-btn-secondary"
									onClick={() => {
										handlePrintBlank(inspectingOrder);
									}}
								>
									<Printer size={14} />
									<span>Распечатать А4</span>
								</button>
								<button
									type="button"
									className="ztl-btn-primary"
									onClick={() => setInspectingOrder(null)}
								>
									Закрыть
								</button>
							</footer>
						</div>
					</div>
				)}

				{/* ─── 7. МОДАЛЬНОЕ ОКНО ОФОРМЛЕНИЯ ГАРАНТИЙНОЙ РЕКЛАМАЦИИ В ЗТЛ ────── */}
				{warrantyReworkOrder && (
					<div className="ztl-detail-overlay">
						<div className="ztl-detail-card" style={{ maxWidth: "480px" }}>
							<header className="ztl-detail-header" style={{ borderBottom: "2px solid #e11d48" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<RotateCcw size={18} color="#e11d48" />
									<h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#e11d48" }}>
										Гарантийная рекламация наряда № {warrantyReworkOrder.orderNumber}
									</h3>
								</div>
								<button
									type="button"
									className="ztl-btn-icon"
									onClick={() => setWarrantyReworkOrder(null)}
								>
									<X size={16} />
								</button>
							</header>

							<form onSubmit={handleWarrantyReworkSubmit}>
								<div className="ztl-detail-body">
									<p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "var(--muted, #64748b)" }}>
										Работа для пациента <strong>{warrantyReworkOrder.patientName}</strong> будет переведена в статус
										«Гарантийная переделка» с сохранением ссылки на исходный наряд № {warrantyReworkOrder.orderNumber}.
									</p>

									<div className="ztl-form-group">
										<label className="ztl-form-label">Причина рекламации / замечания врача *</label>
										<select
											className="ztl-select"
											style={{ width: "100%", marginBottom: "8px" }}
											value={warrantyReason}
											onChange={(e) => setWarrantyReason(e.target.value)}
										>
											<option value="Скол керамической облицовки">Скол керамической облицовки</option>
											<option value="Завышение прикуса / окклюзионный блок">Завышение прикуса / окклюзионный блок</option>
											<option value="Несоответствие цвета / оттенка VITA">Несоответствие цвета / оттенка VITA</option>
											<option value="Нарушение краевого прилегания (уступ)">Нарушение краевого прилегания (уступ)</option>
											<option value="Балансирование каркаса на культе">Балансирование каркаса на культе</option>
											<option value="Другая причина (указать вручную)">Другая причина (указать вручную)</option>
										</select>

										<textarea
											className="ztl-form-input"
											style={{ height: "70px", padding: "6px 10px", resize: "none" }}
											placeholder="Уточнение дефекта для зубного техника..."
											value={warrantyReason}
											onChange={(e) => setWarrantyReason(e.target.value)}
										/>
									</div>
								</div>

								<footer className="ztl-detail-footer">
									<button
										type="button"
										className="ztl-btn-secondary"
										onClick={() => setWarrantyReworkOrder(null)}
									>
										Отмена
									</button>
									<button
										type="submit"
										className="ztl-btn-primary"
										style={{ background: "#e11d48", borderColor: "#be123c", color: "#ffffff" }}
									>
										<RotateCcw size={14} />
										<span>Отправить на рекламацию</span>
									</button>
								</footer>
							</form>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
