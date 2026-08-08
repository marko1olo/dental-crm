import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
/**
 * Фрагменты диктовки текущего приёма — GET /api/speech/chunks.
 *
 * ЗАЧЕМ. Сервер уже отдаёт по recordingId полный список фрагментов
 * (transcript, status, quality, warnings) через handleSpeechChunks, но веб
 * его ни разу не вызывал. Экран приёма показывал только KPI «Восстановление:
 * чисто / проверить» из GET /api/speech/recordings/recovery — без пофрагментного
 * разбора. Когда recoveryState = missing_chunks / failed_chunks / quality_review,
 * врач не видел, КАКОЙ именно фрагмент пустой, упал или требует правки, и не
 * мог точечно собрать запись обратно в поле диктовки.
 *
 * СИСТЕМА НЕ ПРАВИТ КАРТУ САМА. Здесь список, превью текста фрагмента и кнопка
 * «Собрать в диктовку» (существующий assemble). Правку ЭМК делает врач.
 */

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { speechRecoveryStateLabels } from "../../workspaceUiLabels";

type SpeechChunkQuality = {
	level?: string;
	nextAction?: string;
	wordCount?: number;
	charCount?: number;
	providerWarnings?: string[];
	signals?: string[];
};

export type SpeechTranscriptionChunkRow = {
	id: string;
	recordingId: string;
	chunkIndex: number;
	source?: string;
	patientId?: string | null;
	visitId?: string | null;
	providerLabel?: string;
	transcript: string;
	confidence?: number | null;
	status: string;
	quality?: SpeechChunkQuality;
	warnings?: string[];
	createdAt?: string;
	durationMs?: number | null;
	byteLength?: number;
};

type RecoveryRecording = {
	recordingId: string;
	chunkCount: number;
	receivedChunkIndexes?: number[];
	missingChunkIndexes?: number[];
	recoveryState: string;
	nextAction?: string;
	transcriptPreview?: string;
	transcriptCharCount?: number;
	qualityCounts?: {
		clear?: number;
		review?: number;
		empty?: number;
		failed?: number;
	};
	statusCounts?: Record<string, number>;
	providerLabels?: string[];
	warnings?: string[];
	lastChunkAt?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
	transcribed: "распознан",
	fallback_text: "текст-запас",
	needs_provider_key: "нет ключа",
	failed: "ошибка",
};

const QUALITY_LABELS: Record<string, string> = {
	clear: "чисто",
	review: "проверка",
	empty: "пусто",
	failed: "сбой",
};

function loadFailureText(status: number, serverMessage: string | null): string {
	if (serverMessage && /[а-яё]/i.test(serverMessage)) return serverMessage;
	if (status === 401 || status === 403) {
		return "Нет прав смотреть фрагменты диктовки: доступ закрыт или истёк вход.";
	}
	if (status === 400) {
		return "Не хватает пациента или приёма для просмотра фрагментов диктовки.";
	}
	if (status === 404) {
		return "Пациент или приём для диктовки не найдены в этой клинике.";
	}
	if (status === 409) {
		return "Диктовка относится к другому пациенту — фрагменты не показаны.";
	}
	if (status >= 500) {
		return "Сбой на сервере клиники: список фрагментов диктовки не собран.";
	}
	return `Программа не смогла получить фрагменты диктовки (ответ ${status}).`;
}

function formatWhen(value: string | null | undefined): string {
	if (!value) return "—";
	try {
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return value;
		return d.toLocaleString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return value;
	}
}

function shortRecordingId(id: string): string {
	if (!id) return "—";
	if (id.length <= 18) return id;
	return `${id.slice(0, 8)}…${id.slice(-6)}`;
}

function previewText(text: string, max = 160): string {
	const t = (text || "").replace(/\s+/g, " ").trim();
	if (!t) return "— пусто —";
	if (t.length <= max) return t;
	return `${t.slice(0, max)}…`;
}

export const SpeechChunksInspector: React.FC = () => {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const dashboard = appLogic?.dashboard as
		| { activeVisit?: { id?: string; patientId?: string } | null }
		| null
		| undefined;
	const speechRecordingRecovery = appLogic?.speechRecordingRecovery as
		| {
				recordings?: RecoveryRecording[];
				totalRecordings?: number;
				generatedAt?: string;
		  }
		| null
		| undefined;
	const loadSpeechRecordingRecovery =
		typeof appLogic?.loadSpeechRecordingRecovery === "function"
			? appLogic.loadSpeechRecordingRecovery
			: null;
	const assembleSpeechRecording =
		typeof appLogic?.assembleSpeechRecording === "function"
			? appLogic.assembleSpeechRecording
			: null;

	const visitId = dashboard?.activeVisit?.id?.trim() || "";
	const patientId = dashboard?.activeVisit?.patientId?.trim() || "";
	const hasScope = Boolean(visitId && patientId);

	const recordings = useMemo(() => {
		const list = speechRecordingRecovery?.recordings;
		return Array.isArray(list) ? list : [];
	}, [speechRecordingRecovery]);

	const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(
		null,
	);
	const [chunks, setChunks] = useState<SpeechTranscriptionChunkRow[]>([]);
	const [chunksError, setChunksError] = useState<string | null>(null);
	const [chunksLoading, setChunksLoading] = useState(false);
	const [recoveryBusy, setRecoveryBusy] = useState(false);
	const [assembleBusyId, setAssembleBusyId] = useState<string | null>(null);
	const [assembleNote, setAssembleNote] = useState<string | null>(null);
	const [expanded, setExpanded] = useState(false);

	// Auto-select first incomplete recording, else first, when list changes.
	useEffect(() => {
		if (!recordings.length) {
			setSelectedRecordingId(null);
			return;
		}
		if (
			selectedRecordingId &&
			recordings.some((r) => r.recordingId === selectedRecordingId)
		) {
			return;
		}
		const incomplete = recordings.find(
			(r) => r.recoveryState && r.recoveryState !== "complete",
		);
		const pick = incomplete ?? recordings[0];
		if (!pick) {
			setSelectedRecordingId(null);
			return;
		}
		setSelectedRecordingId(pick.recordingId);
	}, [recordings, selectedRecordingId]);

	const loadChunks = useCallback(
		async (recordingId: string) => {
			if (!recordingId || !hasScope) {
				setChunks([]);
				return;
			}
			setChunksLoading(true);
			setChunksError(null);
			try {
				const params = new URLSearchParams({
					recordingId,
					visitId,
					patientId,
				});
				let response: Response;
				try {
					response = await fetch(`/api/speech/chunks?${params.toString()}`, {
						cache: "no-store",
						headers:
							auth && typeof auth.denteClinicalReadHeaders === "function"
								? auth.denteClinicalReadHeaders()
								: {},
					});
				} catch {
					setChunks([]);
					setChunksError(
						"Сервер клиники не ответил. Проверьте, что программа клиники запущена и есть сеть.",
					);
					return;
				}
				const payload = (await response.json()) as
					| SpeechTranscriptionChunkRow[]
					| { message?: string; error?: string }
					| null;
				if (!response.ok) {
					setChunks([]);
					const msg =
						payload && !Array.isArray(payload)
							? (payload.message ?? null)
							: null;
					setChunksError(loadFailureText(response.status, msg));
					return;
				}
				if (!Array.isArray(payload)) {
					setChunks([]);
					setChunksError("Сервер ответил, но списка фрагментов в ответе нет.");
					return;
				}
				const normalized: SpeechTranscriptionChunkRow[] = payload
					.map((row): SpeechTranscriptionChunkRow => {
						const out: SpeechTranscriptionChunkRow = {
							id: String(row.id ?? `${row.recordingId}-${row.chunkIndex}`),
							recordingId: String(row.recordingId ?? recordingId),
							chunkIndex: Number(row.chunkIndex) || 0,
							transcript:
								typeof row.transcript === "string" ? row.transcript : "",
							status: String(row.status ?? "unknown"),
							patientId: row.patientId ?? null,
							visitId: row.visitId ?? null,
							confidence:
								typeof row.confidence === "number" ? row.confidence : null,
							durationMs:
								typeof row.durationMs === "number" ? row.durationMs : null,
							warnings: Array.isArray(row.warnings)
								? row.warnings.map(String)
								: [],
						};
						if (typeof row.source === "string") out.source = row.source;
						if (typeof row.providerLabel === "string") {
							out.providerLabel = row.providerLabel;
						}
						if (row.quality && typeof row.quality === "object") {
							out.quality = row.quality;
						}
						if (typeof row.createdAt === "string")
							out.createdAt = row.createdAt;
						if (typeof row.byteLength === "number") {
							out.byteLength = row.byteLength;
						}
						return out;
					})
					.sort((a, b) => a.chunkIndex - b.chunkIndex);
				setChunks(normalized);
			} catch (err) {
				setChunks([]);
				showToast(
					actionFailureToast(
						"Загрузка результатов диктовки",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				setChunksError("Сервер клиники не ответил. Проверьте, что программа клиники запущена и есть сеть.");
			} finally {
				setChunksLoading(false);
			}
		},
		[auth, hasScope, patientId, visitId],
	);

	useEffect(() => {
		if (!expanded || !selectedRecordingId || !hasScope) return;
		void loadChunks(selectedRecordingId);
	}, [expanded, selectedRecordingId, hasScope, loadChunks]);

	const refreshRecovery = useCallback(async () => {
		if (!loadSpeechRecordingRecovery) {
			setChunksError(
				"Обновление списка записей диктовки недоступно на этом экране.",
			);
			return;
		}
		setRecoveryBusy(true);
		setAssembleNote(null);
		try {
			await loadSpeechRecordingRecovery({ silent: false });
		} catch {
			// loadSpeechRecordingRecovery already surfaces errors via setError
		} finally {
			setRecoveryBusy(false);
		}
	}, [loadSpeechRecordingRecovery]);

	const onAssemble = useCallback(
		async (recordingId: string) => {
			if (!assembleSpeechRecording) {
				setAssembleNote(
					"Сборка диктовки недоступна на этом экране — обновите страницу приёма.",
				);
				return;
			}
			setAssembleBusyId(recordingId);
			setAssembleNote(null);
			try {
				await assembleSpeechRecording(recordingId, { silent: false });
				setAssembleNote(
					"Фрагменты собраны в поле диктовки. Проверьте текст перед сохранением в карту.",
				);
				if (selectedRecordingId === recordingId) {
					void loadChunks(recordingId);
				}
				if (loadSpeechRecordingRecovery) {
					void loadSpeechRecordingRecovery({ silent: true });
				}
			} catch (err) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				const msg =
					err instanceof Error && err.message.trim()
						? err.message
						: "Запись распознавания не собрана.";
				setAssembleNote(msg);
			} finally {
				setAssembleBusyId(null);
			}
		},
		[
			assembleSpeechRecording,
			loadChunks,
			loadSpeechRecordingRecovery,
			selectedRecordingId,
		],
	);

	if (!hasScope) {
		return null;
	}

	const issueCount = recordings.filter(
		(r) => r.recoveryState && r.recoveryState !== "complete",
	).length;
	const selected =
		recordings.find((r) => r.recordingId === selectedRecordingId) ?? null;
	const summaryLabel = !speechRecordingRecovery
		? "список ещё не загружен"
		: recordings.length === 0
			? "записей диктовки нет"
			: issueCount
				? `${issueCount} запис. требуют внимания · ${recordings.length} всего`
				: `${recordings.length} запис. · потерь не видно`;

	return (
		<section
			className="speech-chunks-inspector"
			data-testid="speech-chunks-inspector"
			aria-label="Фрагменты диктовки приёма"
			style={{
				margin: "0.75rem 0 1rem",
				padding: "0.75rem 1rem",
				background: "var(--paper-soft, #f7f4ef)",
				border: "1px solid var(--line, #e2d9cc)",
				borderRadius: "10px",
			}}
		>
			<details
				open={expanded}
				onToggle={(e) => setExpanded((e.target as HTMLDetailsElement).open)}
			>
				<summary
					style={{
						cursor: "pointer",
						userSelect: "none",
						display: "flex",
						flexWrap: "wrap",
						alignItems: "center",
						gap: "8px",
						fontWeight: 600,
					}}
					data-testid="speech-chunks-inspector-summary"
				>
					<span>Фрагменты диктовки</span>
					<span
						style={{
							fontWeight: 500,
							fontSize: "0.85rem",
							color: issueCount
								? "var(--rust, #a14a2a)"
								: "var(--muted, #6b6560)",
						}}
					>
						{summaryLabel}
					</span>
				</summary>

				<div style={{ marginTop: "0.75rem" }}>
					<p
						style={{
							margin: "0 0 0.75rem",
							fontSize: "0.85rem",
							color: "var(--muted, #6b6560)",
							lineHeight: 1.35,
						}}
					>
						Покажите, какие куски голоса уже лежат на сервере: пустые, с ошибкой
						или на проверке. Сборка переносит текст в поле диктовки — в карту
						приёма он попадёт только после вашего сохранения.
					</p>

					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: "8px",
							marginBottom: "0.75rem",
							alignItems: "center",
						}}
					>
						<button
							type="button"
							className="secondary-button"
							data-testid="speech-chunks-refresh-recovery"
							disabled={recoveryBusy || !loadSpeechRecordingRecovery}
							onClick={() => void refreshRecovery()}
						>
							{recoveryBusy ? "Обновляю…" : "Обновить список записей"}
						</button>
						{selectedRecordingId ? (
							<button
								type="button"
								className="secondary-button"
								data-testid="speech-chunks-reload"
								disabled={chunksLoading}
								onClick={() => void loadChunks(selectedRecordingId)}
							>
								{chunksLoading ? "Читаю фрагменты…" : "Перечитать фрагменты"}
							</button>
						) : null}
						{selectedRecordingId ? (
							<button
								type="button"
								className="primary-button"
								data-testid="speech-chunks-assemble"
								disabled={Boolean(assembleBusyId) || !assembleSpeechRecording}
								onClick={() => void onAssemble(selectedRecordingId)}
								title="Собрать расшифровку выбранной записи в поле диктовки"
							>
								{assembleBusyId === selectedRecordingId
									? "Собираю…"
									: "Собрать в диктовку"}
							</button>
						) : null}
					</div>

					{assembleNote ? (
						<p
							role="status"
							aria-live="polite"
							data-testid="speech-chunks-assemble-note"
							style={{
								margin: "0 0 0.75rem",
								fontSize: "0.9rem",
								color: "var(--ink, #1c1917)",
							}}
						>
							{assembleNote}
						</p>
					) : null}

					{!speechRecordingRecovery ? (
						<p
							data-testid="speech-chunks-recovery-empty"
							style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}
						>
							Список записей ещё не загружен. Нажмите «Обновить список записей».
						</p>
					) : recordings.length === 0 ? (
						<p
							data-testid="speech-chunks-no-recordings"
							style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}
						>
							На этом приёме серверных записей диктовки пока нет. После
							голосовой записи фрагменты появятся здесь.
						</p>
					) : (
						<>
							<ul
								data-testid="speech-chunks-recordings"
								style={{
									listStyle: "none",
									margin: "0 0 0.75rem",
									padding: 0,
									display: "flex",
									flexDirection: "column",
									gap: "6px",
								}}
							>
								{recordings.map((rec) => {
									const active = rec.recordingId === selectedRecordingId;
									const stateLabel =
										speechRecoveryStateLabels[rec.recoveryState] ??
										rec.recoveryState;
									const warn =
										rec.recoveryState && rec.recoveryState !== "complete";
									return (
										<li key={rec.recordingId}>
											<button
												type="button"
												data-testid={`speech-chunks-recording-${rec.recordingId}`}
												onClick={() => {
													setSelectedRecordingId(rec.recordingId);
													setAssembleNote(null);
												}}
												style={{
													width: "100%",
													textAlign: "left",
													padding: "8px 10px",
													borderRadius: "8px",
													border: active
														? "1px solid var(--teal, #0f766e)"
														: "1px solid var(--line, #e2d9cc)",
													background: active
														? "var(--paper, #fff)"
														: "transparent",
													cursor: "pointer",
												}}
											>
												<strong style={{ fontSize: "0.9rem" }}>
													{shortRecordingId(rec.recordingId)}
												</strong>
												<span
													style={{
														marginLeft: "8px",
														fontSize: "0.8rem",
														color: warn
															? "var(--rust, #a14a2a)"
															: "var(--muted)",
													}}
												>
													{stateLabel} · {rec.chunkCount} фрагм.
													{rec.missingChunkIndexes?.length
														? ` · пропуски: ${rec.missingChunkIndexes.join(", ")}`
														: ""}
												</span>
												{rec.transcriptPreview ? (
													<div
														style={{
															marginTop: "4px",
															fontSize: "0.8rem",
															color: "var(--muted)",
															lineHeight: 1.3,
														}}
													>
														{previewText(rec.transcriptPreview, 120)}
													</div>
												) : null}
												{rec.nextAction ? (
													<div
														style={{
															marginTop: "2px",
															fontSize: "0.78rem",
															color: "var(--ink)",
														}}
													>
														{rec.nextAction}
													</div>
												) : null}
											</button>
										</li>
									);
								})}
							</ul>

							{selected ? (
								<div
									data-testid="speech-chunks-selected-meta"
									style={{
										marginBottom: "0.5rem",
										fontSize: "0.82rem",
										color: "var(--muted)",
									}}
								>
									Запись {shortRecordingId(selected.recordingId)}
									{selected.lastChunkAt
										? ` · последний фрагмент ${formatWhen(selected.lastChunkAt)}`
										: ""}
									{selected.providerLabels?.length
										? ` · ${selected.providerLabels.join(", ")}`
										: ""}
								</div>
							) : null}

							{chunksError ? (
								<p
									role="alert"
									data-testid="speech-chunks-error"
									style={{
										margin: "0 0 0.5rem",
										color: "var(--bad-fg, #b91c1c)",
										fontSize: "0.9rem",
									}}
								>
									{chunksError}
								</p>
							) : null}

							{chunksLoading && !chunks.length ? (
								<p
									data-testid="speech-chunks-loading"
									style={{
										margin: 0,
										fontSize: "0.9rem",
										color: "var(--muted)",
									}}
								>
									Читаю фрагменты с сервера…
								</p>
							) : null}

							{!chunksLoading &&
							!chunksError &&
							selectedRecordingId &&
							chunks.length === 0 ? (
								<p
									data-testid="speech-chunks-empty"
									style={{
										margin: 0,
										fontSize: "0.9rem",
										color: "var(--muted)",
									}}
								>
									У этой записи на сервере нет фрагментов (или они вне текущего
									приёма).
								</p>
							) : null}

							{chunks.length > 0 ? (
								<div
									data-testid="speech-chunks-list"
									style={{ overflowX: "auto" }}
								>
									<table
										style={{
											width: "100%",
											borderCollapse: "collapse",
											fontSize: "0.85rem",
										}}
									>
										<thead>
											<tr style={{ textAlign: "left", color: "var(--muted)" }}>
												<th
													style={{
														padding: "6px 8px",
														borderBottom: "1px solid var(--line)",
													}}
												>
													№
												</th>
												<th
													style={{
														padding: "6px 8px",
														borderBottom: "1px solid var(--line)",
													}}
												>
													Статус
												</th>
												<th
													style={{
														padding: "6px 8px",
														borderBottom: "1px solid var(--line)",
													}}
												>
													Качество
												</th>
												<th
													style={{
														padding: "6px 8px",
														borderBottom: "1px solid var(--line)",
													}}
												>
													Текст
												</th>
												<th
													style={{
														padding: "6px 8px",
														borderBottom: "1px solid var(--line)",
													}}
												>
													Когда
												</th>
											</tr>
										</thead>
										<tbody>
											{chunks.map((chunk) => {
												const qLevel = chunk.quality?.level ?? "";
												const bad =
													chunk.status === "failed" ||
													qLevel === "failed" ||
													qLevel === "empty";
												const review = qLevel === "review";
												return (
													<tr
														key={chunk.id}
														data-testid={`speech-chunk-row-${chunk.chunkIndex}`}
														style={{
															background: bad
																? "rgba(185, 28, 28, 0.06)"
																: review
																	? "rgba(161, 74, 42, 0.06)"
																	: undefined,
														}}
													>
														<td
															style={{
																padding: "6px 8px",
																verticalAlign: "top",
															}}
														>
															{chunk.chunkIndex + 1}
														</td>
														<td
															style={{
																padding: "6px 8px",
																verticalAlign: "top",
															}}
														>
															{STATUS_LABELS[chunk.status] ?? chunk.status}
															{chunk.providerLabel ? (
																<div
																	style={{
																		fontSize: "0.75rem",
																		color: "var(--muted)",
																	}}
																>
																	{chunk.providerLabel}
																</div>
															) : null}
														</td>
														<td
															style={{
																padding: "6px 8px",
																verticalAlign: "top",
															}}
														>
															{QUALITY_LABELS[qLevel] ?? (qLevel || "—")}
															{chunk.quality?.nextAction ? (
																<div
																	style={{
																		fontSize: "0.75rem",
																		color: "var(--ink)",
																	}}
																>
																	{chunk.quality.nextAction}
																</div>
															) : null}
														</td>
														<td
															style={{
																padding: "6px 8px",
																verticalAlign: "top",
																maxWidth: "28rem",
																lineHeight: 1.35,
															}}
														>
															{previewText(chunk.transcript, 200)}
															{chunk.warnings?.length ? (
																<div
																	style={{
																		marginTop: "4px",
																		fontSize: "0.75rem",
																		color: "var(--rust, #a14a2a)",
																	}}
																>
																	{chunk.warnings.join(" · ")}
																</div>
															) : null}
														</td>
														<td
															style={{
																padding: "6px 8px",
																verticalAlign: "top",
																whiteSpace: "nowrap",
															}}
														>
															{formatWhen(chunk.createdAt)}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							) : null}
						</>
					)}
				</div>
			</details>
		</section>
	);
};

export default SpeechChunksInspector;
