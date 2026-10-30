import React from "react";
import { Sparkles } from "lucide-react";
import type { ClinicalBundleDefinition } from "../treatmentPlanBundlesEngine.js";

interface PreviewProps {
	readonly bundle: ClinicalBundleDefinition;
	readonly onClose: () => void;
}

export const BundlePreviewDrawer: React.FC<PreviewProps> = ({ bundle, onClose }) => {
	return (
		<div
			className="p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--teal,#0d9488)]/30 text-xs space-y-2 animate-in fade-in duration-150"
			data-testid="bundle-detail-preview"
		>
			<div className="flex items-center justify-between gap-2 border-b border-[var(--line,var(--border,#cbd5e1))] pb-2">
				<div className="flex items-center gap-2">
					<Sparkles size={16} className="text-[var(--teal,#0d9488)]" />
					<strong className="text-[var(--ink,#0f172a)] font-bold">{bundle.title}</strong>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="text-[11px] text-[var(--muted,#64748b)] hover:underline cursor-pointer"
				>
					Закрыть
				</button>
			</div>

			<p className="text-[var(--muted,#64748b)]">{bundle.description}</p>

			<div className="overflow-x-auto">
				<table className="w-full text-[11px] border-collapse">
					<thead>
						<tr className="border-b border-[var(--line,var(--border,#cbd5e1))] text-[var(--muted,#64748b)] text-left">
							<th className="py-1 pr-2">Код услуги</th>
							<th className="py-1 pr-2">Процедура</th>
							<th className="py-1 pr-2">Материалы и протокол</th>
							<th className="py-1 text-right">Тариф</th>
						</tr>
					</thead>
					<tbody>
						{bundle.items.map((it) => (
							<tr
								key={it.serviceCode || it.code804n}
								className="border-b border-[var(--line,var(--border,#cbd5e1))]/50 hover:bg-[var(--paper,#ffffff)]"
							>
								<td className="py-1 font-mono font-bold text-[var(--teal,#0d9488)]">{it.serviceCode || it.code804n}</td>
								<td className="py-1 pr-2 font-medium">{it.name}</td>
								<td className="py-1 pr-2 text-[10px] text-[var(--muted,#64748b)]">{it.materials}</td>
								<td className="py-1 text-right font-mono font-bold whitespace-nowrap">
									{it.defaultPriceRub.toLocaleString("ru-RU")} ₽
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};
