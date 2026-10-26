import type React from "react";
import { Check, Eye, PackagePlus } from "lucide-react";
import type { ClinicalBundleDefinition } from "../treatmentPlanBundlesEngine.js";
import { getBundleIcon, getStageBadge } from "./bundleIcons.js";

interface CardProps {
	readonly bundle: ClinicalBundleDefinition;
	readonly selectedTooth: number;
	readonly isRecentlyAdded: boolean;
	readonly onPreview: () => void;
	readonly onApply: () => void;
}

export const BundleCard: React.FC<CardProps> = ({
	bundle,
	selectedTooth,
	isRecentlyAdded,
	onPreview,
	onApply,
}) => {
	const badge = getStageBadge(bundle.stageNumber);

	return (
		<div
			className="flex flex-col justify-between p-3 rounded-xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper,#ffffff)] hover:border-[var(--teal,#0d9488)] hover:shadow-md transition-all group"
			data-testid={`bundle-card-${bundle.id}`}
		>
			<div>
				<div className="flex items-start justify-between gap-1.5 mb-1.5">
					<div className="flex items-center gap-1.5 min-w-0">
						{getBundleIcon(bundle.id)}
						<span className="font-bold text-xs text-[var(--ink,#0f172a)] truncate group-hover:text-[var(--teal,#0d9488)] transition-colors">
							{bundle.shortTitle}
						</span>
					</div>
					<span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border shrink-0 ${badge.cls}`}>
						{bundle.stageNumber === 1 ? "Этап I" : bundle.stageNumber === 2 ? "Этап II" : "Этап III"}
					</span>
				</div>

				<p className="text-[11px] text-[var(--muted,#64748b)] leading-snug mb-2 line-clamp-2">
					{bundle.description}
				</p>

				<div className="text-[10px] text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f8fafc)] p-1.5 rounded-lg border border-[var(--line,var(--border,#cbd5e1))] mb-2.5">
					<strong className="text-[var(--ink,#0f172a)] block mb-0.5 font-semibold">
						Включает ({bundle.items.length} поз.):
					</strong>
					<ul className="list-disc list-inside space-y-0.5 text-[9.5px]">
						{bundle.items.map((it) => (
							<li key={it.serviceCode || it.code804n} className="truncate">
								<span className="font-mono text-[var(--muted,#64748b)]">{it.serviceCode || it.code804n}:</span> {it.name}
							</li>
						))}
					</ul>
				</div>
			</div>

			<div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--line,var(--border,#cbd5e1))]">
				<div>
					<span className="text-[10px] text-[var(--muted,#64748b)] block leading-none">Итого под ключ</span>
					<strong className="text-sm font-black text-[var(--ink,#0f172a)] font-mono">
						{bundle.totalPriceRub.toLocaleString("ru-RU")} ₽
					</strong>
				</div>

				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={onPreview}
						className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors cursor-pointer touch-manipulation"
						title="Посмотреть клинический состав и материалы"
					>
						<Eye size={14} />
					</button>
					<button
						type="button"
						onClick={onApply}
						className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs touch-manipulation ${
							isRecentlyAdded ? "bg-emerald-600 text-white" : "bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white"
						}`}
						title={`Добавить пакет в план лечения${bundle.requiresTooth ? ` для зуба ${selectedTooth}` : ""}`}
						data-testid={`add-bundle-${bundle.id}`}
					>
						{isRecentlyAdded ? (
							<>
								<Check size={13} />
								<span>Добавлено!</span>
							</>
						) : (
							<>
								<PackagePlus size={13} />
								<span>В план</span>
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
};
