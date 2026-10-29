import React from "react";
import { AlertCircle, FlaskConical, Loader2, Plus, RefreshCw } from "lucide-react";
import { DentalLabOrdersView } from "../lab/DentalLabOrdersView";
import { DentalLabOrderModal } from "../lab/DentalLabOrderModal";
import { LabTrackingDrawer } from "../lab/LabTrackingDrawer";
import { useLabOrdersPanelLogic } from "./useLabOrdersPanelLogic";
import { LabOrderCardItem } from "./LabOrderCardItem";
import type { LabOrderFilterKey } from "./labOrdersTypes";
import "./LabOrdersPanel.css";

export type { LabOrder } from "./labOrdersTypes";

export interface LabOrdersPanelProps {
	readonly patientId?: string;
}

const FILTER_LABELS: readonly { key: LabOrderFilterKey; label: string }[] = [
	{ key: "all", label: "Все" },
	{ key: "active", label: "В работе" },
	{ key: "fitting", label: "Примерка" },
	{ key: "ready", label: "Готов в клинике" },
	{ key: "completed", label: "Сдан" },
];

/**
 * LabOrdersPanel — Канонический фасад интеграции нарядов ЗТЛ в карточке пациента (Мандаты 8e, 8n, 8am).
 * Обеспечивает:
 * - Ровно 1 Primary CTA кнопку в цвете Teal (#0d9488) «+ Новый наряд в ЗТЛ».
 * - Оформление ортопедических нарядов за 30 секунд у кресла без блокирующих преград.
 * - Прямое монтирование DentalLabOrderModal и LabTrackingDrawer в боевой DOM.
 * - Полную мобильную адаптивность Apple HIG (0px паразитного горизонтального дрифта).
 */
export function LabOrdersPanel({ patientId }: LabOrdersPanelProps): React.JSX.Element {
	if (!patientId) return <DentalLabOrdersView />;

	const logic = useLabOrdersPanelLogic(patientId);
	const portalBasePath = "/#/portal/lab-order/";

	return (
		<div
			className="lab-orders-panel space-y-3.5"
			data-testid="patient-lab-orders-panel"
			data-patient-id={patientId}
			data-portal-path={portalBasePath}
		>
			{/* Верхняя шапка: Заголовок, счетчик и единственная Primary CTA кнопка */}
			<header className="flex flex-wrap items-center justify-between gap-2.5 p-3 sm:p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-9 h-9 rounded-xl bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]/25 flex items-center justify-center shrink-0">
						<FlaskConical className="w-5 h-5 text-[var(--teal,#0d9488)]" />
					</div>
					<div className="min-w-0">
						<h2 className="text-sm sm:text-base font-bold text-[var(--ink)] truncate">
							Наряды в лабораторию (ЗТЛ)
						</h2>
						<p className="text-xs text-[var(--muted)] truncate">
							Ортопедические конструкции, примерки и отслеживание статуса
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={() => void logic.fetchOrders()}
						disabled={logic.loading}
						className="secondary-button min-h-[38px] px-2.5 py-1.5 text-xs font-medium rounded-xl border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer inline-flex items-center gap-1 transition-colors"
						title="Обновить список нарядов ЗТЛ"
					>
						<RefreshCw className={`w-3.5 h-3.5 ${logic.loading ? "animate-spin" : ""}`} />
						<span className="hidden sm:inline">Обновить</span>
					</button>

					{/* Мандат 8am: Ровно 1 Primary CTA кнопка в Teal */}
					<button
						type="button"
						onClick={logic.handleOpenCreateOrder}
						className="primary-button min-h-[38px] px-3.5 py-1.5 text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5 text-white active:scale-95 transition-transform"
						style={{ backgroundColor: "var(--teal, #0d9488)", borderColor: "var(--teal, #0d9488)" }}
						data-testid="lab-order-panel-create-btn"
					>
						<Plus className="w-4 h-4 shrink-0" />
						<span>+ Новый наряд в ЗТЛ</span>
					</button>
				</div>
			</header>

			{/* Фильтры по этапам жизненного цикла нарядов ЗТЛ */}
			{logic.orders.length > 0 && (
				<nav
					className="flex items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle,rgba(0,0,0,0.06))] overflow-x-auto scrollbar-none"
					aria-label="Фильтры нарядов ЗТЛ"
				>
					{FILTER_LABELS.map(({ key, label }) => {
						const count = logic.filterCounts[key];
						const isActive = logic.filter === key;
						return (
							<button
								key={key}
								type="button"
								onClick={() => logic.setFilter(key)}
								data-testid={`lab-filter-${key}`}
								className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
									isActive
										? "bg-[var(--paper)] text-[var(--ink)] shadow-xs font-bold border border-[var(--line)]"
										: "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent border border-transparent"
								}`}
							>
								<span>{label}</span>
								<span
									className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
										isActive
											? "bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] font-bold"
											: "bg-[var(--paper)] text-[var(--muted)]"
									}`}
								>
									{count}
								</span>
							</button>
						);
					})}
				</nav>
			)}

			{/* Состояния: Ошибка, Загрузка, Пустой список или Карточки нарядов */}
			{logic.error && (
				<div
					className="p-3.5 rounded-2xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2"
					role="alert"
				>
					<div className="flex items-center gap-2">
						<AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
						<span>{logic.error}</span>
					</div>
					<button
						type="button"
						onClick={() => void logic.fetchOrders()}
						className="px-2.5 py-1 rounded-lg bg-rose-200 dark:bg-rose-900 font-semibold hover:bg-rose-300 transition-colors cursor-pointer shrink-0"
					>
						Повторить
					</button>
				</div>
			)}

			{logic.loading && logic.orders.length === 0 ? (
				<div className="p-8 text-center bg-[var(--paper-soft)] rounded-2xl border border-[var(--line)] flex flex-col items-center justify-center gap-2">
					<Loader2 className="w-6 h-6 animate-spin text-[var(--teal,#0d9488)]" />
					<span className="text-xs text-[var(--muted)]">Загрузка нарядов лаборатории...</span>
				</div>
			) : logic.orders.length === 0 ? (
				<div
					className="p-8 text-center bg-[var(--paper-soft)] rounded-2xl border border-dashed border-[var(--line)] flex flex-col items-center gap-3 my-2"
					data-testid="lab-orders-empty-state"
				>
					<div className="w-14 h-14 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center shadow-2xs">
						<FlaskConical className="w-7 h-7 text-[var(--teal,#0d9488)]" />
					</div>
					<div className="space-y-1">
						<h3 className="font-bold text-sm text-[var(--ink)]">Нет оформленных заказов в лабораторию</h3>
						<p className="text-xs text-[var(--muted)] max-w-md">
							Оформите заказ на изготовление коронок, мостовидных протезов или вкладок для этого пациента.
						</p>
					</div>
					<button
						type="button"
						onClick={logic.handleOpenCreateOrder}
						className="primary-button min-h-[40px] px-4 py-2 flex items-center gap-1.5 text-xs font-bold rounded-xl shadow-xs cursor-pointer text-white"
						style={{ backgroundColor: "var(--teal, #0d9488)", borderColor: "var(--teal, #0d9488)" }}
						data-testid="lab-order-panel-create-empty-btn"
					>
						<Plus className="w-4 h-4" />
						<span>+ Заказ в лабораторию</span>
					</button>
				</div>
			) : logic.filteredOrders.length === 0 ? (
				<div className="p-6 text-center bg-[var(--paper-soft)] rounded-2xl border border-[var(--line)] text-xs text-[var(--muted)]">
					Нет нарядов ЗТЛ с выбранным фильтром.
				</div>
			) : (
				<div className="lab-orders-list space-y-2.5" data-testid="lab-orders-active-list">
					{logic.filteredOrders.map((order) => (
						<LabOrderCardItem
							key={order.id}
							order={order}
							onOpenPrintOrder={() => logic.handleOpenPrintOrder(order)}
							onOpenEditOrder={() => logic.handleOpenEditOrder(order)}
							onOpenTracking={() => logic.handleOpenTrackingDrawer(order)}
							onCopyPortalLink={() => logic.copyPortalLink(order.secureToken)}
							onStatusTransition={logic.handleStatusTransition}
						/>
					))}
				</div>
			)}

			{/* Живое монтирование модального окна создания/редактирования наряда ЗТЛ */}
			{logic.isOrderModalOpen && (
				<DentalLabOrderModal
					isOpen={logic.isOrderModalOpen}
					onClose={() => {
						logic.setIsOrderModalOpen(false);
						logic.setSelectedOrderForEdit(null);
					}}
					patientId={patientId}
					editingOrder={logic.selectedOrderForEdit}
					initialOrder={logic.selectedOrderForEdit}
					initialTab={logic.modalInitialTab}
					onOrderSaved={() => {
						logic.setIsOrderModalOpen(false);
						logic.setSelectedOrderForEdit(null);
						void logic.fetchOrders();
					}}
				/>
			)}

			{/* Живое монтирование шторки отслеживания этапов ЗТЛ */}
			{logic.isTrackingDrawerOpen && logic.selectedOrderForTracking && (
				<LabTrackingDrawer
					isOpen={logic.isTrackingDrawerOpen}
					onClose={() => {
						logic.setIsTrackingDrawerOpen(false);
						logic.setSelectedOrderForTracking(null);
					}}
					order={logic.selectedOrderForTracking}
					onStageUpdate={async (orderId, newStage) => {
						logic.handleStatusTransition(orderId, newStage);
					}}
				/>
			)}
		</div>
	);
}

export default LabOrdersPanel;
