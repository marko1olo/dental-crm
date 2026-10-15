import React, { useState } from "react";
import { AnesthesiaQuickBar } from "./AnesthesiaQuickBar";

export function AnesthesiaStandaloneWorkspace() {
	const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
	const [hasCardio, setHasCardio] = useState(Boolean(searchParams?.has("cardio")));
	const [hasSulfite, setHasSulfite] = useState(Boolean(searchParams?.has("sulfite")));
	const [hasArticaineAllergy, setHasArticaineAllergy] = useState(
		Boolean(searchParams?.has("articaine_allergy") || searchParams?.has("allergy")),
	);
	const takesBeta = Boolean(searchParams?.has("beta"));
	const hasIhd = Boolean(searchParams?.has("ihd"));
	const hasLidocaineAllergy = Boolean(searchParams?.has("lidocaine_allergy"));

	return (
		<div
			className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6 overflow-y-auto"
			data-testid="anesthesia-standalone-workspace"
		>
			<div className="max-w-7xl mx-auto space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
					<div>
						<h1 className="text-lg sm:text-xl font-black text-[var(--ink)]">
							Обезболивание и анестезия у кресла
						</h1>
						<p className="text-xs text-[var(--muted)]">
							Быстрый выбор препарата, 1-клик дозировки и экстренная помощь
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={() => setHasSulfite((prev) => !prev)}
							className={`text-xs font-bold px-2.5 py-1.5 min-h-[44px] rounded-lg border transition-all cursor-pointer ${
								hasSulfite
									? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500"
									: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-[var(--line-strong)]"
							}`}
							data-testid="toggle-sulfite-risk"
						>
							{hasSulfite ? "✓ Аллергия на сульфиты" : "+ Аллергия на сульфиты"}
						</button>
						<button
							type="button"
							onClick={() => setHasArticaineAllergy((prev) => !prev)}
							className={`text-xs font-bold px-2.5 py-1.5 min-h-[44px] rounded-lg border transition-all cursor-pointer ${
								hasArticaineAllergy
									? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500"
									: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-[var(--line-strong)]"
							}`}
							data-testid="toggle-articaine-allergy"
						>
							{hasArticaineAllergy ? "✓ Аллергия на артикаин" : "+ Аллергия на артикаин"}
						</button>
						<button
							type="button"
							onClick={() => setHasCardio((prev) => !prev)}
							className={`text-xs font-bold px-2.5 py-1.5 min-h-[44px] rounded-lg border transition-all cursor-pointer ${
								hasCardio
									? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500"
									: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-[var(--line-strong)]"
							}`}
							data-testid="toggle-cardio-risk"
						>
							{hasCardio ? "✓ ССЗ кардио-риск" : "+ Кардио-риск"}
						</button>
					</div>
				</div>
				<AnesthesiaQuickBar
					patientWeightKg={70}
					targetToothNumberFdi={16}
					hasCardiovascularRisk={hasCardio}
					takesBetaBlockers={takesBeta}
					hasIschemicHeartDisease={hasIhd}
					hasSulfiteAllergy={hasSulfite}
					hasArticaineAllergy={hasArticaineAllergy}
					hasLidocaineAllergy={hasLidocaineAllergy}
					onApplyAnesthesia={() => {}}
					onOpenEmergencyProtocol={() => {
						const url = new URL(window.location.href);
						url.searchParams.set("emergency", "1");
						window.location.href = url.toString();
					}}
				/>
			</div>
		</div>
	);
}
