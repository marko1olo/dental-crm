import { useState, useCallback, useEffect } from "react";
import { denteAdminSecretRequestHeaders } from "../../../../AppHelpers";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import type { DentalLabOrderData } from "../../DentalLabOrderModal";
import { useAppStore } from "../../../../store/appStore";
import { CANONICAL_DEMO_LAB_ORDERS } from "../constants";

export interface UseLabOrdersDataParams {
	readonly initialOrders?: readonly DentalLabOrderData[] | undefined;
	readonly onOrdersChanged?: ((orders: readonly DentalLabOrderData[]) => void) | undefined;
	readonly onOpenOrderFromEvent?: (draft: DentalLabOrderData) => void;
}

export function useLabOrdersData({ initialOrders, onOrdersChanged, onOpenOrderFromEvent }: UseLabOrdersDataParams) {
	const [orders, setOrders] = useState<DentalLabOrderData[]>(() =>
		initialOrders ? [...initialOrders] : [],
	);
	const [isLoading, setIsLoading] = useState(!initialOrders);
	const [error, setError] = useState<string | null>(null);
	const labOrderStatuses = useAppStore((state: any) => state.labOrderStatuses);

	const fetchOrders = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);
			const res = await fetch("/api/dental-lab/orders", { headers: denteAdminSecretRequestHeaders() });
			if (!res.ok) {
				if (isDemoShowcaseMode() || (typeof window !== "undefined" && window.location.search.includes("demo=true"))) {
					setOrders([...CANONICAL_DEMO_LAB_ORDERS]);
					onOrdersChanged?.(CANONICAL_DEMO_LAB_ORDERS);
					return;
				}
				throw new Error(`Ошибка загрузки нарядов ЗТЛ: ${res.status}`);
			}
			const data = await res.json();
			const list = Array.isArray(data) ? data : [];
			if (list.length === 0 && (isDemoShowcaseMode() || (typeof window !== "undefined" && window.location.search.includes("demo=true")))) {
				setOrders([...CANONICAL_DEMO_LAB_ORDERS]);
				onOrdersChanged?.(CANONICAL_DEMO_LAB_ORDERS);
				return;
			}
			setOrders(list);
			onOrdersChanged?.(list);
		} catch (err: unknown) {
			if (isDemoShowcaseMode() || (typeof window !== "undefined" && window.location.search.includes("demo=true"))) {
				setOrders([...CANONICAL_DEMO_LAB_ORDERS]);
				onOrdersChanged?.(CANONICAL_DEMO_LAB_ORDERS);
				return;
			}
			setError(err instanceof Error ? err.message : "Не удалось загрузить наряды ЗТЛ");
		} finally {
			setIsLoading(false);
		}
	}, [onOrdersChanged]);

	useEffect(() => {
		if (!initialOrders) void fetchOrders();
	}, [fetchOrders, initialOrders, labOrderStatuses]);

	useEffect(() => {
		const handleOpenFromEvent = (e: Event) => {
			const detail = (e as CustomEvent<DentalLabOrderData>).detail;
			let draft = detail;
			if (!draft && typeof window !== "undefined") {
				try {
					const raw = window.localStorage.getItem("dente_pending_lab_order_draft");
					if (raw) draft = JSON.parse(raw);
				} catch {}
			}
			if (draft) onOpenOrderFromEvent?.(draft);
		};
		window.addEventListener("dente-open-lab-order", handleOpenFromEvent);
		return () => window.removeEventListener("dente-open-lab-order", handleOpenFromEvent);
	}, [onOpenOrderFromEvent]);

	useEffect(() => {
		const handleOrderCreated = (e: Event) => {
			const detail = (e as CustomEvent<DentalLabOrderData>).detail;
			if (detail) {
				setOrders((prev) => {
					const idx = prev.findIndex((o) => o.id === detail.id || (detail.secureToken && o.secureToken === detail.secureToken));
					if (idx >= 0) {
						const next = [...prev];
						next[idx] = { ...next[idx], ...detail };
						return next;
					}
					return [detail, ...prev];
				});
			}
			void fetchOrders();
		};
		window.addEventListener("dente-lab-order-created", handleOrderCreated);
		return () => window.removeEventListener("dente-lab-order-created", handleOrderCreated);
	}, [fetchOrders]);

	return { orders, setOrders, isLoading, error, fetchOrders };
}
