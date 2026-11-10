import React, { useEffect, useState, useCallback } from "react";
import { Camera, RefreshCw, Sparkles, ExternalLink, Image as ImageIcon } from "lucide-react";

export interface PatientPhotoItem {
	id: string;
	url: string;
	name: string;
	label?: string;
	type?: string;
	createdAt?: string;
}

export interface PatientPhotosTabProps {
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly cardNumber?: string | null | undefined;
	readonly onOpenPhotoStudio: () => void;
}

export const PatientPhotosTab: React.FC<PatientPhotosTabProps> = ({
	patientId,
	patientName,
	cardNumber,
	onOpenPhotoStudio,
}) => {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [photos, setPhotos] = useState<readonly PatientPhotoItem[]>([]);

	const loadPhotos = useCallback(async () => {
		if (!patientId) {
			setPhotos([]);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const res = await fetch(`/api/patients/${patientId}/photos`, {
				headers: {
					Accept: "application/json",
				},
			});

			if (!res.ok) {
				throw new Error(`Ошибка загрузки фото: HTTP ${res.status}`);
			}

			const data = await res.json();
			const combined: PatientPhotoItem[] = [];

			// 1. Извлекаем слоты из фотопротокола
			if (data.protocol?.slots && typeof data.protocol.slots === "object") {
				for (const [slotId, slotVal] of Object.entries(data.protocol.slots)) {
					if (typeof slotVal === "string" && slotVal.trim()) {
						combined.push({
							id: `slot-${slotId}`,
							url: slotVal,
							name: slotId,
							label: slotId,
							createdAt: data.protocol.updatedAt || data.protocol.createdAt,
						});
					} else if (slotVal && typeof slotVal === "object") {
						const s = slotVal as { url?: string; imageUrl?: string; label?: string; timestamp?: string };
						const url = s.url || s.imageUrl;
						if (url) {
							combined.push({
								id: `slot-${slotId}`,
								url,
								name: s.label || slotId,
								label: s.label || slotId,
								createdAt: s.timestamp || data.protocol.updatedAt,
							});
						}
					}
				}
			}

			// 2. Извлекаем прикрепленные снимки визитов и attachments
			if (Array.isArray(data.photos)) {
				for (const p of data.photos) {
					if (p.url && !combined.some((item) => item.url === p.url)) {
						combined.push({
							id: p.id || `photo-${Math.random()}`,
							url: p.url,
							name: p.name || "Клинический снимок",
							label: p.name || "Снимок приёма",
							type: p.type,
							createdAt: p.createdAt,
						});
					}
				}
			}

			setPhotos(combined);
		} catch (err: any) {
			setError(err?.message || "Не удалось загрузить галерею снимков");
			setPhotos([]);
		} finally {
			setIsLoading(false);
		}
	}, [patientId]);

	useEffect(() => {
		loadPhotos();
	}, [loadPhotos]);

	return (
		<div
			className="p-4 sm:p-6 flex flex-col gap-4 min-h-[320px] bg-[var(--paper-soft)] rounded-2xl border border-[var(--line)]"
			data-testid="patient-photos-panel"
		>
			{/* Верхний тулбар действий */}
			<div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-[var(--line-subtle)]">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
						<Camera className="w-5 h-5" />
					</div>
					<div>
						<h3 className="text-sm sm:text-base font-bold text-[var(--ink)] m-0 flex items-center gap-2">
							<span>Клинический фотопротокол</span>
							{photos.length > 0 && (
								<span className="text-xs px-2 py-0.5 rounded-full bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] font-bold">
									{photos.length} снимков
								</span>
							)}
						</h3>
						<p className="text-xs text-[var(--muted)] m-0">
							12 стандартных проекций, цифровая эстетика DSD и сопоставление До / После
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={loadPhotos}
						className="p-2 text-[var(--muted)] hover:text-[var(--ink)] rounded-lg border border-[var(--line)] bg-[var(--paper)] transition-colors inline-flex items-center justify-center cursor-pointer"
						title="Обновить снимки"
						aria-label="Обновить снимки"
					>
						<RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[var(--teal,#0d9488)]" : ""}`} />
					</button>
					<button
						type="button"
						onClick={onOpenPhotoStudio}
						className="px-4 py-2 bg-[var(--primary,#0d9488)] text-white font-bold rounded-xl text-xs hover:opacity-95 transition-opacity inline-flex items-center gap-2 shadow-xs cursor-pointer min-h-[38px]"
						data-testid="open-photo-protocol-modal-btn"
					>
						<Camera className="w-4 h-4" />
						<span>Открыть студию фотопротокола</span>
					</button>
				</div>
			</div>

			{/* Тело вкладки */}
			{isLoading ? (
				<div className="flex flex-col items-center justify-center p-12 text-[var(--muted)] gap-3">
					<RefreshCw className="w-6 h-6 animate-spin text-[var(--teal,#0d9488)]" />
					<span className="text-xs font-semibold">Загрузка снимков пациента...</span>
				</div>
			) : photos.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-3 text-center py-10 px-4">
					<div className="w-14 h-14 rounded-2xl bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center">
						<Camera className="w-7 h-7 opacity-80" />
					</div>
					<div className="max-w-md">
						<h4 className="text-sm sm:text-base font-bold text-[var(--ink)] m-0">
							Клинический фотопротокол формируется
						</h4>
						<p className="text-xs text-[var(--muted)] mt-1.5 mb-4 leading-relaxed">
							В карте пациента пока нет сохраненных дентальных снимков. Запустите студию фотопротокола для пакетной загрузки, разметки FDI или съёмки с мобильного моста.
						</p>
						<button
							type="button"
							onClick={onOpenPhotoStudio}
							className="px-4 py-2.5 bg-[var(--primary,#0d9488)] text-white font-bold rounded-xl text-xs hover:opacity-95 transition-opacity inline-flex items-center gap-2 shadow-xs cursor-pointer"
						>
							<Sparkles className="w-4 h-4" />
							<span>Загрузить первые снимки</span>
						</button>
					</div>
				</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 overflow-y-auto max-h-[480px] p-1">
					{photos.map((item) => (
						<div
							key={item.id}
							onClick={onOpenPhotoStudio}
							className="group relative rounded-xl overflow-hidden border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal,#0d9488)] transition-all cursor-pointer shadow-xs flex flex-col"
						>
							<div className="relative aspect-4/3 w-full bg-slate-900 overflow-hidden flex items-center justify-center">
								<img
									src={item.url}
									alt={item.name}
									className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
									loading="lazy"
								/>
								<div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
									<span className="text-[11px] font-bold text-white bg-black/60 px-2 py-1 rounded-md backdrop-blur-xs flex items-center gap-1">
										<ExternalLink className="w-3 h-3" />
										<span>Студия</span>
									</span>
								</div>
							</div>
							<div className="p-2 flex flex-col justify-between gap-1 grow">
								<span className="text-xs font-semibold text-[var(--ink)] line-clamp-1" title={item.name}>
									{item.name}
								</span>
								{item.createdAt && (
									<span className="text-[10px] text-[var(--muted)]">
										{new Date(item.createdAt).toLocaleDateString("ru-RU", {
											day: "numeric",
											month: "short",
										})}
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default PatientPhotosTab;
