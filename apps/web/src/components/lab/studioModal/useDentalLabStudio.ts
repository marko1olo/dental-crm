/**
 * apps/web/src/components/lab/studioModal/useDentalLabStudio.ts
 *
 * DENTE Dental CRM — Dental Lab Studio State & Lifecycle Hook.
 * Encapsulates order draft creation, stage advancement, filtering, and integer finance math.
 * Mandate 8b modular design, Mandate 8e chairside doctor autonomy.
 */

import { useState, useMemo, useCallback } from "react";
import {
	CANONICAL_LAB_STAGES,
	CLINIC_LABORATORIES,
	SEED_LAB_ORDERS,
	type DentalLabOrderEntry,
	getMaterialMeta,
	isOrderOverdue,
} from "../dentalLabCatalogData";
import type { LabFilterTab } from "./LabOrdersRegistryView";

export interface UseDentalLabStudioParams {
	readonly initialToothFdi?: string | number | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly onOrderCreated?: ((order: DentalLabOrderEntry) => void) | undefined;
}

export function useDentalLabStudio({
	initialToothFdi = "16",
	patientName = "Ковалев Дмитрий Сергеевич",
	doctorName = "Д-р Смирнова Е. В. (Ортопед)",
	onOrderCreated,
}: UseDentalLabStudioParams) {
	// Список активных заказов ЗТЛ
	const [orders, setOrders] = useState<DentalLabOrderEntry[]>(() => [...SEED_LAB_ORDERS]);
	const [activeFilter, setActiveFilter] = useState<LabFilterTab>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

	// Форма экспресс-создания наряда
	const initialToothNum = Number(initialToothFdi) || 16;
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([initialToothNum]);
	const [selectedMaterialId, setSelectedMaterialId] = useState<string>("zirconia_multilayer");
	const [selectedShade, setSelectedShade] = useState<string>("A2");
	const [selectedLab, setSelectedLab] = useState<string>(CLINIC_LABORATORIES[0] ?? "ЗТЛ «Мастер Дент»");
	const [notes, setNotes] = useState("");
	const [isUrgent, setIsUrgent] = useState(false);
	const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

	// Автоматический расчет срока сдачи наряда
	const selectedMaterial = useMemo(
		() => getMaterialMeta(selectedMaterialId),
		[selectedMaterialId],
	);

	const defaultDueDate = useMemo(() => {
		const target = new Date();
		target.setDate(target.getDate() + (selectedMaterial?.defaultDurationDays || 5));
		return target.toISOString().split("T")[0] ?? "";
	}, [selectedMaterial]);

	const [customDueDate, setCustomDueDate] = useState<string>(defaultDueDate || "");

	// Переключение зуба
	const toggleTooth = useCallback((tooth: number) => {
		setSelectedTeeth((prev) =>
			prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b),
		);
	}, []);

	// Создание наряда (Мандат 8e: Кнопка НИКОГДА не disabled!)
	const handleCreateOrder = useCallback(() => {
		const teethToSave = selectedTeeth.length > 0 ? selectedTeeth : [16];
		const materialToSave = selectedMaterialId || "zirconia_multilayer";
		const shadeToSave = selectedShade || "A2";
		const labToSave = selectedLab || CLINIC_LABORATORIES[0] || "ЗТЛ «Мастер Дент»";
		const matMeta = getMaterialMeta(materialToSave);

		const count = teethToSave.length;
		const totalLabCost = matMeta.baseLabCostKopecks * count;
		const totalPatientPrice = matMeta.defaultPatientPriceKopecks * count;

		const nextOrderNumber = `ЗТЛ-${100 + orders.length + 1}`;
		const newEntry: DentalLabOrderEntry = {
			id: `lab-ord-${Date.now()}`,
			orderNumber: nextOrderNumber,
			patientName,
			doctorName,
			teeth: teethToSave,
			materialId: materialToSave,
			shadeCode: shadeToSave,
			stage: "scan_sent",
			labCostKopecks: totalLabCost,
			patientPriceKopecks: totalPatientPrice,
			laboratoryName: labToSave,
			createdAt: new Date().toISOString(),
			dueDate: customDueDate || defaultDueDate || new Date().toISOString().split("T")[0]!,
			notes: notes.trim() || undefined,
			isUrgent,
		};

		setOrders((prev) => [newEntry, ...prev]);
		onOrderCreated?.(newEntry);
		setIsCreateDrawerOpen(false);
		setFeedbackToast(`Заказ-наряд ${newEntry.orderNumber} успешно отправлен в лабораторию`);
		setTimeout(() => setFeedbackToast(null), 3500);
	}, [
		selectedTeeth,
		selectedMaterialId,
		selectedShade,
		selectedLab,
		patientName,
		doctorName,
		customDueDate,
		defaultDueDate,
		notes,
		isUrgent,
		orders.length,
		onOrderCreated,
	]);

	// Перевод этапа заказа
	const handleAdvanceStage = useCallback((orderId: string) => {
		setOrders((prev) =>
			prev.map((ord) => {
				if (ord.id !== orderId) return ord;
				const currentIdx = CANONICAL_LAB_STAGES.findIndex((s) => s.id === ord.stage);
				const nextStage =
					currentIdx >= 0 && currentIdx < CANONICAL_LAB_STAGES.length - 1
						? (CANONICAL_LAB_STAGES[currentIdx + 1]?.id ?? ord.stage)
						: ord.stage;
				return { ...ord, stage: nextStage };
			}),
		);
	}, []);

	// Фильтрация заказов
	const filteredOrders = useMemo(() => {
		return orders.filter((ord) => {
			if (activeFilter === "in_work") {
				if (ord.stage === "in_clinic" || ord.stage === "seated") return false;
			} else if (activeFilter === "in_clinic") {
				if (ord.stage !== "in_clinic") return false;
			} else if (activeFilter === "overdue") {
				if (!isOrderOverdue(ord)) return false;
			}

			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				ord.patientName.toLowerCase().includes(q) ||
				ord.orderNumber.toLowerCase().includes(q) ||
				ord.laboratoryName.toLowerCase().includes(q) ||
				ord.teeth.some((t) => String(t).includes(q))
			);
		});
	}, [orders, activeFilter, searchQuery]);

	// Счетчики фильтров
	const counts = useMemo(() => {
		return {
			all: orders.length,
			in_work: orders.filter((o) => o.stage !== "in_clinic" && o.stage !== "seated").length,
			in_clinic: orders.filter((o) => o.stage === "in_clinic").length,
			overdue: orders.filter((o) => isOrderOverdue(o)).length,
		};
	}, [orders]);

	return {
		orders,
		filteredOrders,
		counts,
		activeFilter,
		setActiveFilter,
		searchQuery,
		setSearchQuery,
		isCreateDrawerOpen,
		setIsCreateDrawerOpen,
		selectedTeeth,
		toggleTooth,
		selectedMaterial,
		selectedMaterialId,
		setSelectedMaterialId,
		selectedShade,
		setSelectedShade,
		selectedLab,
		setSelectedLab,
		customDueDate,
		setCustomDueDate,
		isUrgent,
		setIsUrgent,
		notes,
		setNotes,
		feedbackToast,
		setFeedbackToast,
		handleCreateOrder,
		handleAdvanceStage,
	};
}
