/**
 * @file CopilotSettingsGranularPermissions.tsx
 * @description Fine-grained agent tool auto-approve permissions in the style of Cline, Roo-Code and Cursor SOTA.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e (Doctor Autonomy).
 */

import React from "react";
import type { GranularAgentPermissions } from "../../../store/copilotStore";

export interface CopilotSettingsGranularPermissionsProps {
	granularPermissions: GranularAgentPermissions;
	setGranularPermissions: (perms: GranularAgentPermissions) => void;
}

export function CopilotSettingsGranularPermissions({
	granularPermissions,
	setGranularPermissions,
}: CopilotSettingsGranularPermissionsProps) {
	return (
		<section className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2">
			<div className="font-bold text-[var(--ink)] flex items-center justify-between">
				<span>Гранулярные разрешения действий (Auto-Approve)</span>
				<span className="text-[10px] text-[var(--teal,#0d9488)] font-semibold">Автономные права</span>
			</div>
			<p className="text-[10px] text-[var(--muted)] m-0 leading-relaxed">
				Выберите, какие действия ассистент выполняет без всплывающих подтверждений:
			</p>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
				<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-[var(--ink)]">
					<input
						type="checkbox"
						checked={granularPermissions.autoApproveFileReads}
						onChange={(e) => setGranularPermissions({ ...granularPermissions, autoApproveFileReads: e.target.checked })}
						className="rounded text-[var(--teal,#0d9488)]"
					/>
					<span>Чтение снимков и файлов на ПК</span>
				</label>
				<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-[var(--ink)]">
					<input
						type="checkbox"
						checked={granularPermissions.autoApproveClinicalMutations}
						onChange={(e) => setGranularPermissions({ ...granularPermissions, autoApproveClinicalMutations: e.target.checked })}
						className="rounded text-[var(--teal,#0d9488)]"
					/>
					<span>Разметка формулы и дневника ЭМК</span>
				</label>
				<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-[var(--ink)]">
					<input
						type="checkbox"
						checked={granularPermissions.autoApproveFinancialDrafts}
						onChange={(e) => setGranularPermissions({ ...granularPermissions, autoApproveFinancialDrafts: e.target.checked })}
						className="rounded text-[var(--teal,#0d9488)]"
					/>
					<span>Формирование черновиков сметы</span>
				</label>
				<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-[var(--ink)]">
					<input
						type="checkbox"
						checked={granularPermissions.autoApproveFileWrites}
						onChange={(e) => setGranularPermissions({ ...granularPermissions, autoApproveFileWrites: e.target.checked })}
						className="rounded text-[var(--teal,#0d9488)]"
					/>
					<span>Запись и экспорт файлов на диск</span>
				</label>
				<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-[var(--ink)] sm:col-span-2">
					<input
						type="checkbox"
						checked={granularPermissions.autoApproveExternalSoftware}
						onChange={(e) => setGranularPermissions({ ...granularPermissions, autoApproveExternalSoftware: e.target.checked })}
						className="rounded text-[var(--teal,#0d9488)]"
					/>
					<span>Запуск внешнего стоматологического ПО (Romexis, Ez3D Plus)</span>
				</label>
			</div>
		</section>
	);
}
