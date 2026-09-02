import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	Calendar,
	Copy,
	Check,
	RefreshCw,
	ShieldCheck,
	ExternalLink,
	AlertTriangle,
	Key,
	X,
	Smartphone,
	Globe,
	Lock,
	CheckCircle2,
} from "lucide-react";
import type { Dashboard } from "@dental/shared";
import {
	buildGoogleCalendarSubscriptionUrl,
	buildWebcalUrl,
	buildYandexCalendarSubscriptionUrl,
} from "@dental/shared";
import { auth } from "../../AppConstants";
import { showToast } from "../GlobalToast";

export interface DoctorCalendarSyncModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly dashboard?: Dashboard | null;
	readonly initialDoctorId?: string | null;
}

interface CalendarFeedData {
	doctorId: string;
	doctorName: string;
	feedUrl: string;
	webcalUrl: string;
	tokenVersion: number;
	tokenCreatedAt?: string | null;
}

export const DoctorCalendarSyncModal: React.FC<DoctorCalendarSyncModalProps> = ({
	isOpen,
	onClose,
	dashboard,
	initialDoctorId,
}) => {
	const staffDoctors = useMemo(() => {
		return (dashboard?.clinicSettings?.staff ?? []).filter(
			(s) => s.active && (s.role === "doctor" || s.role === "owner" || s.role === "administrator"),
		);
	}, [dashboard?.clinicSettings?.staff]);

	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
		initialDoctorId || staffDoctors[0]?.id || "",
	);
	const [feedData, setFeedData] = useState<CalendarFeedData | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isRotating, setIsRotating] = useState<boolean>(false);
	const [copiedKey, setCopiedKey] = useState<"feed" | "webcal" | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [showRotationWarning, setShowRotationWarning] = useState<boolean>(false);

	useEffect(() => {
		if (initialDoctorId) {
			setSelectedDoctorId(initialDoctorId);
		} else if (staffDoctors[0]?.id && !selectedDoctorId) {
			setSelectedDoctorId(staffDoctors[0].id);
		}
	}, [initialDoctorId, staffDoctors, selectedDoctorId]);

	const fetchFeedUrl = useCallback(async (doctorId: string) => {
		if (!doctorId) return;
		setIsLoading(true);
		setErrorMessage(null);
		try {
			const res = await fetch(`/api/schedule/ical/doctor/${encodeURIComponent(doctorId)}/feed-url`, {
				headers: auth.denteClinicalReadHeaders(),
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.message || `Ошибка сервера (${res.status})`);
			}

			const data = (await res.json()) as CalendarFeedData;
			setFeedData(data);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось загрузить ссылку расписания";
			setErrorMessage(msg);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (isOpen && selectedDoctorId) {
			void fetchFeedUrl(selectedDoctorId);
		}
	}, [isOpen, selectedDoctorId, fetchFeedUrl]);

	// Escape key to close modal
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const handleCopy = async (text: string, key: "feed" | "webcal") => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedKey(key);
			showToast("Ссылка скопирована в буфер обмена", "success");
			setTimeout(() => setCopiedKey(null), 2500);
		} catch {
			showToast("Ошибка копирования в буфер обмена", "error");
		}
	};

	const handleRotateToken = async () => {
		if (!selectedDoctorId) return;
		setIsRotating(true);
		setErrorMessage(null);
		try {
			const res = await fetch(`/api/schedule/ical/doctor/${encodeURIComponent(selectedDoctorId)}/rotate`, {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders(),
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.message || "Не удалось отозвать токен");
			}

			const data = (await res.json()) as CalendarFeedData;
			setFeedData(data);
			setShowRotationWarning(false);
			showToast("Токен обновлен. Новая ссылка готова к подключению.", "success");
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка при ротации токена";
			setErrorMessage(msg);
			showToast(msg, "error");
		} finally {
			setIsRotating(false);
		}
	};

	if (!isOpen) return null;

	const origin = typeof window !== "undefined" ? window.location.origin : "";
	const fullFeedUrl = feedData ? `${origin}${feedData.feedUrl}` : "";
	const webcalUrl = feedData ? buildWebcalUrl(feedData.feedUrl, origin) : "";
	const yandexUrl = feedData ? buildYandexCalendarSubscriptionUrl(feedData.feedUrl, origin) : "";
	const googleUrl = feedData ? buildGoogleCalendarSubscriptionUrl(feedData.feedUrl, origin) : "";

	const selectedDoctor = staffDoctors.find((d) => d.id === selectedDoctorId);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
			data-testid="doctor-calendar-sync-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="calendar-sync-modal-title"
		>
			<div className="w-full max-w-2xl max-h-[92vh] rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl flex flex-col overflow-hidden text-[var(--ink,#0f172a)] animate-in fade-in zoom-in-95 duration-150">
				{/* Modal Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
							<Calendar className="w-5 h-5" aria-hidden="true" />
						</div>
						<div>
							<h2 id="calendar-sync-modal-title" className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] leading-tight">
								Синхронизация расписания (iCal / CalDAV)
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
								Яндекс Календарь • Apple Calendar (iPhone/Mac) • Google Календарь
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-11 h-11 rounded-xl flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] border border-transparent hover:border-[var(--line,#e2e8f0)] transition-all cursor-pointer"
						aria-label="Закрыть окно"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Modal Body */}
				<div className="p-4 sm:p-6 overflow-y-auto space-y-5">
					{/* Doctor selector */}
					{staffDoctors.length > 1 && (
						<div>
							<label htmlFor="calendar-doctor-select" className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] mb-2">
								Выберите врача
							</label>
							<select
								id="calendar-doctor-select"
								value={selectedDoctorId}
								onChange={(e) => setSelectedDoctorId(e.target.value)}
								className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-sm font-medium focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-hidden"
							>
								{staffDoctors.map((doc) => (
									<option key={doc.id} value={doc.id}>
										{doc.fullName || "Врач"} ({doc.role === "owner" ? "Руководитель" : "Врач"})
									</option>
								))}
							</select>
						</div>
					)}

					{/* 152-FZ Security Banner */}
					<div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
						<ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
						<div className="text-xs leading-relaxed">
							<span className="font-bold">152-ФЗ защита персональных данных:</span> во внешние календари передаются исключительно инициалы пациента (Пациент И.И.), номер медицинской карты и кабинет. Диагнозы, МКБ-10 и конфиденциальные примечания строго защищены и не экспортируются.
						</div>
					</div>

					{/* Loading State */}
					{isLoading && (
						<div className="py-8 flex flex-col items-center justify-center gap-3 text-[var(--muted,#64748b)]">
							<RefreshCw className="w-6 h-6 animate-spin text-[var(--teal,var(--brand-primary))]" />
							<span className="text-xs font-medium">Генерация защищенной персональной ссылки...</span>
						</div>
					)}

					{/* Error Message */}
					{errorMessage && !isLoading && (
						<div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5">
							<AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
							<div>{errorMessage}</div>
						</div>
					)}

					{/* Active Subscription Links */}
					{feedData && !isLoading && (
						<div className="space-y-4">
							{/* Direct iCal URL input */}
							<div>
								<div className="flex items-center justify-between mb-1.5">
									<label htmlFor="calendar-feed-url-input" className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
										<Lock className="w-3.5 h-3.5 text-amber-500" />
										<span>Персональная ссылка подписки (iCalendar / webcal)</span>
									</label>
									<span className="text-[10px] font-mono text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f8fafc)] px-2 py-0.5 rounded-md border border-[var(--line,#e2e8f0)]">
										Версия ключа: v{feedData.tokenVersion}
									</span>
								</div>
								<div className="flex gap-2">
									<input
										id="calendar-feed-url-input"
										type="text"
										readOnly
										value={webcalUrl || fullFeedUrl}
										className="flex-1 min-h-[44px] px-3 font-mono text-xs rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] select-all focus:outline-hidden"
										data-testid="calendar-feed-url-input"
									/>
									<button
										type="button"
										onClick={() => handleCopy(webcalUrl || fullFeedUrl, "feed")}
										className="min-h-[44px] px-4 rounded-xl font-medium text-xs bg-[var(--teal-dark,var(--brand-primary))] text-white hover:opacity-90 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
										data-testid="copy-calendar-link-btn"
									>
										{copiedKey === "feed" ? (
											<>
												<Check className="w-4 h-4 text-emerald-300" />
												<span>Скопировано</span>
											</>
										) : (
											<>
												<Copy className="w-4 h-4" />
												<span>Копировать</span>
											</>
										)}
									</button>
								</div>
							</div>

							{/* 1-Click Platform Integrations */}
							<div>
								<div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] mb-2">
									Быстрое подключение в 1 клик
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
									{/* Yandex Calendar */}
									<a
										href={yandexUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="p-3 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-700 dark:text-red-300 flex flex-col items-center justify-center gap-1 text-center transition-all group"
									>
										<div className="flex items-center gap-1.5 font-bold text-xs">
											<span>Яндекс Календарь</span>
											<ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
										</div>
										<span className="text-[10px] text-[var(--muted,#64748b)]">Добавить подписку</span>
									</a>

									{/* Apple Calendar (iOS / macOS) */}
									<a
										href={webcalUrl}
										className="p-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 hover:bg-sky-500/10 text-sky-700 dark:text-sky-300 flex flex-col items-center justify-center gap-1 text-center transition-all group"
									>
										<div className="flex items-center gap-1.5 font-bold text-xs">
											<Smartphone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
											<span>Apple Calendar</span>
										</div>
										<span className="text-[10px] text-[var(--muted,#64748b)]">iPhone, iPad, Mac</span>
									</a>

									{/* Google Calendar */}
									<a
										href={googleUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="p-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-700 dark:text-blue-300 flex flex-col items-center justify-center gap-1 text-center transition-all group"
									>
										<div className="flex items-center gap-1.5 font-bold text-xs">
											<Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
											<span>Google Календарь</span>
										</div>
										<span className="text-[10px] text-[var(--muted,#64748b)]">Веб и Android</span>
									</a>
								</div>
							</div>

							{/* Instructions Accordion */}
							<div className="p-3.5 rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs text-[var(--ink,#0f172a)] space-y-2">
								<div className="font-bold flex items-center gap-1.5 text-xs text-[var(--ink,#0f172a)]">
									<CheckCircle2 className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
									<span>Как это работает:</span>
								</div>
								<ul className="list-disc list-inside space-y-1 text-[11px] text-[var(--muted,#64748b)]">
									<li>Календарь автоматически синхронизируется каждые 15 минут.</li>
									<li>Переносы, отмены и новые записи обновляются автоматически.</li>
									<li>События содержат напоминания за 15 минут до начала приёма.</li>
								</ul>
							</div>

							{/* Token Rotation Section */}
							<div className="pt-2 border-t border-[var(--line,#e2e8f0)]">
								{!showRotationWarning ? (
									<div className="flex items-center justify-between">
										<div>
											<div className="text-xs font-semibold text-[var(--ink,#0f172a)]">
												Безопасность ссылки
											</div>
											<div className="text-[11px] text-[var(--muted,#64748b)]">
												Если ссылка была скомпрометирована или отправлена не тому лицу
											</div>
										</div>
										<button
											type="button"
											onClick={() => setShowRotationWarning(true)}
											className="min-h-[44px] px-3.5 rounded-xl text-xs font-medium border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
											data-testid="rotate-calendar-token-btn"
										>
											<Key className="w-3.5 h-3.5" />
											<span>Отозвать ссылку</span>
										</button>
									</div>
								) : (
									<div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2.5 animate-in fade-in duration-100">
										<div className="flex items-start gap-2.5">
											<AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
											<div className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
												<span className="font-bold">Внимание:</span> все ранее подключенные устройства и календари потеряют доступ к расписанию до тех пор, пока вы не вставите в них новую ссылку.
											</div>
										</div>
										<div className="flex justify-end gap-2 flex-wrap">
											<button
												type="button"
												onClick={() => setShowRotationWarning(false)}
												disabled={isRotating}
												className="min-h-[44px] px-4 rounded-xl text-xs font-medium border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer"
											>
												Отмена
											</button>
											<button
												type="button"
												onClick={handleRotateToken}
												disabled={isRotating}
												className="min-h-[44px] px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition-all cursor-pointer"
											>
												{isRotating ? (
													<RefreshCw className="w-3.5 h-3.5 animate-spin" />
												) : (
													<Key className="w-3.5 h-3.5" />
												)}
												<span>Подтвердить отзыв и выпустить новый ключ</span>
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex justify-end">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-5 rounded-xl text-xs font-semibold bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] transition-all cursor-pointer shadow-2xs"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
};
