import type React from "react";
import { CANONICAL_DENTAL_SUPPLIERS, type AcceptanceWaybillDocument } from "../acceptanceWaybillsEngine.js";

export interface AcceptanceWaybillsMetaBarProps {
	readonly waybill: AcceptanceWaybillDocument;
	readonly setWaybill: React.Dispatch<React.SetStateAction<AcceptanceWaybillDocument>>;
	readonly selectedSupplierId: string;
	readonly onSupplierChange: (id: string) => void;
}

export const AcceptanceWaybillsMetaBar: React.FC<AcceptanceWaybillsMetaBarProps> = ({
	waybill,
	setWaybill,
	selectedSupplierId,
	onSupplierChange,
}) => {
	return (
		<section className="acceptance-meta-bar">
			<div className="acceptance-meta-field">
				<label className="acceptance-meta-label">Поставщик</label>
				<select
					className="acceptance-select"
					value={selectedSupplierId}
					onChange={(e) => onSupplierChange(e.target.value)}
					data-testid="select-supplier"
				>
					{CANONICAL_DENTAL_SUPPLIERS.map((sup) => (
						<option key={sup.id} value={sup.id}>
							{sup.name} {sup.inn ? `(ИНН ${sup.inn})` : ""}
						</option>
					))}
				</select>
			</div>

			<div className="acceptance-meta-field">
				<label className="acceptance-meta-label">ИНН поставщика</label>
				<input
					type="text"
					className="acceptance-input"
					value={waybill.supplier.inn}
					onChange={(e) =>
						setWaybill((prev) => ({
							...prev,
							supplier: { ...prev.supplier, inn: e.target.value },
						}))
					}
					placeholder="7701234567"
					data-testid="input-supplier-inn"
				/>
			</div>

			<div className="acceptance-meta-field">
				<label className="acceptance-meta-label">Номер накладной</label>
				<input
					type="text"
					className="acceptance-input"
					value={waybill.waybillNumber}
					onChange={(e) => setWaybill((prev) => ({ ...prev, waybillNumber: e.target.value }))}
					placeholder="СТ-48192"
					data-testid="input-waybill-number"
				/>
			</div>

			<div className="acceptance-meta-field">
				<label className="acceptance-meta-label">Дата прихода</label>
				<input
					type="date"
					className="acceptance-input"
					value={waybill.receiptDate}
					onChange={(e) => setWaybill((prev) => ({ ...prev, receiptDate: e.target.value }))}
					data-testid="input-receipt-date"
				/>
			</div>

			<div className="acceptance-meta-field">
				<label className="acceptance-meta-label">Склад зачисления</label>
				<select
					className="acceptance-select"
					value={waybill.warehouseName}
					onChange={(e) => setWaybill((prev) => ({ ...prev, warehouseName: e.target.value }))}
					data-testid="select-warehouse-destination"
				>
					<option value="Центральный склад клиники">Центральный склад клиники</option>
					<option value="Кабинет №1 (Терапия)">Кабинет №1 (Терапия)</option>
					<option value="Кабинет №2 (Хирургия)">Кабинет №2 (Хирургия)</option>
					<option value="Кабинет №3 (Ортопедия)">Кабинет №3 (Ортопедия)</option>
				</select>
			</div>
		</section>
	);
};

export default AcceptanceWaybillsMetaBar;
