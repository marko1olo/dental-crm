import { Camera, Paperclip, Search } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { AUTHED_API_FILE_FAILURE, fetchAuthedApiFileObjectUrl } from "../lib/authedApiFile";
import { showToast } from "./GlobalToast";
import { readDenteClinicToken } from "../lib/safeLocalStorage";

interface Attachment {
	id: string;
	url: string;
	name: string;
}

interface VisitDiaryPhotoUploadProps {
	visitId: string;
	diaryId: string | null;
	isLocked: boolean;
}

export function VisitDiaryPhotoUpload({
	visitId,
	diaryId,
	isLocked,
}: VisitDiaryPhotoUploadProps) {
	const [attachments, setAttachments] = useState<Attachment[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	/* Объектные адреса снимков по идентификатору вложения.
	   ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ: адрес сервера подставлялся прямо в <img src>,
	   а такой запрос посылает браузер без единого заголовка — подмена fetch из
	   lib/apiAuthFetch.ts на разметку не действует. Сервер вложений требует
	   токен кабинета (apps/api/src/routes/files.ts:86-118), то есть отвечал
	   401, и врач вместо фотографий лечения видел значки битых картинок. */
	const [photoObjectUrls, setPhotoObjectUrls] = useState<Record<string, string>>({});
	const [unreadablePhotoIds, setUnreadablePhotoIds] = useState<readonly string[]>([]);
	/* Ссылка, а не состояние: освобождать объектные адреса нужно при смене приёма
	   и при размонтировании, а не на каждое прикрепление нового фото. Без
	   revokeObjectURL рабочее место держало бы в памяти копию каждого снимка
	   каждого открытого за смену приёма. */
	const createdPhotoObjectUrls = useRef<Map<string, string>>(new Map());
	useEffect(() => {
		/* Сброс идёт до всех проверок и до запроса. Иначе при переходе к
		   другому приёму в списке остаются снимки предыдущего, и они
		   выглядят как снимки текущего. Отмена запроса нужна затем, чтобы
		   поздний ответ по прошлому приёму не перетёр уже загруженный
		   список текущего. */
		setAttachments([]);
		setPhotoObjectUrls({});
		setUnreadablePhotoIds([]);
		if (!visitId) return;

		const controller = new AbortController();
		let cancelled = false;
		const clinicToken = readDenteClinicToken() || null;
		fetch(`/api/files/visits/${visitId}/attachments`, {
			headers: {
				"x-dente-clinic-token": clinicToken || "",
			},
			signal: controller.signal,
		})
			.then((r) => {
				if (r.ok) return r.json();
				return null;
			})
			.then((data) => {
				if (cancelled) return;
				if (data?.files) {
					setAttachments(data.files);
				}
			})
			.catch((error) => {
				if (cancelled) return;
				console.error(error);
			});

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
					setPhotoObjectUrls((prev) => ({ ...prev, [attachment.id]: objectUrl }));
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

	const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !diaryId) return;

		setIsUploading(true);
		try {
			const img = new Image();
			const objectUrl = URL.createObjectURL(file);

			await new Promise((resolve, reject) => {
				img.onload = resolve;
				img.onerror = reject;
				img.src = objectUrl;
			});

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
			ctx?.drawImage(img, 0, 0, width, height);

			const compressedBlob = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(resolve, "image/webp", 0.8),
			);
			URL.revokeObjectURL(objectUrl);

			if (!compressedBlob) throw new Error("Compression failed");

			const formData = new FormData();
			formData.append("file", compressedBlob, "photo.webp");
			formData.append("entityType", "diary");
			formData.append("entityId", diaryId);

			const clinicToken = readDenteClinicToken() || null;

			const res = await fetch(`/api/files/visits/${visitId}/attachments`, {
				method: "POST",
				headers: {
					"x-dente-clinic-token": clinicToken || "",
				},
				body: formData,
			});
			if (!res.ok) throw new Error("Upload failed");

			const data = await res.json();
			if (data.file) {
				setAttachments((prev) => [...prev, data.file]);
				showToast("Фото сжато в WebP и загружено", "success");
			}
		} catch (err: any) {
			showToast(`Ошибка загрузки: ${err.message}`, "error");
		} finally {
			setIsUploading(false);
			e.target.value = "";
		}
	};

	return (
		<div className="space-y-1.5 lg:col-span-2">
			<label className="text-xs tracking-widest uppercase text-zinc-400 font-semibold flex items-center justify-between">
				<span className="flex items-center gap-1.5">
					<Camera className="w-3 h-3 text-rose-400" /> Вложения (Фотографии)
				</span>
				{!isLocked && diaryId && (
					<label className="cursor-pointer text-xs flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-lg transition-colors border border-zinc-700">
						<Paperclip className="w-3 h-3" />
						{isUploading ? "Сжатие..." : "Прикрепить фото"}
						<input
							type="file"
							accept="image/*"
							className="hidden"
							onChange={handlePhotoUpload}
							disabled={isUploading || isLocked}
						/>
					</label>
				)}
			</label>
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
