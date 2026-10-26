import React from "react";
import { Zap } from "lucide-react";
import { type ClinicalPackageId, CLINICAL_WRITEOFF_PACKAGES } from "../warehousePackageWriteOffEngine.js";

interface BatchWriteoffPackagesTabProps {
	readonly packageMultiplier: number;
	readonly setPackageMultiplier: (m: number) => void;
	readonly submittingPackageId: string | null;
	readonly onPackageClick: (pkgId: ClinicalPackageId) => Promise<void>;
}

export const BatchWriteoffPackagesTab: React.FC<BatchWriteoffPackagesTabProps> = ({
	packageMultiplier,
	setPackageMultiplier,
	submittingPackageId,
	onPackageClick,
}) => {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between flex-wrap gap-2 text-xs">
				<span className="font-semibold text-[var(--muted)]">Множитель пакетов:</span>
				<div className="flex items-center gap-1.5">
					{[1, 2, 5, 10].map((m) => (
						<button
							key={m}
							type="button"
							onClick={() => setPackageMultiplier(m)}
							className={`h-8 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
								packageMultiplier === m
									? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							{m}x
						</button>
					))}
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
				{CLINICAL_WRITEOFF_PACKAGES.map((pkg) => {
					const isCurrentSubmitting = submittingPackageId === pkg.id;

					return (
						<div
							key={pkg.id}
							className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal,#0d9488)] transition flex flex-col justify-between gap-3 text-xs"
						>
							<div>
								<div className="flex items-center justify-between gap-2">
									<h4 className="font-bold text-[var(--ink)] text-sm">{pkg.title}</h4>
									<span className="text-[11px] font-semibold text-[var(--muted)] bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line)]">
										{pkg.items.length} поз.
									</span>
								</div>
								<p className="text-[11px] text-[var(--muted)] mt-1">{pkg.description}</p>
							</div>

							<div className="pt-2 border-t border-[var(--line-subtle)] flex items-center justify-between gap-2">
								<span className="text-[11px] text-[var(--muted)] font-mono">
									{packageMultiplier > 1 ? `${packageMultiplier} наб.` : "1 набор"}
								</span>
								<button
									type="button"
									disabled={false}
									onClick={() => onPackageClick(pkg.id as ClinicalPackageId)}
									className="h-9 min-h-[36px] px-3.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white font-bold text-xs transition inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
									data-testid={`btn-writeoff-pkg-${pkg.id}`}
								>
									<Zap size={14} />
									<span>{isCurrentSubmitting ? "Списание..." : "Списать пакет"}</span>
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
