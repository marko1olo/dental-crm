import React from "react";
import { CheckCircle2, X } from "lucide-react";
import { money } from "../../../AppHelpers";
import type { MobileShiftConsumableItem } from "./types";

export interface MobileShiftHandoverSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly doctorName: string;
	readonly nextDoctorName: string;
	readonly completedCount: number;
	readonly totalAppointmentsCount: number;
	readonly totalRevenueRub: number;
	readonly estimatedDoctorPayoutRub: number;
	readonly consumables: MobileShiftConsumableItem[];
	readonly handleConfirmHandoverShift: () => void;
}

export const MobileShiftHandoverSheet: React.FC<MobileShiftHandoverSheetProps> = ({
	isOpen, onClose, doctorName, nextDoctorName, completedCount, totalAppointmentsCount,
	totalRevenueRub, estimatedDoctorPayoutRub, consumables, handleConfirmHandoverShift,
}) => {
	if (!isOpen) return null;

	return (
		<div className="mobile-shift-sheet-overlay" role="dialog" aria-modal="true" data-testid="sheet-shift-handover">
			<div className="mobile-shift-sheet-backdrop" onClick={onClose} aria-hidden="true" />
			<div className="mobile-shift-sheet-container">
				<div className="mobile-shift-sheet-handle" />
				<div className="mobile-shift-sheet-header">
					<h3 className="mobile-shift-sheet-title">Закрытие и передача смены</h3>
					<button type="button" className="mobile-shift-sheet-close-btn" onClick={onClose} aria-label="Закрыть"><X size={16} /></button>
				</div>

				<div className="mobile-shift-sheet-body">
					<div style={{ background: "var(--paper-soft)", border: "1px solid var(--line)", borderRadius: "14px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
						<strong style={{ fontSize: "14.5px", color: "var(--ink)" }}>Итоги смены доктора: {doctorName}</strong>
						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
							<div style={{ fontSize: "12px", color: "var(--muted)" }}>Принято пациентов: <strong style={{ color: "var(--ink)" }}>{completedCount} из {totalAppointmentsCount}</strong></div>
							<div style={{ fontSize: "12px", color: "var(--muted)" }}>Выручка смены: <strong style={{ color: "var(--ink)" }}>{money(totalRevenueRub)}</strong></div>
							<div style={{ fontSize: "12px", color: "var(--muted)" }}>Гонорар на руки: <strong style={{ color: "var(--teal-dark)" }}>{money(estimatedDoctorPayoutRub)}</strong></div>
							<div style={{ fontSize: "12px", color: "var(--muted)" }}>Материалы: <strong style={{ color: "var(--ink)" }}>{consumables.length} поз. сверено</strong></div>
						</div>
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
						<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>Передать кабинет и смену следующему врачу:</span>
						<div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "12px", background: "var(--paper)", border: "1px solid var(--line)" }}>
							<div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--teal-surface)", color: "var(--teal-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px" }}>
								{nextDoctorName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
							</div>
							<div style={{ minWidth: 0, flex: 1 }}>
								<strong style={{ display: "block", fontSize: "13.5px", color: "var(--ink)" }}>{nextDoctorName}</strong>
								<span style={{ fontSize: "11.5px", color: "var(--muted)" }}>Дежурный терапевт (вечерняя смена с 15:00)</span>
							</div>
							<CheckCircle2 size={18} className="text-teal-600" />
						</div>
					</div>

					<p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", lineHeight: 1.4 }}>
						Все электронные карты приемов сохранены. Акт передачи кабинета и списания расходников будет сформирован автоматически.
					</p>
				</div>

				<div className="mobile-shift-sheet-footer">
					<button type="button" className="mobile-shift-btn-primary-cta" onClick={handleConfirmHandoverShift} data-testid="btn-confirm-handover">
						<CheckCircle2 size={18} /><span>Передать смену & Завершить</span>
					</button>
				</div>
			</div>
		</div>
	);
};
