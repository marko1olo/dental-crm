import React, { useState, useEffect, useCallback } from "react";
import { FlaskConical, Plus, X, Loader2, Calendar } from "lucide-react";
import type { DentalLabOrderRecord } from "./dentalLabOrderEngine";
import { DentalLabOrderModal } from "./DentalLabOrderModal";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";

export interface DentalLabOrdersTrackerModalProps {
	readonly isOpen: boolean; readonly onClose: () => void;
	readonly currentPatientId?: string | undefined; readonly currentPatientName?: string | undefined;
	readonly currentDoctorName?: string | undefined; readonly currentToothNumber?: number | string | undefined;
	readonly onOrderSaved?: ((order: DentalLabOrderRecord) => void) | undefined;
}

/**
 * Трекер нарядов лаборатории для пациента / карты (Мандат 8b: <= 120 строк).
 */
export function DentalLabOrdersTrackerModal({
	isOpen,
	onClose,
	currentPatientId,
	currentPatientName,
	currentDoctorName,
	currentToothNumber,
	onOrderSaved,
}: DentalLabOrdersTrackerModalProps) {
	const [orders, setOrders] = useState<DentalLabOrderRecord[]>([]);
	const [loading, setLoading] = useState(false);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [selectedOrder, setSelectedOrder] = useState<DentalLabOrderRecord | null>(null);

	const loadOrders = useCallback(async () => {
		setLoading(true);
		try {
			const q = currentPatientId ? `?patientId=${encodeURIComponent(currentPatientId)}` : "";
			const res = await fetch(`/api/dental-lab/orders${q}`, { headers: denteAdminSecretRequestHeaders() });
			if (res.ok) {
				const data = await res.json();
				setOrders(Array.isArray(data) ? data : data.orders || []);
			}
		} catch {
			showToast("Не удалось загрузить наряды ЗТЛ");
		} finally {
			setLoading(false);
		}
	}, [currentPatientId]);

	useEffect(() => {
		if (isOpen) void loadOrders();
	}, [isOpen, loadOrders]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 max-sm:p-0 max-sm:items-end bg-black/75 backdrop-blur-sm" role="dialog" aria-modal="true" data-testid="dental-lab-orders-tracker-modal">
			<div className="relative w-full max-w-2xl bg-[var(--paper)] border border-[var(--line)] rounded-2xl max-sm:rounded-t-[24px] max-sm:rounded-b-none p-4 sm:p-5 shadow-2xl flex flex-col max-h-[85vh] max-sm:max-h-[92vh] overflow-hidden">
				<div className="sm:hidden w-9 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-3 shrink-0" aria-hidden="true" />
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line)] gap-2">
					<div className="flex items-center gap-2 min-w-0 flex-1">
						<FlaskConical className="w-5 h-5 text-[var(--teal)] shrink-0" />
						<h3 className="text-sm sm:text-base font-bold text-[var(--ink)] truncate">Наряды в лабораторию {currentPatientName ? `· ${currentPatientName}` : ""}</h3>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<button type="button" onClick={() => { setSelectedOrder(null); setIsDrawerOpen(true); }} className="px-3.5 py-2 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-bold bg-[var(--primary)] text-white flex items-center gap-1.5 shadow-xs cursor-pointer">
							<Plus size={14} /><span>Новый наряд</span>
						</button>
						<button type="button" onClick={onClose} className="w-11 h-11 sm:w-8 sm:h-8 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer" aria-label="Закрыть">
							<X size={18} />
						</button>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto py-3 space-y-2">
					{loading ? (
						<div className="p-8 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
							<Loader2 className="w-4 h-4 animate-spin text-[var(--primary)]" />
							<span>Загрузка нарядов...</span>
						</div>
					) : orders.length === 0 ? (
						<div className="p-8 text-center text-xs text-[var(--muted)]">Нет нарядов в лабораторию для данного пациента</div>
					) : (
						orders.map((o) => (
							<div key={o.id} onClick={() => { setSelectedOrder(o); setIsDrawerOpen(true); }} className="p-3.5 min-h-[52px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] transition cursor-pointer flex items-center justify-between gap-3">
								<div className="min-w-0 flex-1">
									<div className="font-bold text-xs text-[var(--ink)] truncate">Наряд #{o.orderNumber || o.id?.slice(0, 8)} · Зуб: {(o as any).toothFdi || (o as any).teethFdi || "челюсть"}</div>
									<div className="text-[11px] text-[var(--muted)] truncate">{(o as any).material || (o as any).materialRu || "Ортопедическая конструкция"} · Цвет: {(o as any).colorVita || (o as any).vitaShade || "—"}</div>
								</div>
								<div className="text-right shrink-0">
									<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30">{o.status || "в работе"}</span>
									{o.dueDate && <div className="text-[10px] text-[var(--muted)] mt-1 flex items-center gap-1 justify-end"><Calendar size={11} /><span>до {new Date(o.dueDate).toLocaleDateString("ru-RU")}</span></div>}
								</div>
							</div>
						))
					)}
				</div>

				{isDrawerOpen && (
					<DentalLabOrderModal
						isOpen={isDrawerOpen}
						onClose={() => setIsDrawerOpen(false)}
						initialOrder={selectedOrder as any}
						patientId={currentPatientId}
						patientName={currentPatientName}
						doctorName={currentDoctorName}
						initialToothFdi={currentToothNumber}
						onOrderSaved={(saved) => {
							setIsDrawerOpen(false);
							void loadOrders();
							if (saved && onOrderSaved) onOrderSaved(saved as any);
						}}
					/>
				)}
			</div>
		</div>
	);
}

export default DentalLabOrdersTrackerModal;
