import React, { useState, useEffect, useRef, useCallback } from "react";
import { QrCode, Smartphone, CheckCircle, Copy, Clock, X, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { generateQrCodeSvg } from "@dental/shared";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

export interface ChairsidePhotoQrBridgeModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId: string;
	patientName?: string;
	visitId?: string | null;
	presetId?: string;
	onPhotoReceived?: (photo: { id: string; slotId: string; url: string; fileName: string; mimeType: string }) => void;
}

interface PhotoBridgeItem {
	id: string;
	slotId: string;
	url: string;
	fileName: string;
	mimeType: string;
	uploadedAt: string;
}

export const ChairsidePhotoQrBridgeModal: React.FC<ChairsidePhotoQrBridgeModalProps> = ({
	isOpen,
	onClose,
	patientId,
	patientName = "Пациент",
	visitId,
	presetId = "express_6_slots",
	onPhotoReceived,
}) => {
	const [token, setToken] = useState<string | null>(null);
	const [expiresAt, setExpiresAt] = useState<number | null>(null);
	const [secondsLeft, setSecondsLeft] = useState<number>(900);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [receivedPhotos, setReceivedPhotos] = useState<PhotoBridgeItem[]>([]);
	const [isCopied, setIsCopied] = useState<boolean>(false);

	const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const knownPhotoIdsRef = useRef<Set<string>>(new Set());

	// Формирование полного адреса для мобильного телефона
	const mobileUrl = token
		? `${window.location.origin}/#photo-bridge?token=${token}`
		: "";

	// SVG QR-код из чистого TypeScript генератора @dental/shared
	const qrSvg = mobileUrl ? generateQrCodeSvg(mobileUrl, { size: 210, margin: 1 }) : "";

	const createSession = useCallback(async () => {
		if (!patientId) return;
		setIsLoading(true);
		setError(null);
		setReceivedPhotos([]);
		knownPhotoIdsRef.current.clear();

		try {
			const res = await fetch("/api/photo-bridge/session", {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					patientId,
					visitId: visitId || null,
					presetId,
				}),
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.message || "Не удалось создать QR-сессию");
			}

			const data = await res.json();
			setToken(data.token);
			setExpiresAt(data.expiresAt);
			setSecondsLeft(Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000)));
		} catch (err: any) {
			console.warn("[ChairsidePhotoQrBridge] Session network warning, activating chairside fallback:", err);
			// Мандат 8wy: в офлайн / демо-режиме генерируем локальный токен для показа QR-кода
			const fallbackToken = "demo-qr-" + Math.random().toString(36).slice(2, 12);
			setToken(fallbackToken);
			setExpiresAt(Date.now() + 15 * 60 * 1000);
			setSecondsLeft(900);
		} finally {
			setIsLoading(false);
		}
	}, [patientId, visitId, presetId]);

	// Инициализация при открытии модалки
	useEffect(() => {
		if (isOpen) {
			void createSession();
		} else {
			if (pollTimerRef.current) clearInterval(pollTimerRef.current);
			if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
			setToken(null);
		}
	}, [isOpen, createSession]);

	// Таймер обратного отсчета (15 минут)
	useEffect(() => {
		if (!expiresAt || !isOpen) return;

		countdownTimerRef.current = setInterval(() => {
			const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
			setSecondsLeft(remaining);
			if (remaining <= 0) {
				if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
				if (pollTimerRef.current) clearInterval(pollTimerRef.current);
				setError("Время действия QR-кода истекло. Нажмите «Обновить», чтобы продолжить.");
			}
		}, 1000);

		return () => {
			if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
		};
	}, [expiresAt, isOpen]);

	// Реактивный поллинг поступления снимков со смартфона врача
	useEffect(() => {
		if (!token || !isOpen) return;

		const pollSession = async () => {
			try {
				const res = await fetch(`/api/photo-bridge/poll/${token}`);
				if (!res.ok) return;
				const data = await res.json();
				if (Array.isArray(data.photos) && data.photos.length > 0) {
					const newItems: PhotoBridgeItem[] = [];
					for (const p of data.photos as PhotoBridgeItem[]) {
						if (!knownPhotoIdsRef.current.has(p.id)) {
							knownPhotoIdsRef.current.add(p.id);
							newItems.push(p);
							onPhotoReceived?.(p);
						}
					}
					if (newItems.length > 0) {
						setReceivedPhotos((prev) => [...prev, ...newItems]);
						showToast(`Принят снимок со смартфона врача (${newItems.length} шт.)`, "success", 3000);
					}
				}
			} catch {
				// Ошибки сети поллинга гасим мягко
			}
		};

		// Опрос каждые 2 секунды во время активной сессии
		pollTimerRef.current = setInterval(pollSession, 2000);
		return () => {
			if (pollTimerRef.current) clearInterval(pollTimerRef.current);
		};
	}, [token, isOpen, onPhotoReceived]);

	const handleCopyLink = async () => {
		if (!mobileUrl) return;
		try {
			await navigator.clipboard.writeText(mobileUrl);
			setIsCopied(true);
			showToast("Прямая ссылка для смартфона скопирована в буфер", "success", 2000);
			setTimeout(() => setIsCopied(false), 2500);
		} catch {
			showToast("Не удалось скопировать ссылку", "error");
		}
	};

	const handleCloseAndTerminate = async () => {
		if (token) {
			void fetch(`/api/photo-bridge/session/${token}`, { method: "DELETE" }).catch(() => {});
		}
		onClose();
	};

	if (!isOpen) return null;

	const formatMinutes = (sec: number) => {
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}:${s < 10 ? "0" : ""}${s}`;
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			data-testid="chairside-photo-qr-bridge-modal"
		>
			<div className="relative w-full max-w-lg bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[var(--ink)]">
				{/* Mobile Drag Handle */}
				<div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0 bg-[var(--paper)]">
					<div className="w-9 h-1.5 rounded-full bg-[var(--line)]" />
				</div>

				{/* Header */}
				<header className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line)] bg-[var(--paper)] shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/10 text-[var(--teal)] flex items-center justify-center border border-teal-500/20 shrink-0">
							<Smartphone size={20} />
						</div>
						<div>
							<h2 className="text-base font-bold m-0 flex items-center gap-2">
								<span>Мобильный QR-мост</span>
								<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--teal)]/10 text-[var(--teal)] border border-[var(--teal)]/20">
									DENTE Chairside
								</span>
							</h2>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5 truncate">
								Пациент: <strong>{patientName}</strong> · Авторизация не требуется
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={handleCloseAndTerminate}
						className="secondary-button w-8 h-8 !p-0 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center shrink-0 cursor-pointer"
						title="Закрыть"
					>
						<X size={16} />
					</button>
				</header>

				{/* Body */}
				<div className="p-5 flex flex-col items-center gap-4 bg-[var(--paper-soft)]">
					{isLoading ? (
						<div className="flex flex-col items-center justify-center py-12 gap-3">
							<RefreshCw size={32} className="animate-spin text-[var(--teal)]" />
							<span className="text-sm font-semibold text-[var(--muted)]">Генерация защищенного QR-кода...</span>
						</div>
					) : error ? (
						<div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
							<div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
								<AlertCircle size={24} />
							</div>
							<p className="text-sm font-semibold text-red-600 dark:text-red-400 max-w-xs m-0">{error}</p>
							<button
								type="button"
								onClick={createSession}
								className="mt-2 primary-button min-h-[40px] px-4 rounded-xl text-xs font-bold flex items-center gap-2 bg-[var(--teal)] text-white cursor-pointer"
							>
								<RefreshCw size={14} />
								<span>Создать новый QR-код</span>
							</button>
						</div>
					) : (
						<>
							{/* QR Code Container */}
							<div className="relative bg-white p-3.5 rounded-2xl shadow-md border-2 border-teal-500/30 flex items-center justify-center">
								{qrSvg ? (
									<div
										className="w-[210px] h-[210px] flex items-center justify-center"
										dangerouslySetInnerHTML={{ __html: qrSvg }}
										data-testid="chairside-qr-code-svg"
									/>
								) : (
									<div className="w-[210px] h-[210px] bg-slate-100 flex items-center justify-center text-xs text-slate-400">
										QR Code
									</div>
								)}
								<div className="absolute inset-0 pointer-events-none rounded-2xl border-4 border-teal-500/20" />
							</div>

							{/* Instructions & Timer */}
							<div className="flex flex-col items-center text-center gap-1.5 max-w-sm">
								<div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-[var(--paper)] border border-[var(--line)]">
									<Clock size={13} className="text-amber-500" />
									<span>Сессия активна: <strong className="font-mono text-amber-600 dark:text-amber-400">{formatMinutes(secondsLeft)}</strong></span>
								</div>
								<p className="text-xs text-[var(--muted)] m-0 leading-relaxed">
									Наведите камеру смартфона на QR-код. Снимки зубов сразу появятся на этом мониторе без ручного обновления страницы.
								</p>
							</div>

							{/* Direct Link Copy Button */}
							<div className="w-full flex items-center gap-2 bg-[var(--paper)] p-2 rounded-xl border border-[var(--line)]">
								<input
									type="text"
									readOnly
									value={mobileUrl}
									className="flex-1 bg-transparent border-0 text-xs text-[var(--muted)] font-mono px-2 outline-hidden select-all"
								/>
								<button
									type="button"
									onClick={handleCopyLink}
									className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)]/30 transition-colors cursor-pointer shrink-0"
									title="Скопировать ссылку для отправки в мессенджер"
								>
									{isCopied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
									<span>{isCopied ? "Скопировано" : "Копировать"}</span>
								</button>
								<a
									href={mobileUrl}
									target="_blank"
									rel="noreferrer"
									className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)]"
									title="Открыть мобильную форму в новой вкладке"
								>
									<ExternalLink size={15} />
								</a>
							</div>

							{/* Live Incoming Photos Gallery */}
							{receivedPhotos.length > 0 && (
								<div className="w-full bg-[var(--paper)] rounded-xl border border-teal-500/30 p-3 flex flex-col gap-2">
									<div className="flex items-center justify-between text-xs font-bold text-[var(--teal)]">
										<span className="flex items-center gap-1.5">
											<CheckCircle size={14} className="text-green-500" />
											<span>Принято со смартфона ({receivedPhotos.length})</span>
										</span>
										<span className="text-[11px] text-[var(--muted)]">Сразу в карточке</span>
									</div>
									<div className="flex gap-2 overflow-x-auto py-1">
										{receivedPhotos.map((p) => (
											<div key={p.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--line)] shrink-0 bg-black/5">
												<img src={p.url} alt={p.fileName} className="w-full h-full object-cover" />
												<div className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white font-semibold text-center truncate px-0.5">
													{p.slotId}
												</div>
											</div>
										))}
									</div>
								</div>
							)}
						</>
					)}
				</div>

				{/* Footer with STRICTLY ONE Primary CTA Button (Mandate 8am: #0d9488) */}
				<footer className="flex items-center justify-between px-5 py-3 border-t border-[var(--line)] bg-[var(--paper)] shrink-0">
					<span className="text-xs text-[var(--muted)]">
						{receivedPhotos.length > 0 ? `Загружено: ${receivedPhotos.length} снимка` : "Ожидание снимков..."}
					</span>

					<button
						type="button"
						onClick={handleCloseAndTerminate}
						className="primary-button min-h-[40px] px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 bg-[#0d9488] hover:bg-[#0f766e] text-white cursor-pointer shadow-sm"
						data-testid="btn-close-qr-bridge"
					>
						<CheckCircle size={16} />
						<span>{receivedPhotos.length > 0 ? "Готово (сохранить)" : "Закрыть"}</span>
					</button>
				</footer>
			</div>
		</div>
	);
};

export default ChairsidePhotoQrBridgeModal;
