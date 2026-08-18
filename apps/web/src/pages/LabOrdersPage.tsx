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
import { useAppStore } from "../store/appStore";

export function LabOrdersPage() {
	const [orders, setOrders] = useState<DentalLabOrderData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filtering & Search
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [doctorFilter, setDoctorFilter] = useState<string>("all");

	// Modal State
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<DentalLabOrderData | null>(null);

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
		const completed = orders.filter((o) => o.status === "completed").length;

		const totalCost = orders.reduce((sum, o) => sum + (o.priceRub || 0), 0);
		const doctorDeductions = orders.reduce((sum, o) => sum + (o.doctorDeductionRub || ((o.priceRub || 0) * (o.doctorSharePct ?? 50)) / 100), 0);

		return {
			total,
			inProgress,
			tryIn,
			completed,
			totalCost,
			doctorDeductions,
		};
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
		<div className="p-6 space-y-6 max-w-7xl mx-auto">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div className="space-y-1">
					<h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 m-0">
						<FlaskConical className="w-7 h-7 text-teal-600 dark:text-teal-400" />
						Зуботехническая лаборатория (CAD/CAM ЗТЛ)
					</h1>
					<p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 m-0">
						Цифровые наряд-заказы, 3-зонная расцветка VITA, культи ND1–ND9, трекинг этапов и удержания из гонораров врачей.
					</p>
				</div>

				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={fetchOrders}
						className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors shadow-sm"
						title="Обновить список"
					>
						<RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-teal-600" : ""}`} />
					</button>

					<button
						type="button"
						onClick={handleOpenNewOrder}
						className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-teal-500/20 inline-flex items-center gap-2 transition-all"
					>
						<Plus className="w-4 h-4" />
						Новый наряд в ЗТЛ
					</button>
				</div>
			</div>

			{/* Summary KPI Cards */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
				<div className="p-3.5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
					<span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Всего заказов</span>
					<div className="text-xl font-black text-slate-900 dark:text-white font-mono">{metrics.total}</div>
				</div>

				<div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-800/40 shadow-sm space-y-1">
					<span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">В производстве</span>
					<div className="text-xl font-black text-blue-900 dark:text-blue-100 font-mono">{metrics.inProgress}</div>
				</div>

				<div className="p-3.5 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-200 dark:border-purple-800/40 shadow-sm space-y-1">
					<span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">На примерке</span>
					<div className="text-xl font-black text-purple-900 dark:text-purple-100 font-mono">{metrics.tryIn}</div>
				</div>

				<div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 shadow-sm space-y-1">
					<span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Сдано работ</span>
					<div className="text-xl font-black text-emerald-900 dark:text-emerald-100 font-mono">{metrics.completed}</div>
				</div>

				<div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1 col-span-2 sm:col-span-1 lg:col-span-1">
					<span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Сумма ЗТЛ</span>
					<div className="text-lg font-black text-teal-600 dark:text-teal-400 font-mono">{money(metrics.totalCost)}</div>
				</div>

				<div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-800/40 shadow-sm space-y-1 col-span-2 sm:col-span-2 lg:col-span-1">
					<span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Удержания с врачей</span>
					<div className="text-lg font-black text-amber-900 dark:text-amber-200 font-mono">{money(metrics.doctorDeductions)}</div>
				</div>
			</div>

			{/* Filters & Search Toolbar */}
			<div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
				<div className="relative flex-1 w-full">
					<Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
					<input
						type="text"
						placeholder="Поиск по пациенту, врачу, зубу FDI или материалу..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
					/>
				</div>

				<div className="flex items-center gap-2 w-full sm:w-auto">
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
					>
						<option value="all">Все статусы</option>
						<option value="sent">Отправлен в ЗТЛ</option>
						<option value="in_progress">В производстве</option>
						<option value="fitting">На примерке</option>
						<option value="refitting">На доработке</option>
						<option value="shipped">В клинике</option>
						<option value="completed">Сдан / Установлен</option>
					</select>
				</div>
			</div>

			{/* Main Orders Table / Cards */}
			{isLoading && orders.length === 0 ? (
				<div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
					<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
					<span>Загрузка нарядов лаборатории...</span>
				</div>
			) : error ? (
				<div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
					<span>{error}</span>
					<button
						type="button"
						onClick={fetchOrders}
						className="px-3 py-1 bg-rose-200 rounded-lg font-bold"
					>
						Повторить
					</button>
				</div>
			) : filteredOrders.length === 0 ? (
				<div className="p-12 text-center bg-white dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs space-y-3">
					<FlaskConical className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
					<p className="font-semibold text-sm">Нарядов в зуботехническую лабораторию не найдено</p>
					<p className="max-w-md mx-auto">
						Оформите новый заказ-наряд с выбором зубов по FDI, расцветки VITA и автоматическим расчетом удержания себестоимости с врача.
					</p>
					<button
						type="button"
						onClick={handleOpenNewOrder}
						className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold inline-flex items-center gap-1.5 shadow-sm"
					>
						<Plus className="w-4 h-4" />
						Создать первый наряд
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredOrders.map((order) => {
						return (
							<div
								key={order.id}
								className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/70 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
							>
								<div className="space-y-3">
									{/* Card Top */}
									<div className="flex items-start justify-between gap-2">
										<div className="flex items-center gap-2">
											<span className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center font-extrabold text-teal-700 dark:text-teal-400 text-xs font-mono">
												{order.toothFdi || "—"}
											</span>
											<div>
												<h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white m-0">
													{order.patientName || "Пациент"}
												</h3>
												<span className="text-[11px] text-slate-500 dark:text-slate-400 block">
													Врач: {order.doctorName || "Не указан"}
												</span>
											</div>
										</div>

										{getStatusBadge(order.status)}
									</div>

									{/* Tech Details */}
									<div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1 text-slate-700 dark:text-slate-300">
										<div className="flex justify-between">
											<span className="text-slate-400">Материал:</span>
											<span className="font-semibold">{order.material || "Цирконий"}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-slate-400">Цвет VITA:</span>
											<span className="font-bold text-teal-600 dark:text-teal-400 font-mono">
												{order.colorVita || "A2"}
											</span>
										</div>
										{order.dueDate && (
											<div className="flex justify-between text-slate-500">
												<span>Срок сдачи:</span>
												<span>{new Date(order.dueDate).toLocaleDateString("ru-RU")}</span>
											</div>
										)}
									</div>

									{/* Notes preview */}
									{order.clinicalNotes && (
										<p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2 m-0">
											{order.clinicalNotes}
										</p>
									)}
								</div>

								{/* Card Bottom: Financials & Action Buttons */}
								<div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
									<div>
										<span className="text-[10px] text-slate-400 block">Себестоимость ЗТЛ:</span>
										<span className="text-sm font-black text-slate-900 dark:text-white font-mono">
											{order.priceRub != null ? money(order.priceRub) : "—"}
										</span>
									</div>

									<div className="flex items-center gap-1.5">
										{order.secureToken && (
											<button
												type="button"
												onClick={() => copyPortalLink(order.secureToken)}
												className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
												title="Скопировать ссылку для зубного техника"
											>
												<Link className="w-3.5 h-3.5" />
											</button>
										)}

										<button
											type="button"
											onClick={() => handleOpenEditOrder(order)}
											className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 font-bold text-xs border border-teal-200 dark:border-teal-800 transition-colors"
										>
											Детали наряда
										</button>
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
		</div>
	);
}
