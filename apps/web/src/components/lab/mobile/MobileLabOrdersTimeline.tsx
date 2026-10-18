import React, { useMemo, useState } from "react";
import { FlaskConical, Plus, RefreshCw } from "lucide-react";
import type { DentalLabOrderData } from "../labMath";
import { MobileLabOrderStatusSheet } from "./MobileLabOrderStatusSheet";
import { MobileLabTimelineHeader } from "./MobileLabTimelineHeader";
import { MobileLabOrderCard } from "./MobileLabOrderCard";
import "./mobileLabOrders.css";

export { getOrderStageIndex, formatMobileDeadlineAndTimer, MOBILE_LAB_STAGES } from "./mobileLabTimelineHelpers";

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

export const MobileLabOrdersTimeline: React.FC<MobileLabOrdersTimelineProps> = React.memo(
	function MobileLabOrdersTimeline({
		orders, isLoading, error, onRefresh, onOpenNewOrder, onOpenTrackerModal,
		onStatusChange, onPrintOrder, onTechnicianComment, onAttachScan, onReclamation, copyPortalLink,
	}) {
		const [searchQuery, setSearchQuery] = useState("");
		const [statusFilter, setStatusFilter] = useState<string>("all");
		const [selectedOrderForSheet, setSelectedOrderForSheet] = useState<DentalLabOrderData | null>(null);

		const filterTabs = useMemo(() => [
			{ id: "all", label: "Все", count: orders.length },
			{ id: "in_progress", label: "В работе", count: orders.filter((o) => ["in_progress", "sent", "sent_to_lab"].includes(o.status || "")).length },
			{ id: "fitting", label: "Примерка", count: orders.filter((o) => ["fitting", "refitting", "try_in"].includes(o.status || "")).length },
			{ id: "ready", label: "В клинике", count: orders.filter((o) => ["ready", "ready_in_clinic", "shipped"].includes(o.status || "")).length },
			{ id: "completed", label: "Сдано", count: orders.filter((o) => ["completed", "delivered_to_patient"].includes(o.status || "")).length },
		], [orders]);

		const filteredOrders = useMemo(() => {
			return orders.filter((o) => {
				const status = (o.status || "").toLowerCase();
				if (statusFilter === "in_progress" && !["in_progress", "sent", "sent_to_lab"].includes(status)) return false;
				if (statusFilter === "fitting" && !["fitting", "refitting", "try_in"].includes(status)) return false;
				if (statusFilter === "ready" && !["ready", "ready_in_clinic", "shipped"].includes(status)) return false;
				if (statusFilter === "completed" && !["completed", "delivered_to_patient"].includes(status)) return false;
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
			<div className="mobile-lab-container" data-testid="mobile-lab-orders-timeline-view">
				<MobileLabTimelineHeader
					searchQuery={searchQuery} setSearchQuery={setSearchQuery}
					statusFilter={statusFilter} setStatusFilter={setStatusFilter}
					filterTabs={filterTabs} isLoading={isLoading} onRefresh={onRefresh}
					onOpenTrackerModal={onOpenTrackerModal}
				/>

				<div className="mobile-lab-timeline">
					{isLoading && orders.length === 0 ? (
						<div className="p-12 text-center text-[var(--muted)] flex items-center justify-center gap-2">
							<RefreshCw size={18} className="animate-spin text-teal-600" />
							<span>Загрузка нарядов...</span>
						</div>
					) : error && orders.length === 0 ? (
						<div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">{error}</div>
					) : filteredOrders.length === 0 ? (
						<div className="p-8 text-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] text-xs space-y-2 mt-4">
							<FlaskConical size={32} className="mx-auto text-teal-600 dark:text-teal-400" />
							<div className="font-bold text-sm text-[var(--ink)]">Нарядов не найдено</div>
							<div className="text-[11px]">Попробуйте изменить поисковый запрос или фильтр</div>
						</div>
					) : (
						filteredOrders.map((order) => (
							<MobileLabOrderCard key={order.id} order={order} onSelect={setSelectedOrderForSheet} />
						))
					)}
				</div>

				<div className="mobile-lab-thumb-bar">
					<button type="button" onClick={onOpenNewOrder} className="mobile-lab-primary-cta" data-testid="mobile-lab-add-order-btn">
						<Plus size={19} />
						<span>Новый наряд в лабораторию</span>
					</button>
				</div>

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
