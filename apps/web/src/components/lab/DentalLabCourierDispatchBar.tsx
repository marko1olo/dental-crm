import { Loader2, Package, Send } from "lucide-react";
import { useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import {
	COURIER_SERVICES,
	type CourierDeliveryWindow,
	type CourierDispatchConfig,
	DELIVERY_WINDOWS,
} from "./courierModules/courierConstants";
import type { DentalLabOrderData } from "./DentalLabOrderModal";

export {
	COURIER_SERVICES,
	type CourierDeliveryWindow,
	type CourierDispatchConfig,
	DELIVERY_WINDOWS,
};

export interface DentalLabCourierDispatchBarProps {
	readonly orders: readonly DentalLabOrderData[];
	readonly onDispatchUpdated?: () => void;
	readonly onSelectOrderForPrint?: (order: DentalLabOrderData) => void;
}

export function DentalLabCourierDispatchBar({
	orders,
	onDispatchUpdated,
}: DentalLabCourierDispatchBarProps) {
	const [isSending, setIsSending] = useState(false);

	const pendingOrders = orders.filter((o) => {
		const s = o.status || "";
		return s === "draft" || s === "created" || s === "impression_taken";
	});

	const handleBatchSendToLab = async () => {
		if (pendingOrders.length === 0) {
			showToast(
				"Нет подготовленных нарядов для отправки в лабораторию",
				"info",
			);
			return;
		}
		setIsSending(true);
		try {
			await Promise.all(
				pendingOrders.map((o) =>
					fetch(`/api/clinical/lab-orders/${encodeURIComponent(o.id)}`, {
						method: "PUT",
						headers: {
							...denteAdminSecretRequestHeaders(),
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							currentStage: "sent_to_lab",
							status: "sent_to_lab",
						}),
					}),
				),
			);
			showToast(
				`Отправлено в лабораторию: ${pendingOrders.length} нарядов`,
				"success",
			);
			onDispatchUpdated?.();
		} catch {
			showToast("Ошибка при отправке нарядов в лабораторию", "error");
		} finally {
			setIsSending(false);
		}
	};

	if (pendingOrders.length === 0) return null;

	return (
		<div
			className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs"
			data-testid="lab-courier-dispatch-bar"
		>
			<div className="flex items-center gap-2">
				<Package className="w-4 h-4 text-[var(--teal)] shrink-0" />
				<span className="font-semibold text-[var(--ink)]">
					Готовы к отправке в ЗТЛ: {pendingOrders.length} нарядов
				</span>
			</div>
			<button
				type="button"
				onClick={handleBatchSendToLab}
				disabled={isSending}
				className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-60"
				data-testid="btn-dispatch-call-courier"
			>
				{isSending ? (
					<Loader2 size={13} className="animate-spin" />
				) : (
					<Send size={13} />
				)}
				<span>Передать наряды в лабораторию</span>
			</button>
		</div>
	);
}

export default DentalLabCourierDispatchBar;
