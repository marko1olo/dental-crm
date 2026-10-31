import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAuthedApiFileObjectUrl } from "../../../lib/authedApiFile";
import { requestFailureCause } from "../../../lib/panelStateText";
import { readDenteClinicToken } from "../../../lib/safeLocalStorage";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import { compressChairsidePhoto } from "../../photography/chairsidePhotoCompressor";
import { useClipboardPhotoPaste } from "../../photography/useClipboardPhotoPaste";
import type {
	Attachment,
	AttachmentsLoadState,
	DiaryPrintPhoto,
	UseVisitDiaryPhotoUploadOptions,
} from "./photoUploadTypes";
import { savePhotoOfflineDraft } from "./savePhotoOfflineDraft";

export type {
	Attachment,
	AttachmentsLoadState,
	DiaryPrintPhoto,
	UseVisitDiaryPhotoUploadOptions,
};

export function useVisitDiaryPhotoUploadState({
	visitId,
	diaryId,
	isLocked,
	onPrintPhotosChange,
}: UseVisitDiaryPhotoUploadOptions) {
	const [attachments, setAttachments] = useState<Attachment[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
	const [isBeforeAfterOpen, setIsBeforeAfterOpen] = useState(false);
	const [zoomPhoto, setZoomPhoto] = useState<{
		id: string;
		url: string;
		name: string;
	} | null>(null);
	const [loadState, setLoadState] = useState<AttachmentsLoadState>({
		phase: "loading",
	});
	const [selectedPrintIds, setSelectedPrintIds] = useState<Set<string>>(
		new Set(),
	);
	const [photoObjectUrls, setPhotoObjectUrls] = useState<
		Record<string, string>
	>({});
	const [unreadablePhotoIds, setUnreadablePhotoIds] = useState<
		readonly string[]
	>([]);

	const createdPhotoObjectUrls = useRef<Map<string, string>>(new Map());
	const onPrintPhotosChangeRef = useRef(onPrintPhotosChange);
	useEffect(() => {
		onPrintPhotosChangeRef.current = onPrintPhotosChange;
	});

	const fetchAttachments = useCallback(
		async (signal?: AbortSignal) => {
			if (!visitId) {
				setLoadState({ phase: "empty" });
				return;
			}
			setLoadState({ phase: "loading" });
			const cleanVisitId = visitId.startsWith("visit-")
				? visitId.slice(6)
				: visitId;
			const clinicToken = readDenteClinicToken() || null;
			let status: number | null = null;
			try {
				const res = await fetch(
					`/api/files/visits/${cleanVisitId}/attachments`,
					{
						headers: {
							...(clinicToken ? { "x-dente-clinic-token": clinicToken } : {}),
						},
						signal,
					},
				);
				status = res.status;
				if (!res.ok) {
					setLoadState({ phase: "failed", status });
					return;
				}
				const data = (await res.json().catch(() => null)) as {
					files?: Attachment[];
				} | null;
				const files = Array.isArray(data?.files) ? data?.files : null;
				if (!files) {
					setLoadState({ phase: "failed", status });
					return;
				}
				setAttachments(files);
				setSelectedPrintIds(new Set(files.map((f) => f.id)));
				setLoadState(
					files.length === 0 ? { phase: "empty" } : { phase: "ready" },
				);
			} catch (err) {
				if (
					signal?.aborted ||
					(err instanceof DOMException && err.name === "AbortError")
				)
					return;
				setLoadState({ phase: "failed", status });
			}
		},
		[visitId],
	);

	useEffect(() => {
		setAttachments([]);
		setPhotoObjectUrls({});
		setUnreadablePhotoIds([]);
		setSelectedPrintIds(new Set());
		const controller = new AbortController();
		void fetchAttachments(controller.signal);

		return () => {
			controller.abort();
			for (const objectUrl of createdPhotoObjectUrls.current.values()) {
				URL.revokeObjectURL(objectUrl);
			}
			createdPhotoObjectUrls.current = new Map();
			onPrintPhotosChangeRef.current?.([]);
		};
	}, [fetchAttachments]);

	useEffect(() => {
		if (attachments.length === 0) return;
		let cancelled = false;
		void (async () => {
			for (const att of attachments) {
				if (cancelled) return;
				if (createdPhotoObjectUrls.current.has(att.id)) continue;
				try {
					const objectUrl = await fetchAuthedApiFileObjectUrl(att.url);
					if (cancelled) {
						URL.revokeObjectURL(objectUrl);
						return;
					}
					createdPhotoObjectUrls.current.set(att.id, objectUrl);
					setPhotoObjectUrls((prev) => ({ ...prev, [att.id]: objectUrl }));
				} catch {
					if (cancelled) return;
					setUnreadablePhotoIds((prev) =>
						prev.includes(att.id) ? prev : [...prev, att.id],
					);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [attachments]);

	useEffect(() => {
		if (!onPrintPhotosChangeRef.current) return;
		const ready: DiaryPrintPhoto[] = [];
		for (const att of attachments) {
			if (!selectedPrintIds.has(att.id)) continue;
			const objectUrl = photoObjectUrls[att.id];
			if (objectUrl && !unreadablePhotoIds.includes(att.id)) {
				ready.push({ id: att.id, name: att.name || "снимок", objectUrl });
			}
		}
		onPrintPhotosChangeRef.current(ready);
	}, [attachments, photoObjectUrls, unreadablePhotoIds, selectedPrintIds]);

	const uploadBlobAttachment = useCallback(
		async (compressedBlob: Blob, fileName: string) => {
			if (!diaryId || isLocked) {
				showToast(
					isLocked
						? "Дневник уже подписан"
						: "Сначала сохраните черновик дневника",
					"info",
				);
				return;
			}

			setIsUploading(true);
			try {
				const formData = new FormData();
				formData.append("file", compressedBlob, fileName || "photo.webp");
				formData.append("entityType", "diary");
				formData.append("entityId", diaryId);
				const clinicToken = readDenteClinicToken() || null;

				const res = await fetch(`/api/files/visits/${visitId}/attachments`, {
					method: "POST",
					headers: {
						...(clinicToken ? { "x-dente-clinic-token": clinicToken } : {}),
					},
					body: formData,
				});
				const rawBody = await res.text();
				if (!res.ok) {
					logger.error(
						`[diary photo upload] ${res.status} ${rawBody.slice(0, 300)}`,
					);
					void savePhotoOfflineDraft(compressedBlob, diaryId, visitId);
					showToast(
						`Снимок не загружен: ${requestFailureCause(res.status)}. Повторите загрузку.`,
						"error",
						14000,
					);
					return;
				}

				const parsed = rawBody.trim() ? JSON.parse(rawBody) : null;
				const uploaded = parsed?.file as Attachment | undefined;
				if (uploaded?.id) {
					setAttachments((prev) => [...prev, uploaded]);
					setSelectedPrintIds((prev) => new Set(prev).add(uploaded.id));
					setLoadState({ phase: "ready" });
					showToast("Фото сжато в WebP и прикреплено", "success");
				} else {
					showToast(
						"Сервер принял снимок. Нажмите «Повторить» для обновления списка.",
						"info",
						14000,
					);
					void fetchAttachments();
				}
			} catch (err) {
				logger.error("[diary photo upload] network error", err);
				void savePhotoOfflineDraft(compressedBlob, diaryId, visitId);
				showToast(
					`Снимок не загружен: ${requestFailureCause(null)}. Проверьте сеть.`,
					"error",
					14000,
				);
			} finally {
				setIsUploading(false);
			}
		},
		[diaryId, isLocked, visitId, fetchAttachments],
	);

	useClipboardPhotoPaste({
		enabled: !isLocked && Boolean(diaryId),
		onPhotoReceived: uploadBlobAttachment,
	});

	const handlePhotoUpload = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			if (!diaryId || isLocked) {
				showToast(
					isLocked
						? "Дневник уже подписан"
						: "Сначала сохраните черновик дневника",
					"info",
				);
				e.target.value = "";
				return;
			}
			setIsUploading(true);
			try {
				const compressedBlob = await compressChairsidePhoto(file, {
					maxDimension: 1920,
					quality: 0.85,
					targetMime: "image/webp",
				});
				const targetName = `${file.name.replace(/\.[^.]+$/, "")}.webp`;
				await uploadBlobAttachment(compressedBlob, targetName);
			} catch (err) {
				logger.error("[handlePhotoUpload] compression failed", err);
				showToast(
					"Файл не открылся как изображение. Выберите JPG, PNG, HEIC или WEBP.",
					"error",
					10000,
				);
			} finally {
				setIsUploading(false);
				e.target.value = "";
			}
		},
		[diaryId, isLocked, uploadBlobAttachment],
	);

	const handleDeletePhoto = useCallback((id: string) => {
		const objUrl = createdPhotoObjectUrls.current.get(id);
		if (objUrl) {
			URL.revokeObjectURL(objUrl);
			createdPhotoObjectUrls.current.delete(id);
		}
		setAttachments((prev) => prev.filter((a) => a.id !== id));
		setPhotoObjectUrls((prev) => {
			const next = { ...prev };
			delete next[id];
			return next;
		});
		setSelectedPrintIds((prev) => {
			const next = new Set(prev);
			next.delete(id);
			return next;
		});
		setUnreadablePhotoIds((prev) =>
			prev.filter((unreadableId) => unreadableId !== id),
		);
		showToast("Снимок удален из списка дневника", "info");
	}, []);

	const togglePrintSelection = useCallback((id: string) => {
		setSelectedPrintIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const splitterPhotos = useMemo(() => {
		return attachments.map((att) => ({
			id: att.id,
			url: photoObjectUrls[att.id] || att.url,
			name: att.name,
		}));
	}, [attachments, photoObjectUrls]);

	return {
		attachments,
		isUploading,
		isCameraModalOpen,
		setIsCameraModalOpen,
		isBeforeAfterOpen,
		setIsBeforeAfterOpen,
		zoomPhoto,
		setZoomPhoto,
		loadState,
		selectedPrintIds,
		photoObjectUrls,
		unreadablePhotoIds,
		reloadAttachments: () => void fetchAttachments(),
		uploadBlobAttachment,
		handlePhotoUpload,
		handleDeletePhoto,
		togglePrintSelection,
		splitterPhotos,
	};
}
