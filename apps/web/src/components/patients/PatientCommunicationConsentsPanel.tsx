/**
 * PatientCommunicationConsentsPanel.tsx — Согласия пациента на каналы связи.
 * Decomposed facade strictly <= 80 lines following Mandate 8b.
 */

import React from "react";
import type { PatientCommunicationConsentsPanelProps } from "./communicationConsents/types";
import { useCommunicationConsents } from "./communicationConsents/useCommunicationConsents";
import { ConsentsMatrixTable } from "./communicationConsents/ConsentsMatrixTable";

export type { PatientCommunicationConsentsPanelProps } from "./communicationConsents/types";

export const PatientCommunicationConsentsPanel: React.FC<
	PatientCommunicationConsentsPanelProps
> = ({ patientId }) => {
	const state = useCommunicationConsents(patientId);
	const { loading, saving } = state;

	if (!patientId) return null;

	return (
		<section
			className="rounded-2xl border border-[var(--teal,var(--brand-primary))]/25 bg-[var(--paper,#ffffff)] dark:bg-zinc-950/80 p-4 shadow-sm"
			data-testid="patient-comm-consents-panel"
			aria-label="Согласия на каналы связи"
		>
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
				<div>
					<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] tracking-wide">
						Согласия на связь
					</h3>
					<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
						Служебные (запись, напоминания) и реклама по каналам. Без явного
						«разрешено» реклама не уходит.
					</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{state.dirty && (
						<span className="text-xs px-2.5 py-1 rounded-lg border border-amber-600/30 dark:border-amber-400/30 bg-amber-500/15 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 font-semibold">
							Есть изменения
						</span>
					)}
					<button
						type="button"
						data-testid="patient-comm-consents-reload"
						disabled={loading || saving}
						onClick={() => void state.load()}
						className="px-3.5 py-2 min-h-[44px] sm:min-h-[32px] text-xs rounded-xl border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)] disabled:opacity-50 inline-flex items-center justify-center font-medium cursor-pointer"
					>
						Обновить
					</button>
					<button
						type="button"
						data-testid="patient-comm-consents-save"
						disabled={loading || saving}
						onClick={() => void state.save()}
						className="px-4 py-2 min-h-[44px] sm:min-h-[32px] text-xs font-bold rounded-xl bg-[var(--teal,var(--brand-primary))] hover:brightness-110 text-white border border-[var(--teal,var(--brand-primary))]/40 disabled:opacity-50 inline-flex items-center justify-center cursor-pointer"
					>
						{state.saving ? "Сохраняю…" : "Сохранить"}
					</button>
				</div>
			</div>

			{state.loading && !state.loaded ? (
				<p className="text-xs text-[var(--muted)]">Загружаю согласия…</p>
			) : null}

			{state.error && (
				<p className="mb-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2">
					{state.error}
				</p>
			)}

			{state.loaded && (
				<ConsentsMatrixTable
					matrix={state.matrix}
					saving={state.saving}
					onToggle={state.toggle}
				/>
			)}
		</section>
	);
};

export default PatientCommunicationConsentsPanel;
