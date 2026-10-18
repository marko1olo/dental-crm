import React from "react";
import { X } from "lucide-react";
import type { ChairRentalModel, ChairRentalResult } from "@dental/shared";
import { ChairRentalPrintableActSheet } from "./ChairRentalPrintableActSheet";

export interface ChairRentalReconciliationModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName: string;
	readonly doctorFullName: string;
	readonly model: ChairRentalModel;
	readonly hoursWorked: number;
	readonly economics: ChairRentalResult;
	readonly formatRub: (val: number) => string;
	readonly modelLabels: Record<ChairRentalModel, string>;
	readonly actDocNumber: string;
	readonly todayDateStr: string;
}

export const ChairRentalReconciliationModal: React.FC<ChairRentalReconciliationModalProps> = ({
	isOpen,
	onClose,
	clinicName,
	doctorFullName,
	model,
	hoursWorked,
	economics,
	formatRub,
	modelLabels,
	actDocNumber,
	todayDateStr,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="chair-rental-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-label="Акт сверки взаиморасчетов по субаренде кресла"
			data-testid="reconciliation-act-modal"
		>
			<div className="chair-rental-modal-container">
				<div className="chair-rental-modal-drag-handle" aria-hidden="true" />

				<div className="chair-rental-modal-header">
					<div>
						<h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>
							Акт сверки взаиморасчетов
						</h4>
						<span style={{ fontSize: "12px", color: "var(--muted)" }}>
							{actDocNumber} · {todayDateStr}
						</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="chair-rental-act-btn"
						style={{ minWidth: "44px", minHeight: "44px", padding: 0 }}
						aria-label="Закрыть окно акта"
						data-testid="btn-close-act-modal"
					>
						<X size={18} />
					</button>
				</div>

				<div className="chair-rental-modal-body">
					<ChairRentalPrintableActSheet
						clinicName={clinicName}
						doctorFullName={doctorFullName}
						model={model}
						hoursWorked={hoursWorked}
						economics={economics}
						formatRub={formatRub}
						modelLabels={modelLabels}
						todayDateStr={todayDateStr}
					/>
				</div>

				<div className="chair-rental-modal-footer">
					<button
						type="button"
						className="chair-rental-act-btn"
						onClick={onClose}
						data-testid="btn-cancel-act-sheet"
					>
						<span>Закрыть</span>
					</button>

					<button
						type="button"
						className="chair-rental-act-btn"
						style={{ background: "var(--teal)", color: "#fff", borderColor: "var(--teal)" }}
						onClick={() => {
							if (typeof window !== "undefined") window.print();
						}}
						data-testid="btn-print-act-sheet"
					>
						<span>Печать акта сверки</span>
					</button>
				</div>
			</div>
		</div>
	);
};
