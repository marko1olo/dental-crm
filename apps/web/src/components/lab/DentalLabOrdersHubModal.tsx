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
	CheckCircle2,
	Eye,
	RefreshCw,
	Building2,
	Coins,
	FileText,
	Clock,
	Truck,
} from "lucide-react";
import "./dentalLabWorkflow.css";
import {
	OrthopedicWorkTypeId,
	ORTHOPEDIC_WORK_TYPES,
	LabWorkflowStatus,
	LAB_WORKFLOW_STATUSES,
	LAB_WORKFLOW_STATUS_ORDER,
	DentalLabWorkflowOrder,
	createDentalLabOrder,
	advanceLabOrderStage,
	getNextLabProductionStage,
	generateDentalLabOrderA4PrintBlank,
	exportDentalLabOrdersToCsv,
	formatRussianDate,
} from "./dentalLabWorkflowEngine";

export interface DentalLabOrdersHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialOrders?: readonly DentalLabWorkflowOrder[] | undefined;
	readonly onSaveOrder?: ((order: DentalLabWorkflowOrder) => void) | undefined;
}

// ─── ДЕФОЛТНЫЕ КЛИНИЧЕСКИЕ ДАННЫЕ ДЛЯ РЕАЛИЗМА ────────────────────────────────

const SAMPLE_LABS = [
	"CAD/CAM Центр Дентал-Мастер",
	"ArtDent Премиум Лаб",
	"ZirconLab Pro",
	"Центральная зуботехническая лаборатория",
];

const INITIAL_SAMPLE_ORDERS: DentalLabWorkflowOrder[] = [
	createDentalLabOrder({
		patientId: "pat-101",
		patientName: "Смирнова Елена Александровна",
		patientChartNumber: "043/у-8492",
		doctorId: "doc-1",
		doctorName: "Д-р Ковалев С. П.",
		doctorPhone: "+7 (916) 111-22-33",
		clinicName: "Стоматологическая клиника DENTE",
		labName: "CAD/CAM Центр Дентал-Мастер",
		workTypeId: "crown_emax",
		selectedTeeth: [11, 21],
		shadeCode: "A2",
		stumpShadeCode: "ND2",
		translucency: "HT",
		surfaceTexture: "microtexture",
		pricePerUnitRub: 24000,
		costPerUnitRub: 8000,
		doctorPercent: 25,
		orderDate: new Date(Date.now() - 3 * 86400000),
		expectedLabDate: new Date(Date.now() + 2 * 86400000),
		fittingDate: new Date(Date.now() + 3 * 86400000),
		appointmentId: "appt-8041",
		initialStatus: "sent_to_lab",
		clinicalNotes: "Индивидуализация мамелонов, прозрачный режущий край по силиконовому ключу.",
	}),
	createDentalLabOrder({
		patientId: "pat-102",
		patientName: "Барабаш Сергей Владимирович",
		patientChartNumber: "043/у-7321",
		doctorId: "doc-2",
		doctorName: "Д-р Васильев А. М.",
		clinicName: "Стоматологическая клиника DENTE",
		labName: "ZirconLab Pro",
		workTypeId: "crown_zirconia",
		selectedTeeth: [16, 17],
		shadeCode: "A3",
		stumpShadeCode: "ND4",
		translucency: "MT",
		surfaceTexture: "high_gloss",
		pricePerUnitRub: 22000,
		costPerUnitRub: 7000,
		doctorPercent: 20,
		orderDate: new Date(Date.now() - 6 * 86400000),
		// Создаем критический конфликт дедлайна: готовность ЗТЛ позже визита!
		expectedLabDate: new Date(Date.now() + 3 * 86400000),
		fittingDate: new Date(Date.now() + 1 * 86400000),
		appointmentId: "appt-8055",
		initialStatus: "sent_to_lab",
		clinicalNotes: "Монолитный диоксид циркония Katana HTML. Винтовая фиксация.",
	}),
	createDentalLabOrder({
		patientId: "pat-103",
		patientName: "Кузнецова Ольга Дмитриевна",
		patientChartNumber: "043/у-9104",
		doctorId: "doc-1",
		doctorName: "Д-р Ковалев С. П.",
		clinicName: "Стоматологическая клиника DENTE",
		labName: "ArtDent Премиум Лаб",
		workTypeId: "custom_abutment",
		selectedTeeth: [24],
		shadeCode: "A1",
		translucency: "MT",
		pricePerUnitRub: 38000,
		costPerUnitRub: 13000,
		doctorPercent: 22,
		orderDate: new Date(Date.now() - 5 * 86400000),
		expectedLabDate: new Date(Date.now() + 1 * 86400000),
		fittingDate: new Date(Date.now() + 2 * 86400000),
		appointmentId: "appt-8062",
		initialStatus: "fitting_scheduled",
	}),
	createDentalLabOrder({
		patientId: "pat-104",
		patientName: "Морозов Игорь Геннадьевич",
		patientChartNumber: "043/у-6623",
		doctorId: "doc-3",
		doctorName: "Д-р Попова М. В.",
		clinicName: "Стоматологическая клиника DENTE",
		labName: "Центральная зуботехническая лаборатория",
		workTypeId: "clasp_prosthesis",
		selectedTeeth: [34, 35, 36, 37, 44, 45, 46, 47],
		shadeCode: "A3.5",
		pricePerUnitRub: 6000,
		costPerUnitRub: 2000,
		doctorPercent: 20,
		orderDate: new Date(Date.now() - 7 * 86400000),
		expectedLabDate: new Date(Date.now() - 1 * 86400000), // Просрочено ЗТЛ!
		fittingDate: new Date(Date.now() + 2 * 86400000),
		initialStatus: "draft",
	}),
];

export const DentalLabOrdersHubModal: React.FC<DentalLabOrdersHubModalProps> = ({
	isOpen,
	onClose,
	initialOrders,
	onSaveOrder,
}) => {
	// Состояние реестра нарядов
	const [orders, setOrders] = useState<DentalLabWorkflowOrder[]>(() => {
		return initialOrders && initialOrders.length > 0
			? [...initialOrders]
			: INITIAL_SAMPLE_ORDERS;
	});

	// Фильтры
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedLab, setSelectedLab] = useState<string>("ALL");
	const [selectedWorkType, setSelectedWorkType] = useState<string>("ALL");
	const [onlyDelayedFilter, setOnlyDelayedFilter] = useState<boolean>(false);

	// Модалка создания / деталей наряда
	const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
	const [inspectingOrder, setInspectingOrder] = useState<DentalLabWorkflowOrder | null>(null);

	// Форма создания нового наряда
	const [newPatientName, setNewPatientName] = useState<string>("");
	const [newChartNumber, setNewChartNumber] = useState<string>("");
	const [newDoctorName, setNewDoctorName] = useState<string>("Д-р Ковалев С. П.");
	const [newLabName, setNewLabName] = useState<string>(SAMPLE_LABS[0] ?? "CAD/CAM Центр");
	const [newWorkType, setNewWorkType] = useState<OrthopedicWorkTypeId>("crown_emax");
	const [newTeethInput, setNewTeethInput] = useState<string>("11, 21");
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

	// Группировка по 4 клиническим статусам
	const ordersByStage = useMemo(() => {
		const map: Record<LabWorkflowStatus, DentalLabWorkflowOrder[]> = {
			draft: [],
			sent_to_lab: [],
			fitting_scheduled: [],
			installed_completed: [],
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
	}, [onSaveOrder]);

	// Создание нового наряда
	const handleCreateOrderSubmit = useCallback((e: React.FormEvent) => {
		e.preventDefault();
		if (!newPatientName.trim()) return;

		const teeth = newTeethInput
			.split(",")
			.map((s) => parseInt(s.trim(), 10))
			.filter((n) => !isNaN(n) && n >= 11 && n <= 48);

		const created = createDentalLabOrder({
			patientId: `pat-${Date.now()}`,
			patientName: newPatientName.trim(),
			patientChartNumber: newChartNumber.trim() || "043/у",
			doctorId: "doc-current",
			doctorName: newDoctorName.trim(),
			clinicName: "Стоматологическая клиника DENTE",
			labName: newLabName,
			workTypeId: newWorkType,
			selectedTeeth: teeth.length > 0 ? teeth : [11],
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
		});

		setOrders((prev) => [created, ...prev]);
		if (onSaveOrder) onSaveOrder(created);

		// Сброс формы
		setIsCreateModalOpen(false);
		setNewPatientName("");
		setNewChartNumber("");
		setNewAppointmentId("");
		setNewClinicalNotes("");
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
		onSaveOrder,
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

				{/* ─── 2. БАННЕР КРИТИЧЕСКИХ ЗАДЕРЖЕК ЗТЛ (isDelayedAlert) ────────── */}
				{delayedOrders.length > 0 && (
					<div className="ztl-delay-banner" role="alert">
						<div className="ztl-delay-banner-left">
							<AlertTriangle size={16} />
							<span>
								Обнаружено <strong>{delayedOrders.length}</strong> заказов с задержкой ЗТЛ или конфликтом даты примерки!
							</span>
							<span className="ztl-delay-badge-count">isDelayedAlert</span>
						</div>
						<button
							type="button"
							className="ztl-btn-secondary"
							style={{ height: "26px", fontSize: "11px", borderColor: "#fca5a5", color: "#991b1b" }}
							onClick={() => setOnlyDelayedFilter((prev) => !prev)}
						>
							{onlyDelayedFilter ? "Показать все заказы" : "Показать проблемные наряды"}
						</button>
					</div>
				)}

				{/* ─── 3. ПАНЕЛЬ ФИЛЬТРОВ И ПОИСКА ──────────────────────────────── */}
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

				{/* ─── 4. КАНБАН-ДОСКА (4 КЛИНИЧЕСКИХ СТАТУСА) ───────────────────── */}
				<main className="ztl-kanban-board">
					{LAB_WORKFLOW_STATUS_ORDER.map((stageId) => {
						const stageDef = LAB_WORKFLOW_STATUSES[stageId];
						const stageOrders = ordersByStage[stageId] || [];

						return (
							<div key={stageId} className="ztl-kanban-column">
								<div className="ztl-column-header">
									<div className="ztl-column-title-wrap">
										<span className="ztl-column-icon">{stageDef.icon}</span>
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
													<span title="Стоимость для пациента">
														{order.financials.patientPriceTotalRub.toLocaleString("ru-RU")} ₽
													</span>
													<span style={{ color: "var(--muted, #64748b)", fontSize: "10px" }} title="Себестоимость ЗТЛ">
														Себест: {order.financials.labCostTotalRub.toLocaleString("ru-RU")} ₽
													</span>
												</div>

												{/* Кнопки действий */}
												<div className="ztl-card-actions-row">
													<button
														type="button"
														className="ztl-btn-card-action"
														onClick={() => setInspectingOrder(order)}
														title="Просмотреть детали наряда"
													>
														<Eye size={12} />
														<span>Инфо</span>
													</button>
													<button
														type="button"
														className="ztl-btn-card-action"
														onClick={() => handlePrintBlank(order)}
														title="Распечатать наряд А4 для курьера"
													>
														<Printer size={12} />
														<span>А4</span>
													</button>
													{order.currentStage !== "installed_completed" && (
														<button
															type="button"
															className="ztl-btn-card-action ztl-btn-advance"
															onClick={() => handleAdvanceStage(order)}
															title="Передвинуть на следующий клинический статус"
														>
															<ChevronRight size={12} />
														</button>
													)}
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
												placeholder="Иванов Иван Иванович"
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
												placeholder="11, 21, 22"
												value={newTeethInput}
												onChange={(e) => setNewTeethInput(e.target.value)}
											/>
										</div>
									</div>

									<div className="ztl-form-grid-2">
										<div className="ztl-form-group">
											<label className="ztl-form-label">Оттенок (VITA)</label>
											<input
												type="text"
												className="ztl-form-input"
												placeholder="A2"
												value={newShade}
												onChange={(e) => setNewShade(e.target.value)}
											/>
										</div>
										<div className="ztl-form-group">
											<label className="ztl-form-label">Оттенок культи (ND1-ND9)</label>
											<input
												type="text"
												className="ztl-form-input"
												placeholder="ND2"
												value={newStumpShade}
												onChange={(e) => setNewStumpShade(e.target.value)}
											/>
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
			</div>
		</div>
	);
};
