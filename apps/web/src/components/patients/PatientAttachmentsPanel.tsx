/**
 * Вложения карточки пациента (POST/GET /api/patients/:patientId/attachments).
 *
 * БЫЛО: POST уже писал multipart на диск + attachments.patient_id + sha256, а
 * GET download по id работал — но **zero web callers** на patient-level POST.
 * Фото дневника (VisitDiaryPhotoUpload) живёт на /api/files/visits/...;
 * паспорт, направление, скан договора на карточке загрузить было нечем —
 * только CLI/SQL. Списка GET тоже не было: даже после загрузки оператор не
 * видел файлы и не мог скачать.
 *
 * ТЕПЕРЬ: панель на карточке — список + «Прикрепить файл» (любой тип, не только
 * image). GET list (добавлен зеркалом visit list) + POST multipart без
 * Content-Type (boundary выставит браузер). Скачивание через
 * fetchAuthedApiFileObjectUrl — <a href> без токена даёт 401. Заголовки:
 * denteAdminSecretRequestHeaders (clinic+staff токены).
 */

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { operatorReadableErrorDetail } from "../../AppHelpers";
import {
	AUTHED_API_FILE_FAILURE,
	fetchAuthedApiFileObjectUrl,
} from "../../lib/authedApiFile";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	actionFailureToast,
	requestFailureCause,
} from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import { DocumentCameraScannerModal } from "../scanner/DocumentCameraScannerModal";

type AttachmentFile = {
	id: string;
	url: string;
	name: string;
	type: string;
};

function jsonObjectOrNull(raw: string): Record<string, unknown> | null {
	const t = raw.trim();
	if (!t) return null;
	try {
		const p: unknown = JSON.parse(t);
		return typeof p === "object" && p !== null && !Array.isArray(p)
			? (p as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

function parseFilesPayload(raw: string): AttachmentFile[] {
	const json = jsonObjectOrNull(raw);
	const files = json?.files;
	if (!Array.isArray(files)) return [];
	const out: AttachmentFile[] = [];
	for (const row of files) {
		if (typeof row !== "object" || row === null || Array.isArray(row)) continue;
		const r = row as Record<string, unknown>;
		const id = typeof r.id === "string" ? r.id.trim() : "";
		const url = typeof r.url === "string" ? r.url.trim() : "";
		const name = typeof r.name === "string" ? r.name.trim() : "";
		const type = typeof r.type === "string" ? r.type.trim() : "";
		if (!id || !url) continue;
		out.push({
			id,
			url,
			name: name || id,
			type: type || "application/octet-stream",
		});
	}
	return out;
}

export type PatientAttachmentsPanelProps = {
	patientId?: string | null;
	patientName?: string | null;
};

export const PatientAttachmentsPanel: React.FC<
	PatientAttachmentsPanelProps
> = ({ patientId, patientName }) => {
	const [files, setFiles] = useState<AttachmentFile[]>([]);
	const [loading, setLoading] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [downloadingId, setDownloadingId] = useState<string | null>(null);
	const [scannerModalOpen, setScannerModalOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const pid = (patientId ?? "").trim();

	const load = useCallback(async () => {
		const id = (patientId ?? "").trim();
		if (!id) {
			setFiles([]);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(
				`/api/patients/${encodeURIComponent(id)}/attachments`,
				{
					headers: denteAdminSecretRequestHeaders(),
				},
			);
			const raw = await res.text();
			if (!res.ok) {
				logger.error(
					`[patient-attachments] GET ${res.status} ${raw.slice(0, 300)}`,
				);
				const json = jsonObjectOrNull(raw);
				const serverMsg =
					typeof json?.message === "string" ? json.message.trim() : "";
				const detail = operatorReadableErrorDetail(serverMsg || null);
				const msg =
					detail ??
					(res.status === 404
						? "Пациент не найден в этой клинике."
						: actionFailureToast("Список вложений не загружен", res.status));
				setError(msg);
				setFiles([]);
				return;
			}
			setFiles(parseFilesPayload(raw));
		} catch (e) {
			showToast(
				actionFailureToast(
					// biome-ignore lint/suspicious/noTemplateCurlyInString: automated suppression
					"Список вложений не загружен: ${requestFailureCause(null)}.",
					(e as { status?: number })?.status ?? null,
				),
				"error",
			);
			logger.error("[patient-attachments] list failed", e);
			setError(`Список вложений не загружен: ${requestFailureCause(null)}.`);
			setFiles([]);
		} finally {
			setLoading(false);
		}
	}, [patientId]);

	useEffect(() => {
		void load();
	}, [load]);

	const onUpload = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			const id = (patientId ?? "").trim();
			if (!file || !id || uploading) {
				e.target.value = "";
				return;
			}

			setUploading(true);
			setError(null);
			try {
				const formData = new FormData();
				formData.append("file", file, file.name);

				const res = await fetch(
					`/api/patients/${encodeURIComponent(id)}/attachments`,
					{
						method: "POST",
						headers: denteAdminSecretRequestHeaders(),
						body: formData,
					},
				);
				const raw = await res.text();
				const json = jsonObjectOrNull(raw);
				const serverMsg =
					typeof json?.message === "string" ? json.message.trim() : "";
				const detail = operatorReadableErrorDetail(serverMsg || null);

				if (!res.ok) {
					logger.error(
						`[patient-attachments] POST ${res.status} ${raw.slice(0, 300)}`,
					);
					const msg =
						detail ??
						(res.status === 400
							? "Файл не передан. Выберите файл и повторите."
							: res.status === 403
								? "Пациент не найден в этой клинике или нет доступа."
								: actionFailureToast("Файл не загружен", res.status));
					setError(msg);
					showToast(msg, "error", 12000);
					return;
				}

				const fileObj = json?.file;
				if (
					typeof fileObj === "object" &&
					fileObj !== null &&
					!Array.isArray(fileObj)
				) {
					const f = fileObj as Record<string, unknown>;
					const newId = typeof f.id === "string" ? f.id.trim() : "";
					const newUrl = typeof f.url === "string" ? f.url.trim() : "";
					const newName =
						typeof f.name === "string" ? f.name.trim() : file.name;
					const newType =
						typeof f.type === "string"
							? f.type.trim()
							: file.type || "application/octet-stream";
					if (newId && newUrl) {
						setFiles((prev) => {
							if (prev.some((x) => x.id === newId)) return prev;
							return [
								...prev,
								{
									id: newId,
									url: newUrl,
									name: newName || newId,
									type: newType,
								},
							];
						});
					} else {
						await load();
					}
				} else {
					await load();
				}
				showToast(`Файл «${file.name}» загружен в карточку.`, "success", 8000);
			} catch (err) {
				logger.error("[patient-attachments] upload failed", err);
				const msg = `Файл не загружен: ${requestFailureCause(null)}.`;
				setError(msg);
				showToast(msg, "error", 12000);
			} finally {
				setUploading(false);
				e.target.value = "";
			}
		},
		[load, patientId, uploading],
	);

	const onDownload = useCallback(async (att: AttachmentFile) => {
		setDownloadingId(att.id);
		try {
			const objectUrl = await fetchAuthedApiFileObjectUrl(att.url);
			const a = document.createElement("a");
			a.href = objectUrl;
			a.download = att.name || "attachment";
			a.rel = "noopener";
			document.body.appendChild(a);
			a.click();
			a.remove();
			// Не revoke сразу: браузеру нужно время начать скачивание.
			window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
			showToast(`Скачивание: ${att.name}`, "success", 5000);
		} catch (err) {
			logger.error("[patient-attachments] download failed", err);
			const errText =
				err instanceof Error ? err.message : typeof err === "string" ? err : "";
			const msg = errText.includes(AUTHED_API_FILE_FAILURE)
				? "Файл не скачан: нет доступа или файл отсутствует."
				: `Файл не скачан: ${requestFailureCause(null)}.`;
			showToast(msg, "error", 12000);
		} finally {
			setDownloadingId(null);
		}
	}, []);

	if (!pid) return null;

	const nameHint = (patientName ?? "").trim();

	return (
		<section
			className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 md:p-6 text-[var(--ink)] shadow-sm"
			data-testid="patient-attachments-panel"
			aria-label="Вложения карточки пациента"
		>
			<div className="mb-3 flex flex-wrap items-start justify-between gap-2">
				<div>
					<h3 className="text-base font-bold text-[var(--ink)] tracking-wide">
						Файлы и документы карточки
					</h3>
					<p className="text-xs text-[var(--muted)] mt-0.5">
						Паспорт, направление, договор, снимки и прочие документы
						{nameHint ? ` · ${nameHint}` : ""}. Не фото дневника приёма — те
						живут во вкладке визита.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						data-testid="patient-camera-scan-button"
						onClick={() => setScannerModalOpen(true)}
						className="inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-3.5 py-2 text-xs font-bold rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-[var(--ink)] border border-[var(--line-strong)] transition-colors shadow-xs"
					>
						📸 Скан камерой
					</button>
					<label className="cursor-pointer inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-3.5 py-2 text-xs font-bold rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white border border-[var(--teal)] transition-colors shadow-sm disabled:opacity-50">
						{uploading ? "Загружаю…" : "Прикрепить файл"}
						<input
							ref={inputRef}
							type="file"
							className="hidden"
							data-testid="patient-attachments-input"
							disabled={uploading || loading}
							onChange={(ev) => void onUpload(ev)}
						/>
					</label>
				</div>
			</div>

			{error ? (
				<p
					className="mb-3 text-xs font-semibold text-rose-600 dark:text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2"
					data-testid="patient-attachments-error"
					role="alert"
				>
					{error}
				</p>
			) : null}

			{loading && files.length === 0 ? (
				<p
					className="text-xs text-[var(--muted)]"
					data-testid="patient-attachments-loading"
				>
					Загрузка списка…
				</p>
			) : files.length === 0 ? (
				<p
					className="text-xs text-[var(--muted)] bg-[var(--paper-soft)] p-4 rounded-xl border border-[var(--line)]"
					data-testid="patient-attachments-empty"
				>
					Вложений пока нет. Прикрепите скан, снимок или PDF-документ.
				</p>
			) : (
				<ul
					className="flex flex-col gap-2"
					data-testid="patient-attachments-list"
				>
					{(files ?? []).map((att) => (
						<li
							key={att.id}
							className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] px-3.5 py-2.5"
							data-testid={`patient-attachment-row-${att.id}`}
						>
							<div className="min-w-0 flex-1">
								<p className="text-sm font-semibold text-[var(--ink)] truncate" title={att.name}>
									{att.name}
								</p>
								<p className="text-xs text-[var(--muted)] truncate">{att.type}</p>
							</div>
							<button
								type="button"
								data-testid={`patient-attachment-download-${att.id}`}
								disabled={downloadingId === att.id}
								onClick={() => void onDownload(att)}
								className="min-h-[44px] px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[var(--paper)] hover:bg-[var(--teal-surface)] text-[var(--ink)] border border-[var(--line-strong)] disabled:opacity-50 transition-colors"
							>
								{downloadingId === att.id ? "…" : "Скачать"}
							</button>
						</li>
					))}
				</ul>
			)}

			<DocumentCameraScannerModal
				isOpen={scannerModalOpen}
				patientId={pid}
				patientName={patientName ?? undefined}
				onClose={() => setScannerModalOpen(false)}
				onAttachmentUploaded={() => void load()}
			/>
		</section>
	);
};

export default PatientAttachmentsPanel;
