/**
 * TreatmentPlanActMaterialsTable.tsx — Спецификация списания медикаментов и расходных материалов (ТМЦ)
 * для печатной формы Акта выполненных работ DENTE CRM.
 */

import React from "react";
import { Package } from "lucide-react";
import type { CompletedWorksActAndWriteOffData } from "./types";
import type { DocumentBrandColorPalette } from "../../store/documentBrandingStore";
import type { Kopecks } from "@dental/shared";
import { formatMoneyExact } from "./treatmentPlanActFormatters";
import { ActMaterialsTableRow } from "./actMaterialsTable/ActMaterialsTableRow";

export interface TreatmentPlanActMaterialsTableProps {
	readonly actData: CompletedWorksActAndWriteOffData;
	readonly palette: DocumentBrandColorPalette;
	readonly netMaterialRub: number;
	readonly netMaterialKopecks?: Kopecks;
	readonly materialsInWords: string;
	readonly hasDeficit: boolean;
}

export const TreatmentPlanActMaterialsTable: React.FC<TreatmentPlanActMaterialsTableProps> = ({
	actData,
	palette,
	netMaterialRub,
	netMaterialKopecks,
	materialsInWords,
	hasDeficit,
}) => {
	return (
		<div className="doc-soap-section mb-6 print:mb-4">
			<div
				className="doc-soap-heading flex items-center justify-between p-2 rounded-t-lg font-black text-xs uppercase tracking-wider text-slate-900 border-b-2"
				style={{
					backgroundColor: palette.softBg,
					borderColor: palette.primary,
					color: palette.primaryDark,
				}}
			>
				<div className="flex items-center gap-2">
					<Package className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
					<span>2. Накладная на списание медикаментов и расходных материалов (ТМЦ)</span>
				</div>
				<span className="text-[11px] font-semibold lowercase opacity-90">
					Позиций ТМЦ: {actData.writtenOffMaterials.length}
				</span>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full border-collapse border border-slate-300 text-xs">
					<thead>
						<tr className="bg-slate-100 text-slate-800 font-bold text-[11px]">
							<th className="border border-slate-300 p-2 text-center w-10">№</th>
							<th className="border border-slate-300 p-2 text-left">
								Наименование медикамента / расходного материала
							</th>
							<th className="border border-slate-300 p-2 text-center w-28">Привязка к услуге</th>
							<th className="border border-slate-300 p-2 text-center w-16">Ед. изм.</th>
							<th className="border border-slate-300 p-2 text-center w-16">Расход</th>
							<th className="border border-slate-300 p-2 text-right w-24">Уч. цена, ₽</th>
							<th className="border border-slate-300 p-2 text-right w-28">Сумма списания, ₽</th>
							<th className="border border-slate-300 p-2 text-center w-36">Складской остаток</th>
						</tr>
					</thead>
					<tbody>
						{actData.writtenOffMaterials.map((mat, idx) => (
							<ActMaterialsTableRow
								key={mat.id || idx}
								mat={mat}
								idx={idx}
							/>
						))}

						<tr
							className="font-bold text-xs"
							style={{ backgroundColor: palette.softBg, color: palette.primaryDark }}
						>
							<td colSpan={6} className="border border-slate-300 p-2.5 text-right uppercase tracking-wide">
								ИТОГО СЕБЕСТОИМОСТЬ СПИСАННЫХ МАТЕРИАЛОВ (ТМЦ):
							</td>
							<td className="border border-slate-300 p-2.5 text-right font-mono font-black text-sm text-slate-950">
								{formatMoneyExact(netMaterialRub, netMaterialKopecks)}
							</td>
							<td className="border border-slate-300 p-2.5 text-center text-[11px] font-bold text-slate-600">
								{hasDeficit ? "Мягкий овердрафт разрешен" : "Склад обеспечен"}
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div className="p-2.5 bg-slate-50 border-x border-b border-slate-300 text-xs text-slate-800 rounded-b-lg">
				<strong>Себестоимость материалов прописью:</strong> <em>{materialsInWords}</em>.
			</div>
		</div>
	);
};
