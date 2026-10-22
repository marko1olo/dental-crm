import { AlertTriangle, Clock, Printer } from "lucide-react";
import React from "react";
import {
	type MedicalWasteJournalRecord,
	validateStorageDuration,
} from "./medicalWasteEngine.js";
import {
	getDecontaminationMethod,
	getMedicalWasteClass,
	getMedicalWastePackaging,
} from "./medicalWastePresets.js";

export interface MedicalWasteJournalRowProps {
	readonly record: MedicalWasteJournalRecord;
	readonly onPrintThermalSticker: (record: MedicalWasteJournalRecord) => void;
}

export function MedicalWasteJournalRow({
	record: r,
	onPrintThermalSticker,
}: MedicalWasteJournalRowProps) {
	const classDef = getMedicalWasteClass(r.wasteClass);
	const storageCheck = validateStorageDuration(r.timestamp, r.storageLocation);

	return (
		<tr
			className="sanpin-log-row"
			style={{
				minHeight: "44px",
				contentVisibility: "auto",
				containIntrinsicSize: "1px 44px",
				contain: "content",
			}}
		>
			<td className="whitespace-nowrap font-medium">{r.timestamp}</td>
			<td>
				<span
					className="waste-badge"
					style={{
						backgroundColor: classDef.colorTheme.hexBadgeBg,
						color: classDef.colorTheme.hexBadgeFg,
						border: `1px solid ${classDef.colorTheme.hexBorder}`,
					}}
				>
					Класс {classDef.letterCode}
				</span>
			</td>
			<td className="text-xs">{getMedicalWastePackaging(r.packageType).nameRu}</td>
			<td className="text-center font-bold">{r.packageCount}</td>
			<td className="text-right font-black text-ink">{r.netWeightKg.toFixed(2)}</td>
			<td className="font-mono text-xs font-semibold text-muted">{r.sealNumber || "—"}</td>
			<td className="text-xs">{getDecontaminationMethod(r.decontaminationMethod).nameRu}</td>
			<td>
				{storageCheck.isExpired ? (
					<span className="text-xs font-bold text-bad-fg flex items-center gap-1">
						<AlertTriangle size={14} /> Истек ({Math.abs(storageCheck.hoursRemaining)} ч)
					</span>
				) : (
					<span className="text-xs font-semibold text-ok-fg flex items-center gap-1">
						<Clock size={14} /> {storageCheck.hoursRemaining} ч
					</span>
				)}
			</td>
			<td>
				{r.status === "accumulating" ? (
					<span className="text-xs font-bold text-amber bg-amber-soft px-2 py-0.5 rounded-full">
						Накопление
					</span>
				) : (
					<span className="text-xs font-bold text-ok-fg bg-ok-bg px-2 py-0.5 rounded-full">
						Вывезено ({r.transferActNumber})
					</span>
				)}
			</td>
			<td className="text-center">
				<button
					type="button"
					onClick={() => onPrintThermalSticker(r)}
					className="waste-btn waste-btn-secondary min-h-[38px] px-2.5 py-1 text-xs font-bold whitespace-nowrap cursor-pointer hover:border-[var(--teal,#0d9488)]"
					title="Печать термоэтикетки со штрихкодом 58x40 мм для бака/пакета"
					data-testid={`print-sticker-${r.id}`}
				>
					<Printer size={13} className="text-[var(--teal,#0d9488)]" />
					<span>58×40 мм</span>
				</button>
			</td>
		</tr>
	);
}
