/**
 * DoctorShiftDetailSheet.tsx — iOS Bottom Sheet детализации смены и услуг врача.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import React from "react";
import { money } from "../../../AppHelpers";
import { X, Package } from "lucide-react";
import type { DoctorPayoutRow } from "../../../pages/payoutDashboard/types.js";
import type { ShiftSummaryItem } from "./types.js";

export interface DoctorShiftDetailSheetProps {
	readonly activeShift: ShiftSummaryItem;
	readonly currentDoctor: DoctorPayoutRow;
	readonly onClose: () => void;
}

export function DoctorShiftDetailSheet({
	activeShift,
	currentDoctor,
	onClose,
}: DoctorShiftDetailSheetProps) {
	return (
		<div className="doctor-wallet-sheet-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Детализация смены ${activeShift.formattedDate}`}>
			<div className="doctor-wallet-sheet-surface" onClick={(e) => e.stopPropagation()}>
				<div className="doctor-wallet-sheet-handle-wrap">
					<div className="doctor-wallet-sheet-handle" />
				</div>

				<div className="doctor-wallet-sheet-header">
					<h3 className="doctor-wallet-sheet-title">Смена {activeShift.formattedDate}</h3>
					<button type="button" className="doctor-wallet-sheet-close" onClick={onClose} aria-label="Закрыть детализацию смены">
						<X size={20} />
					</button>
				</div>

				<div className="doctor-wallet-sheet-summary-badge">
					<div className="doctor-wallet-sheet-summary-item">
						<span className="doctor-wallet-sheet-summary-lbl">Пациенты</span>
						<span className="doctor-wallet-sheet-summary-val">{activeShift.patientCount}</span>
					</div>
					<div className="doctor-wallet-sheet-summary-item">
						<span className="doctor-wallet-sheet-summary-lbl">Касса смены</span>
						<span className="doctor-wallet-sheet-summary-val">{money(activeShift.shiftRevenueRub)}</span>
					</div>
					<div className="doctor-wallet-sheet-summary-item">
						<span className="doctor-wallet-sheet-summary-lbl">К начислению</span>
						<span className="doctor-wallet-sheet-summary-val">{money(activeShift.shiftEarnedRub)}</span>
					</div>
				</div>

				<div className="doctor-wallet-sheet-scroll">
					{activeShift.visits.map((v) => {
						const visitEarned = Math.round(v.revenueRub * ((currentDoctor.commissionPct ?? 0) / 100));
						return (
							<div key={v.visitId} className="doctor-wallet-visit-item">
								<div className="doctor-wallet-visit-top">
									<div>
										<h5 className="doctor-wallet-visit-patient">{v.patientName}</h5>
										<span className="doctor-wallet-visit-cardno">Карта № {v.medicalCardNumber}</span>
									</div>
									<div>
										<div className="doctor-wallet-visit-revenue">{money(v.revenueRub)}</div>
										<div className="doctor-wallet-visit-earned">+{money(visitEarned)}</div>
									</div>
								</div>

								{v.services.map((srv) => (
									<div key={srv.id} className="doctor-wallet-service-row">
										<div className="doctor-wallet-service-name">
											{srv.toothCode && <span className="doctor-wallet-tooth-badge">{srv.toothCode}</span>}
											{srv.order804nCode && <span className="doctor-wallet-service-code">{srv.order804nCode}</span>}
											<span>{srv.title}</span>
										</div>
										<span className="doctor-wallet-service-price">{money(srv.priceRub * srv.quantity)}</span>
									</div>
								))}

								{v.materials && v.materials.length > 0 && (
									<div className="doctor-wallet-service-row">
										<div className="doctor-wallet-service-name">
											<Package size={12} />
											<span>Материалы ({v.materials.length})</span>
										</div>
										<span className="doctor-wallet-service-price">
											−{money(v.materials.reduce((acc, m) => acc + m.totalCostRub, 0))}
										</span>
									</div>
								)}
							</div>
						);
					})}
				</div>

				<div className="doctor-wallet-sheet-footer">
					<button type="button" className="doctor-wallet-primary-cta" onClick={onClose}>
						<span>Закрыть детализацию</span>
					</button>
				</div>
			</div>
		</div>
	);
}
