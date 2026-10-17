/**
 * apps/web/src/components/visit/billing/useVisitBillingExternalEvents.ts
 * Listeners for copilot, clinical protocol, and catalog billing events.
 * Compliant with Mandate 8b (<= 120 lines).
 */

import { useEffect } from "react";
import { showToast } from "../../GlobalToast.js";
import {
	type VisitBillingServiceItem,
	DEFAULT_CHAIRSIDE_SERVICES,
	syncBillingItemsToVisitStore,
} from "../visitBillingTypes.js";
import { parseBillingServicesList, parseSingleBillingItem } from "./billingEventItemParser.js";

export interface UseVisitBillingExternalEventsParams {
	setServices: React.Dispatch<React.SetStateAction<VisitBillingServiceItem[]>>;
	onServicesChange?: ((items: VisitBillingServiceItem[]) => void) | undefined;
	onAddBillingItem?: ((item: any) => void) | undefined;
}

export function useVisitBillingExternalEvents({
	setServices,
	onServicesChange,
	onAddBillingItem,
}: UseVisitBillingExternalEventsParams) {
	useEffect(() => {
		const handleAddServicesToInvoice = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (!detail) return;
			const rawList: any[] = Array.isArray(detail) ? detail : Array.isArray(detail.services) ? detail.services : Array.isArray(detail.items) ? detail.items : detail.service ? [detail.service] : [];
			if (rawList.length === 0) return;

			const newItems = parseBillingServicesList(rawList, detail);

			setServices((prev) => {
				const isPlaceholder =
					prev.length === 0 ||
					(prev.length === DEFAULT_CHAIRSIDE_SERVICES.length &&
						prev.every((item, idx) => item.id === DEFAULT_CHAIRSIDE_SERVICES[idx]?.id));
				const shouldReplace = Boolean(detail.replaceExisting) || isPlaceholder;
				const next = shouldReplace ? newItems : [...prev, ...newItems];
				syncBillingItemsToVisitStore(next);
				onServicesChange?.(next);
				return next;
			});

			if (onAddBillingItem) {
				newItems.forEach((it) => {
					try {
						const toothNum = it.toothCode ? Number(it.toothCode) || undefined : undefined;
						onAddBillingItem({
							code804n: it.code804n, title: it.title, priceRub: it.unitPriceRub, quantity: it.quantity,
							...(toothNum !== undefined ? { toothNumber: toothNum } : {}),
						});
					} catch (cbErr) {
						console.warn("[VisitServiceBillingWidget] Error in onAddBillingItem:", cbErr);
					}
				});
			}
			const totalSum = newItems.reduce((acc, it) => acc + it.unitPriceRub * it.quantity, 0);
			showToast(`Услуги (${newItems.length}) на сумму ${totalSum.toLocaleString("ru-RU")} ₽ добавлены в счёт`, "success", 3000);
		};

		const handleAddBillingEvent = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (!detail) return;
			const item = detail.item || detail;
			const newItem = parseSingleBillingItem(item);
			setServices((prev) => {
				const isPlaceholder = prev.length === 0 || (prev.length === DEFAULT_CHAIRSIDE_SERVICES.length && prev.every((p, i) => p.id === DEFAULT_CHAIRSIDE_SERVICES[i]?.id));
				const exists = !isPlaceholder && prev.some((s) => String(s.toothCode || "") === String(newItem.toothCode || "") && ((s.code804n && newItem.code804n && s.code804n === newItem.code804n) || (s.title && newItem.title && s.title.trim().toLowerCase() === newItem.title.trim().toLowerCase())));
				if (exists) return prev;
				const next = isPlaceholder ? [newItem] : [...prev, newItem];
				syncBillingItemsToVisitStore(next);
				onServicesChange?.(next);
				return next;
			});
			onAddBillingItem?.(item);
		};

		const handleRemoveBillingEvent = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (!detail) return;
			const targets = detail.items || [detail.item || detail];
			setServices((prev) => {
				const next = prev.filter((s) => !targets.some((t: any) => typeof t === "string" ? s.code804n === t || s.title === t : (t.code804n && s.code804n === t.code804n) || (t.title && s.title === t.title)));
				syncBillingItemsToVisitStore(next);
				onServicesChange?.(next);
				return next;
			});
		};

		window.addEventListener("dente-add-services-to-invoice", handleAddServicesToInvoice);
		window.addEventListener("dente-add-billing-item", handleAddBillingEvent);
		window.addEventListener("dente-remove-billing-items", handleRemoveBillingEvent);
		return () => {
			window.removeEventListener("dente-add-services-to-invoice", handleAddServicesToInvoice);
			window.removeEventListener("dente-add-billing-item", handleAddBillingEvent);
			window.removeEventListener("dente-remove-billing-items", handleRemoveBillingEvent);
		};
	}, [setServices, onServicesChange, onAddBillingItem]);
}
