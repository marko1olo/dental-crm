/**
 * @file CopilotSettingsCapabilitiesTable.tsx
 * @description Visual comparative matrix for DENTE Copilot environments:
 * Web Browser vs Desktop PC Workstation vs Mobile / Chairside Tablet.
 * (Mandate 8b <= 150 lines, Mandate 8e, Mandate 8x).
 */

import React from "react";
import { Check, Monitor, Smartphone } from "lucide-react";
import {
	ENVIRONMENT_CAPABILITIES_MATRIX,
	type CapabilityStatus,
} from "../copilotCatalogData";
import type { CopilotRuntimeEnvironment } from "../../../store/copilotStore";

export interface CopilotSettingsCapabilitiesTableProps {
	runtimeMode: CopilotRuntimeEnvironment;
}

export function renderCapabilityStatusBadge(status: CapabilityStatus) {
	if (status === "available") {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
				<Check size={10} />
				<span>Доступно</span>
			</span>
		);
	}
	if (status === "desktop_required") {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-500/10 text-slate-600 border border-slate-500/20">
				<Monitor size={10} />
				<span>Требуется приложение для ПК</span>
			</span>
		);
	}
	if (status === "mobile_specific") {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/10 text-sky-600 border border-sky-500/20">
				<Smartphone size={10} />
				<span>Специфика мобильного планшета</span>
			</span>
		);
	}
	return <span className="text-[11px] text-[var(--muted)]">—</span>;
}

export function CopilotSettingsCapabilitiesTable({ runtimeMode }: CopilotSettingsCapabilitiesTableProps) {
	const currentLabel =
		runtimeMode === "web_browser"
			? "Веб-браузер"
			: runtimeMode === "desktop_native"
			? "Десктоп ПК"
			: "Планшет у кресла";

	return (
		<div className="space-y-3 text-xs" data-testid="copilot-capabilities-matrix">
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
				<div>
					<h4 className="font-bold text-[var(--ink)]">Сравнительная матрица сред DENTE</h4>
					<p className="text-[10px] text-[var(--muted)]">Честное разделение возможностей без скрытых эмуляций</p>
				</div>
				<div className="text-[10px] px-2 py-0.5 rounded bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] font-semibold border border-[var(--teal,#0d9488)]/20">
					{`Текущая: ${currentLabel}`}
				</div>
			</div>

			<div className="border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--paper)]">
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse text-[11px]">
						<thead>
							<tr className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line)] text-[var(--muted)]">
								<th className="py-2.5 px-3 font-semibold">Функция / Возможность</th>
								<th className="py-2.5 px-2 font-semibold text-center">Браузер</th>
								<th className="py-2.5 px-2 font-semibold text-center">Десктоп ПК</th>
								<th className="py-2.5 px-2 font-semibold text-center">Планшет</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line)]">
							{ENVIRONMENT_CAPABILITIES_MATRIX.map((cap) => (
								<tr key={cap.id} className="hover:bg-[var(--paper-soft)]/50">
									<td className="py-2 px-3">
										<div className="font-bold text-[var(--ink)]">{cap.name}</div>
										<div className="text-[10px] text-[var(--muted)]">{cap.description}</div>
									</td>
									<td className="py-2 px-2 text-center whitespace-nowrap">{renderCapabilityStatusBadge(cap.web)}</td>
									<td className="py-2 px-2 text-center whitespace-nowrap">{renderCapabilityStatusBadge(cap.desktop)}</td>
									<td className="py-2 px-2 text-center whitespace-nowrap">{renderCapabilityStatusBadge(cap.mobile)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
