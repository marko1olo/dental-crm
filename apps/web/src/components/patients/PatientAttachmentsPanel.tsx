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
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	AUTHED_API_FILE_FAILURE,
	fetchAuthedApiFileObjectUrl,
} from "../../lib/authedApiFile";
import { operatorReadableErrorDetail } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import { actionFailureToast, requestFailureCause } from "../../lib/panelStateText";

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
		out.push({ id, url, name: name || id, type: type || "application/octet-stream" });
	}
	return out;
}

export type PatientAttachmentsPanelProps = {
	patientId?: string | null;
	patientName?: string | null;
};

export const PatientAttachmentsPanel: React.FC<PatientAttachmentsPanelProps> = ({
	patientId,
	patientName,
}) => {
	const [files, setFiles] = useState<AttachmentFile[]>([]);
	const [loading, setLoading] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [downloadingId, setDownloadingId] = useState<string | null>(null);
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
			const res = await fetch(`/api/patients/${encodeURIComponent(id)}/attachments`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			const raw = await res.text();
			if (!res.ok) {
				console.error(`[patient-attachments] GET ${res.status} ${raw.slice(0, 300)}`);
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
			console.error("[patient-attachments] list failed", e);
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

				const res = await fetch(`/api/patients/${encodeURIComponent(id)}/attachments`, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders(),
					body: formData,
				});
				const raw = await res.text();
				const json = jsonObjectOrNull(raw);
				const serverMsg =
					typeof json?.message === "string" ? json.message.trim() : "";
				const detail = operatorReadableErrorDetail(serverMsg || null);

				if (!res.ok) {
					console.error(`[patient-attachments] POST ${res.status} ${raw.slice(0, 300)}`);
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
				if (typeof fileObj === "object" && fileObj !== null && !Array.isArray(fileObj)) {
					const f = fileObj as Record<string, unknown>;
					const newId = typeof f.id === "string" ? f.id.trim() : "";
					const newUrl = typeof f.url === "string" ? f.url.trim() : "";
					const newName = typeof f.name === "string" ? f.name.trim() : file.name;
					const newType =
						typeof f.type === "string" ? f.type.trim() : file.type || "application/octet-stream";
					if (newId && newUrl) {
						setFiles((prev) => {
							if (prev.some((x) => x.id === newId)) return prev;
							return [
								...prev,
								{ id: newId, url: newUrl, name: newName || newId, type: newType },
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
				console.error("[patient-attachments] upload failed", err);
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
			console.error("[patient-attachments] download failed", err);
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
			className="rounded-2xl border border-sky-500/25 bg-zinc-950/80 p-4 shadow-[0_0_40px_-18px_rgba(56,189,248,0.28)]"
			data-testid="patient-attachments-panel"
			aria-label="Вложения карточки пациента"
		>
			<div className="mb-3 flex flex-wrap items-start justify-between gap-2">
				<div>
					<h3 className="text-sm font-bold text-sky-200 tracking-wide">
						Файлы карточки
					</h3>
					<p className="text-xs text-zinc-500 mt-0.5">
						Паспорт, направление, договор и прочие документы
						{nameHint ? ` · ${nameHint}` : ""}. Не фото дневника приёма —
						те живут во вкладке визита.
					</p>
				</div>
				<label className="cursor-pointer inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-3 py-2 text-sm font-medium rounded-xl bg-sky-600/90 hover:bg-sky-500 text-white border border-sky-400/40 disabled:opacity-50">
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

			{error ? (
				<p
					className="mb-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2"
					data-testid="patient-attachments-error"
					role="alert"
				>
					{error}
				</p>
			) : null}

			{loading && files.length === 0 ? (
				<p className="text-xs text-zinc-500" data-testid="patient-attachments-loading">
					Загрузка списка…
				</p>
			) : files.length === 0 ? (
				<p className="text-xs text-zinc-500" data-testid="patient-attachments-empty">
					Вложений пока нет. Прикрепите скан или PDF.
				</p>
			) : (
				<ul
					className="flex flex-col gap-2"
					data-testid="patient-attachments-list"
				>
					{files.map((att) => (
						<li
							key={att.id}
							className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2"
							data-testid={`patient-attachment-row-${att.id}`}
						>
							<div className="min-w-0 flex-1">
								<p className="text-sm text-zinc-100 truncate" title={att.name}>
									{att.name}
								</p>
								<p className="text-[11px] text-zinc-500 truncate">{att.type}</p>
							</div>
							<button
								type="button"
								data-testid={`patient-attachment-download-${att.id}`}
								disabled={downloadingId === att.id}
								onClick={() => void onDownload(att)}
								className="min-h-[44px] min-w-[44px] px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sky-200 border border-zinc-700 disabled:opacity-50"
							>
								{downloadingId === att.id ? "…" : "Скачать"}
							</button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
};

export default PatientAttachmentsPanel;
