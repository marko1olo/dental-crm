import { Printer } from "lucide-react";
import React from "react";
import type { WarehouseWriteoffItem } from "./types.js";

export interface WarehouseManagerActPreviewProps {
	readonly activeWriteoffLines: readonly WarehouseWriteoffItem[];
	readonly totalWriteoffCostRub: number;
	readonly cabinetName: string;
	readonly nurseName: string;
	readonly doctorName: string;
}

export const WarehouseManagerActPreview: React.FC<WarehouseManagerActPreviewProps> = ({
	activeWriteoffLines,
	totalWriteoffCostRub,
	cabinetName,
	nurseName,
	doctorName,
}) => {
	return (
		<div className="bg-[var(--paper,#ffffff)] border border-[var(--border,#e2e8f0)] rounded-lg p-6 max-w-3xl mx-auto text-xs space-y-4 font-sans">
			<div className="flex items-center justify-between border-b border-[var(--border,#cbd5e1)] dark:border-slate-700 pb-3">
				<div className="space-y-1">
					<h3 className="text-sm font-bold uppercase tracking-wide">АКТ СПИСАНИЯ РАСХОДНЫХ МАТЕРИАЛОВ</h3>
					<p className="text-[11px] text-[var(--muted,#64748b)]">Утверждено ответственным лицом (без бюрократии)</p>
				</div>
				<button
					type="button"
					onClick={() => window.print()}
					className="h-11 px-4 text-xs font-bold rounded-lg border border-[var(--teal,#0d9488)] text-[var(--teal-dark,#0f766e)] bg-[var(--teal-soft,#ccfbf1)] hover:bg-[var(--teal)] hover:text-white transition-colors inline-flex items-center gap-2 cursor-pointer shadow-2xs"
					style={{ minHeight: "44px" }}
					title="Распечатать бумажный акт списания"
				>
					<Printer size={16} />
					Распечатать акт
				</button>
			</div>

			<div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
				<div><span className="text-[var(--muted,#64748b)]">Подразделение:</span> <span className="font-semibold">{cabinetName}</span></div>
				<div><span className="text-[var(--muted,#64748b)]">Дата списания:</span> <span className="font-semibold">{new Date().toLocaleDateString("ru-RU")}</span></div>
				<div><span className="text-[var(--muted,#64748b)]">Ответственное лицо (единолично):</span> <span className="font-semibold">{nurseName}</span></div>
				<div><span className="text-[var(--muted,#64748b)]">Принимающий врач:</span> <span className="font-semibold">{doctorName}</span></div>
			</div>

			<div className="border border-[var(--border,#e2e8f0)] rounded overflow-hidden">
				<table className="w-full text-left text-xs border-collapse">
					<thead className="bg-slate-100 dark:bg-slate-800 font-semibold border-b border-slate-200 dark:border-slate-700">
						<tr>
							<th className="py-2 px-2.5">№</th>
							<th className="py-2 px-2.5">Наименование материала</th>
							<th className="py-2 px-2.5">Ед.</th>
							<th className="py-2 px-2.5 text-right">Кол-во</th>
							<th className="py-2 px-2.5 text-right">Цена, ₽</th>
							<th className="py-2 px-2.5 text-right">Сумма, ₽</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200 dark:divide-slate-800">
						{activeWriteoffLines.map((line, idx) => (
							<tr key={line.id}>
								<td className="py-1.5 px-2.5 text-[var(--muted,#64748b)]">{idx + 1}</td>
								<td className="py-1.5 px-2.5">
									<div className="font-medium">{line.name}</div>
									{line.isOverdraft && <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">[Расход сверх остатка]</span>}
								</td>
								<td className="py-1.5 px-2.5">{line.unit}</td>
								<td className="py-1.5 px-2.5 text-right font-mono font-semibold">{line.writeoffQuantity}</td>
								<td className="py-1.5 px-2.5 text-right font-mono">{Number.parseFloat(line.unitCostRub).toFixed(2)}</td>
								<td className="py-1.5 px-2.5 text-right font-mono font-bold">{(Number.parseFloat(line.unitCostRub) * line.writeoffQuantity).toFixed(2)}</td>
							</tr>
						))}
					</tbody>
					<tfoot className="bg-slate-50 dark:bg-slate-900 font-bold border-t border-slate-200 dark:border-slate-700">
						<tr>
							<td colSpan={5} className="py-2 px-2.5 text-right">ИТОГО К СПИСАНИЮ:</td>
							<td className="py-2 px-2.5 text-right font-mono text-sm text-teal-700 dark:text-teal-400">{totalWriteoffCostRub.toFixed(2)} ₽</td>
						</tr>
					</tfoot>
				</table>
			</div>

			<div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-[var(--muted,#64748b)]">
				<div>Подпись ответственного лица: ____________________ / {nurseName}</div>
				<div className="text-right">Основание: Фактический расход материалов</div>
			</div>
		</div>
	);
};
