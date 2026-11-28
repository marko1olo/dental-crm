import React, { useState, useEffect, useRef } from "react";
import { generateUuidV7 } from "@dental/shared";
import { Camera, Check, CheckCircle, RefreshCw, Upload, Smartphone, AlertCircle, ChevronRight } from "lucide-react";
import { compressChairsidePhotoToBlobUrl } from "../chairsidePhotoCompressor";
import { showToast } from "../../GlobalToast";
import { logger } from "../../../utils/logger";

export interface MobilePhotoSlot {
	id: string;
	titleRu: string;
	shortLabelRu: string;
	instructionRu: string;
}

export const CHAIRSIDE_MOBILE_SLOTS: MobilePhotoSlot[] = [
	{ id: "portrait_smile", titleRu: "Улыбка и пропорции лица", shortLabelRu: "Улыбка", instructionRu: "Естественная широкая улыбка анфас" },
	{ id: "intraoral_frontal_occlusion", titleRu: "Фронт в смыкании (прикус)", shortLabelRu: "Фронт", instructionRu: "С роторасширителем, резцы в окклюзии" },
	{ id: "intraoral_maxillary_occlusal", titleRu: "Окклюзия верхняя челюсть", shortLabelRu: "Верхняя дуга", instructionRu: "С зеркалом, вся зубная дуга в фокусе" },
	{ id: "intraoral_mandibular_occlusal", titleRu: "Окклюзия нижняя челюсть", shortLabelRu: "Нижняя дуга", instructionRu: "С зеркалом, язык убран кзади" },
	{ id: "intraoral_right_buccal", titleRu: "Правый боковой сегмент", shortLabelRu: "Правый бок", instructionRu: "Соотношение клыков и моляров справа" },
	{ id: "intraoral_left_buccal", titleRu: "Левый боковой сегмент", shortLabelRu: "Левый бок", instructionRu: "Соотношение клыков и моляров слева" },
];

export interface MobilePhotoUploadPageProps {
	tokenFromUrl?: string;
}

export const MobilePhotoUploadPage: React.FC<MobilePhotoUploadPageProps> = ({ tokenFromUrl }) => {
	// Извлечение токена из props или location.hash/search
	const [token, setToken] = useState<string>(() => {
		if (tokenFromUrl) return tokenFromUrl;
		const hash = window.location.hash;
		const hashMatch = hash.match(/token=([a-f0-9]+)/i);
		if (hashMatch?.[1]) return hashMatch[1];
		const searchParams = new URLSearchParams(window.location.search);
		return searchParams.get("token") || searchParams.get("photoBridgeToken") || "";
	});

	const [sessionData, setSessionData] = useState<{
		patientInitials: string;
		expiresAt: number;
		slots?: MobilePhotoSlot[] | undefined;
	} | null>(null);

	const [selectedSlotId, setSelectedSlotId] = useState<string>("portrait_smile");
	const [uploadedSlots, setUploadedSlots] = useState<Record<string, { url: string; fileName: string }>>({});
	const createdBlobUrlsRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		const tracked = createdBlobUrlsRef.current;
		return () => {
			if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
				for (const blobUrl of tracked) {
					URL.revokeObjectURL(blobUrl);
				}
			}
			tracked.clear();
		};
	}, []);
	const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
	const [isUploading, setIsUploading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [secondsRemaining, setSecondsRemaining] = useState<number>(900);

	const fileInputRef = useRef<HTMLInputElement | null>(null);

	// Загрузка метаданных сессии с бэкенда
	const fetchSession = async (activeToken: string) => {
		setIsLoadingSession(true);
		setError(null);
		try {
			const res = await fetch(`/api/photo-bridge/session/${activeToken}`);
			if (!res.ok) {
				let errMsg = "Сессия не найдена или срок действия истек.";
				try {
					const errData = (await res.json()) as { message?: string };
					if (errData?.message) errMsg = errData.message;
				} catch (parseErr) {
					logger.warn("[MobilePhotoUploadPage] Non-JSON error on session fetch", parseErr);
				}
				throw new Error(errMsg);
			}
			const data = await res.json();
			const receivedSlots: MobilePhotoSlot[] | undefined = Array.isArray(data.slots) && data.slots.length > 0
				? data.slots.map((s: { id: string; titleRu?: string; shortLabelRu?: string; descriptionRu?: string; instructionRu?: string }) => ({
						id: s.id,
						titleRu: s.titleRu || s.shortLabelRu || s.id,
						shortLabelRu: s.shortLabelRu || s.titleRu || s.id,
						instructionRu: s.instructionRu || s.descriptionRu || "Клинический снимок",
				  }))
				: undefined;

			setSessionData({
				patientInitials: data.patientInitials || "Пациент",
				expiresAt: data.expiresAt,
				slots: receivedSlots,
			});

			const firstSlot = receivedSlots?.[0];
			if (receivedSlots && receivedSlots.length > 0 && firstSlot) {
				setSelectedSlotId((prev) => (receivedSlots.some((s) => s.id === prev) ? prev : firstSlot.id));
			}

			if (Array.isArray(data.uploadedPhotos)) {
				const map: Record<string, { url: string; fileName: string }> = {};
				for (const p of data.uploadedPhotos) {
					if (p.slotId) map[p.slotId] = { url: p.url, fileName: p.fileName };
				}
				setUploadedSlots(map);
			}
		} catch (err: unknown) {
			logger.warn("[MobilePhotoUploadPage] Session fetch failed", err);
			const msg = err instanceof Error ? err.message : String(err);
			setError(msg || "Сессия не найдена или срок действия истек.");
		} finally {
			setIsLoadingSession(false);
		}
	};

	useEffect(() => {
		if (token) {
			void fetchSession(token);
		} else {
			setIsLoadingSession(false);
			setError("Отсутствует токен сессии. Отсканируйте QR-код на экране монитора врача.");
		}
	}, [token]);

	// Таймер обратного отсчета
	useEffect(() => {
		if (!sessionData?.expiresAt) return;
		const timer = setInterval(() => {
			const rem = Math.max(0, Math.floor((sessionData.expiresAt - Date.now()) / 1000));
			setSecondsRemaining(rem);
			if (rem <= 0) {
				clearInterval(timer);
				setError("Время действия QR-сессии истекло. Отсканируйте обновленный QR-код на ПК.");
			}
		}, 1000);
		return () => clearInterval(timer);
	}, [sessionData]);

	// Обработка сделанного снимка
	const handleFileCaptured = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !token) return;

		setIsUploading(true);
		try {
			// 1. Аппаратная компрессия на мобильном телефоне (Canvas/WebP до 1920px, 85%)
			const compressed = await compressChairsidePhotoToBlobUrl(file, {
				maxDimension: 1920,
				quality: 0.85,
			}).catch((compressErr) => {
				logger.warn("[MobilePhotoUploadPage] Chairside compression fallback to original file", compressErr);
				return null;
			});

			const uploadBlob = compressed ? compressed.blob : file;
			const safeFilename = `${selectedSlotId}-${Date.now()}.webp`;

			// 2. Отправка multipart на Fastify бэкенд
			const fd = new FormData();
			fd.append("file", uploadBlob, safeFilename);
			fd.append("slotId", selectedSlotId);

			const uploadRes = await fetch(`/api/photo-bridge/upload/${token}?slotId=${selectedSlotId}`, {
				method: "POST",
				headers: {
					"Idempotency-Key": generateUuidV7(),
				},
				body: fd,
			});

			if (!uploadRes.ok) {
				if (compressed?.blobUrl && compressed.blobUrl.startsWith("blob:")) {
					URL.revokeObjectURL(compressed.blobUrl);
				}
				let errData: { message?: string } = {};
				try {
					errData = (await uploadRes.json()) as { message?: string };
				} catch (parseErr) {
					logger.debug("[MobilePhotoUploadPage] Failed to parse upload error JSON", parseErr);
				}
				throw new Error(errData.message || "Ошибка отправки снимка на сервер.");
			}

			const uploadJson = await uploadRes.json();
			const serverUrl = typeof uploadJson.photo?.url === "string" ? uploadJson.photo.url : "";
			let photoUrl = serverUrl;
			if (serverUrl) {
				if (compressed?.blobUrl && compressed.blobUrl.startsWith("blob:")) {
					URL.revokeObjectURL(compressed.blobUrl);
				}
			} else if (compressed?.blobUrl) {
				photoUrl = compressed.blobUrl;
				if (photoUrl.startsWith("blob:")) {
					createdBlobUrlsRef.current.add(photoUrl);
				}
			} else {
				photoUrl = URL.createObjectURL(file);
				createdBlobUrlsRef.current.add(photoUrl);
			}

			setUploadedSlots((prev) => {
				const previousSlotUrl = prev[selectedSlotId]?.url;
				if (
					previousSlotUrl &&
					previousSlotUrl !== photoUrl &&
					previousSlotUrl.startsWith("blob:")
				) {
					URL.revokeObjectURL(previousSlotUrl);
					createdBlobUrlsRef.current.delete(previousSlotUrl);
				}
				return {
					...prev,
					[selectedSlotId]: { url: photoUrl, fileName: safeFilename },
				};
			});

			const effectiveSlotsList = sessionData?.slots && sessionData.slots.length > 0 ? sessionData.slots : CHAIRSIDE_MOBILE_SLOTS;
			showToast(`Снимок «${effectiveSlotsList.find((s) => s.id === selectedSlotId)?.shortLabelRu}» принят!`, "success", 2500);

			// 3. Zero-Friction: автоматический переход к следующему незаполненному ракурсу
			const currentIndex = effectiveSlotsList.findIndex((s) => s.id === selectedSlotId);
			const remainingSlots = effectiveSlotsList.filter(
				(s, idx) => idx > currentIndex && !uploadedSlots[s.id] && s.id !== selectedSlotId,
			);
			if (remainingSlots.length > 0 && remainingSlots[0]) {
				setSelectedSlotId(remainingSlots[0].id);
			}
		} catch (err: unknown) {
			logger.error("[MobilePhotoUploadPage] Upload failed", err);
			const errMsg = err instanceof Error ? err.message : "Не удалось загрузить снимок.";
			showToast(errMsg || "Не удалось загрузить снимок.", "error");
		} finally {
			setIsUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const triggerCamera = () => {
		if (isUploading) return;
		fileInputRef.current?.click();
	};

	const formatTimer = (sec: number) => {
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}:${s < 10 ? "0" : ""}${s}`;
	};

	const effectiveSlots = sessionData?.slots && sessionData.slots.length > 0 ? sessionData.slots : CHAIRSIDE_MOBILE_SLOTS;
	const totalSlotsCount = effectiveSlots.length;
	const fallbackSlot: MobilePhotoSlot = {
		id: "portrait_smile",
		titleRu: "Улыбка и пропорции лица",
		shortLabelRu: "Улыбка",
		instructionRu: "Естественная широкая улыбка анфас",
	};
	const activeSlot = effectiveSlots.find((s) => s.id === selectedSlotId) ?? effectiveSlots[0] ?? fallbackSlot;
	const uploadedCount = Object.keys(uploadedSlots).length;

	if (isLoadingSession) {
		return (
			<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center justify-center p-6 gap-3">
				<RefreshCw size={36} className="animate-spin text-[var(--teal)]" />
				<h2 className="text-base font-bold m-0">Подключение к креслу врача...</h2>
				<p className="text-xs text-[var(--muted)] m-0">Синхронизация карты пациента</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center justify-center p-6 text-center gap-4">
				<div className="w-14 h-14 rounded-full bg-[var(--danger-soft,rgba(239,68,68,0.1))] text-[var(--danger,#ef4444)] flex items-center justify-center border border-[var(--danger,rgba(239,68,68,0.2))]">
					<AlertCircle size={32} />
				</div>
				<h2 className="text-lg font-bold m-0 text-[var(--danger,#ef4444)]">Сессия не активна</h2>
				<p className="text-sm text-[var(--muted)] max-w-xs m-0 leading-relaxed">{error}</p>
				<button
					type="button"
					onClick={() => token && fetchSession(token)}
					className="primary-button min-h-[48px] px-6 rounded-xl font-bold flex items-center gap-2 bg-[var(--primary)] text-white shadow-md active:scale-95"
				>
					<RefreshCw size={16} />
					<span>Попробовать снова</span>
				</button>
			</div>
		);
	}

	return (
		<div
			className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col pb-28 select-none"
			data-testid="mobile-photo-upload-page"
		>
			{/* Скрытый нативный инпут камеры смартфона */}
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				capture="environment"
				onChange={handleFileCaptured}
				className="hidden"
				data-testid="mobile-camera-input"
			/>

			{/* Мобильная шапка Apple HIG (<= 56px, 1 строка) */}
			<header className="sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-[var(--paper)]/95 backdrop-blur-md border-b border-[var(--line)]">
				<div className="flex items-center gap-2.5 truncate">
					<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-[var(--teal)] flex items-center justify-center border border-teal-500/20 shrink-0">
						<Smartphone size={16} />
					</div>
					<div className="truncate">
						<div className="text-xs font-bold truncate flex items-center gap-1.5">
							<span>{sessionData?.patientInitials || "Пациент"}</span>
							<span className="text-[10px] font-normal text-teal-600 dark:text-teal-400 bg-teal-500/10 px-1.5 py-0.2 rounded-full">
								{uploadedCount}/{totalSlotsCount}
							</span>
						</div>
						<div className="text-[10px] text-[var(--muted)] font-mono">
							Сессия: {formatTimer(secondsRemaining)}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-1">
					<span className="text-[11px] font-bold text-[var(--teal)] px-2 py-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						DENTE Мост
					</span>
				</div>
			</header>

			{/* Основной контент */}
			<main className="p-4 flex flex-col gap-4">
				{/* Инструкция к текущему выбранному ракурсу */}
				<div className="bg-[var(--paper-soft)] p-3.5 rounded-2xl border border-[var(--line)] flex flex-col gap-1 shadow-xs">
					<div className="flex items-center justify-between">
						<span className="text-[11px] font-semibold text-[var(--primary)]">
							Текущий ракурс
						</span>
						{uploadedSlots[selectedSlotId] && (
							<span className="flex items-center gap-1 text-[11px] font-bold text-[var(--teal,#0d9488)] bg-[var(--teal-subtle,rgba(13,148,136,0.1))] px-2 py-0.5 rounded-full border border-[var(--teal,#0d9488)]/20">
								<Check size={12} />
								<span>Снимок сделан</span>
							</span>
						)}
					</div>
					<h3 className="text-base font-bold m-0 text-[var(--ink)]">
						{activeSlot.titleRu}
					</h3>
					<p className="text-xs text-[var(--muted)] m-0 leading-relaxed">
						{activeSlot.instructionRu}
					</p>
				</div>

				{/* Сетка/список клинических ракурсов (тач >= 44x44px) */}
				<div className="flex flex-col gap-2">
					<div className="text-xs font-bold text-[var(--muted)] px-1">
						Выберите клинический ракурс:
					</div>
					<div className="grid grid-cols-2 gap-2">
						{effectiveSlots.map((slot) => {
							const isSelected = slot.id === selectedSlotId;
							const isDone = Boolean(uploadedSlots[slot.id]);

							return (
								<button
									key={slot.id}
									type="button"
									onClick={() => setSelectedSlotId(slot.id)}
									className={`min-h-[52px] p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
										isSelected
											? "border-teal-500 bg-teal-500/10 shadow-xs"
											: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)]"
									}`}
								>
									<div className="truncate">
										<div className={`text-xs font-bold truncate ${isSelected ? "text-[var(--teal)]" : "text-[var(--ink)]"}`}>
											{slot.shortLabelRu}
										</div>
										<div className="text-[10px] text-[var(--muted)] truncate">
											{isDone ? "В карточке" : "Ожидает"}
										</div>
									</div>

									<div className="shrink-0">
										{isDone ? (
											<div className="w-6 h-6 rounded-full bg-[var(--teal-subtle,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] flex items-center justify-center">
												<Check size={14} />
											</div>
										) : (
											<div className={`w-6 h-6 rounded-full border flex items-center justify-center ${isSelected ? "border-teal-500 text-teal-600" : "border-[var(--line)] text-[var(--muted)]"}`}>
												<Camera size={12} />
											</div>
										)}
									</div>
								</button>
							);
						})}
					</div>
				</div>

				{/* Галерея сделанных кадров */}
				{uploadedCount > 0 && (
					<div className="flex flex-col gap-2 mt-2">
						<div className="text-xs font-bold text-[var(--muted)] px-1 flex items-center justify-between">
							<span>Снимки на мониторе врача ({uploadedCount}):</span>
							<span className="text-green-600 dark:text-green-400 font-semibold text-[11px]">Мгновенно синхронизировано</span>
						</div>
						<div className="flex gap-2 overflow-x-auto py-1">
							{effectiveSlots.filter((s) => uploadedSlots[s.id]).map((s) => (
								<div
									key={s.id}
									onClick={() => setSelectedSlotId(s.id)}
									className="relative w-20 h-20 rounded-xl overflow-hidden border border-[var(--line)] shrink-0 bg-black/5 cursor-pointer"
								>
									<img
										src={uploadedSlots[s.id]?.url}
										alt={s.shortLabelRu}
										className="w-full h-full object-cover"
									/>
									<div className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white font-semibold text-center truncate px-1 py-0.5">
										{s.shortLabelRu}
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</main>

			{/* Фиксированная нижняя панель Apple HIG (Natural Thumb Zone) */}
			<div className="fixed bottom-0 inset-x-0 p-4 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] shadow-lg z-40">
				<button
					type="button"
					onClick={triggerCamera}
					aria-disabled={isUploading}
					className="w-full h-14 rounded-2xl bg-[var(--primary)] hover:opacity-95 active:scale-[0.98] text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-md cursor-pointer transition-all"
					data-testid="btn-mobile-take-photo"
				>
					{isUploading ? (
						<>
							<RefreshCw size={20} className="animate-spin" />
							<span>Сжатие и отправка на ПК...</span>
						</>
					) : (
						<>
							<Camera size={22} />
							<span>
								{uploadedSlots[selectedSlotId] ? "Переснять ракурс" : `Снять «${activeSlot.shortLabelRu}»`}
							</span>
						</>
					)}
				</button>
			</div>
		</div>
	);
};

export default MobilePhotoUploadPage;
