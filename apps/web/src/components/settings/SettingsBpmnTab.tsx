import { GitMerge, Pause, Play, Plus, Trash2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast, panelStateText } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";
import {
	type ClinicWorkflow,
	normalizeClinicWorkflow,
	parseWorkflowsPayload,
	WORKFLOW_TRIGGER_LABELS,
	WORKFLOWS_PANEL_SUBJECT,
	type WorkflowsLoadState,
	workflowsCountLabel,
	workflowTriggerLabel,
} from "./settingsWorkflowsPanel";

export function SettingsBpmnTab() {
	const { denteClinicalReadHeaders } = useAppLogicContext();
	const [workflows, setWorkflows] = useState<ClinicWorkflow[]>([]);
	/*
	 * Загрузка / прочитано / отказ. Раньше здесь стоял один `loading`, а отказ
	 * сервера уходил в `catch { setWorkflows([]) }` — и становился неотличим от
	 * честной пустоты. Причина, почему это опасно именно здесь, разобрана в
	 * ./settingsWorkflowsPanel.ts.
	 */
	const [loadState, setLoadState] = useState<WorkflowsLoadState>({
		phase: "loading",
	});
	const [togglingId, setTogglingId] = useState<string | null>(null);
	const [newName, setNewName] = useState("");
	const [newTrigger, setNewTrigger] = useState("appointment_completed");
	const [adding, setAdding] = useState(false);
	const [showForm, setShowForm] = useState(false);

	const fetchWorkflows = useCallback(async () => {
		setLoadState({ phase: "loading" });
		try {
			const res = await fetch("/api/clinic/workflows", {
				headers: denteClinicalReadHeaders(),
			});
			// Тело читается строкой один раз: у res.json() на пустом ответе и на
			// HTML от прокси исключение с английским текстом.
			const raw = await res.text();
			const outcome = parseWorkflowsPayload(res.status, raw);
			if (!outcome.ok) {
				// Код ответа нужен разработчику, а не администратору: в консоль.
				console.error("[сценарии] список не прочитан, ответ", outcome.status);
				setLoadState({ phase: "failed", status: outcome.status });
				return;
			}
			setWorkflows(outcome.workflows);
			setLoadState({ phase: "ready" });
		} catch (err) {
			// До сервера не дошли вовсе: status = null, текст об этом так и скажет.
			console.error("[сценарии] запрос не дошёл до сервера", err);
			setLoadState({ phase: "failed", status: null });
		}
	}, [denteClinicalReadHeaders]);

	useEffect(() => {
		void fetchWorkflows();
	}, [fetchWorkflows]);

	/*
	 * Тексты отказов действий собираются из общего lib/panelStateText.ts.
	 *
	 * БЫЛО: «Не удалось изменить статус процесса», «Не удалось удалить процесс»,
	 * «Не удалось создать процесс» — факт без причины и без следующего шага.
	 * Администратор нажимал ту же кнопку ещё три раза, потому что экран не сказал
	 * ни что случилось, ни что делать. Причина у нас известна: код ответа.
	 */
	const handleToggle = useCallback(
		async (wf: ClinicWorkflow) => {
			setTogglingId(wf.id);
			try {
				const res = await fetch(`/api/clinic/workflows/${wf.id}/toggle`, {
					method: "POST",
					headers: {
						...denteClinicalReadHeaders(),
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ active: !wf.active }),
				});
				if (!res.ok) {
					showToast(
						actionFailureToast(
							wf.active
								? `Сценарий «${wf.name}» не остановлен`
								: `Сценарий «${wf.name}» не включён`,
							res.status,
						),
						"error",
					);
					return;
				}
				setWorkflows((prev) =>
					prev.map((w) => (w.id === wf.id ? { ...w, active: !wf.active } : w)),
				);
			} catch (err) {
				console.error("[сценарии] переключение не дошло до сервера", err);
				showToast(
					actionFailureToast(`Сценарий «${wf.name}» не переключён`, null),
					"error",
				);
			} finally {
				setTogglingId(null);
			}
		},
		[denteClinicalReadHeaders],
	);

	const handleDelete = useCallback(
		async (wf: ClinicWorkflow) => {
			if (!window.confirm(`Удалить сценарий «${wf.name}»?`)) return;
			try {
				const res = await fetch(`/api/clinic/workflows/${wf.id}`, {
					method: "DELETE",
					headers: denteClinicalReadHeaders(),
				});
				if (!res.ok) {
					showToast(
						actionFailureToast(`Сценарий «${wf.name}» не удалён`, res.status),
						"error",
					);
					return;
				}
				setWorkflows((prev) => prev.filter((w) => w.id !== wf.id));
				showToast(`Сценарий «${wf.name}» удалён`, "success");
			} catch (err) {
				console.error("[сценарии] удаление не дошло до сервера", err);
				showToast(
					actionFailureToast(`Сценарий «${wf.name}» не удалён`, null),
					"error",
				);
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
					headers: {
						...denteClinicalReadHeaders(),
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						name: newName.trim(),
						trigger: newTrigger,
						active: false,
					}),
				});
				if (!res.ok) {
					showToast(
						actionFailureToast(
							`Сценарий «${newName.trim()}» не создан`,
							res.status,
						),
						"error",
					);
					return;
				}
				/*
				 * СОЗДАННУЮ СТРОКУ НАДО ПРОВЕРИТЬ, А НЕ ПОВЕРИТЬ.
				 *
				 * БЫЛО: `setWorkflows(prev => [...prev, json.workflow])` без единой
				 * проверки. Успешный ответ без поля `workflow` (или с телом не того
				 * вида) дописывал в список `undefined`, и следующий же рендер падал на
				 * `wf.id` — то есть весь раздел настроек гас сразу после слов «Процесс
				 * создан». Если строку прочитать нельзя, честнее перечитать список с
				 * сервера и сказать, что результат не подтверждён.
				 */
				const raw = await res.text();
				let created: ClinicWorkflow | null = null;
				try {
					created = normalizeClinicWorkflow(
						(JSON.parse(raw) as { workflow?: unknown })?.workflow,
					);
				} catch {
					created = null;
				}
				setNewName("");
				setShowForm(false);
				if (created) {
					setWorkflows((prev) => [...prev, created]);
					showToast(`Сценарий «${created.name}» создан`, "success");
					return;
				}
				console.error("[сценарии] сервер не вернул созданный сценарий");
				showToast(
					"Сценарий создан, но сервер не показал его — перечитываем список.",
					"success",
				);
				await fetchWorkflows();
			} catch (err) {
				console.error("[сценарии] создание не дошло до сервера", err);
				showToast(
					actionFailureToast(`Сценарий «${newName.trim()}» не создан`, null),
					"error",
				);
			} finally {
				setAdding(false);
			}
		},
		[denteClinicalReadHeaders, fetchWorkflows, newName, newTrigger],
	);

	return (
		<div className="profile-studio-container animate-fade-in">
			<div className="import-copy" style={{ marginBottom: "0" }}>
				<GitMerge aria-hidden="true" />
				<div>
					<p className="eyebrow">Бизнес-процессы</p>
					<h2>Автоматические сценарии</h2>
					<p>
						Настраивайте автоматические действия по триггерам: создание
						черновиков, напоминаний, задач для администратора. Все действия
						проходят подтверждение вручную.
					</p>
				</div>
			</div>

			<div
				className="profile-form-grid"
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "24px",
					marginTop: "24px",
				}}
			>
				<section className="profile-section-card">
					<div
						className="profile-section-header"
						style={{
							display: "flex",
							justifyContent: "space-between",
							width: "100%",
							alignItems: "center",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
							<div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
								<GitMerge size={24} />
							</div>
							<div className="profile-section-title">
								<h3 style={{ margin: 0 }}>Активные сценарии</h3>
								<p style={{ margin: 0 }}>
									{workflowsCountLabel(loadState, workflows.length)}
								</p>
							</div>
						</div>
						{/*
							КНОПКИ СОЗДАНИЯ ЗДЕСЬ НЕТ, ПОКА СПИСОК НЕ ПРОЧИТАН.

							Создание уходит на тот же адрес, что и чтение. Если чтение
							отказало, «Создать» откажет тоже — а форма к этому моменту уже
							съела придуманное название и выбранное событие. Пока список
							читается, кнопка тоже недоступна: иначе форма открывается над
							строкой «Загружаем сценарии…».
						*/}
						{loadState.phase === "ready" ? (
							<button
								type="button"
								className="primary-button"
								style={{ display: "flex", alignItems: "center", gap: "8px" }}
								onClick={() => setShowForm((v) => !v)}
							>
								<Plus size={16} /> Создать сценарий
							</button>
						) : null}
					</div>

					{loadState.phase === "failed" ? (
						<PanelLoadFailure
							subject={WORKFLOWS_PANEL_SUBJECT}
							status={loadState.status}
							onRetry={() => void fetchWorkflows()}
						/>
					) : null}

					{showForm && loadState.phase === "ready" && (
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
							<div
								className="profile-form-group"
								style={{ flex: "1 1 180px", margin: 0 }}
							>
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
							<div
								className="profile-form-group"
								style={{ flex: "1 1 200px", margin: 0 }}
							>
								{/* «Триггер» — жаргон. Администратор ищет глазами «после чего». */}
								<label htmlFor="wf-trigger">После какого события</label>
								<select
									id="wf-trigger"
									value={newTrigger}
									onChange={(e) => setNewTrigger(e.target.value)}
								>
									{Object.entries(WORKFLOW_TRIGGER_LABELS).map(
										([key, label]) => (
											<option key={key} value={key}>
												{label}
											</option>
										),
									)}
								</select>
							</div>
							<div style={{ display: "flex", gap: "8px" }}>
								<button
									type="submit"
									className="primary-button"
									disabled={adding}
								>
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
						{/*
							ЗАГРУЗКА И ПУСТОТА — РАЗНЫЕ СТРОКИ, И НИ ОДНА ИЗ НИХ НЕ ПОЯВЛЯЕТСЯ
							ПРИ ОТКАЗЕ.

							БЫЛО одно условие — `workflows.length === 0 && !loading` — и под
							него попадал в том числе непрочитанный список: экран утверждал
							«Нет сценариев» там, где сервер отказал. Текст отказа теперь
							стоит выше, в <PanelLoadFailure>, а здесь остались только два
							честных состояния.
						*/}
						{loadState.phase === "loading" && (
							<div
								role="status"
								aria-live="polite"
								style={{
									textAlign: "center",
									padding: "32px",
									color: "var(--text-secondary)",
									fontSize: "0.875rem",
								}}
							>
								{
									panelStateText(WORKFLOWS_PANEL_SUBJECT, { phase: "loading" })
										.title
								}
							</div>
						)}
						{loadState.phase === "ready" && workflows.length === 0 && (
							<div
								style={{
									textAlign: "center",
									padding: "32px",
									color: "var(--text-secondary)",
									fontSize: "0.875rem",
								}}
							>
								<p style={{ margin: 0, fontWeight: 600, color: "var(--ink)" }}>
									{WORKFLOWS_PANEL_SUBJECT.emptyTitle}
								</p>
								<p style={{ margin: "6px 0 0" }}>
									{WORKFLOWS_PANEL_SUBJECT.emptyHint}
								</p>
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
									<h4
										style={{
											margin: 0,
											color: "var(--ink)",
											fontSize: "0.9rem",
										}}
									>
										{wf.name}
									</h4>
									<span
										style={{ fontSize: "13px", color: "var(--text-secondary)" }}
									>
										Срабатывает: {workflowTriggerLabel(wf.trigger)}
									</span>
								</div>
								<div
									style={{ display: "flex", alignItems: "center", gap: "8px" }}
								>
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
											color: wf.active
												? "rgb(16, 185, 129)"
												: "rgb(100, 116, 139)",
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
