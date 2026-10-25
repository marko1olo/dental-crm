import { useCallback, useEffect, useState } from "react";
import { operatorReadableErrorDetail } from "../../../AppHelpers";
import { AUTHED_API_FILE_FAILURE, fetchAuthedApiFileObjectUrl } from "../../../lib/authedApiFile";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { actionFailureToast, requestFailureCause } from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import { type AttachmentFile, jsonObjectOrNull, parseFilesPayload } from "./attachmentTypes";

export function usePatientAttachmentsLogic(patientId?: string | null) {
	const [files, setFiles] = useState<AttachmentFile[]>([]);
	const [loading, setLoading] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [downloadingId, setDownloadingId] = useState<string | null>(null);

	const load = useCallback(async () => {
		const id = (patientId ?? "").trim();
		if (!id) { setFiles([]); return; }
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/patients/${encodeURIComponent(id)}/attachments`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			const raw = await res.text();
			if (!res.ok) {
				logger.error(`[patient-attachments] GET ${res.status} ${raw.slice(0, 300)}`);
				const json = jsonObjectOrNull(raw);
				const serverMsg = typeof json?.message === "string" ? json.message.trim() : "";
				const detail = operatorReadableErrorDetail(serverMsg || null);
				const msg = detail ?? (res.status === 404 ? "Пациент не найден в этой клинике." : actionFailureToast("Список вложений не загружен", res.status));
				setError(msg);
				setFiles([]);
				return;
			}
			setFiles(parseFilesPayload(raw));
		} catch (e) {
			logger.error("[patient-attachments] list failed", e);
			setError(`Список вложений не загружен: ${requestFailureCause(null)}.`);
			setFiles([]);
		} finally {
			setLoading(false);
		}
	}, [patientId]);

	useEffect(() => { void load(); }, [load]);

	const onUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		const id = (patientId ?? "").trim();
		if (!file || !id || uploading) { e.target.value = ""; return; }
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
			const serverMsg = typeof json?.message === "string" ? json.message.trim() : "";
			const detail = operatorReadableErrorDetail(serverMsg || null);
			if (!res.ok) {
				const msg = detail ?? (res.status === 400 ? "Файл не передан." : actionFailureToast("Файл не загружен", res.status));
				setError(msg);
				showToast(msg, "error", 12000);
				return;
			}
			const fileObj = json?.file as Record<string, unknown> | undefined;
			if (fileObj && typeof fileObj === "object" && typeof fileObj.id === "string" && typeof fileObj.url === "string") {
				const newId = fileObj.id.trim();
				const newUrl = fileObj.url.trim();
				setFiles((prev) => prev.some((x) => x.id === newId) ? prev : [...prev, { id: newId, url: newUrl, name: String(fileObj.name || file.name), type: String(fileObj.type || file.type) }]);
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
	}, [load, patientId, uploading]);

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
			window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
			showToast(`Скачивание: ${att.name}`, "success", 5000);
		} catch (err) {
			logger.error("[patient-attachments] download failed", err);
			const errText = err instanceof Error ? err.message : String(err || "");
			const msg = errText.includes(AUTHED_API_FILE_FAILURE) ? "Файл не скачан: нет доступа." : `Файл не скачан: ${requestFailureCause(null)}.`;
			showToast(msg, "error", 12000);
		} finally {
			setDownloadingId(null);
		}
	}, []);

	return { files, loading, uploading, error, downloadingId, onUpload, onDownload, reload: load };
}
