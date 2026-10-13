/**
 * ProcedureDeductionHeader.tsx — Шапка модального окна списания материалов.
 */

import { Package, X } from "lucide-react";
import React from "react";

export interface ProcedureDeductionHeaderProps {
	readonly serviceName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly toothNumber?: number | string | undefined;
	readonly onClose: () => void;
}

export const ProcedureDeductionHeader: React.FC<ProcedureDeductionHeaderProps> = ({
	serviceName,
	patientName,
	toothNumber,
	onClose,
}) => {
	return (
		<header className="inventory-deduction-header">
			<div className="inventory-deduction-title-wrap">
				<div className="inventory-deduction-icon-badge">
					<Package size={26} />
				</div>
				<div className="min-w-0">
					<h2 className="inventory-deduction-title truncate">
						Списание материалов по техкартам
					</h2>
					<p className="inventory-deduction-subtitle truncate">
						{serviceName ? `Услуга: ${serviceName}` : "Клинический прием"}
						{toothNumber ? ` • Зуб №${toothNumber}` : ""}
						{patientName ? ` • Пациент: ${patientName}` : ""}
					</p>
				</div>
			</div>
			<button
				type="button"
				className="inventory-deduction-close-btn"
				onClick={onClose}
				aria-label="Закрыть окно"
			>
				<X size={20} />
			</button>
		</header>
	);
};
