import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import {
	type ClinicWorkflow,
	normalizeClinicWorkflow,
	parseWorkflowsPayload,
	type WorkflowsLoadState,
} from "../settingsWorkflowsPanel";

export function useClinicWorkflows() {
	const { denteClinicalReadHeaders } = useAppLogicContext();
	const [workflows, setWorkflows] = useState<ClinicWorkflow[]>([]);
	const [loadState, setLoadState] = useState<WorkflowsLoadState>({ phase: "loading" });
	const [togglingId, setTogglingId] = useState<string | null>(null);

	const fetchWorkflows = useCallback(async () => {
		setLoadState({ phase: "loading" });
		try {
			const res = await fetch("/api/clinic/workflows", { headers: denteClinicalReadHeaders() });
			const raw = await res.text();
			const outcome = parseWorkflowsPayload(res.status, raw);
			if (!outcome.ok) {
				setLoadState({ phase: "failed", status: outcome.status });
				return;
			}
			setWorkflows(outcome.workflows);
			setLoadState({ phase: "ready" });
		} catch {
			setLoadState({ phase: "failed", status: null });
		}
	}, [denteClinicalReadHeaders]);

	useEffect(() => { void fetchWorkflows(); }, [fetchWorkflows]);

	const handleToggle = useCallback(async (wf: ClinicWorkflow) => {
		setTogglingId(wf.id);
		try {
			const res = await fetch(`/api/clinic/workflows/${wf.id}/toggle`, {
				method: "POST",
				headers: { ...denteClinicalReadHeaders(), "Content-Type": "application/json" },
				body: JSON.stringify({ active: !wf.active }),
			});
			if (!res.ok) {
				showToast(actionFailureToast(wf.active ? "Не остановлен" : "Не включён", res.status), "error");
				return;
			}
			setWorkflows((prev) => prev.map((w) => (w.id === wf.id ? { ...w, active: !wf.active } : w)));
		} finally {
			setTogglingId(null);
		}
	}, [denteClinicalReadHeaders]);

	const handleDelete = useCallback(async (wf: ClinicWorkflow) => {
		try {
			const res = await fetch(`/api/clinic/workflows/${wf.id}`, {
				method: "DELETE",
				headers: denteClinicalReadHeaders(),
			});
			if (!res.ok) {
				showToast(actionFailureToast("Сценарий не удалён", res.status), "error");
				return;
			}
			setWorkflows((prev) => prev.filter((w) => w.id !== wf.id));
			showToast(`Сценарий «${wf.name}» удалён`, "success");
		} catch {
			showToast("Сценарий не удалён", "error");
		}
	}, [denteClinicalReadHeaders]);

	const handleAddStandard = useCallback(async () => {
		const standard = [
			{ name: "Напоминание о визите за 24 часа", trigger: "appointment_booked", active: true },
			{ name: "Контроль качества после приёма", trigger: "appointment_completed", active: true },
			{ name: "Приглашение на профосмотр через 6 месяцев", trigger: "recall_due", active: true },
		];
		for (const tpl of standard) {
			if (workflows.some((w) => w.name.toLowerCase() === tpl.name.toLowerCase())) continue;
			await fetch("/api/clinic/workflows", {
				method: "POST",
				headers: { ...denteClinicalReadHeaders(), "Content-Type": "application/json" },
				body: JSON.stringify(tpl),
			});
		}
		showToast("Стандартные уведомления подключены", "success");
		await fetchWorkflows();
	}, [denteClinicalReadHeaders, fetchWorkflows, workflows]);

	return { workflows, loadState, togglingId, fetchWorkflows, handleToggle, handleDelete, handleAddStandard };
}
