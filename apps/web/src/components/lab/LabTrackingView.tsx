import React, { useState, useMemo } from "react";
import {
	Calendar,
	CheckCircle2,
	Clock,
	ExternalLink,
	FlaskConical,
	LayoutGrid,
	List,
	Search,
	Tag,
} from "lucide-react";
import { money } from "../../AppHelpers";
import {
	type DentalLabOrderData,
	formatLabOrderTeethOrJaw,
	isJawWideConstruction,
} from "./labMath";

export interface LabTrackingViewProps {
	orders: DentalLabOrderData[];
	onOpenTracking?: (order: DentalLabOrderData) => void;
	onOpenEditOrder?: (order: DentalLabOrderData) => void;
	onStatusChange?: (orderId: string, targetStatus: string) => void;
	defaultViewMode?: "cards" | "table";
}

export function LabTrackingView({
	orders,
	onOpenTracking,
	onOpenEditOrder,
	onStatusChange,
	defaultViewMode = "cards",
}: LabTrackingViewProps) {
	const [viewMode, setViewMode] = useState<"cards" | "table">(defaultViewMode);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");

	const filteredOrders = useMemo(() => {
		return orders.filter((o) => {
			if (statusFilter !== "all" && o.status !== statusFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const pName = (o.patientName || "").toLowerCase();
				const dName = (o.doctorName || "").toLowerCase();
				const tooth = (o.toothFdi || "").toLowerCase();
				const mat = (o.material || "").toLowerCase();
				const notes = (o.clinicalNotes || "").toLowerCase();
				const constr = (o.constructionType || "").toLowerCase();
				return (
					pName.includes(q) ||
					dName.includes(q) ||
					tooth.includes(q) ||
					mat.includes(q) ||
					notes.includes(q) ||
					constr.includes(q)
				);
			}
			return true;
		});
	}, [orders, statusFilter, searchQuery]);

	const renderTeethOrJawBadge = (order: DentalLabOrderData, isTable = false) => {
		const isJaw =
			Boolean(order.jawScope) ||
			isJawWideConstruction(order.constructionType) ||
			Boolean(
				order.toothFdi &&
					(order.toothFdi.includes("челюст") ||
						order.toothFdi.includes("В/Ч") ||
						order.toothFdi.includes("Н/Ч")),
			);

		const label = formatLabOrderTeethOrJaw(order);

		if (isTable) {
			return (
				<span
					className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold transition-colors ${
						isJaw
							? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
							: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
					}`}
					title={order.toothFdi || label}
				>
					{label}
				</span>
			);
		}

		return (
			<span
				className={`min-h-[32px] px-2.5 py-1 rounded-xl font-extrabold text-xs flex items-center justify-center text-center transition-colors ${
					isJaw
						? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
						: "bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-400 font-mono"
				}`}
				title={order.toothFdi || label}
			>
				{label}
			</span>
		);
	};

	return (
		<div className="space-y-4">
			{/* View Controls Toolbar */}
			<div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-[var(--paper)] rounded-2xl border border-[var(--line)] shadow-sm">
				<div className="relative flex-1 w-full">
					<Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-3" />
					<input
						type="text"
						placeholder="Поиск по пациенту, челюсти, зубу FDI или конструкции..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full h-9 pl-9 pr-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:ring-2 focus:ring-teal-500 focus:outline-none"
					/>
				</div>

				<div className="flex items-center gap-2 w-full sm:w-auto">
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:ring-2 focus:ring-teal-500 focus:outline-none"
					>
						<option value="all">Все статусы</option>
						<option value="sent">Отправлен в ЗТЛ</option>
						<option value="in_progress">В производстве</option>
						<option value="fitting">На примерке</option>
						<option value="refitting">На доработке</option>
						<option value="shipped">В клинике</option>
						<option value="completed">Сдан / Установлен</option>
					</select>

					<div className="flex items-center gap-1 bg-[var(--paper-soft)] p-1 rounded-xl border border-[var(--line)]">
						<button
							type="button"
							onClick={() => setViewMode("cards")}
							className={`h-7 px-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
								viewMode === "cards"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-sm"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							title="Вид карточек"
						>
							<LayoutGrid className="w-3.5 h-3.5" />
							<span>Карточки</span>
						</button>
						<button
							type="button"
							onClick={() => setViewMode("table")}
							className={`h-7 px-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
								viewMode === "table"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-sm"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							title="Вид таблицы"
						>
							<List className="w-3.5 h-3.5" />
							<span>Таблица</span>
						</button>
					</div>
				</div>
			</div>

			{filteredOrders.length === 0 ? (
				<div className="p-12 text-center bg-[var(--paper)] rounded-2xl border border-dashed border-[var(--line)] text-[var(--muted)] text-xs space-y-2">
					<FlaskConical className="w-8 h-8 mx-auto text-teal-600 dark:text-teal-400" />
					<p className="font-bold text-sm text-[var(--ink)]">Нарядов по указанным критериям не найдено</p>
				</div>
			) : viewMode === "cards" ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredOrders.map((order) => {
						return (
							<div
								key={order.id}
								className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
							>
								<div className="space-y-3">
									<div className="flex items-start justify-between gap-2">
										<div className="flex items-center gap-2">
											{renderTeethOrJawBadge(order, false)}
											<div>
												<h3 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0">
													{order.patientName || "Пациент"}
												</h3>
												<span className="text-xs text-[var(--muted)] block">
													Врач: {order.doctorName || "Не указан"}
												</span>
											</div>
										</div>
									</div>

									<div className="p-2.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] text-xs space-y-1 text-[var(--ink)]">
										<div className="flex justify-between">
											<span className="text-[var(--muted)]">Конструкция:</span>
											<span className="font-semibold">{order.constructionType || "Одиночная коронка"}</span>
										</div>
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

									{order.clinicalNotes && (
										<p className="text-xs text-[var(--muted)] italic line-clamp-2 m-0">
											{order.clinicalNotes}
										</p>
									)}
								</div>

								{/* Actions */}
								<div className="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2 flex-wrap">
									<div>
										<span className="text-xs text-[var(--muted)] block">Себестоимость:</span>
										<span className="text-sm font-black text-[var(--ink)] font-mono">
											{order.priceRub != null ? money(order.priceRub) : "—"}
										</span>
									</div>

									<div className="flex items-center gap-1.5 flex-wrap">
										{onOpenTracking && (
											<button
												type="button"
												onClick={() => onOpenTracking(order)}
												className="h-8 px-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-bold text-xs border border-indigo-200 dark:border-indigo-800 transition-colors"
											>
												Трекинг
											</button>
										)}
										{onOpenEditOrder && (
											<button
												type="button"
												onClick={() => onOpenEditOrder(order)}
												className="h-8 px-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 font-bold text-xs border border-teal-200 dark:border-teal-800 transition-colors"
											>
												Детали
											</button>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			) : (
				<div className="bg-[var(--paper)] rounded-2xl border border-[var(--line)] shadow-sm overflow-x-auto">
					<table className="w-full text-left text-xs border-collapse">
						<thead>
							<tr className="border-b border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] font-bold">
								<th className="p-3">Пациент / Врач</th>
								<th className="p-3">Челюсть / Зубы FDI</th>
								<th className="p-3">Конструкция</th>
								<th className="p-3">Материал / VITA</th>
								<th className="p-3">Срок сдачи</th>
								<th className="p-3">Себестоимость</th>
								<th className="p-3 text-right">Действия</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line)]">
							{filteredOrders.map((order) => (
								<tr key={order.id} className="hover:bg-[var(--paper-soft)] transition-colors">
									<td className="p-3">
										<div className="font-bold text-[var(--ink)]">{order.patientName || "Пациент"}</div>
										<div className="text-[var(--muted)] text-[11px]">{order.doctorName || "Не указан"}</div>
									</td>
									<td className="p-3">
										{renderTeethOrJawBadge(order, true)}
									</td>
									<td className="p-3">
										<div className="font-semibold text-[var(--ink)]">{order.constructionType || "Одиночная коронка"}</div>
									</td>
									<td className="p-3">
										<div>{order.material || "Цирконий"}</div>
										<div className="font-mono text-teal-600 dark:text-teal-400 font-bold text-[11px]">
											VITA {order.colorVita || "A2"}
										</div>
									</td>
									<td className="p-3 text-[var(--muted)]">
										{order.dueDate ? new Date(order.dueDate).toLocaleDateString("ru-RU") : "—"}
									</td>
									<td className="p-3 font-mono font-bold text-[var(--ink)]">
										{order.priceRub != null ? money(order.priceRub) : "—"}
									</td>
									<td className="p-3 text-right">
										<div className="inline-flex items-center gap-1.5 justify-end">
											{onOpenTracking && (
												<button
													type="button"
													onClick={() => onOpenTracking(order)}
													className="h-7 px-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-[11px] border border-indigo-200 dark:border-indigo-800"
												>
													Трекинг
												</button>
											)}
											{onOpenEditOrder && (
												<button
													type="button"
													onClick={() => onOpenEditOrder(order)}
													className="h-7 px-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 font-bold text-[11px] border border-teal-200 dark:border-teal-800"
												>
													Детали
												</button>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
