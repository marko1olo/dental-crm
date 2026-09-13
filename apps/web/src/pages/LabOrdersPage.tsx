import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	AlertCircle,
	Calendar,
	CheckCircle2,
	Clock,
	DollarSign,
	Download,
	ExternalLink,
	Filter,
	FlaskConical,
	Layers,
	Link,
	Loader2,
	MoreVertical,
	Plus,
	Printer,
	QrCode,
	RefreshCw,
	Search,
	Sparkles,
	Tag,
	Trash2,
	User,
} from "lucide-react";
import { denteAdminSecretRequestHeaders, money } from "../AppHelpers";
import { showToast } from "../components/GlobalToast";
import { DentalLabOrderModal, type DentalLabOrderData } from "../components/lab/DentalLabOrderModal";
import { LabTrackingDrawer } from "../components/lab/LabTrackingDrawer";
import { useAppStore } from "../store/appStore";
import { formatLabOrderTeethOrJaw, isJawWideConstruction } from "../components/lab/labMath";

export function LabOrdersPage() {
	const [orders, setOrders] = useState<DentalLabOrderData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filtering & Search
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [doctorFilter, setDoctorFilter] = useState<string>("all");
	const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);

	// Modal State
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<DentalLabOrderData | null>(null);

	// Tracking Drawer State
	const [isTrackingDrawerOpen, setIsTrackingDrawerOpen] = useState(false);
	const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<DentalLabOrderData | null>(null);

	// Live status updates from store
	const labOrderStatuses = useAppStore((state: any) => state.labOrderStatuses);

	const fetchOrders = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);
			const res = await fetch("/api/clinical/lab-orders", {
				headers: denteAdminSecretRequestHeaders(),
			});

			if (!res.ok) {
				throw new Error(`Ошибка загрузки нарядов ЗТЛ: ${res.status}`);
			}

			const data = await res.json();
			setOrders(Array.isArray(data) ? data : []);
		} catch (err: any) {
			setError(err.message || "Не удалось загрузить наряды лаборатории");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchOrders();
	}, [fetchOrders, labOrderStatuses]);

	// Filtered Orders List
	const filteredOrders = useMemo(() => {
		return orders.filter((o) => {
			if (statusFilter !== "all" && o.status !== statusFilter) return false;
			if (doctorFilter !== "all" && o.doctorId !== doctorFilter && o.doctorName !== doctorFilter) return false;

			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const pName = (o.patientName || "").toLowerCase();
				const dName = (o.doctorName || "").toLowerCase();
				const tooth = (o.toothFdi || "").toLowerCase();
				const mat = (o.material || "").toLowerCase();
				const notes = (o.clinicalNotes || "").toLowerCase();
				return pName.includes(q) || dName.includes(q) || tooth.includes(q) || mat.includes(q) || notes.includes(q);
			}

			return true;
		});
	}, [orders, statusFilter, doctorFilter, searchQuery]);

	// KPI Metrics
	const metrics = useMemo(() => {
		const total = orders.length;
		const inProgress = orders.filter((o) => o.status === "in_progress" || o.status === "sent").length;
		const tryIn = orders.filter((o) => o.status === "fitting" || o.status === "refitting").length;
		const ready = orders.filter((o) => o.status === "shipped" || o.status === "delivered" || o.status === "received" || o.status === "completed").length;
		const completed = orders.filter((o) => o.status === "completed").length;
		const overdue = orders.filter((o) => {
			if (!o.dueDate || o.status === "completed" || o.status === "cancelled") return false;
			const due = new Date(o.dueDate).getTime();
			return !Number.isNaN(due) && due < Date.now();
		}).length;

		const totalCost = orders.reduce((sum, o) => sum + (o.priceRub || 0), 0);
		const doctorDeductions = orders.reduce((sum, o) => sum + (o.doctorDeductionRub || ((o.priceRub || 0) * (o.doctorSharePct ?? 50)) / 100), 0);

		return {
			total,
			inProgress,
			tryIn,
			ready,
			completed,
			overdue,
			totalCost,
			doctorDeductions,
		};
	}, [orders]);

	const doctorsList = useMemo(() => {
		const set = new Set<string>();
		for (const o of orders) {
			if (o.doctorName) set.add(o.doctorName);
		}
		return Array.from(set).sort();
	}, [orders]);

	const handleStatusChange = async (orderId: string, newStatus: string) => {
		try {
			const res = await fetch(`/api/clinical/lab-orders/${orderId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({ status: newStatus }),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Ошибка обновления статуса");
			}

			showToast("Статус наряда ЗТЛ успешно обновлен", "success");
			fetchOrders();
		} catch (err: any) {
			showToast(err.message || "Ошибка смены статуса", "error");
		}
	};

	const copyPortalLink = (token?: string) => {
		if (!token) return;
		const url = `${window.location.origin}/#/portal/lab-order/${token}`;
		navigator.clipboard.writeText(url);
		showToast("Ссылка для зуботехника скопирована в буфер обмена", "success");
	};

	const handleOpenNewOrder = () => {
		setSelectedOrderForEdit(null);
		setIsModalOpen(true);
	};

	const handleOpenEditOrder = (order: DentalLabOrderData) => {
		setSelectedOrderForEdit(order);
		setIsModalOpen(true);
	};

	const handleOpenTracking = (order: DentalLabOrderData) => {
		setSelectedOrderForTracking(order);
		setIsTrackingDrawerOpen(true);
	};

	const handleDrawerStageUpdate = async (orderId: string, newStage: string, note?: string) => {
		try {
			const res = await fetch(`/api/lab/orders/${orderId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({ stage: newStage, notes: note }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Ошибка обновления этапа ЗТЛ");
			}
			showToast("Этап наряда ЗТЛ успешно обновлен", "success");
			fetchOrders();
		} catch (err: any) {
			showToast(err.message || "Ошибка смены этапа ЗТЛ", "error");
		}
	};

	const getStatusBadge = (status?: string) => {
		switch (status) {
			case "sent":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">Отправлен в ЗТЛ</span>;
			case "in_progress":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">В работе (CAD/CAM)</span>;
			case "fitting":
			case "refitting":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">На примерке / Доработке</span>;
			case "shipped":
			case "delivered":
			case "received":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">В клинике / Готов к сдаче</span>;
			case "completed":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Сдан / Установлен</span>;
			case "cancelled":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">Аннулирован</span>;
			default:
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{status || "Черновик"}</span>;
		}
	};

	return (
		<div className="p-4 space-y-3 max-w-7xl mx-auto">
			{/* Page Header (Compact ~36px) */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
				<div className="flex items-center gap-2.5 min-w-0">
					<FlaskConical className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
					<div className="min-w-0">
						<h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate m-0 leading-tight">
							Зуботехническая лаборатория (CAD/CAM ЗТЛ)
						</h1>
						<p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 hidden sm:block leading-tight">
							Цифровые наряд-заказы, расцветка VITA, культи ND1–ND9, трекинг этапов и удержания.
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={fetchOrders}
						className="h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors shadow-2xs flex items-center justify-center cursor-pointer"
						title="Обновить список"
					>
						<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-teal-600" : ""}`} />
					</button>

					<button
						type="button"
						onClick={handleOpenNewOrder}
						className="h-9 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-bold shadow-2xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
					>
						<Plus className="w-3.5 h-3.5" />
						<span>Новый наряд в ЗТЛ</span>
					</button>
				</div>
			</div>

			{/* Compact 1-Line Inline Summary Chip Strip (32-36px) */}
			<div className="h-9 min-h-[34px] flex items-center gap-2.5 px-3 bg-[var(--paper)] rounded-xl border border-[var(--line)] text-xs text-[var(--muted)] overflow-x-auto whitespace-nowrap shadow-2xs scrollbar-thin">
				<span>
					Всего: <strong className="text-[var(--ink)] font-mono">{metrics.total}</strong>
				</span>
				<span className="text-[var(--line)]">•</span>
				<span>
					В работе: <strong className="text-blue-600 dark:text-blue-400 font-mono">{metrics.inProgress}</strong>
				</span>
				<span className="text-[var(--line)]">•</span>
				<span>
					Готовы: <strong className="text-teal-600 dark:text-teal-400 font-mono">{metrics.ready}</strong>
				</span>
				<span className="text-[var(--line)]">•</span>
				<span>
					На примерке: <strong className="text-purple-600 dark:text-purple-400 font-mono">{metrics.tryIn}</strong>
				</span>
				<span className="text-[var(--line)]">•</span>
				<span>
					Просрочено:{" "}
					<strong
						className={
							metrics.overdue > 0
								? "text-rose-600 dark:text-rose-400 font-bold font-mono"
								: "text-[var(--ink)] font-mono"
						}
					>
						{metrics.overdue}
					</strong>
				</span>
				<span className="text-[var(--line)]">•</span>
				<span>
					Сумма: <strong className="text-teal-600 dark:text-teal-400 font-mono">{money(metrics.totalCost)}</strong>
				</span>
				{metrics.doctorDeductions > 0 && (
					<>
						<span className="text-[var(--line)]">•</span>
						<span>
							Удержания: <strong className="text-amber-600 dark:text-amber-400 font-mono">{money(metrics.doctorDeductions)}</strong>
						</span>
					</>
				)}
			</div>

			{/* Filters & Search Toolbar (Compact 36px) */}
			<div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 bg-[var(--paper)] rounded-xl border border-[var(--line)] shadow-2xs">
				<div className="relative flex-1 w-full">
					<Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
					<input
						type="text"
						placeholder="Поиск по пациенту, врачу, зубу FDI или материалу..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full h-9 min-h-[36px] pl-8 pr-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-teal-500 focus:outline-none"
					/>
				</div>

				<div className="flex items-center gap-2 w-full sm:w-auto">
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="h-9 min-h-[36px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer"
					>
						<option value="all">Все статусы</option>
						<option value="sent">Отправлен в ЗТЛ</option>
						<option value="in_progress">В производстве</option>
						<option value="fitting">На примерке</option>
						<option value="refitting">На доработке</option>
						<option value="shipped">В клинике</option>
						<option value="completed">Сдан / Установлен</option>
					</select>

					<select
						value={doctorFilter}
						onChange={(e) => setDoctorFilter(e.target.value)}
						className="h-9 min-h-[36px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer"
					>
						<option value="all">Все врачи</option>
						{doctorsList.map((doc: string) => (
							<option key={doc} value={doc}>{doc}</option>
						))}
					</select>
				</div>
			</div>

			{/* Main Orders Table / Cards */}
			{isLoading ? (
				<div className="p-12 text-center text-[var(--muted)] flex items-center justify-center gap-2">
					<Loader2 className="w-5 h-5 animate-spin text-teal-600" />
					<span>Загрузка нарядов лаборатории...</span>
				</div>
			) : error ? (
				<div className="p-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl text-rose-700 dark:text-rose-300 flex items-center gap-3">
					<AlertCircle className="w-5 h-5 shrink-0" />
					<div>
						<div className="font-bold">Не удалось загрузить наряды ЗТЛ</div>
						<div className="text-xs">{error}</div>
					</div>
				</div>
			) : filteredOrders.length === 0 ? (
				<div className="p-12 text-center bg-[var(--paper)] rounded-2xl border border-dashed border-[var(--line)] text-[var(--muted)] text-xs space-y-3">
					<FlaskConical className="w-10 h-10 mx-auto text-teal-600 dark:text-teal-400" />
					<p className="font-bold text-sm text-[var(--ink)]">Нарядов в зуботехническую лабораторию пока нет</p>
					<p className="max-w-md mx-auto text-[var(--muted)]">
						Оформите новый заказ-наряд в лабораторию с выбором зубов по FDI, расцветки VITA и автоматическим расчетом удержания себестоимости с врача.
					</p>
					<button
						type="button"
						onClick={handleOpenNewOrder}
						className="min-h-[44px] h-11 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold inline-flex items-center gap-2 shadow-2xs cursor-pointer transition-all active:scale-95 text-xs"
						data-testid="empty-state-add-first-lab-order-btn"
						style={{ minHeight: "44px" }}
					>
						<Plus className="w-4 h-4" />
						<span>+ Оформить заказ-наряд в лабораторию</span>
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredOrders.map((order) => {
						return (
							<div
								key={order.id}
								className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
							>
								<div className="space-y-3">
									{/* Card Top */}
									<div className="flex items-start justify-between gap-2">
										<div className="flex items-center gap-2">
											<span
												className={`min-h-[36px] px-2.5 py-1 rounded-xl font-extrabold text-xs flex items-center justify-center text-center ${
													order.jawScope ||
													isJawWideConstruction(order.constructionType) ||
													Boolean(
														order.toothFdi &&
															(order.toothFdi.includes("челюст") ||
																order.toothFdi.includes("В/Ч") ||
																order.toothFdi.includes("Н/Ч")),
													)
														? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
														: "bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-400 font-mono"
												}`}
												title={order.toothFdi || "Челюсть / Зубы"}
											>
												{formatLabOrderTeethOrJaw(order)}
											</span>
											<div>
												<h3 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0">
													{order.patientName || "Пациент"}
												</h3>
												<span className="text-xs text-[var(--muted)] block">
													Врач: {order.doctorName || "Не указан"}
												</span>
											</div>
										</div>

										{getStatusBadge(order.status)}
									</div>

									{/* Tech Details */}
									<div className="p-2.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] text-xs space-y-1 text-[var(--ink)]">
										<div className="flex justify-between">
											<span className="text-[var(--muted)]">Материал:</span>
											<span className="font-semibold">{order.material || "Цирконий"}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-[var(--muted)]">Цвет VITA:</span>
											<span className="font-bold text-teal-600 dark:text-teal-400 font-mono">
												{order.colorVita || "A2"}
											</span>
										</div>
										{order.dueDate && (
											<div className="flex justify-between text-[var(--muted)]">
												<span>Срок сдачи:</span>
												<span>{new Date(order.dueDate).toLocaleDateString("ru-RU")}</span>
											</div>
										)}
									</div>

									{/* Notes preview */}
									{order.clinicalNotes && (
										<p className="text-xs text-[var(--muted)] italic line-clamp-2 m-0">
											{order.clinicalNotes}
										</p>
									)}
								</div>

								{/* Status Selector (Mandate 8c: >=44px) */}
								<div className="flex items-center justify-between p-2 bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl text-xs">
									<span className="text-[var(--muted)] font-medium">Статус:</span>
									<select
										value={
											(order.status === "fitting" || order.status === "refitting")
												? "fitting"
												: (order.status === "shipped" || order.status === "delivered" || order.status === "received")
												? "received"
												: (order.status === "completed")
												? "completed"
												: "sent"
										}
										onChange={(e) => {
											const targetApiStatus = e.target.value === "received" ? "received" : e.target.value;
											handleStatusChange(order.id!, targetApiStatus);
										}}
										className="h-11 min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-bold text-xs cursor-pointer text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-teal-500"
										aria-label="Изменить статус наряда ЗТЛ"
										style={{ minHeight: "44px" }}
									>
										<option value="sent">Отправлен в ЗТЛ</option>
										<option value="fitting">На примерке</option>
										<option value="received">Готов (в клинике)</option>
										<option value="completed">Сдан пациенту</option>
									</select>
								</div>

								{/* Card Bottom: Financials & <= 2 Direct Actions + Context Menu (Sin 3) */}
								<div className="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2">
									<div>
										<span className="text-[11px] text-[var(--muted)] block">Себестоимость:</span>
										<span className="text-sm font-black text-[var(--ink)] font-mono">
											{order.priceRub != null ? money(order.priceRub) : "—"}
										</span>
									</div>

									<div className="flex items-center gap-1.5">
										{order.dueDate && (
											<button
												type="button"
												onClick={() => {
													window.location.hash = "#schedule";
													const d = new Date(order.dueDate!).toLocaleDateString("ru-RU");
													showToast(`Переход в расписание на дату готовности: ${d} (зуб ${order.toothFdi || ""})`, "success");
												}}
												className="h-11 min-h-[44px] px-3 rounded-xl bg-[var(--teal)] text-white hover:opacity-90 font-bold text-xs inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
												title="Запланировать слот в расписании"
												style={{ minHeight: "44px" }}
											>
												<Calendar className="w-3.5 h-3.5" />
												Запись
											</button>
										)}

										<button
											type="button"
											onClick={() => handleOpenEditOrder(order)}
											className="h-11 min-h-[44px] px-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 font-bold text-xs border border-teal-200 dark:border-teal-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
											style={{ minHeight: "44px" }}
										>
											Детали
										</button>

										<div className="relative">
											<button
												type="button"
												onClick={() => setOpenMenuOrderId((prev) => prev === order.id ? null : (order.id || null))}
												className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
												style={{ minWidth: "44px", minHeight: "44px" }}
												aria-label="Вторичные действия с нарядом ЗТЛ"
												aria-expanded={openMenuOrderId === order.id}
											>
												<MoreVertical className="w-4 h-4" />
											</button>

											{openMenuOrderId === order.id && (
												<div className="absolute right-0 bottom-full mb-1 z-50 w-52 p-1 bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl shadow-lg flex flex-col gap-1 text-xs">
													<button
														type="button"
														onClick={() => {
															setOpenMenuOrderId(null);
															handleOpenTracking(order);
														}}
														className="w-full text-left px-3 py-2 min-h-[44px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer"
														style={{ minHeight: "44px" }}
													>
														<Layers className="w-4 h-4 text-indigo-500" />
														Трекинг этапов
													</button>
													{order.secureToken && (
														<button
															type="button"
															onClick={() => {
																setOpenMenuOrderId(null);
																copyPortalLink(order.secureToken!);
															}}
															className="w-full text-left px-3 py-2 min-h-[44px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer"
															style={{ minHeight: "44px" }}
														>
															<Link className="w-4 h-4 text-teal-500" />
															Копировать ссылку ЗТЛ
														</button>
													)}
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Modal Instance */}
			<DentalLabOrderModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				initialOrder={selectedOrderForEdit}
				onOrderSaved={() => fetchOrders()}
			/>

			{/* Tracking Drawer Instance */}
			<LabTrackingDrawer
				isOpen={isTrackingDrawerOpen}
				onClose={() => setIsTrackingDrawerOpen(false)}
				order={selectedOrderForTracking}
				onStageUpdate={handleDrawerStageUpdate}
			/>
		</div>
	);
}
