import React from "react";
import { BellRing, Sparkles } from "lucide-react";
import { PanelLoadFailure } from "../PanelLoadFailure";
import { WORKFLOWS_PANEL_SUBJECT } from "./settingsWorkflowsPanel";
import { useClinicWorkflows } from "./workflows/useClinicWorkflows";
import { WorkflowItemRow } from "./workflows/WorkflowItemRow";

export function SettingsBpmnTab() {
	const { workflows, loadState, togglingId, fetchWorkflows, handleToggle, handleDelete, handleAddStandard } =
		useClinicWorkflows();

	return (
		<div className="space-y-5 animate-fade-in" data-testid="settings-notifications-tab">
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<BellRing className="w-5 h-5 text-[var(--teal)]" />
					<h3 className="text-lg font-bold text-[var(--ink)] m-0">Служба уведомлений и автосценариев</h3>
				</div>
				<p className="text-xs text-[var(--muted)] m-0">
					Автоматические напоминания о визитах, контроль самочувствия после приёма и приглашения на профосмотр.
				</p>
			</div>

			<section className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper-card)] shadow-xs space-y-4">
				<div className="flex items-center justify-between flex-wrap gap-3">
					<div>
						<h4 className="m-0 text-sm font-semibold text-[var(--ink)]">Активные уведомления</h4>
						<span className="text-xs text-[var(--muted)]">Настроено: {workflows.length}</span>
					</div>
					<button
						type="button"
						onClick={handleAddStandard}
						className="h-9 min-h-[44px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
					>
						<Sparkles size={14} className="text-amber-500" />
						<span>Подключить стандартные</span>
					</button>
				</div>

				{loadState.phase === "failed" && (
					<PanelLoadFailure
						subject={WORKFLOWS_PANEL_SUBJECT}
						status={loadState.status}
						onRetry={() => void fetchWorkflows()}
					/>
				)}

				{loadState.phase === "loading" && (
					<div className="py-8 text-center text-xs text-[var(--muted)]">Загрузка уведомлений...</div>
				)}

				{loadState.phase === "ready" && workflows.length === 0 && (
					<div className="py-8 text-center space-y-2">
						<p className="m-0 text-sm font-medium text-[var(--ink)]">Нет активных авто-уведомлений</p>
						<p className="m-0 text-xs text-[var(--muted)]">Включите стандартные напоминания клиники в 1 клик</p>
					</div>
				)}

				<div className="space-y-2">
					{workflows.map((wf) => (
						<WorkflowItemRow
							key={wf.id}
							wf={wf}
							isToggling={togglingId === wf.id}
							onToggle={handleToggle}
							onDelete={handleDelete}
						/>
					))}
				</div>
			</section>
		</div>
	);
}
