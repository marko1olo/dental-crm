import { useState, useMemo, useCallback, useEffect } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { mapRawApiOrderToWorkflowOrder } from "../dentalLabApiMapper";
import type { DentalLabWorkflowOrder, LabWorkflowStatus } from "../dentalLabWorkflowEngine";

export interface UseDentalLabHubDataParams {
	readonly isOpen: boolean;
	readonly initialOrders?: readonly DentalLabWorkflowOrder[] | undefined;
	readonly currentPatientId?: string | undefined;
	readonly currentPatientName?: string | undefined;
	readonly currentDoctorName?: string | undefined;
}

export function useDentalLabHubData({
	isOpen,
	initialOrders,
	currentPatientId,
	currentPatientName,
	currentDoctorName,
}: UseDentalLabHubDataParams) {
	const [orders, setOrders] = useState<DentalLabWorkflowOrder[]>(() =>
		initialOrders && initialOrders.length > 0 ? [...initialOrders] : [],
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedLab, setSelectedLab] = useState("ALL");
	const [selectedWorkType, setSelectedWorkType] = useState("ALL");
	const [selectedStage, setSelectedStage] = useState("ALL");
	const [selectedDateRange, setSelectedDateRange] = useState<"ALL" | "today" | "week">("ALL");
	const [onlyDelayedFilter, setOnlyDelayedFilter] = useState(false);

	const loadLabOrders = useCallback(async () => {
		try {
			const query = currentPatientId ? `?patientId=${encodeURIComponent(currentPatientId)}` : "";
			const res = await fetch(`/api/dental-lab/orders${query}`, { headers: denteAdminSecretRequestHeaders() });
			if (!res.ok) { setOrders([]); return; }
			const data = await res.json();
			const list = Array.isArray(data) ? data : Array.isArray(data?.orders) ? data.orders : [];
			if (list.length > 0) {
				setOrders(list.map((raw: any, idx: number) =>
					mapRawApiOrderToWorkflowOrder(raw, idx, currentPatientId, currentPatientName, currentDoctorName),
				));
			} else { setOrders([]); }
		} catch (err) {
			console.warn("[DentalLabHub] Live load error:", err);
			setOrders([]);
		}
	}, [currentPatientId, currentPatientName, currentDoctorName]);

	useEffect(() => {
		if (initialOrders) setOrders([...initialOrders]);
	}, [initialOrders]);

	useEffect(() => {
		if (!isOpen || (initialOrders && initialOrders.length > 0)) return;
		void loadLabOrders();
	}, [isOpen, initialOrders, loadLabOrders]);

	useEffect(() => {
		const handleOrderCreated = () => void loadLabOrders();
		window.addEventListener("dente-lab-order-created", handleOrderCreated);
		return () => window.removeEventListener("dente-lab-order-created", handleOrderCreated);
	}, [loadLabOrders]);

	const delayedOrders = useMemo(
		() => orders.filter((ord) => ord.isDelayedAlert || ord.delayAlert.isDelayedAlert),
		[orders],
	);

	const totalLabCostRub = useMemo(
		() => orders.reduce((sum, ord) => sum + ord.financials.labCostTotalRub, 0),
		[orders],
	);

	const totalPatientPriceRub = useMemo(
		() => orders.reduce((sum, ord) => sum + ord.financials.patientPriceTotalRub, 0),
		[orders],
	);

	const filteredOrders = useMemo(() => {
		const todayIso = new Date().toISOString().slice(0, 10);
		return orders.filter((ord) => {
			if (onlyDelayedFilter && !ord.isDelayedAlert && !ord.delayAlert.isDelayedAlert) return false;
			if (selectedLab !== "ALL" && ord.labName !== selectedLab) return false;
			if (selectedWorkType !== "ALL" && ord.workTypeId !== selectedWorkType) return false;
			if (selectedStage !== "ALL" && ord.currentStage !== selectedStage) return false;
			if (selectedDateRange === "today" && ord.expectedLabDateIso !== todayIso && ord.fittingDate !== todayIso) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const match = ord.orderNumber.toLowerCase().includes(q) ||
					ord.patientName.toLowerCase().includes(q) ||
					ord.doctorName.toLowerCase().includes(q) ||
					ord.selectedTeeth.some((t) => String(t).includes(q));
				if (!match) return false;
			}
			return true;
		});
	}, [orders, onlyDelayedFilter, selectedLab, selectedWorkType, selectedStage, selectedDateRange, searchQuery]);

	const ordersByStage = useMemo(() => {
		const map: Record<LabWorkflowStatus, DentalLabWorkflowOrder[]> = {
			draft: [], sent_to_lab: [], fitting_scheduled: [], installed_completed: [], warranty_rework: [],
		};
		for (const ord of filteredOrders) {
			if (map[ord.currentStage]) map[ord.currentStage].push(ord);
			else map.draft.push(ord);
		}
		return map;
	}, [filteredOrders]);

	return {
		orders, setOrders, searchQuery, setSearchQuery, selectedLab, setSelectedLab,
		selectedWorkType, setSelectedWorkType, selectedStage, setSelectedStage,
		selectedDateRange, setSelectedDateRange, onlyDelayedFilter, setOnlyDelayedFilter,
		delayedOrders, totalLabCostRub, totalPatientPriceRub, filteredOrders, ordersByStage,
	};
}
