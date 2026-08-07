import { actionFailureToast } from "../lib/panelStateText";
import { Camera, Paperclip, Search } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	AUTHED_API_FILE_FAILURE,
	fetchAuthedApiFileObjectUrl,
} from "../lib/authedApiFile";
import { requestFailureCause } from "../lib/panelStateText";
import { readDenteClinicToken } from "../lib/safeLocalStorage";
import { showToast } from "./GlobalToast";

interface Attachment {
	id: string;
	url: string;
	name: string;
}

/** Снимок, готовый к печати 043/у (blob: уже с токеном кабинета). */
export type DiaryPrintPhoto = {
	id: string;
	name: string;
	objectUrl: string;
};

interface VisitDiaryPhotoUploadProps {
	visitId: string;
	diaryId: string | null;
	isLocked: boolean;
	/**
	 * БЫЛО: снимки жили только внутри галереи на экране приёма.
	 * PrintPreviewContent в VisitDiaryEditor не знал про attachments —
	 * юридическая 043/у печаталась без фотодоказательства лечения.
	 * СТАЛО: отдаём готовые objectUrl вверх, когда blob загружен.
	 */
	onPrintPhotosChange?: (photos: readonly DiaryPrintPhoto[]) => void;
}

/**
 * Список вложений дневника. Ровно одно из четырёх состояний чтения —
 * «пусто» и «не прочитано» не сливаются.
 *
 * БЫЛО: при !r.ok или сети then(null)/catch только console.error, attachments
 * оставался []. UI рисовал «Нажмите Прикрепить фото» / «Нет прикрепленных
 * фото» — как будто снимков нет, хотя они могли быть на сервере. Врач
 * считал, что фото не прикреплялись, и мог прикрепить повторно или не
 * увидеть доказательство лечения в 043/у.
 */
type AttachmentsLoadState =
	| { readonly phase: "loading" }
	| { readonly phase: "empty" }
	| { readonly phase: "ready" }
	| { readonly phase: "failed"; readonly status: number | null };

export function VisitDiaryPhotoUpload({
	visitId,
	diaryId,
	isLocked,
	onPrintPhotosChange,
}: VisitDiaryPhotoUploadProps) {
	const [attachments, setAttachments] = useState<Attachment[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const [loadState, setLoadState] = useState<AttachmentsLoadState>({
		phase: "loading",
	});
	const [_reloadToken, setReloadToken] = useState(0);
	/* Объектные адреса снимков по идентификатору вложения.
	   ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ: адрес сервера подставлялся прямо в <img src>,
	   а такой запрос посылает браузер без единого заголовка — подмена fetch из
	   lib/apiAuthFetch.ts на разметку не действует. Сервер вложений требует
	   токен кабинета (apps/api/src/routes/files.ts:86-118), то есть отвечал
	   401, и врач вместо фотографий лечения видел значки битых картинок. */
	const [photoObjectUrls, setPhotoObjectUrls] = useState<
		Record<string, string>
	>({});
	const [unreadablePhotoIds, setUnreadablePhotoIds] = useState<
		readonly string[]
	>([]);
	/* Ссылка, а не состояние: освобождать объектные адреса нужно при смене приёма
	   и при размонтировании, а не на каждое прикрепление нового фото. Без
	   revokeObjectURL рабочее место держало бы в памяти копию каждого снимка
	   каждого открытого за смену приёма. */
	const createdPhotoObjectUrls = useRef<Map<string, string>>(new Map());

	const reloadAttachments = useCallback(() => {
		setReloadToken((t) => t + 1);
	}, []);

	useEffect(() => {
		/* Сброс идёт до всех проверок и до запроса. Иначе при переходе к
		   другому приёму в списке остаются снимки предыдущего, и они
		   выглядят как снимки текущего. Отмена запроса нужна затем, чтобы
		   поздний ответ по прошлому приёму не перетёр уже загруженный
		   список текущего. */
		setAttachments([]);
		setPhotoObjectUrls({});
		setUnreadablePhotoIds([]);
		setLoadState({ phase: "loading" });
		if (!visitId) {
			setLoadState({ phase: "empty" });
			return;
		}

		const controller = new AbortController();
		let cancelled = false;
		const clinicToken = readDenteClinicToken() || null;

		void (async () => {
			let status: number | null = null;
			try {
				const response = await fetch(
					`/api/files/visits/${visitId}/attachments`,
					{
						headers: {
							...(clinicToken ? { "x-dente-clinic-token": clinicToken } : {}),
						},
						signal: controller.signal,
					},
				);
				status = response.status;
				if (!response.ok) {
					console.error(`[diary attachments] ${status} ${visitId}`);
					if (!cancelled) setLoadState({ phase: "failed", status });
					return;
				}
				const data: unknown = await response.json().catch(() => null);
				if (cancelled) return;
				const files =
					data &&
					typeof data === "object" &&
					!Array.isArray(data) &&
					Array.isArray((data as { files?: unknown }).files)
						? (data as { files: Attachment[] }).files
						: null;
				if (!files) {
					// 200 без files — испорченный ответ, не «снимков нет».
					console.error(`[diary attachments] ${status}: тело без files`);
					setLoadState({ phase: "failed", status });
					return;
				}
				setAttachments(files);
				setLoadState(
					files.length === 0 ? { phase: "empty" } : { phase: "ready" },
				);
			} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
				if (cancelled) return;
				// abort при смене приёма — не failed
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}
				console.error("[diary attachments] запрос не выполнен", error);
				setLoadState({ phase: "failed", status });
			}
		})();

		return () => {
			cancelled = true;
			controller.abort();
			// Снимки прошлого приёма освобождаются здесь: React вызывает уборку
			// прежнего эффекта до тела нового, поэтому и переход к другому приёму,
			// и уход с экрана закрыты одной строкой.
			for (const objectUrl of createdPhotoObjectUrls.current.values()) {
				URL.revokeObjectURL(objectUrl);
			}
			createdPhotoObjectUrls.current = new Map();
		};
	}, [visitId]);

	/* Снимки забираются через fetch по тому же адресу, который отдал сервер в
	   поле url (apps/api/src/routes/files.ts:137,185), и только потом попадают в
	   разметку объектным адресом blob:. Так запрос идёт через подмену
	   window.fetch и получает токен кабинета, а браузеру для показа картинки уже
	   не нужно ни авторизации, ни второго запроса.
	   Освобождение обязательно: без revokeObjectURL каждый переход между приёмами
	   оставлял бы в памяти рабочего места копию каждого снимка. */
	useEffect(() => {
		if (attachments.length === 0) return;

		let cancelled = false;

		void (async () => {
			for (const attachment of attachments) {
				if (cancelled) return;
				// Уже забранные снимки не перезапрашиваются: прикрепление нового
				// фото меняет список, а освобождать адреса показанных снимков
				// на этом шаге значит вернуть врачу битые картинки.
				if (createdPhotoObjectUrls.current.has(attachment.id)) continue;
				try {
					const objectUrl = await fetchAuthedApiFileObjectUrl(attachment.url);
					if (cancelled) {
						URL.revokeObjectURL(objectUrl);
						return;
					}
					createdPhotoObjectUrls.current.set(attachment.id, objectUrl);
					setPhotoObjectUrls((prev) => ({
						...prev,
						[attachment.id]: objectUrl,
					}));
				} catch {
					if (cancelled) return;
					setUnreadablePhotoIds((prev) =>
						prev.includes(attachment.id) ? prev : [...prev, attachment.id],
					);
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [attachments]);

	/*
	 * Отдать снимки в печать 043/у только когда blob: готов.
	 * Иначе <img src=/api/...> в window.print уйдёт без x-dente-clinic-token
	 * и на бумаге будут битые картинки / 401.
	 */
	useEffect(() => {
		if (!onPrintPhotosChange) return;
		const ready: DiaryPrintPhoto[] = [];
		for (const att of attachments) {
			const objectUrl = photoObjectUrls[att.id];
			if (!objectUrl) continue;
			if (unreadablePhotoIds.includes(att.id)) continue;
			ready.push({
				id: att.id,
				name: typeof att.name === "string" && att.name ? att.name : "снимок",
				objectUrl,
			});
		}
		onPrintPhotosChange(ready);
	}, [attachments, photoObjectUrls, unreadablePhotoIds, onPrintPhotosChange]);

	// Сброс списка печати при смене приёма / размонтировании — иначе
	// в 043/у другого визита останутся чужие blob:.
	useEffect(() => {
		return () => {
			onPrintPhotosChange?.([]);
		};
	}, [onPrintPhotosChange]);
	const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		/*
		 * БЫЛО: if (!diaryId) return — молча. Врач выбирал файл, ничего не
		 * происходило (кнопка видна только при diaryId, но race/state мог
		 * обойти). СТАЛО: явный toast.
		 */
		if (!diaryId) {
			showToast(
				"Сначала сохраните черновик дневника — без id записи снимок прикрепить нельзя.",
				"info",
				10000,
			);
			e.target.value = "";
			return;
		}
		if (isLocked) {
			showToast(
				"Дневник уже подписан — новые фото к закрытой 043/у не прикрепляются.",
				"info",
				10000,
			);
			e.target.value = "";
			return;
		}

		setIsUploading(true);
		let localObjectUrl: string | null = null;
		try {
			const img = new Image();
			localObjectUrl = URL.createObjectURL(file);

			try {
				await new Promise<void>((resolve, reject) => {
					img.onload = () => resolve();
					img.onerror = () => reject(new Error("FILE_NOT_IMAGE"));
					img.src = localObjectUrl!;
				});
			} catch {
				showToast(
					"Файл не открылся как изображение. Выберите снимок JPG, PNG или WEBP.",
					"error",
					12000,
				);
				return;
			}

			const canvas = document.createElement("canvas");
			let width = img.width;
			let height = img.height;

			const MAX_SIZE = 1200;
			if (width > height && width > MAX_SIZE) {
				height *= MAX_SIZE / width;
				width = MAX_SIZE;
			} else if (height > MAX_SIZE) {
				width *= MAX_SIZE / height;
				height = MAX_SIZE;
			}

			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				showToast(
					"Не удалось подготовить снимок на этом рабочем месте (нет canvas). Попробуйте другой браузер или ПК.",
					"error",
					12000,
				);
				return;
			}
			ctx.drawImage(img, 0, 0, width, height);

			const compressedBlob = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(resolve, "image/webp", 0.8),
			);

			if (!compressedBlob) {
				/*
				 * БЫЛО: throw new Error("Compression failed") → toast
				 * «Ошибка загрузки: Compression failed» латиницей у кресла.
				 */
				showToast(
					"Не удалось сжать снимок перед отправкой. Выберите другой файл или уменьшите размер.",
					"error",
					12000,
				);
				return;
			}

			const formData = new FormData();
			formData.append("file", compressedBlob, "photo.webp");
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
				/*
				 * БЫЛО: throw new Error("Upload failed") → «Ошибка загрузки:
				 * Upload failed». Серверный message (RU) отбрасывался.
				 */
				console.error(
					`[diary photo upload] ${res.status} ${rawBody.slice(0, 300)}`,
				);
				let serverMessage: string | null = null;
				try {
					const parsed: unknown = rawBody.trim() ? JSON.parse(rawBody) : null;
					if (
						parsed &&
						typeof parsed === "object" &&
						!Array.isArray(parsed) &&
						typeof (parsed as { message?: unknown }).message === "string"
					) {
						const m = (parsed as { message: string }).message.trim();
						// Не показываем машинные коды латиницей (AttachmentNotSaved без message уже закрыт на API).
						if (m && !/^[A-Za-z][A-Za-z0-9_]+$/.test(m)) serverMessage = m;
					}
				} catch {
					/* тело не JSON — ниже status fallback */
				}
				showToast(
					serverMessage ??
						`Снимок не загружен: ${requestFailureCause(res.status)}. Повторите загрузку; файл на экране не пропал из выбора — выберите его снова.`,
					"error",
					14000,
				);
				return;
			}

			let data: { file?: Attachment } | null = null;
			try {
				const parsed: unknown = rawBody.trim() ? JSON.parse(rawBody) : null;
				if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
					data = parsed as { file?: Attachment };
				}
			} catch {
				data = null;
			}
			const uploaded = data?.file;
			if (
				uploaded &&
				typeof uploaded === "object" &&
				typeof uploaded.id === "string" &&
				uploaded.id
			) {
				setAttachments((prev) => [...prev, uploaded]);
				setLoadState({ phase: "ready" });
				showToast("Фото сжато в WebP и загружено", "success");
			} else {
				console.error(
					"[diary photo upload] 2xx без file",
					rawBody.slice(0, 200),
				);
				showToast(
					"Сервер принял снимок, но не вернул карточку вложения. Нажмите «Повторить» в списке снимков — файл мог уже сохраниться.",
					"info",
					14000,
				);
				reloadAttachments();
			}
		} catch (err) {
			// Сеть / выключенный API — без err.message латиницей.
			console.error("[diary photo upload] запрос не выполнен", err);
			showToast(
				`Снимок не загружен: ${requestFailureCause(null)}. Проверьте сеть и повторите.`,
				"error",
				14000,
			);
		} finally {
			if (localObjectUrl) URL.revokeObjectURL(localObjectUrl);
			setIsUploading(false);
			e.target.value = "";
		}
	};

	return (
		<div className="space-y-1.5 lg:col-span-2">
			<div className="text-xs tracking-widest uppercase text-zinc-400 font-semibold flex items-center justify-between">
				<span className="flex items-center gap-1.5">
					<Camera className="w-3 h-3 text-rose-400" /> Вложения (Фотографии)
				</span>
				{!isLocked && diaryId && (
					<label
						htmlFor="visit-diary-photo-upload"
						className="cursor-pointer text-xs flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-lg transition-colors border border-zinc-700"
					>
						<Paperclip className="w-3 h-3" />
						{isUploading ? "Сжатие..." : "Прикрепить фото"}
						<input
							id="visit-diary-photo-upload"
							type="file"
							accept="image/*"
							className="hidden"
							onChange={handlePhotoUpload}
							disabled={isUploading || isLocked}
						/>
					</label>
				)}
			</div>
			{attachments.length > 0 ? (
				<div className="flex gap-3 overflow-x-auto pb-2">
					{attachments.map((att) => {
						const objectUrl = photoObjectUrls[att.id];
						if (!objectUrl) {
							/* Пока снимок не забран — рамка с текстом, а не битая
							   картинка: врач должен видеть разницу между «идёт
							   загрузка» и «сервер отказал». */
							const failed = unreadablePhotoIds.includes(att.id);
							return (
								<div
									key={att.id}
									title={failed ? AUTHED_API_FILE_FAILURE : att.name}
									className="h-20 w-20 shrink-0 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/60 text-[10px] leading-tight text-zinc-500 flex items-center justify-center text-center px-1"
								>
									{failed ? "Снимок не открылся" : "Загрузка…"}
								</div>
							);
						}
						return (
							<div key={att.id} className="relative group shrink-0">
								<img
									src={objectUrl}
									alt={att.name}
									className="h-20 w-20 object-cover rounded-lg border border-zinc-700 shadow-sm"
								/>
								<a
									href={objectUrl}
									target="_blank"
									rel="noreferrer"
									download={att.name}
									className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
								>
									<Search className="w-5 h-5 text-white" />
								</a>
							</div>
						);
					})}
				</div>
			) : loadState.phase === "loading" ? (
				<div className="w-full bg-zinc-900/60 border border-zinc-800 border-dashed rounded-xl p-4 text-sm text-zinc-500 text-center">
					Загрузка снимков…
				</div>
			) : loadState.phase === "failed" ? (
				<div className="w-full bg-zinc-900/60 border border-rose-900/50 border-dashed rounded-xl p-4 text-sm text-zinc-400 text-center space-y-2">
					<p>
						Список снимков не прочитан
						{loadState.status != null
							? ` (${requestFailureCause(loadState.status)})`
							: ""}
						. Не считайте, что снимков нет — они могли остаться на сервере.
					</p>
					<button
						type="button"
						onClick={reloadAttachments}
						className="text-xs px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200"
					>
						Повторить
					</button>
				</div>
			) : (
				<div className="w-full bg-zinc-900/60 border border-zinc-800 border-dashed rounded-xl p-4 text-sm text-zinc-500 text-center">
					{diaryId
						? isLocked
							? "Нет прикрепленных фото."
							: "Нажмите «Прикрепить фото», чтобы добавить снимки лечения."
						: "Сначала сохраните дневник, чтобы прикрепить фото."}
				</div>
			)}
		</div>
	);
}
