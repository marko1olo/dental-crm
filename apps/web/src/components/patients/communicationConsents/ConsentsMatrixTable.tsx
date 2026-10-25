import React from "react";
import {
	CHANNELS,
	SCOPES,
	cellKey,
	type Channel,
	type ConsentMatrix,
	type Scope,
} from "./types";

interface ConsentsMatrixTableProps {
	readonly matrix: ConsentMatrix;
	readonly saving: boolean;
	readonly onToggle: (channel: Channel, scope: Scope) => void;
}

export function ConsentsMatrixTable({
	matrix,
	saving,
	onToggle,
}: ConsentsMatrixTableProps) {
	return (
		<div className="overflow-x-auto" data-testid="patient-comm-consents-matrix">
			<table className="w-full text-left text-xs border-collapse min-w-[420px]">
				<thead>
					<tr className="text-[var(--muted)] border-b border-[var(--line)]">
						<th className="py-2 pr-3 font-medium">Канал</th>
						{SCOPES.map((sc) => (
							<th key={sc.value} className="py-2 px-2 font-medium text-center">
								{sc.label}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{CHANNELS.map((ch) => (
						<tr key={ch.value} className="border-b border-[var(--line)]">
							<td className="py-2 pr-3 text-[var(--ink)] font-medium">
								{ch.label}
							</td>
							{SCOPES.map((sc) => {
								const k = cellKey(ch.value, sc.value);
								const state = matrix[k] ?? "revoked";
								const on = state === "granted";
								return (
									<td key={sc.value} className="py-2 px-2 text-center">
										<button
											type="button"
											data-testid={`patient-comm-consent-${ch.value}-${sc.value}`}
											aria-pressed={on}
											onClick={() => onToggle(ch.value, sc.value)}
											disabled={saving}
											className={
												on
													? "min-w-[88px] min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 dark:bg-emerald-600/25 text-emerald-800 dark:text-emerald-200 border border-emerald-600/30 dark:border-emerald-400/35 inline-flex items-center justify-center cursor-pointer transition-colors"
													: "min-w-[88px] min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--paper-strong)] text-[var(--muted)] border border-[var(--glass-border)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center cursor-pointer transition-colors"
											}
										>
											{on ? "Разрешено" : "Запрещено"}
										</button>
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
			<p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">
				По умолчанию служебные — разрешены, реклама — запрещена, пока администратор не зафиксирует иное.
			</p>
		</div>
	);
}
