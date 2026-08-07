/**
 * Буфер обмена расписания — скопированные приёмы для быстрой вставки.
 *
 * ЗАЧЕМ. Администратор часто переносит приём: пациент перезвонил, врач
 * задержался, кресло занято. «Повторить» открывает форму новой записи на
 * неделю вперёд; буфер держит снимок и вставляет на выбранное время
 * одним действием, с той же охраной пересечений, что и обычное создание.
 *
 * СИСТЕМА НИКОГО НЕ ЗАПИСЫВАЕТ БЕЗ ВРЕМЕНИ. Вставка требует дату и время
 * начала — без них приём не создаётся. Исходная запись в сетке остаётся
 * на месте: буфер копирует, а не вырезает.
 */

import { ChevronDown, ChevronUp } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";

type ClipboardItem = {
	id: string;
	appointmentId: string;
	patientName: string;
	doctorName: string;
	serviceTitle: string;
	durationMinutes: number;
	clipboardStatus: string;
	copiedAt: string;
};

type Props = {
	/** После успешной вставки — обновить дашборд (расписание на экране). */
	onPasted?: (dashboard: unknown) => void;
	/** Внешний сигнал перечитать список (после «В буфер» с карточки). */
	reloadToken?: number;
};

function clipboardWriteHeaders(): Record<string, string> {
	return denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
}

function formatCopiedAt(iso: string): string {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return iso;
	return parsed.toLocaleString("ru-RU", {
		day: "numeric",
		month: "long",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatDuration(minutes: number): string {
	if (!Number.isFinite(minutes) || minutes <= 0) return "";
	if (minutes < 60) return `${minutes} мин`;
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest > 0 ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

/** datetime-local value in local wall clock for the control. */
function defaultPasteLocalValue(): string {
	const d = new Date();
	d.setMinutes(0, 0, 0);
	d.setHours(d.getHours() + 1);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert datetime-local string to ISO with timezone offset. */
function localValueToIso(localValue: string): string | null {
	if (!localValue?.trim()) return null;
	const parsed = new Date(localValue);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed.toISOString();
}

function loadFailureText(status: number, serverMessage: string | null): string {
	if (serverMessage && /[а-яё]/i.test(serverMessage)) return serverMessage;
	if (status === 401 || status === 403) {
		return "Нет прав смотреть буфер расписания: доступ закрыт или истёк вход в программу.";
	}
	if (status === 404) return "Раздел буфера расписания не отвечает.";
	if (status >= 500) return "Сбой на сервере клиники: список буфера не собран.";
	return `Программа не смогла получить буфер расписания (ответ ${status}).`;
}

async function writeFailureText(
	response: Response,
	action: string,
): Promise<string> {
	const body = await response.json().catch((err) => {
		console.error('[Dente]', err);
		showToast(actionFailureToast('Ответ сервера не прочитан', (err as { status?: number })?.status ?? null), 'error');
		return null;
	});
	const serverMessage =
		body && typeof body.message === "string" ? body.message.trim() : "";
	if (serverMessage && /[а-яё]/i.test(serverMessage)) return serverMessage;
	if (response.status === 401 || response.status === 403) {
		return `Не удалось ${action}: нет прав. Введите секрет администратора расписания и повторите.`;
	}
	if (response.status === 404) {
		return `Не удалось ${action}: запись уже убрал кто-то другой. Обновите список.`;
	}
	if (response.status >= 500) {
		return `Не удалось ${action}: сервер клиники ответил отказом. Повторите, а если повторится — сообщите администратору.`;
	}
	return `Не удалось ${action}. Повторите, а если повторится — сообщите администратору.`;
}

export const ScheduleClipboardPanel: React.FC<Props> = ({
	onPasted,
	reloadToken = 0,
}) => {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;

	const [isCollapsed, setIsCollapsed] = useState(false);
	const [items, setItems] = useState<ClipboardItem[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [pasteStartsAt, setPasteStartsAt] = useState(defaultPasteLocalValue);
	const [busyId, setBusyId] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		setLoading(true);
		try {
			let response: Response;
			try {
				response = await fetch("/api/schedule/clipboard-items", {
					headers: auth ? auth.denteClinicalReadHeaders() : {},
				});
			} catch {
				setItems([]);
				setError(
					"Сервер клиники не ответил. Проверьте, что программа клиники запущена и есть сеть.",
				);
				return;
			}
			const payload = (await response.json().catch((err) => {
				console.error('[Dente]', err);
				showToast(actionFailureToast('Ответ с буфером расписания не прочитан', (err as { status?: number })?.status ?? null), 'error');
				return null;
			})) as
				| ClipboardItem[]
				| { message?: string }
				| null;
			if (!response.ok) {
				setItems([]);
				const msg =
					payload &&
					!Array.isArray(payload) &&
					typeof payload.message === "string"
						? payload.message
						: null;
				setError(loadFailureText(response.status, msg));
				return;
			}
			if (!Array.isArray(payload)) {
				setItems([]);
				setError("Сервер ответил, но списка буфера в ответе нет.");
				return;
			}
			setItems(payload);
		} finally {
			setLoading(false);
		}
	}, [auth]);

	useEffect(() => {
		void load();
	}, [load]);

	const clearItem = async (item: ClipboardItem) => {
		if (busyId) return;
		setBusyId(item.id);
		try {
			let response: Response;
			try {
				response = await fetch(`/api/schedule/clipboard-items/${item.id}`, {
					method: "DELETE",
					headers: clipboardWriteHeaders(),
				});
			} catch {
				showToast(
					"Сервер клиники не ответил. Запись в буфере не убрана.",
					"error",
				);
				return;
			}
			if (!response.ok) {
				showToast(
					await writeFailureText(response, "убрать запись из буфера"),
					"error",
				);
				return;
			}
			setItems((prev) => prev.filter((row) => row.id !== item.id));
			showToast(`«${item.patientName}» убран из буфера`, "success");
		} finally {
			setBusyId(null);
		}
	};

	const pasteItem = async (item: ClipboardItem) => {
		const startsAtIso = localValueToIso(pasteStartsAt);
		if (!startsAtIso) {
			showToast("Укажите дату и время начала приёма для вставки.", "error");
			return;
		}
		if (busyId) return;
		setBusyId(item.id);
		try {
			let response: Response;
			try {
				response = await fetch(
					`/api/schedule/clipboard-items/${item.id}/paste`,
					{
						method: "POST",
						headers: clipboardWriteHeaders(),
						body: JSON.stringify({ startsAt: startsAtIso }),
					},
				);
			} catch {
				showToast(
					"Сервер клиники не ответил. Приём из буфера не вставлен.",
					"error",
				);
				return;
			}
			if (!response.ok) {
				showToast(
					await writeFailureText(response, "вставить приём из буфера"),
					"error",
				);
				return;
			}
			const dashboard = await response.json().catch((err) => {
				console.error('[Dente]', err);
				showToast(actionFailureToast('Ответ после вставки приёма не прочитан', (err as { status?: number })?.status ?? null), 'error');
				return null;
			});
			setItems((prev) => prev.filter((row) => row.id !== item.id));
			showToast(
				`Приём «${item.patientName}» вставлен на выбранное время`,
				"success",
			);
			if (dashboard && onPasted) onPasted(dashboard);
		} finally {
			setBusyId(null);
		}
	};

	return (
		<section
			className="panel ops-panel"
			data-testid="schedule-clipboard-panel"
			style={{
				position: "fixed",
				bottom: "24px",
				right: "24px",
				width: "380px",
				maxHeight: isCollapsed ? "60px" : "500px",
				overflowY: isCollapsed ? "hidden" : "auto",
				zIndex: 1000,
				boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
				transition: "max-height 0.3s ease",
				border: "1px solid var(--line-strong)",
				backgroundColor: "var(--surface)",
				borderRadius: "12px",
			}}
		>
			<button
				type="button"
				className="panel-heading"
				style={{
					cursor: "pointer",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					width: "100%",
					background: "transparent",
					border: "none",
					padding: 0,
					textAlign: "inherit",
					font: "inherit",
				}}
				onClick={() => setIsCollapsed(!isCollapsed)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						setIsCollapsed(!isCollapsed);
					}
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<h2 style={{ margin: 0 }}>Буфер расписания</h2>
					{items.length > 0 ? (
						<span className="status-pill status-arrived">{items.length}</span>
					) : null}
				</div>
				{isCollapsed ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
			</button>

			{error ? (
				<div className="ops-notice ops-notice--error" role="alert">
					<p>{error}</p>
					<p>
						Буфер сейчас не виден, но скопированные приёмы могут быть в базе.
						Пока список не открылся, переносите записи кнопкой «Повторить» на
						карточке или создайте приём формой выше.
					</p>
					<button
						className="secondary-button"
						type="button"
						onClick={() => void load()}
						disabled={loading}
					>
						{loading ? "Загружаю…" : "Попробовать снова"}
					</button>
				</div>
			) : null}

			{!error && loading && items.length === 0 ? (
				<div className="ops-skeleton" aria-hidden="true">
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
				</div>
			) : null}

			{!error && !loading && items.length === 0 ? (
				<div className="ops-notice" data-testid="schedule-clipboard-empty">
					<p>
						<strong>Буфер пуст</strong>
					</p>
					<p className="ops-hint">
						На карточке приёма нажмите «В буфер» — снимок появится здесь. Затем
						укажите новое время и нажмите «Вставить». Исходная запись в сетке
						останется на месте.
					</p>
				</div>
			) : null}

			{!error && items.length > 0 ? (
				<>
					<label
						className="ops-field"
						style={{ display: "block", marginBottom: "12px" }}
					>
						<span className="ops-note">Время вставки для выбранной строки</span>
						<input
							type="datetime-local"
							value={pasteStartsAt}
							onChange={(e) => setPasteStartsAt(e.target.value)}
							data-testid="schedule-clipboard-paste-starts-at"
							style={{
								display: "block",
								width: "100%",
								maxWidth: "280px",
								marginTop: "4px",
							}}
						/>
					</label>

					<div className="ops-table-wrap">
						<table className="ops-table">
							<caption className="sr-only">
								Скопированные приёмы для вставки
							</caption>
							<thead>
								<tr>
									<th scope="col">Пациент</th>
									<th scope="col">Врач</th>
									<th scope="col">Повод</th>
									<th scope="col">Длительность</th>
									<th scope="col">Скопировано</th>
									<th scope="col">Действия</th>
								</tr>
							</thead>
							<tbody>
								{items.map((item) => (
									<tr key={item.id} data-testid={`clipboard-item-${item.id}`}>
										<td className="ops-strong" data-label="Пациент">
											{item.patientName}
										</td>
										<td data-label="Врач">{item.doctorName}</td>
										<td data-label="Повод">{item.serviceTitle}</td>
										<td data-label="Длительность">
											{formatDuration(item.durationMinutes)}
										</td>
										<td data-label="Скопировано">
											<span className="ops-note">
												{formatCopiedAt(item.copiedAt)}
											</span>
										</td>
										<td data-label="Действия">
											<div
												style={{
													display: "flex",
													flexWrap: "wrap",
													gap: "6px",
												}}
											>
												<button
													className="primary-button"
													type="button"
													disabled={busyId === item.id}
													onClick={() => void pasteItem(item)}
													aria-label={`Вставить приём: ${item.patientName}`}
												>
													{busyId === item.id ? "…" : "Вставить"}
												</button>
												<button
													className="secondary-button"
													type="button"
													disabled={busyId === item.id}
													onClick={() => void clearItem(item)}
													aria-label={`Убрать из буфера: ${item.patientName}`}
												>
													Убрать
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<p className="ops-hint">
						Вставка создаёт новый приём с тем же пациентом, врачом, креслом и
						поводом. Исходная запись не удаляется. Пересечения по времени
						проверяются так же, как при обычной записи.
					</p>
				</>
			) : null}
		</section>
	);
};

export default ScheduleClipboardPanel;
