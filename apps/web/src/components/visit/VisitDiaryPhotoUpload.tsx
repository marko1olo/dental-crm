import { Camera, Paperclip } from "lucide-react";
import type React from "react";
import { useState } from "react";

interface Attachment {
	id: string;
	url: string;
	name: string;
	type: string;
}

interface VisitDiaryPhotoUploadProps {
	attachments: Attachment[];
	isLocked: boolean;
	diaryId: string | null;
	onUpload: (blob: Blob, name: string, type: string) => Promise<void>;
}

export const VisitDiaryPhotoUpload: React.FC<VisitDiaryPhotoUploadProps> = ({
	attachments,
	isLocked,
	diaryId,
	onUpload,
}) => {
	const [isUploading, setIsUploading] = useState(false);

	const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			setIsUploading(true);

			// Resize image on client to save DB space
			const img = new Image();
			const objectUrl = URL.createObjectURL(file);

			await new Promise((resolve, reject) => {
				img.onload = resolve;
				img.onerror = reject;
				img.src = objectUrl;
			});

			const canvas = document.createElement("canvas");
			const MAX_SIZE = 1200;
			let width = img.width;
			let height = img.height;

			if (width > height) {
				if (width > MAX_SIZE) {
					height *= MAX_SIZE / width;
					width = MAX_SIZE;
				}
			} else {
				if (height > MAX_SIZE) {
					width *= MAX_SIZE / height;
					height = MAX_SIZE;
				}
			}

			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");
			ctx?.drawImage(img, 0, 0, width, height);

			const compressedBlob = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(resolve, "image/jpeg", 0.7),
			);

			URL.revokeObjectURL(objectUrl);

			if (compressedBlob) {
				await onUpload(compressedBlob, file.name, "image/jpeg");
			}
		} catch (err: any) {
			alert(`Ошибка загрузки фото: ${err.message}`);
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
								className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg"
							>
								<span className="text-xs text-white bg-black/80 px-2 py-1 rounded-md">
									Открыть
								</span>
							</a>
						</div>
					))}
				</div>
			) : (
				<div className="text-sm text-zinc-500 py-3 px-4 bg-zinc-900/50 border border-zinc-800 rounded-xl border-dashed flex items-center justify-center">
					{diaryId
						? "Нет прикрепленных файлов"
						: "Сохраните дневник, чтобы прикрепить фото"}
				</div>
			)}
		</div>
	);
};
