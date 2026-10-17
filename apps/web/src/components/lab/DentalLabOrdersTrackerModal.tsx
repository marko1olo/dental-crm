import React, { useState, useEffect, useCallback } from "react";
import { FlaskConical, Plus, X, Loader2, Calendar } from "lucide-react";
import type { DentalLabOrderRecord } from "./dentalLabOrderEngine";
import { DentalLabOrderDrawer } from "./DentalLabOrderDrawer";
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
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm" role="dialog" aria-modal="true" data-testid="dental-lab-orders-tracker-modal">
			<div className="relative w-full max-w-2xl bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh]">
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
					<div className="flex items-center gap-2">
						<FlaskConical className="w-5 h-5 text-[var(--teal)]" />
						<h3 className="text-base font-bold text-[var(--ink)]">Наряды в лабораторию {currentPatientName ? `· ${currentPatientName}` : ""}</h3>
					</div>
					<div className="flex items-center gap-2">
						<button type="button" onClick={() => { setSelectedOrder(null); setIsDrawerOpen(true); }} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--primary)] text-white flex items-center gap-1 shadow-xs cursor-pointer">
							<Plus size={14} /><span>Новый наряд</span>
						</button>
						<button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer" aria-label="Закрыть">
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
							<div key={o.id} onClick={() => { setSelectedOrder(o); setIsDrawerOpen(true); }} className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] transition cursor-pointer flex items-center justify-between gap-3">
								<div>
									<div className="font-bold text-xs text-[var(--ink)]">Наряд #{o.orderNumber || o.id?.slice(0, 8)} · Зуб: {o.toothFdi || o.teethFdi || "челюсть"}</div>
									<div className="text-[11px] text-[var(--muted)]">{o.material || o.materialRu || "Ортопедическая конструкция"} · Цвет: {o.colorVita || o.vitaShade || "—"}</div>
								</div>
								<div className="text-right">
									<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30">{o.status || "в работе"}</span>
									{o.dueDate && <div className="text-[10px] text-[var(--muted)] mt-1 flex items-center gap-1 justify-end"><Calendar size={11} /><span>до {new Date(o.dueDate).toLocaleDateString("ru-RU")}</span></div>}
								</div>
							</div>
						))
					)}
				</div>

				{isDrawerOpen && (
					<DentalLabOrderDrawer
						isOpen={isDrawerOpen}
						onClose={() => setIsDrawerOpen(false)}
						editingOrder={selectedOrder}
						patientId={currentPatientId}
						patientName={currentPatientName}
						doctorName={currentDoctorName}
						initialToothFdi={currentToothNumber}
						onOrderSaved={(saved) => {
							setIsDrawerOpen(false);
							void loadOrders();
							if (saved && onOrderSaved) onOrderSaved(saved);
						}}
					/>
				)}
			</div>
		</div>
	);
}

export default DentalLabOrdersTrackerModal;
