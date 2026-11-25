import { useState, useCallback, useEffect } from "react";
import { denteClinicalReadHeaders } from "../../../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import { clientLogger } from "../../../../services/logging/clientLogger";
import type { DentalLabOrderData } from "../../labMath";
import { useAppStore } from "../../../../store/appStore";
import { CANONICAL_DEMO_LAB_ORDERS } from "../constants";

export interface UseLabOrdersDataParams {
	readonly initialOrders?: readonly DentalLabOrderData[] | undefined;
	readonly onOrdersChanged?: ((orders: readonly DentalLabOrderData[]) => void) | undefined;
	readonly onOpenOrderFromEvent?: (draft: DentalLabOrderData) => void;
}

export function useLabOrdersData({ initialOrders, onOrdersChanged, onOpenOrderFromEvent }: UseLabOrdersDataParams) {
	const isDemo = isDemoShowcaseMode() || (typeof window !== "undefined" && window.location.search.includes("demo=true"));
	const [orders, setOrders] = useState<DentalLabOrderData[]>(() =>
		initialOrders ? [...initialOrders] : isDemo ? [...CANONICAL_DEMO_LAB_ORDERS] : [],
	);
	const [isLoading, setIsLoading] = useState(!initialOrders && !isDemo);
	const [error, setError] = useState<string | null>(null);
	const labOrderStatuses = useAppStore((state) => (state as { labOrderStatuses?: unknown }).labOrderStatuses);

	const fetchOrders = useCallback(async () => {
		try {
			setOrders((current) => {
				if (current.length === 0) setIsLoading(true);
				return current;
			});
			setError(null);
			const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
			const timeoutId = controller ? setTimeout(() => controller.abort(), 2500) : null;
			let res: Response;
			try {
				res = await fetch("/api/lab/orders", {
					headers: denteClinicalReadHeaders(),
					...(controller ? { signal: controller.signal } : {}),
				});
			} finally {
				if (timeoutId) clearTimeout(timeoutId);
			}
			if (!res.ok) {
				if (isDemoShowcaseMode() || (typeof window !== "undefined" && window.location.search.includes("demo=true"))) {
					setOrders([...CANONICAL_DEMO_LAB_ORDERS]);
					onOrdersChanged?.(CANONICAL_DEMO_LAB_ORDERS);
					return;
				}
				throw new Error(`Ошибка загрузки нарядов ЗТЛ: ${res.status}`);
			}
			const data = await res.json();
			const payload = data?.data ?? data;
			const list = Array.isArray(payload) ? payload : (Array.isArray(data?.orders) ? data.orders : []);
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
				} catch (err) {
					clientLogger.warn("[useLabOrdersData] Failed to parse pending lab order draft", err, { module: "DentalLab" });
				}
			}
			if (draft) onOpenOrderFromEvent?.(draft);
		};
		window.addEventListener("dente-open-lab-order", handleOpenFromEvent);
		return () => window.removeEventListener("dente-open-lab-order", handleOpenFromEvent);
	}, [onOpenOrderFromEvent]);

	useEffect(() => {
		const handleOrderCreated = (e: Event) => {
			const rawDetail = (e as CustomEvent<unknown>).detail;
			let candidate: unknown = rawDetail;
			if (rawDetail && typeof rawDetail === "object") {
				const rec = rawDetail as Record<string, unknown>;
				if (rec.data && typeof rec.data === "object") {
					candidate = rec.data;
				} else if (rec.order && typeof rec.order === "object") {
					candidate = rec.order;
				}
			}
			if (candidate && typeof candidate === "object" && "id" in candidate && typeof (candidate as { id?: unknown }).id === "string") {
				const orderObj = candidate as Partial<DentalLabOrderData> & { id: string };
				setOrders((prev) => {
					const idx = prev.findIndex((o) => o.id === orderObj.id || (orderObj.secureToken && o.secureToken === orderObj.secureToken));
					if (idx >= 0) {
						const next = [...prev];
						const existing = next[idx];
						if (existing) {
							next[idx] = { ...existing, ...orderObj };
						}
						return next;
					}
					if ("patientId" in orderObj && typeof orderObj.patientId === "string") {
						return [orderObj as DentalLabOrderData, ...prev];
					}
					return prev;
				});
			}
			void fetchOrders();
		};
		// Каноническое событие ЗТЛ + обратная совместимость
		window.addEventListener("dente:lab:order-created", handleOrderCreated);
		window.addEventListener("dente-lab-order-created", handleOrderCreated);
		return () => {
			window.removeEventListener("dente:lab:order-created", handleOrderCreated);
			window.removeEventListener("dente-lab-order-created", handleOrderCreated);
		};
	}, [fetchOrders]);

	return { orders, setOrders, isLoading, error, fetchOrders };
}
