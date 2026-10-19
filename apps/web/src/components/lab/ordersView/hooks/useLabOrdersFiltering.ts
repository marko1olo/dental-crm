import { useState, useMemo } from "react";
import type { DentalLabOrderData } from "../../DentalLabOrderModal";
import type { DentalLabMetrics, LabOrdersViewMode } from "../types";
import { CANONICAL_STAGE_FILTERS } from "../constants";
import { mapRawApiOrderToWorkflowOrder } from "../../dentalLabApiMapper";
import type { DentalLabWorkflowOrder, LabWorkflowStatus } from "../../dentalLabWorkflowEngine";

export function useLabOrdersFiltering(orders: DentalLabOrderData[]) {
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [doctorFilter, setDoctorFilter] = useState("all");
	const [viewMode, setViewMode] = useState<LabOrdersViewMode>("table");

	const stageCounts = useMemo(() => {
		const counts: Record<string, number> = { all: orders.length };
		for (const f of CANONICAL_STAGE_FILTERS) {
			if (f.id === "all") continue;
			counts[f.id] = orders.filter((o) => {
				const status = o.status || "";
				const stage = (o as any).stage || (o as any).currentStage || "";
				return f.statuses.includes(status) || f.id === stage || f.statuses.includes(stage);
			}).length;
		}
		return counts;
	}, [orders]);

	const filteredOrders = useMemo(() => {
		const matched = CANONICAL_STAGE_FILTERS.find((f) => f.id === statusFilter);
		return orders.filter((o) => {
			if (statusFilter !== "all" && matched) {
				const status = o.status || "";
				const stage = (o as any).stage || (o as any).currentStage || "";
				if (!matched.statuses.includes(status) && matched.id !== stage && !matched.statuses.includes(stage)) return false;
			}
			if (doctorFilter !== "all" && o.doctorId !== doctorFilter && o.doctorName !== doctorFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const p = (o.patientName || "").toLowerCase();
				const d = (o.doctorName || "").toLowerCase();
				const t = (o.toothFdi || "").toLowerCase();
				const m = (o.material || "").toLowerCase();
				const n = ((o as any).orderNumber || o.id || "").toLowerCase();
				if (!p.includes(q) && !d.includes(q) && !t.includes(q) && !m.includes(q) && !n.includes(q)) return false;
			}
			return true;
		});
	}, [orders, statusFilter, doctorFilter, searchQuery]);

	const metrics: DentalLabMetrics = useMemo(() => {
		const total = orders.length;
		const inProgress = orders.filter((o) => o.status === "in_progress" || o.status === "sent").length;
		const tryIn = orders.filter((o) => o.status === "fitting" || o.status === "refitting").length;
		const ready = orders.filter((o) => ["ready", "ready_in_clinic", "shipped", "delivered", "received", "completed"].includes(o.status || "")).length;
		const completed = orders.filter((o) => o.status === "completed").length;
		const overdue = orders.filter((o) => {
			if (!o.dueDate || o.status === "completed" || o.status === "cancelled") return false;
			const due = new Date(o.dueDate).getTime();
			return !Number.isNaN(due) && due < Date.now();
		}).length;
		return { total, inProgress, tryIn, ready, completed, overdue };
	}, [orders]);

	const doctorsList = useMemo(() => {
		const set = new Set<string>();
		for (const o of orders) if (o.doctorName) set.add(o.doctorName);
		return Array.from(set).sort();
	}, [orders]);

	const kanbanOrdersByStage = useMemo(() => {
		const map: {
			draft: DentalLabWorkflowOrder[];
			sent_to_lab: DentalLabWorkflowOrder[];
			in_progress: DentalLabWorkflowOrder[];
			fitting_scheduled: DentalLabWorkflowOrder[];
			installed_completed: DentalLabWorkflowOrder[];
			warranty_rework: DentalLabWorkflowOrder[];
			[key: string]: DentalLabWorkflowOrder[] | undefined;
		} = {
			draft: [],
			sent_to_lab: [],
			in_progress: [],
			fitting_scheduled: [],
			installed_completed: [],
			warranty_rework: [],
		};
		filteredOrders.forEach((raw, idx) => {
			const wf = mapRawApiOrderToWorkflowOrder(raw, idx, raw.patientId, raw.patientName, raw.doctorName ?? undefined);
			const stage = wf.currentStage as string;
			if (["in_progress", "framework_fitting", "cad_modeling", "milling_casting"].includes(stage)) {
				map.in_progress.push(wf);
			} else if (map[stage]) {
				map[stage]!.push(wf);
			} else {
				map.draft.push(wf);
			}
		});
		return map as unknown as Record<LabWorkflowStatus, DentalLabWorkflowOrder[]>;
	}, [filteredOrders]);

	return {
		searchQuery, setSearchQuery, statusFilter, setStatusFilter,
		doctorFilter, setDoctorFilter, viewMode, setViewMode,
		stageCounts, filteredOrders, metrics, doctorsList, kanbanOrdersByStage,
	};
}
