/**
 * apps/web/src/components/visit/billing/useVisitServiceItemActions.ts
 * Item modifications, price adjustments, warranty toggling, and undo rollback.
 * Compliant with Mandate 8b (<= 120 lines).
 */

import { useCallback } from "react";
import { showToast } from "../../GlobalToast.js";
import { pushDestructiveActionWithRollback } from "../../../services/undo/globalUndoRollbackStack.js";
import { type VisitBillingServiceItem, syncBillingItemsToVisitStore } from "../visitBillingTypes.js";

export interface UseVisitServiceItemActionsParams {
	services: VisitBillingServiceItem[];
	updateServices: (items: VisitBillingServiceItem[]) => void;
	setServices: React.Dispatch<React.SetStateAction<VisitBillingServiceItem[]>>;
	onServicesChange?: ((items: VisitBillingServiceItem[]) => void) | undefined;
	readOnly?: boolean | undefined;
	visitId?: string | undefined;
	patientId?: string | undefined;
}

export function useVisitServiceItemActions({
	services,
	updateServices,
	setServices,
	onServicesChange,
	readOnly = false,
	visitId,
	patientId,
}: UseVisitServiceItemActionsParams) {
	const handleStepPrice = useCallback((serviceId: string, deltaRub: number) => {
		if (readOnly) return;
		updateServices(services.map((s) => (s.id === serviceId ? { ...s, unitPriceRub: Math.max(0, s.unitPriceRub + deltaRub) } : s)));
	}, [readOnly, services, updateServices]);

	const handlePriceChange = useCallback((serviceId: string, newPriceRub: number) => {
		if (readOnly) return;
		const sanitized = Math.max(0, Number.isFinite(newPriceRub) ? newPriceRub : 0);
		updateServices(services.map((s) => (s.id === serviceId ? { ...s, unitPriceRub: sanitized } : s)));
	}, [readOnly, services, updateServices]);

	const handleQuantityChange = useCallback((serviceId: string, delta: number) => {
		if (readOnly) return;
		updateServices(services.map((s) => (s.id === serviceId ? { ...s, quantity: Math.max(1, s.quantity + delta) } : s)));
	}, [readOnly, services, updateServices]);

	const handleToggleWarranty = useCallback((serviceId: string) => {
		if (readOnly) return;
		updateServices(services.map((s) => {
			if (s.id !== serviceId) return s;
			const isNowWarranty = !s.isWarranty;
			return { ...s, isWarranty: isNowWarranty, discountPercent: isNowWarranty ? 100 : 0, warrantyReason: isNowWarranty ? "Гарантийная переделка" : undefined };
		}));
	}, [readOnly, services, updateServices]);

	const handleServiceDiscountChange = useCallback((serviceId: string, percent: number) => {
		if (readOnly) return;
		const clamped = Math.max(0, Math.min(100, percent));
		updateServices(services.map((s) => (s.id === serviceId ? { ...s, discountPercent: clamped, isWarranty: clamped === 100, warrantyReason: clamped === 100 ? "Гарантийная переделка" : undefined } : s)));
	}, [readOnly, services, updateServices]);

	const handleAddService = useCallback(() => {
		if (readOnly) return;
		const newItem: VisitBillingServiceItem = {
			id: `serv-${Date.now()}`,
			code804n: "A16.07.002",
			title: "Стоматологический приём и лечение",
			quantity: 1,
			unitPriceRub: 1500,
			discountPercent: 0,
			discountRub: 0,
			isWarranty: false,
		};
		updateServices([...services, newItem]);
		showToast("Услуга добавлена в расчёт визита", "info", 1500);
	}, [readOnly, services, updateServices]);

	const handleRemoveService = useCallback((serviceId: string) => {
		if (readOnly) return;
		const targetIndex = services.findIndex((s) => s.id === serviceId);
		const targetItem = services[targetIndex];
		if (targetIndex === -1 || !targetItem) return;
		updateServices(services.filter((s) => s.id !== serviceId));
		pushDestructiveActionWithRollback({
			entityType: "visit_service",
			description: `Услуга «${targetItem.title}» удалена из сметы визита`,
			item: targetItem,
			index: targetIndex,
			parentId: visitId || patientId,
			onRollback: (item, index) => {
				setServices((prev) => {
					const restored = [...prev];
					restored.splice(index, 0, item as VisitBillingServiceItem);
					syncBillingItemsToVisitStore(restored);
					onServicesChange?.(restored);
					return restored;
				});
			},
		});
	}, [readOnly, services, updateServices, onServicesChange, visitId, patientId, setServices]);

	return {
		handleStepPrice,
		handlePriceChange,
		handleQuantityChange,
		handleToggleWarranty,
		handleServiceDiscountChange,
		handleAddService,
		handleRemoveService,
	};
}
