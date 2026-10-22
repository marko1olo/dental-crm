import { useCallback, useRef } from "react";
import { denteAdminSecretRequestHeaders } from "../../../../AppHelpers";
import { showToast } from "../../../GlobalToast";
import type { DentalLabOrderData } from "../../DentalLabOrderModal";
import { is3DScanUrl } from "../../LabAttachScanModal";
import { copyLabPortalLink, executeLabPayFromCashbox } from "./labOrderActionHelpers";

export function useLabOrderActions(
	fetchOrders: () => Promise<void>,
	onOpenReadyPrompt: (order: DentalLabOrderData) => void,
) {
	const inFlightSetRef = useRef(new Set<string>());

	const handleStatusChange = useCallback(async (orderId: string, newStatus: string, notes?: string) => {
		const lockKey = `status-${orderId}`;
		if (inFlightSetRef.current.has(lockKey)) return;
		inFlightSetRef.current.add(lockKey);
		try {
			const payload: Record<string, any> = { status: newStatus, stage: newStatus };
			if (notes) {
				payload.clinicalNotes = notes;
				payload.remakeReason = notes;
			}
			const res = await fetch(`/api/clinical/lab-orders/${orderId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error("Ошибка обновления статуса");
			showToast("Статус наряда ЗТЛ успешно обновлен", "success");
			void fetchOrders();
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente-lab-order-status-changed", { detail: { orderId, status: newStatus } }));
			}
			if (["ready", "ready_in_clinic", "shipped", "delivered", "received"].includes(newStatus)) {
				if (typeof window !== "undefined") {
					window.dispatchEvent(new CustomEvent("dente-lab-order-ready", { detail: { orderId, status: newStatus } }));
				}
				onOpenReadyPrompt({ id: orderId, status: newStatus } as any);
			}
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : "Ошибка смены статуса", "error");
		} finally {
			inFlightSetRef.current.delete(lockKey);
		}
	}, [fetchOrders, onOpenReadyPrompt]);

	const handlePayFromCashbox = useCallback(async (order: DentalLabOrderData) => {
		if (!order.id) return;
		const lockKey = `pay-${order.id}`;
		if (inFlightSetRef.current.has(lockKey)) return;
		inFlightSetRef.current.add(lockKey);
		try {
			await executeLabPayFromCashbox(order, fetchOrders);
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : "Не удалось оплатить наряд", "error");
		} finally {
			inFlightSetRef.current.delete(lockKey);
		}
	}, [fetchOrders]);

	const handleMarkInstalled = useCallback(async (order: DentalLabOrderData) => {
		if (!order.id) return;
		const lockKey = `install-${order.id}`;
		if (inFlightSetRef.current.has(lockKey)) return;
		inFlightSetRef.current.add(lockKey);
		try {
			const res = await fetch(`/api/lab-orders/${order.id}/mark-installed`, {
				method: "POST",
				headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
				body: JSON.stringify({}),
			});
			if (!res.ok) throw new Error("Ошибка фиксации установки конструкции");
			showToast("Конструкция успешно сдана и зафиксирована во рту пациента", "success");
			if (typeof window !== "undefined") {
				const teeth = order.selectedTeeth?.length ? order.selectedTeeth : String(order.toothFdi || "").split(/[\s,;-]+/).map(Number).filter((n) => n >= 11 && n <= 85);
				for (const t of teeth) {
					window.dispatchEvent(new CustomEvent("dente-quick-tooth-apply", { detail: { toothNumber: t, state: "Crown", patientId: order.patientId } }));
				}
			}
			void fetchOrders();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : "Не удалось зафиксировать установку", "error");
		} finally {
			inFlightSetRef.current.delete(lockKey);
		}
	}, [fetchOrders]);

	const handleSaveAttachedFile = useCallback(async (orderId: string, url: string, onCloseModal: () => void) => {
		const lockKey = `attach-${orderId}`;
		if (inFlightSetRef.current.has(lockKey)) return;
		inFlightSetRef.current.add(lockKey);
		try {
			const res = await fetch(`/api/clinical/lab-orders/${orderId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
				body: JSON.stringify({ attachedImageUrl: url.trim() }),
			});
			if (!res.ok) throw new Error("Ошибка прикрепления файла");
			showToast(is3DScanUrl(url) ? "3D-скан успешно прикреплен" : "Фото прикуса прикреплено", "success");
			onCloseModal();
			void fetchOrders();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : "Ошибка прикрепления", "error");
		} finally {
			inFlightSetRef.current.delete(lockKey);
		}
	}, [fetchOrders]);

	const copyPortalLink = useCallback((token?: string) => {
		copyLabPortalLink(token);
	}, []);

	return { handleStatusChange, handlePayFromCashbox, handleMarkInstalled, handleSaveAttachedFile, copyPortalLink };
}
