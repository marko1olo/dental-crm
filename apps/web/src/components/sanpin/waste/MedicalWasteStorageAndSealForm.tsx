import { Barcode, CheckCircle2 } from "lucide-react";
import type React from "react";
import {
	SANPIN_DECONTAMINATION_METHODS,
	SANPIN_STORAGE_LOCATIONS,
	type DecontaminationMethodType,
	type WasteStorageLocationId,
} from "./medicalWastePresets.js";

export interface MedicalWasteStorageAndSealFormProps {
	readonly decontamMethod: DecontaminationMethodType;
	readonly setDecontamMethod: (m: DecontaminationMethodType) => void;
	readonly storageLocation: WasteStorageLocationId;
	readonly setStorageLocation: (loc: WasteStorageLocationId) => void;
	readonly sealNumber: string;
	readonly setSealNumber: (s: string) => void;
	readonly barcode: string;
	readonly onAddRecord: () => void;
}

export const MedicalWasteStorageAndSealForm: React.FC<MedicalWasteStorageAndSealFormProps> = ({
	decontamMethod, setDecontamMethod, storageLocation, setStorageLocation,
	sealNumber, setSealNumber, barcode, onAddRecord,
}) => {
	return (
		<div className="flex flex-col gap-3">
			<div className="text-xs text-muted px-1">
				• Срок хранения: <strong>не более 24 часов</strong> при комнатной температуре, <strong>до 72 часов</strong> в холодильнике.
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
				<div>
					<label htmlFor="waste-decontam-select" className="text-xs font-semibold text-muted block mb-1">
						Метод обеззараживания
					</label>
					<select
						id="waste-decontam-select"
						value={decontamMethod}
						onChange={(e) => setDecontamMethod(e.target.value as DecontaminationMethodType)}
						className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
					>
						{SANPIN_DECONTAMINATION_METHODS.map((m) => (
							<option key={m.id} value={m.id}>{m.nameRu}</option>
						))}
					</select>
				</div>

				<div>
					<label htmlFor="waste-storage-select" className="text-xs font-semibold text-muted block mb-1">
						Режим накопления / Хранилище
					</label>
					<select
						id="waste-storage-select"
						value={storageLocation}
						onChange={(e) => setStorageLocation(e.target.value as WasteStorageLocationId)}
						className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
					>
						{SANPIN_STORAGE_LOCATIONS.map((loc) => (
							<option key={loc.id} value={loc.id}>{loc.nameRu} ({loc.temperatureRangeRu})</option>
						))}
					</select>
				</div>

				<div>
					<label htmlFor="waste-seal-number" className="text-xs font-semibold text-muted block mb-1">
						Номер бирки / Пломбы-стяжки
					</label>
					<input
						id="waste-seal-number"
						type="text"
						value={sealNumber}
						onChange={(e) => setSealNumber(e.target.value)}
						className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-focus-ring"
					/>
				</div>
			</div>

			<div className="p-4 rounded-xl border border-line bg-paper-soft flex items-center justify-between flex-wrap gap-3">
				<div className="flex items-center gap-3">
					<Barcode size={28} className="text-[var(--teal,#0d9488)]" />
					<div>
						<div className="text-xs text-muted">Сгенерированный штрихкод маркировки</div>
						<div className="font-mono font-bold text-ink text-sm">{barcode}</div>
					</div>
				</div>

				<button type="button" onClick={onAddRecord} className="waste-btn waste-btn-primary">
					<CheckCircle2 size={18} /> Зафиксировать в журнале
				</button>
			</div>
		</div>
	);
};
