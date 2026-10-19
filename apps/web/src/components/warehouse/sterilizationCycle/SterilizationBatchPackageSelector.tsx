/**
 * SterilizationBatchPackageSelector.tsx — Селектор лотков и пакетов автоклава.
 * Apple HIG: тач-таргеты >= 44x44px, высота кнопок >= 36px. Строго <= 120 строк.
 */

import { CheckCircle2, Minus, Plus } from "lucide-react";
import type { SterilizationBatchPackageItem } from "./types.js";

export interface SterilizationBatchPackageSelectorProps {
	readonly packages: readonly SterilizationBatchPackageItem[];
	readonly onUpdateCount: (packageId: string, delta: number) => void;
	readonly indicatorPassed: boolean;
	readonly onToggleIndicator: () => void;
}

export function SterilizationBatchPackageSelector({
	packages,
	onUpdateCount,
	indicatorPassed,
	onToggleIndicator,
}: SterilizationBatchPackageSelectorProps) {
	return (
		<div className="flex flex-col gap-3">
			<div className="text-[13px] font-semibold text-[var(--ink)]">
				Количество лотков и упаковок для стерилизации:
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
				{packages.map((pkg) => (
					<div
						key={pkg.id}
						className="flex items-center justify-between p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]"
					>
						<div className="flex flex-col min-w-0 pr-2">
							<span
								className="text-[13px] font-medium text-[var(--ink)] truncate"
								title={pkg.name}
							>
								{pkg.name}
							</span>
							<span className="text-[11px] text-[var(--muted)]">
								Размер: {pkg.pouchSize}
							</span>
						</div>

						<div className="flex items-center gap-1.5 shrink-0">
							<button
								type="button"
								onClick={() => onUpdateCount(pkg.id, -1)}
								disabled={pkg.count <= 0}
								aria-label={`Уменьшить ${pkg.name}`}
								className="w-9 h-9 min-w-[36px] min-h-[36px] sm:w-8 sm:h-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
							>
								<Minus size={14} />
							</button>

							<span className="w-8 text-center text-[14px] font-bold tabular-nums text-[var(--ink)]">
								{pkg.count}
							</span>

							<button
								type="button"
								onClick={() => onUpdateCount(pkg.id, 1)}
								aria-label={`Увеличить ${pkg.name}`}
								className="w-9 h-9 min-w-[36px] min-h-[36px] sm:w-8 sm:h-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
							>
								<Plus size={14} />
							</button>
						</div>
					</div>
				))}
			</div>

			{/* Индикатор 5 класса интегратора */}
			<button
				type="button"
				onClick={onToggleIndicator}
				className="flex items-center justify-between p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] cursor-pointer hover:border-[var(--teal)] transition-all select-none text-left w-full"
			>
				<div className="flex items-center gap-2.5">
					<CheckCircle2
						size={18}
						className={
							indicatorPassed
								? "text-[var(--teal,#0d9488)]"
								: "text-[var(--muted)]"
						}
					/>
					<div className="flex flex-col">
						<span className="text-[13px] font-medium text-[var(--ink)]">
							Химический интегратор 5 класса (пар 134°C / 2.1 bar)
						</span>
						<span className="text-[11px] text-[var(--muted)]">
							Контроль 5 критических точек камеры автоклава
						</span>
					</div>
				</div>

				<span
					className={`px-2.5 py-1 rounded-full text-[12px] font-semibold border ${
						indicatorPassed
							? "bg-[var(--teal-soft,#ccfbf1)] border-[var(--teal,#0d9488)] text-[var(--teal-dark,#0f766e)]"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)]"
					}`}
				>
					{indicatorPassed ? "✓ Тест пройден" : "Тест не проведен"}
				</span>
			</button>
		</div>
	);
}
