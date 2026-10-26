import { Plus } from "lucide-react";
import type React from "react";
import { VITA_SHADES } from "../../warrantyPresets.js";

export interface WarrantyItemFormInputsProps {
	selectedTeeth: string[];
	currentWorkTitle: string;
	onWorkTitleChange: (val: string) => void;
	currentMaterial: string;
	onMaterialChange: (val: string) => void;
	currentManufacturer: string;
	onManufacturerChange: (val: string) => void;
	currentShade: string;
	onShadeChange: (val: string) => void;
	currentLot: string;
	onLotChange: (val: string) => void;
	currentServiceCode804n: string;
	onServiceCode804nChange: (val: string) => void;
	currentLabOrderNumber: string;
	onLabOrderNumberChange: (val: string) => void;
	onAddItem: () => void;
}

export const WarrantyItemFormInputs: React.FC<WarrantyItemFormInputsProps> = ({
	selectedTeeth, currentWorkTitle, onWorkTitleChange, currentMaterial, onMaterialChange,
	currentManufacturer, onManufacturerChange, currentShade, onShadeChange, currentLot, onLotChange,
	currentServiceCode804n, onServiceCode804nChange, currentLabOrderNumber, onLabOrderNumberChange, onAddItem,
}) => {
	return (
		<div className="warranty-card-section">
			<div className="warranty-form-row">
				<div className="warranty-form-group full-width">
					<label className="warranty-label">Клиническое описание работы</label>
					<input
						type="text" className="warranty-input" value={currentWorkTitle}
						onChange={(e) => onWorkTitleChange(e.target.value)}
						placeholder="Например: Пломбирование нанокомпозитом Filtek Ultimate"
					/>
				</div>
				<div className="warranty-form-group">
					<label className="warranty-label">Материал & Препарат</label>
					<input
						type="text" className="warranty-input" value={currentMaterial}
						onChange={(e) => onMaterialChange(e.target.value)} placeholder="IPS e.max Press, Katana Zirconia..."
					/>
				</div>
				<div className="warranty-form-group">
					<label className="warranty-label">Производитель & Страна</label>
					<input
						type="text" className="warranty-input" value={currentManufacturer}
						onChange={(e) => onManufacturerChange(e.target.value)} placeholder="Ivoclar Vivadent (Лихтенштейн)"
					/>
				</div>
				<div className="warranty-form-group">
					<label className="warranty-label">Оттенок по шкале VITA</label>
					<select className="warranty-select" value={currentShade} onChange={(e) => onShadeChange(e.target.value)}>
						{VITA_SHADES.map((s) => <option key={s} value={s}>{s}</option>)}
					</select>
				</div>
				<div className="warranty-form-group">
					<label className="warranty-label">Партия МДЛП / LOT / Серия</label>
					<input
						type="text" className="warranty-input" value={currentLot}
						onChange={(e) => onLotChange(e.target.value)} placeholder="LOT #984214 / SN-842"
					/>
				</div>
				<div className="warranty-form-group">
					<label className="warranty-label">Код услуги</label>
					<input
						type="text" className="warranty-input" value={currentServiceCode804n}
						onChange={(e) => onServiceCode804nChange(e.target.value)} placeholder="A16.07.002.010"
					/>
				</div>
				<div className="warranty-form-group">
					<label className="warranty-label">Наряд ЗТЛ (лаборатория)</label>
					<input
						type="text" className="warranty-input" value={currentLabOrderNumber}
						onChange={(e) => onLabOrderNumberChange(e.target.value)} placeholder="ЗТЛ-2026-0842"
					/>
				</div>
			</div>

			<button type="button" className="warranty-btn-primary" onClick={onAddItem}>
				<Plus size={16} />
				Добавить в гарантийный паспорт ({selectedTeeth.length > 0 ? `${selectedTeeth.length} поз.` : "общая конструкция"})
			</button>
		</div>
	);
};
