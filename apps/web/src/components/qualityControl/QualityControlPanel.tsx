import { useCallback, useEffect, useState } from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { formatDateTime } from "../../AppHelpers";
import { AlertTriangle, Clock, CheckCircle2, XCircle, FileEdit } from "lucide-react";

type QualityControlItem = {
	id: string;
	visitId?: string;
	type: "not_filled" | "draft" | "under_review" | "approved" | "rejected";
	patientId: string;
	patientName: string | null;
	doctorId: string | null;
	doctorName: string | null;
	createdAt: string;
	complaint?: string;
	anamnesis?: string;
	objectiveStatus?: string;
	diagnosis?: string;
	treatmentPlan?: string;
};

const COLUMNS: Array<{ id: QualityControlItem["type"]; label: string; icon: React.ReactNode }> = [
	{ id: "not_filled", label: "Не заполнен", icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> },
	{ id: "draft", label: "Черновик", icon: <FileEdit className="w-4 h-4 text-[var(--fg-muted)]" /> },
	{ id: "under_review", label: "На проверке", icon: <Clock className="w-4 h-4 text-blue-500" /> },
	{ id: "rejected", label: "На доработке", icon: <XCircle className="w-4 h-4 text-red-500" /> },
	{ id: "approved", label: "Утверждено", icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> }
];

export function QualityControlPanel() {
	const appLogic = useAppLogicContext();
	const [items, setItems] = useState<QualityControlItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const auth = appLogic?.auth;
			const headers =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders()
					: {};

			const response = await fetch("/api/visits/quality-control", { headers });
			if (!response.ok) {
				throw new Error("Ошибка загрузки данных контроля качества");
			}
			const json = await response.json();
			if (!json || !Array.isArray(json.visits)) {
				throw new Error("Неверный формат ответа сервера");
			}
			setItems(json.visits);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			showToast(actionFailureToast("Ошибка", null), "error");
		} finally {
			setLoading(false);
		}
	}, [appLogic?.auth]);

	useEffect(() => {
		void load();
	}, [load]);

	const handleStatusChange = async (visitId: string | undefined, status: "approved" | "rejected") => {
		if (!visitId) return;
		try {
			const auth = appLogic?.auth;
			const headers =
				auth && typeof auth.denteClinicalMutationHeaders === "function"
					? auth.denteClinicalMutationHeaders()
					: {};

			const response = await fetch(`/api/visits/${visitId}/quality-control`, {
				method: "PUT",
				headers: { ...headers, "Content-Type": "application/json" },
				body: JSON.stringify({ status }),
			});
			if (!response.ok) {
				throw new Error("Ошибка сохранения статуса");
			}
			showToast("Статус успешно обновлен", "success");
			void load();
		} catch (err) {
			showToast(actionFailureToast("Ошибка сохранения", null), "error");
		}
	};

	if (loading && items.length === 0) {
		return (
			<div className="ops-skeleton" aria-hidden="true">
				<span className="ops-skeleton__line" />
				<span className="ops-skeleton__line" />
			</div>
		);
	}

	return (
		<section className="ops-quality-control mt-[2rem]">
			<h3 className="ops-section-title mb-4">Контроль качества историй болезни (ЭМК)</h3>
			{error ? (
				<p className="ops-notice ops-notice--error" role="alert">
					{error}
				</p>
			) : null}

			<div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
				{COLUMNS.map(col => {
					const colItems = items.filter(item => item.type === col.id);
					return (
						<div key={col.id} className="ops-kanban-column flex flex-col bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-lg overflow-hidden h-[40rem]">
							<div className="flex items-center gap-2 p-3 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]">
								{col.icon}
								<h4 className="font-semibold text-sm flex-1">{col.label}</h4>
								<span className="text-xs bg-[var(--border-strong)] text-[var(--fg-muted)] px-2 py-0.5 rounded-full font-mono">{colItems.length}</span>
							</div>
							
							<div className="flex-1 overflow-y-auto p-2 space-y-3">
								{colItems.length === 0 ? (
									<div className="text-center py-4 text-[var(--fg-muted)] text-sm italic">Пусто</div>
								) : (
									colItems.map(item => (
										<article key={item.id} className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-md p-3 text-sm shadow-sm flex flex-col gap-2">
											<div className="flex justify-between items-start">
												<strong className="text-[var(--fg)] truncate max-w-[80%]">{item.patientName || "Без имени"}</strong>
												<span className="text-[0.6875rem] text-[var(--fg-muted)]">{formatDateTime(item.createdAt)}</span>
											</div>
											<div className="text-[0.75rem] text-[var(--fg-subtle)]">
												Врач: {item.doctorName || "—"}
											</div>
											
											{item.type === "under_review" && (
												<div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[var(--border-subtle)] text-[0.6875rem]">
													<button
														type="button"
														className="primary-button compact-button bg-[var(--good-fg)] hover:bg-[var(--good-bg)] text-white w-full py-1 text-[11px]"
														onClick={() => void handleStatusChange(item.visitId, "approved")}
													>
														Утвердить
													</button>
													<button
														type="button"
														className="secondary-button compact-button text-[var(--bad-fg)] border-[var(--bad-fg)] hover:bg-[var(--bad-bg)] w-full py-1 text-[11px]"
														onClick={() => void handleStatusChange(item.visitId, "rejected")}
													>
														Отклонить
													</button>
												</div>
											)}
										</article>
									))
								)}
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}
