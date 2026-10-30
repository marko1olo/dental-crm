/**
 * @dental/web/components/orthodontics/workspaceModal/OrthoAlignersTab.tsx
 * Вкладка протокола элайнеров, капп, аттачментов и сепарации эмали (Мандаты 8b, 8e).
 * Сенсорная эргономика, тач-таргеты >= 44px, визуальные индикаторы активности.
 */

import React from "react";
import {
	ALIGNER_ATTACHMENTS_CATALOG,
	type DEFAULT_ALIGNER_STATE,
} from "../orthoCatalogData";

export interface OrthoAlignersTabProps {
	alignerState: typeof DEFAULT_ALIGNER_STATE;
	onChangeAlignerState: (patch: Partial<typeof DEFAULT_ALIGNER_STATE>) => void;
}

export const OrthoAlignersTab: React.FC<OrthoAlignersTabProps> = ({
	alignerState,
	onChangeAlignerState,
}) => {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-150">
			{/* Левая колонка: шаги элайнеров и выдача капп */}
			<section className="lg:col-span-6 flex flex-col gap-4">
				<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
					<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-3">
						Прогресс элайнеров и выдача капп
					</label>
					<div className="flex flex-col gap-3">
						<div className="flex items-center justify-between">
							<span className="text-xs font-medium text-[var(--ink)]">Текущая каппа:</span>
							<span className="text-sm font-bold font-mono text-[#0d9488]">
								{`№ ${alignerState.currentStep} из ${alignerState.totalSteps}`}
							</span>
						</div>
						<div className="py-2 flex items-center min-h-[44px]">
							<input
								type="range"
								min="1"
								max={alignerState.totalSteps}
								value={alignerState.currentStep}
								onChange={(e) =>
									onChangeAlignerState({ currentStep: Number(e.target.value) })
								}
								aria-label="Номер текущей каппы"
								className="w-full h-2 rounded-lg accent-[#0d9488] cursor-pointer"
							/>
						</div>
						<div className="grid grid-cols-2 gap-2 mt-2">
							<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
								<span className="text-[11px] text-[var(--muted)] block">Дней на шаг</span>
								<span className="text-sm font-bold text-[var(--ink)]">
									{alignerState.daysPerStep} дней
								</span>
							</div>
							<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
								<span className="text-[11px] text-[var(--muted)] block">Выдано на руки</span>
								<span className="text-sm font-bold text-[var(--ink)]">
									{alignerState.issuedSetsCount} смены
								</span>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Правая колонка: аттачменты и сепарация */}
			<section className="lg:col-span-6 flex flex-col gap-4">
				<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
					<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-3">
						Аттачменты и сепарация (IPR)
					</label>
					<div className="flex flex-col gap-2">
						{ALIGNER_ATTACHMENTS_CATALOG.map((att) => (
							<div
								key={att.id}
								className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between min-h-[44px]"
							>
								<div>
									<span className="text-xs font-bold text-[var(--ink)] block">{att.nameRu}</span>
									<span className="text-[11px] text-[var(--muted)]">{att.intentRu}</span>
								</div>
								<span className="text-xs font-mono font-bold text-emerald-600 shrink-0">
									✓ Активен
								</span>
							</div>
						))}
					</div>
				</div>
			</section>
		</div>
	);
};

export default OrthoAlignersTab;
