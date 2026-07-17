import { Camera, Paperclip, Search } from "lucide-react";
import React, { useState, useEffect } from "react";
import { showToast } from "./GlobalToast";

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
	useEffect(() => {
		if (!visitId) return;
		const clinicToken = localStorage.getItem("dente_clinic_token");
		fetch(`/api/files/visits/${visitId}/attachments`, {
			headers: {
				"x-dente-clinic-token": clinicToken || "",
			},
		})
			.then((r) => {
				if (r.ok) return r.json();
				return null;
			})
			.then((data) => {
				if (data?.files) {
					setAttachments(data.files);
				}
			})
			.catch(console.error);
	}, [visitId]);

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

			const clinicToken = localStorage.getItem("dente_clinic_token");

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
					{attachments.map((att) => (
						<div key={att.id} className="relative group shrink-0">
							<img
								src={att.url}
								alt={att.name}
								className="h-20 w-20 object-cover rounded-lg border border-zinc-700 shadow-sm"
							/>
							<a
								href={att.url}
								target="_blank"
								rel="noreferrer"
								className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
							>
								<Search className="w-5 h-5 text-white" />
							</a>
						</div>
					))}
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
