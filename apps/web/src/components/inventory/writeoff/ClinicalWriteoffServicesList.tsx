import { Layers } from "lucide-react";
import type React from "react";
import type { ClinicalWriteoffLine, CompletedClinicalService } from "./clinicalWriteoffEngine.js";
import type { DiscrepancyReasonCode } from "./clinicalWriteoffPresets.js";
import { ClinicalWriteoffServiceTable } from "./ClinicalWriteoffServiceTable.js";

export interface ClinicalWriteoffServicesListProps {
	readonly services: readonly CompletedClinicalService[];
	readonly lines: readonly ClinicalWriteoffLine[];
	readonly onQuantityChange: (lineId: string, newQty: number) => void;
	readonly onReasonChange: (lineId: string, reasonCode: DiscrepancyReasonCode) => void;
	readonly onSerialNumberChange: (lineId: string, serial: string) => void;
	readonly onResetToNorm: (lineId: string) => void;
	readonly onRemoveLine: (lineId: string) => void;
}

export const ClinicalWriteoffServicesList: React.FC<ClinicalWriteoffServicesListProps> = ({
	services,
	lines,
	onQuantityChange,
	onReasonChange,
	onSerialNumberChange,
	onResetToNorm,
	onRemoveLine,
}) => {
	return (
		<div className="flex flex-col gap-4">
			<div className="font-bold text-sm flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Layers size={18} className="text-teal-600" />
					<span>Технологические нормы списания ({services.length})</span>
				</div>
				<div className="text-xs text-muted">
					Позиций ТМЦ: <span className="font-bold text-ink">{lines.length}</span>
				</div>
			</div>

			{services.length === 0 ? (
				<div
					className="p-8 text-center text-muted bg-paper-soft rounded-xl border border-line flex flex-col items-center justify-center gap-2"
					data-testid="cw-empty-services"
				>
					<Layers size={32} className="text-slate-400 opacity-60" />
					<p className="font-semibold text-sm text-ink">В текущем приёме нет выполненных клинических услуг</p>
				</div>
			) : (
				services.map((service) => {
					const serviceLines = lines.filter(
						(l) => l.serviceCode === service.serviceCode && l.toothNumber === service.toothNumber,
					);
					return (
						<div
							key={`${service.serviceCode}_${service.toothNumber || "general"}`}
							className="cw-service-card"
						>
							<div className="cw-service-card-header">
								<div className="flex items-center gap-2.5 flex-wrap">
									<span className="cw-service-badge">{service.serviceCode}</span>
									{service.toothNumber && <span className="cw-tooth-badge">Зуб №{service.toothNumber}</span>}
									<span className="font-bold text-sm text-ink">
										{service.serviceTitle || `Услуга ${service.serviceCode}`}
									</span>
								</div>
								<div className="text-xs text-muted">
									Позиций к списанию: <strong>{serviceLines.length}</strong>
								</div>
							</div>
							<ClinicalWriteoffServiceTable
								serviceLines={serviceLines}
								onQuantityChange={onQuantityChange}
								onReasonChange={onReasonChange}
								onSerialNumberChange={onSerialNumberChange}
								onResetToNorm={onResetToNorm}
								onRemoveLine={onRemoveLine}
							/>
						</div>
					);
				})
			)}
		</div>
	);
};
