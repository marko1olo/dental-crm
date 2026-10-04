import React, { useMemo, useState } from "react";
import {
	AlertTriangle,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	FlaskConical,
	Layers,
	Phone,
	Plus,
	RefreshCw,
	RotateCcw,
	Search,
	Sparkles,
	X,
} from "lucide-react";
import type { DentalLabOrderData } from "../labMath";
import { formatLabConstructionTitle } from "../../../pages/LabOrdersPage";
import { SHADE_SWATCH_MAP } from "../labMath";
import { money } from "../../../AppHelpers";
import { MobileLabOrderStatusSheet } from "./MobileLabOrderStatusSheet";
import "./mobileLabOrders.css";

export interface MobileLabOrdersTimelineProps {
	readonly orders: DentalLabOrderData[];
	readonly isLoading: boolean;
	readonly error: string | null;
	readonly onRefresh: () => void;
	readonly onOpenNewOrder: () => void;
	readonly onOpenTrackerModal: () => void;
	readonly onStatusChange: (orderId: string, newStatus: string) => void;
	readonly onPrintOrder: (order: DentalLabOrderData) => void;
	readonly onTechnicianComment: (order: DentalLabOrderData) => void;
	readonly onAttachScan: (order: DentalLabOrderData) => void;
	readonly onReclamation: (order: DentalLabOrderData) => void;
	readonly copyPortalLink: (token?: string) => void;
}

// 4 канонических технологических этапа для мобильного таймлайна
const MOBILE_LAB_STAGES = [
	{ id: "impression", label: "Слепок" },
	{ id: "framework", label: "Каркас" },
	{ id: "ceramic", label: "Керамика" },
	{ id: "delivery", label: "Сдача" },
] as const;

export function getOrderStageIndex(order: DentalLabOrderData): number {
	const status = (order.status || "").toLowerCase();
	const stage = ((order as any).stage || order.currentStage || "").toLowerCase();

	if (
		status === "completed" ||
		status === "delivered_to_patient" ||
		status === "installed_completed" ||
		stage === "patient_fixation"
	) {
		return 3; // Сдача
	}
	if (
		status === "ready" ||
		status === "ready_in_clinic" ||
		status === "shipped" ||
		status === "delivered" ||
		status === "received" ||
		status === "fitting" ||
		status === "refitting" ||
		status === "try_in" ||
		stage === "ceramic_layering" ||
		stage === "ready_in_clinic" ||
		stage === "fitting_in_mouth"
	) {
		return 2; // Керамика / Примерка
	}
	if (
		status === "in_progress" ||
		stage === "cad_modeling" ||
		stage === "milling_casting" ||
		stage === "framework_fitting" ||
		stage === "milling_framework"
	) {
		return 1; // Каркас
	}
	return 0; // Слепок
}

export function formatMobileDeadlineAndTimer(order: DentalLabOrderData): {
	text: string;
	isUrgent: boolean;
	isReady: boolean;
} {
	if (order.status === "completed" || order.status === "delivered_to_patient") {
		return { text: "Зафиксировано в полости рта", isUrgent: false, isReady: true };
	}

	const dateStr = order.scheduledVisitDate || order.fittingDate || order.dueDate;
	if (!dateStr) {
		return { text: "Срок уточняется лабораторией", isUrgent: false, isReady: false };
	}

	const targetDate = new Date(dateStr);
	if (Number.isNaN(targetDate.getTime())) {
		return { text: "Срок уточняется", isUrgent: false, isReady: false };
	}

	const now = new Date();
	const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
	const diffDays = Math.round((targetMidnight - todayMidnight) / (24 * 3600 * 1000));

	const isFitting = order.status === "fitting" || order.status === "ready_in_clinic" || order.status === "try_in";
	const prefix = isFitting ? "Примерка: " : "Сдача: ";

	if (diffDays < 0) {
		return {
			text: `${prefix}Просрочено на ${Math.abs(diffDays)} дн.`,
			isUrgent: true,
			isReady: false,
		};
	}
	if (diffDays === 0) {
		return {
			text: `${prefix}Сегодня в 14:00`,
			isUrgent: false,
			isReady: true,
		};
	}
	if (diffDays === 1) {
		return {
			text: `${prefix}Завтра в 14:00`,
			isUrgent: false,
			isReady: true,
		};
	}
	if (diffDays <= 3) {
		return {
			text: `${prefix}Через ${diffDays} дн. (${targetDate.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })})`,
			isUrgent: false,
			isReady: false,
		};
	}
	return {
		text: `${prefix}${targetDate.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`,
		isUrgent: false,
		isReady: false,
	};
}

export const MobileLabOrdersTimeline: React.FC<MobileLabOrdersTimelineProps> = React.memo(
	function MobileLabOrdersTimeline({
		orders,
		isLoading,
		error,
		onRefresh,
		onOpenNewOrder,
		onOpenTrackerModal,
		onStatusChange,
		onPrintOrder,
		onTechnicianComment,
		onAttachScan,
		onReclamation,
		copyPortalLink,
	}) {
		const [searchQuery, setSearchQuery] = useState("");
		const [statusFilter, setStatusFilter] = useState<string>("all");
		const [selectedOrderForSheet, setSelectedOrderForSheet] = useState<DentalLabOrderData | null>(null);

		// Stage filter tabs
		const FILTER_TABS = useMemo(
			() => [
				{ id: "all", label: "Все", count: orders.length },
				{
					id: "in_progress",
					label: "В работе",
					count: orders.filter((o) => o.status === "in_progress" || o.status === "sent" || o.status === "sent_to_lab").length,
				},
				{
					id: "fitting",
					label: "Примерка",
					count: orders.filter((o) => o.status === "fitting" || o.status === "refitting" || o.status === "try_in").length,
				},
				{
					id: "ready",
					label: "В клинике",
					count: orders.filter((o) => o.status === "ready" || o.status === "ready_in_clinic" || o.status === "shipped").length,
				},
				{
					id: "completed",
					label: "Сдано",
					count: orders.filter((o) => o.status === "completed" || o.status === "delivered_to_patient").length,
				},
			],
			[orders],
		);

		// Filtered list
		const filteredOrders = useMemo(() => {
			return orders.filter((o) => {
				const status = (o.status || "").toLowerCase();
				if (statusFilter === "in_progress") {
					if (status !== "in_progress" && status !== "sent" && status !== "sent_to_lab") return false;
				} else if (statusFilter === "fitting") {
					if (status !== "fitting" && status !== "refitting" && status !== "try_in") return false;
				} else if (statusFilter === "ready") {
					if (status !== "ready" && status !== "ready_in_clinic" && status !== "shipped") return false;
				} else if (statusFilter === "completed") {
					if (status !== "completed" && status !== "delivered_to_patient") return false;
				}

				if (searchQuery.trim()) {
					const q = searchQuery.toLowerCase();
					const pat = (o.patientName || "").toLowerCase();
					const doc = (o.doctorName || "").toLowerCase();
					const tooth = (o.toothFdi || "").toLowerCase();
					const mat = (o.material || "").toLowerCase();
					const num = ((o as any).orderNumber || o.id || "").toLowerCase();
					return pat.includes(q) || doc.includes(q) || tooth.includes(q) || mat.includes(q) || num.includes(q);
				}
				return true;
			});
		}, [orders, statusFilter, searchQuery]);

		return (
			<div
				className="mobile-lab-container"
				data-testid="mobile-lab-orders-timeline-view"
			>
				{/* 1. Compact 1-Row App Bar */}
				<header className="mobile-lab-top-bar">
					<div className="mobile-lab-brand">
						<div className="mobile-lab-brand-icon">
							<FlaskConical size={18} />
						</div>
						<div className="mobile-lab-brand-title">Наряды ЗТЛ</div>
					</div>

					<div className="mobile-lab-top-actions">
						<button
							type="button"
							onClick={onRefresh}
							className="mobile-lab-icon-btn"
							aria-label="Обновить наряды"
							title="Обновить наряды"
						>
							<RefreshCw size={18} className={isLoading ? "animate-spin text-teal-600" : ""} />
						</button>
						<button
							type="button"
							onClick={onOpenTrackerModal}
							className="mobile-lab-icon-btn"
							aria-label="Трекер этапов"
							title="Трекер этапов ЗТЛ"
							data-testid="mobile-lab-open-tracker-btn"
						>
							<Layers size={18} className="text-teal-600 dark:text-teal-400" />
						</button>
					</div>
				</header>

				{/* 2. Search Input */}
				<div className="mobile-lab-search-container">
					<div className="mobile-lab-search-box">
						<Search size={16} className="mobile-lab-search-icon" />
						<input
							type="text"
							placeholder="Поиск по пациенту, зубу, ЗТЛ..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="mobile-lab-search-input"
							data-testid="mobile-lab-search-input"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="mobile-lab-search-clear"
								aria-label="Очистить поиск"
							>
								<X size={16} />
							</button>
						)}
					</div>
				</div>

				{/* 3. Horizontal Filter Chips */}
				<div
					className="mobile-lab-chips-scroller"
					role="tablist"
					aria-label="Фильтры статусов ЗТЛ"
				>
					{FILTER_TABS.map((tab) => {
						const isActive = statusFilter === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								role="tab"
								aria-selected={isActive}
								onClick={() => setStatusFilter(tab.id)}
								className={`mobile-lab-chip ${isActive ? "is-active" : ""}`}
								data-testid={`mobile-lab-filter-chip-${tab.id}`}
							>
								<span>{tab.label}</span>
								<span className="mobile-lab-chip-count">{tab.count}</span>
							</button>
						);
					})}
				</div>

				{/* 4. Vertical Timeline Cards */}
				<div className="mobile-lab-timeline">
					{isLoading && orders.length === 0 ? (
						<div className="p-12 text-center text-[var(--muted)] flex items-center justify-center gap-2">
							<RefreshCw size={18} className="animate-spin text-teal-600" />
							<span>Загрузка нарядов...</span>
						</div>
					) : error && orders.length === 0 ? (
						<div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
							{error}
						</div>
					) : filteredOrders.length === 0 ? (
						<div className="p-8 text-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] text-xs space-y-2 mt-4">
							<FlaskConical size={32} className="mx-auto text-teal-600 dark:text-teal-400" />
							<div className="font-bold text-sm text-[var(--ink)]">Нарядов не найдено</div>
							<div className="text-[11px]">Попробуйте изменить поисковый запрос или фильтр</div>
						</div>
					) : (
						filteredOrders.map((order) => {
							const orderNumDisplay =
								(order as any).orderNumber || (order.id ? `#${order.id.slice(0, 8)}` : "ЗТЛ");
							const toothDisplay = order.toothFdi
								? `Зуб ${order.toothFdi}`
								: order.selectedTeeth?.length
									? `Зуб ${order.selectedTeeth.join(", ")}`
									: "Челюсть";
							const constructionDisplay = formatLabConstructionTitle(
								order.constructionType,
								order.material ?? undefined,
							);
							const swatchBg =
								SHADE_SWATCH_MAP[order.colorVita?.toUpperCase() ?? ""]?.bg || "#f4eedb";
							const labNameDisplay =
								(order as any).labName || "Центральная CAD/CAM ЗТЛ";
							const techNameDisplay =
								(order as any).technicianName || "Дежурный техник";
							const labPhoneDisplay =
								(order as any).labPhone || (order as any).patientPhone || "+7 (999) 450-23-11";

							const stageIdx = getOrderStageIndex(order);
							const deadlineInfo = formatMobileDeadlineAndTimer(order);
							const isWarranty =
								(order as any).isWarrantyRework || order.status === "refitting" || order.priceRub === 0;

							return (
								<article
									key={order.id}
									className="mobile-lab-card"
									onClick={() => setSelectedOrderForSheet(order)}
									data-testid={`mobile-lab-order-card-${order.id}`}
								>
									{/* Top Header: Patient + FDI Tooth Chip */}
									<div className="mobile-lab-card-header">
										<div className="mobile-lab-patient-block">
											<div className="mobile-lab-patient-name" title={order.patientName}>
												{order.patientName || "Пациент"}
											</div>
											<div className="mobile-lab-order-id">{orderNumDisplay}</div>
										</div>

										<div className="mobile-lab-fdi-chip">
											<span className="font-bold">{toothDisplay}</span>
											<span className="opacity-40">•</span>
											<span className="mobile-lab-fdi-construction">{constructionDisplay}</span>
										</div>
									</div>

									{/* Lab & Technician Contact Row with 44px Call Button */}
									<div className="mobile-lab-contact-row">
										<div className="mobile-lab-info-block">
											<div className="mobile-lab-name-text">{labNameDisplay}</div>
											<div className="mobile-lab-tech-text">{techNameDisplay}</div>
										</div>

										<div className="flex items-center gap-2">
											{/* VITA swatch chip */}
											<div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)] text-[11px] font-bold">
												{order.colorVita ? (
													<>
														<span
															className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
															style={{ backgroundColor: swatchBg }}
														/>
														<span>{order.colorVita}</span>
													</>
												) : (
													<span className="text-[var(--muted)]">—</span>
												)}
											</div>

											{/* 44x44px Call Button */}
											<a
												href={`tel:${labPhoneDisplay.replace(/[^\d+]/g, "")}`}
												onClick={(e) => e.stopPropagation()}
												className="mobile-lab-call-btn"
												title={`Позвонить технику: ${labPhoneDisplay}`}
												data-testid={`mobile-lab-call-btn-${order.id}`}
											>
												<Phone size={17} />
											</a>
										</div>
									</div>

									{/* 4-Stage Progress Bar: [ Слепок ✓ ] -> [ Каркас ✓ ] -> [ Керамика ● ] -> [ Сдача ] */}
									<div className="mobile-lab-progress-track">
										{/* Background connector line */}
										<div className="mobile-lab-stage-connector">
											<div
												className="mobile-lab-stage-connector-fill"
												style={{
													width: `${(stageIdx / 3) * 100}%`,
												}}
											/>
										</div>

										{MOBILE_LAB_STAGES.map((st, idx) => {
											const isDone = idx < stageIdx || (idx === 3 && stageIdx === 3);
											const isCurrent = idx === stageIdx && stageIdx !== 3;

											return (
												<div
													key={st.id}
													className={`mobile-lab-stage-item ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}
												>
													<div className="mobile-lab-stage-circle">
														{isDone ? (
															<Check size={12} strokeWidth={3} />
														) : isCurrent ? (
															<span className="w-2 h-2 rounded-full bg-[var(--teal,#0d9488)]" />
														) : (
															<span>{idx + 1}</span>
														)}
													</div>
													<span className="mobile-lab-stage-label">{st.label}</span>
												</div>
											);
										})}
									</div>

									{/* Footer Row: Deadline / Timer & Price / Action */}
									<div className="mobile-lab-footer-row">
										<div
											className={`mobile-lab-deadline-badge ${
												deadlineInfo.isUrgent
													? "is-urgent"
													: deadlineInfo.isReady
														? "is-ready"
														: ""
											}`}
										>
											{deadlineInfo.isUrgent ? (
												<AlertTriangle size={13} className="shrink-0 text-rose-600" />
											) : (
												<Clock size={13} className="shrink-0 text-[var(--teal,#0d9488)]" />
											)}
											<span>{deadlineInfo.text}</span>
										</div>

										<div className="flex items-center gap-1.5 font-mono font-bold text-xs">
											{isWarranty ? (
												<span className="text-emerald-600 dark:text-emerald-400">
													0 ₽ (Гарантия)
												</span>
											) : order.priceRub != null ? (
												<span className="text-[var(--ink)]">{money(order.priceRub)}</span>
											) : (
												<span className="text-[var(--muted)]">—</span>
											)}
											<ChevronRight size={15} className="text-[var(--muted)] shrink-0" />
										</div>
									</div>
								</article>
							);
						})
					)}
				</div>

				{/* 5. Sticky Floating Bottom Bar in Natural Thumb Zone */}
				<div className="mobile-lab-thumb-bar">
					<button
						type="button"
						onClick={onOpenNewOrder}
						className="mobile-lab-primary-cta"
						data-testid="mobile-lab-add-order-btn"
					>
						<Plus size={19} />
						<span>Новый наряд в ЗТЛ</span>
					</button>
				</div>

				{/* 6. Native Bottom Sheet for Lab Order Status Updates */}
				<MobileLabOrderStatusSheet
					isOpen={Boolean(selectedOrderForSheet)}
					onClose={() => setSelectedOrderForSheet(null)}
					order={selectedOrderForSheet}
					onStatusChange={onStatusChange}
					onPrintOrder={onPrintOrder}
					onTechnicianComment={onTechnicianComment}
					onAttachScan={onAttachScan}
					onReclamation={onReclamation}
					copyPortalLink={copyPortalLink}
				/>
			</div>
		);
	},
);
