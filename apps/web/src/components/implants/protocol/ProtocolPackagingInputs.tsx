/**
 * ProtocolPackagingInputs.tsx — Прямой ввод реквизитов стерильной упаковки (LOT / SN / REF) (Мандаты 8e, 8am).
 * Врач быстро вводит номер партии или нажимает «По умолчанию».
 */
import React from "react";
import { Package } from "lucide-react";

export interface ProtocolPackagingInputsProps {
	readonly catalogArticle: string;
	readonly setCatalogArticle: (art: string) => void;
	readonly lotNumber: string;
	readonly setLotNumber: (lot: string) => void;
	readonly serialNumber: string;
	readonly setSerialNumber: (sn: string) => void;
}

export const ProtocolPackagingInputs: React.FC<ProtocolPackagingInputsProps> = ({
	catalogArticle,
	setCatalogArticle,
	lotNumber,
	setLotNumber,
	serialNumber,
	setSerialNumber,
}) => {
	const handleAutofill = () => {
		if (!catalogArticle) setCatalogArticle("TS3S4010S");
		if (!lotNumber) setLotNumber("24C1208");
		if (!serialNumber) setSerialNumber(`SN-${Date.now().toString().slice(-6)}`);
	};

	return (
		<div className="implant-packaging-section p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<Package size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="text-xs font-bold text-[var(--ink)]">
						Стерильная упаковка изделия (LOT / SN / REF):
					</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleAutofill}
						className="secondary-button text-[11px] px-2.5 py-1 min-h-[30px] rounded-lg cursor-pointer"
						title="Автозаполнение по умолчанию"
						data-testid="btn-autofill-packaging"
					>
						По умолчанию
					</button>
					<span className="text-[11px] text-[var(--muted)] hidden sm:inline">Быстрое заполнение реквизитов</span>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
				<div className="min-w-0">
					<label className="text-[10px] text-[var(--muted)] font-medium block mb-1">REF / Артикул:</label>
					<input
						type="text"
						value={catalogArticle}
						onChange={(e) => setCatalogArticle(e.target.value)}
						placeholder="TS3S4010S"
						className="implant-input w-full min-h-[36px] px-2.5 text-xs font-mono rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
						data-testid="input-catalog-article"
					>
					</input>
				</div>
				<div className="min-w-0">
					<label className="text-[10px] text-[var(--muted)] font-medium block mb-1">LOT / Партия:</label>
					<input
						type="text"
						value={lotNumber}
						onChange={(e) => setLotNumber(e.target.value)}
						placeholder="24C1208"
						className="implant-input w-full min-h-[36px] px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
						data-testid="input-lot-number"
					>
					</input>
				</div>
				<div className="min-w-0">
					<label className="text-[10px] text-[var(--muted)] font-medium block mb-1">SN / Серийный номер:</label>
					<input
						type="text"
						value={serialNumber}
						onChange={(e) => setSerialNumber(e.target.value)}
						placeholder="SN-884210"
						className="implant-input w-full min-h-[36px] px-2.5 text-xs font-mono rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
						data-testid="input-serial-number"
					>
					</input>
				</div>
			</div>
		</div>
	);
};

export default ProtocolPackagingInputs;
