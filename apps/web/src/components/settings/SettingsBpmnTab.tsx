import React, { useCallback, useEffect, useState } from "react";
import { GitMerge, Play, Pause, Plus, Trash2 } from "lucide-react";
import { showToast } from "../GlobalToast";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

interface Workflow {
	id: string;
	name: string;
	trigger: string;
	active: boolean;
}

const TRIGGER_LABELS: Record<string, string> = {
	patient_created: "Создание пациента",
	appointment_booked: "Новая запись",
	appointment_completed: "Завершение приёма",
	recall_due: "Дата повторного визита",
	invoice_issued: "Выставление счёта",
};

export function SettingsBpmnTab() {
	const { denteClinicalReadHeaders } = useAppLogicContext();
	const [workflows, setWorkflows] = useState<Workflow[]>([]);
	const [loading, setLoading] = useState(true);
	const [togglingId, setTogglingId] = useState<string | null>(null);
	const [newName, setNewName] = useState("");
	const [newTrigger, setNewTrigger] = useState("appointment_completed");
	const [adding, setAdding] = useState(false);
	const [showForm, setShowForm] = useState(false);

	const fetchWorkflows = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/clinic/workflows", {
				headers: denteClinicalReadHeaders(),
			});
			if (!res.ok) throw new Error("fetch failed");
			const json = await res.json();
			setWorkflows(json.workflows ?? []);
		} catch {
			// API not yet provisioned — show empty state without crashing
			setWorkflows([]);
		} finally {
			setLoading(false);
		}
	}, [denteClinicalReadHeaders]);

	useEffect(() => {
		void fetchWorkflows();
	}, [fetchWorkflows]);

	const handleToggle = useCallback(
		async (wf: Workflow) => {
			setTogglingId(wf.id);
			try {
				const res = await fetch(`/api/clinic/workflows/${wf.id}/toggle`, {
					method: "POST",
					headers: { ...denteClinicalReadHeaders(), "Content-Type": "application/json" },
					body: JSON.stringify({ active: !wf.active }),
				});
				if (!res.ok) throw new Error("toggle failed");
				setWorkflows((prev) =>
					prev.map((w) => (w.id === wf.id ? { ...w, active: !wf.active } : w)),
				);
			} catch {
				showToast("Не удалось изменить статус процесса", "error");
			} finally {
				setTogglingId(null);
			}
		},
		[denteClinicalReadHeaders],
	);

	const handleDelete = useCallback(
		async (wf: Workflow) => {
			if (!window.confirm(`Удалить процесс «${wf.name}»?`)) return;
			try {
				const res = await fetch(`/api/clinic/workflows/${wf.id}`, {
					method: "DELETE",
					headers: denteClinicalReadHeaders(),
				});
				if (!res.ok) throw new Error("delete failed");
				setWorkflows((prev) => prev.filter((w) => w.id !== wf.id));
				showToast("Процесс удалён", "success");
			} catch {
				showToast("Не удалось удалить процесс", "error");
			}
		},
		[denteClinicalReadHeaders],
	);

	const handleAdd = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!newName.trim()) return;
			setAdding(true);
			try {
				const res = await fetch("/api/clinic/workflows", {
					method: "POST",
					headers: { ...denteClinicalReadHeaders(), "Content-Type": "application/json" },
					body: JSON.stringify({ name: newName.trim(), trigger: newTrigger, active: false }),
				});
				if (!res.ok) throw new Error("create failed");
				const json = await res.json();
				setWorkflows((prev) => [...prev, json.workflow]);
				setNewName("");
				setShowForm(false);
				showToast("Процесс создан", "success");
			} catch {
				showToast("Не удалось создать процесс", "error");
			} finally {
				setAdding(false);
			}
		},
		[denteClinicalReadHeaders, newName, newTrigger],
	);

	return (
		<div className="profile-studio-container animate-fade-in">
			<div className="import-copy" style={{ marginBottom: "0" }}>
				<GitMerge aria-hidden="true" />
				<div>
					<p className="eyebrow">Бизнес-процессы</p>
					<h2>Автоматические сценарии</h2>
					<p>
						Настраивайте автоматические действия по триггерам: создание черновиков, напоминаний,
						задач для администратора. Все действия проходят подтверждение вручную.
					</p>
				</div>
			</div>

			<div
				className="profile-form-grid"
				style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "24px" }}
			>
				<section className="profile-section-card">
					<div
						className="profile-section-header"
						style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
							<div
								className="profile-section-icon"
								style={{ background: "rgba(99, 102, 241, 0.1)", color: "rgb(99, 102, 241)" }}
							>
								<GitMerge size={24} />
							</div>
							<div className="profile-section-title">
								<h3 style={{ margin: 0 }}>Активные сценарии</h3>
								<p style={{ margin: 0 }}>
									{loading ? "Загрузка..." : `${workflows.length} сценариев`}
								</p>
							</div>
						</div>
						<button
							type="button"
							className="primary-button"
							style={{ display: "flex", alignItems: "center", gap: "8px" }}
							onClick={() => setShowForm((v) => !v)}
						>
							<Plus size={16} /> Создать сценарий
						</button>
					</div>

					{showForm && (
						<form
							onSubmit={handleAdd}
							style={{
								display: "flex",
								gap: "12px",
								flexWrap: "wrap",
								alignItems: "flex-end",
								padding: "16px",
								background: "var(--paper-2)",
								borderRadius: "8px",
								border: "1px solid var(--line)",
							}}
						>
							<div className="profile-form-group" style={{ flex: "1 1 180px", margin: 0 }}>
								<label htmlFor="wf-name">Название сценария</label>
								<input
									id="wf-name"
									type="text"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									placeholder="Напр.: NPS после приёма"
									required
								/>
							</div>
							<div className="profile-form-group" style={{ flex: "1 1 200px", margin: 0 }}>
								<label htmlFor="wf-trigger">Триггер</label>
								<select
									id="wf-trigger"
									value={newTrigger}
									onChange={(e) => setNewTrigger(e.target.value)}
								>
									{Object.entries(TRIGGER_LABELS).map(([key, label]) => (
										<option key={key} value={key}>
											{label}
										</option>
									))}
								</select>
							</div>
							<div style={{ display: "flex", gap: "8px" }}>
								<button type="submit" className="primary-button" disabled={adding}>
									{adding ? "Создание..." : "Создать"}
								</button>
								<button
									type="button"
									className="secondary-button"
									onClick={() => setShowForm(false)}
								>
									Отмена
								</button>
							</div>
						</form>
					)}

					<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
						{workflows.length === 0 && !loading && (
							<div
								style={{
									textAlign: "center",
									padding: "32px",
									color: "var(--text-secondary)",
									fontSize: "0.875rem",
								}}
							>
								Нет сценариев. Создайте первый автоматический процесс.
							</div>
						)}
						{workflows.map((wf) => (
							<div
								key={wf.id}
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									padding: "14px 16px",
									border: "1px solid var(--line)",
									borderRadius: "8px",
									background: "var(--paper)",
								}}
							>
								<div>
									<h4 style={{ margin: 0, color: "var(--ink)", fontSize: "0.9rem" }}>{wf.name}</h4>
									<span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
										Триггер: {TRIGGER_LABELS[wf.trigger] ?? wf.trigger}
									</span>
								</div>
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<button
										type="button"
										onClick={() => void handleToggle(wf)}
										disabled={togglingId === wf.id}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "6px",
											padding: "6px 12px",
											borderRadius: "20px",
											border: "none",
											cursor: "pointer",
											fontWeight: 600,
											fontSize: "0.8rem",
											background: wf.active
												? "rgba(16, 185, 129, 0.1)"
												: "rgba(100, 116, 139, 0.1)",
											color: wf.active ? "rgb(16, 185, 129)" : "rgb(100, 116, 139)",
											opacity: togglingId === wf.id ? 0.5 : 1,
										}}
									>
										{wf.active ? <Play size={13} /> : <Pause size={13} />}
										{wf.active ? "Активен" : "Остановлен"}
									</button>
									<button
										type="button"
										className="icon-button"
										onClick={() => void handleDelete(wf)}
										title="Удалить сценарий"
										style={{ color: "var(--danger, #ef4444)" }}
									>
										<Trash2 size={15} />
									</button>
								</div>
							</div>
						))}
					</div>
				</section>
			</div>
		</div>
	);
}
