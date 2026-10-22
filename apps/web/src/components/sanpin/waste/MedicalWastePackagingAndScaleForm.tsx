import { Scale } from "lucide-react";
import type React from "react";
import {
	SANPIN_WASTE_PACKAGING_TYPES,
	type MedicalWasteClassId,
	type MedicalWastePackagingTypeId,
} from "./medicalWastePresets.js";

export interface MedicalWastePackagingAndScaleFormProps {
	readonly selectedClass: MedicalWasteClassId;
	readonly selectedPackaging: MedicalWastePackagingTypeId;
	readonly setSelectedPackaging: (p: MedicalWastePackagingTypeId) => void;
	readonly packageCount: number;
	readonly setPackageCount: (cnt: number) => void;
	readonly grossWeightInput: number;
	readonly setGrossWeightInput: (w: number) => void;
	readonly currentWeights: { grossKg: number; tareKg: number; netKg: number };
}

export const MedicalWastePackagingAndScaleForm: React.FC<MedicalWastePackagingAndScaleFormProps> = ({
	selectedClass, selectedPackaging, setSelectedPackaging,
	packageCount, setPackageCount, grossWeightInput, setGrossWeightInput, currentWeights,
}) => {
	return (
		<div className="flex flex-col gap-3">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl border border-line bg-paper-soft">
				<div>
					<label htmlFor="waste-packaging-select" className="text-xs font-semibold text-muted block mb-1">
						Тип тары / Упаковки
					</label>
					<select
						id="waste-packaging-select"
						value={selectedPackaging}
						onChange={(e) => setSelectedPackaging(e.target.value as MedicalWastePackagingTypeId)}
						className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-focus-ring"
					>
						{SANPIN_WASTE_PACKAGING_TYPES.filter((p) => p.wasteClass === selectedClass).map((pkg) => (
							<option key={pkg.id} value={pkg.id}>
								{pkg.nameRu} (тара {pkg.defaultTareWeightKg} кг / {Math.round(pkg.defaultTareWeightKg * 1000)} г)
							</option>
						))}
					</select>
				</div>

				<div>
					<label htmlFor="waste-package-count" className="text-xs font-semibold text-muted block mb-1">
						Количество мест (пакетов/баков)
					</label>
					<input
						id="waste-package-count"
						type="number"
						min={1}
						max={50}
						value={packageCount}
						onChange={(e) => setPackageCount(Number(e.target.value))}
						className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-focus-ring"
					/>
				</div>

				<div>
					<label htmlFor="waste-gross-weight" className="text-xs font-semibold text-muted block mb-1">
						Фактический вес брутто (по весам)
					</label>
					<div className="flex items-center gap-2">
						<Scale size={20} className="text-[var(--teal,#0d9488)] shrink-0" />
						<input
							id="waste-gross-weight"
							type="number"
							step="0.001"
							min="0.001"
							value={grossWeightInput}
							onChange={(e) => setGrossWeightInput(parseFloat(e.target.value) || 0)}
							placeholder="Вес в кг"
							className="flex-1 h-10 px-3 rounded-lg border border-line bg-paper text-ink text-base font-extrabold focus:outline-none focus:ring-2 focus:ring-focus-ring"
						/>
						<span className="text-xs font-bold text-muted px-2 py-1 bg-paper rounded border border-line">
							кг ({Math.round(grossWeightInput * 1000)} г)
						</span>
					</div>
				</div>
			</div>

			<div className="waste-weight-display">
				<div className="waste-weight-metric">
					<span className="waste-weight-lbl">Брутто (с тарой)</span>
					<span className="waste-weight-val">
						{currentWeights.grossKg.toFixed(2)} кг <span className="text-xs font-normal text-muted">({Math.round(currentWeights.grossKg * 1000)} г)</span>
					</span>
				</div>
				<div className="waste-weight-metric">
					<span className="waste-weight-lbl">Тара (пакет/контейнер)</span>
					<span className="waste-weight-val text-muted">
						{currentWeights.tareKg.toFixed(2)} кг <span className="text-xs font-normal">({Math.round(currentWeights.tareKg * 1000)} г)</span>
					</span>
				</div>
				<div className="waste-weight-metric">
					<span className="waste-weight-lbl">Чистый вес нетто</span>
					<span className="waste-weight-net-val">
						{currentWeights.netKg.toFixed(2)} кг <span className="text-xs font-normal">({Math.round(currentWeights.netKg * 1000)} г)</span>
					</span>
				</div>
			</div>
		</div>
	);
};
