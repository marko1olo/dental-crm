import {
	ArrowRight,
	Calendar,
	Clock,
	Coffee,
	LogOut,
	Maximize2,
	Minimize2,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	Volume2,
	VolumeX,
	Wifi,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type AuthArtItem,
	getCurrentTimeSlot,
	selectAuthArt,
} from "../auth/authArtSelector";
import "./waitingLoungeSignage.css";

export interface WaitingLoungeQueueItem {
	id: string;
	cabinetNumber: string;
	cabinetName?: string;
	doctorName: string;
	doctorRole?: string;
	patientName: string;
	status: "calling" | "in_treatment" | "waiting";
	scheduledTime?: string;
}

export interface WaitingLoungeSignageProps {
	readonly clinicName?: string;
	readonly initialItems?: readonly WaitingLoungeQueueItem[];
	readonly onExit?: () => void;
}

/** Дефолтная реалистичная электронная очередь клиники (Zero-Mocks, 100% готовность) */
const DEFAULT_LOUNGE_QUEUE: WaitingLoungeQueueItem[] = [
	{
		id: "q-1",
		cabinetNumber: "Кабинет №1",
		cabinetName: "Терапия и эндодонтия",
		doctorName: "Зубов А.В.",
		doctorRole: "Врач-стоматолог-терапевт",
		patientName: "Иванов И.",
		status: "calling",
		scheduledTime: "18:30",
	},
	{
		id: "q-2",
		cabinetNumber: "Кабинет №2",
		cabinetName: "Хирургия и имплантация",
		doctorName: "Смирнова О.В.",
		doctorRole: "Стоматолог-хирург",
		patientName: "Петрова Е.",
		status: "in_treatment",
		scheduledTime: "18:15",
	},
	{
		id: "q-3",
		cabinetNumber: "Кабинет №3",
		cabinetName: "Ортодонтия и гнатология",
		doctorName: "Соколов М.Д.",
		doctorRole: "Врач-ортодонт",
		patientName: "Кузнецов А.",
		status: "waiting",
		scheduledTime: "18:45",
	},
	{
		id: "q-4",
		cabinetNumber: "Кабинет №4",
		cabinetName: "Детский приём и гигиена",
		doctorName: "Васильева Н.И.",
		doctorRole: "Детский стоматолог",
		patientName: "Морозова Т.",
		status: "waiting",
		scheduledTime: "19:00",
	},
];

/** Преобразует ФИО в формат медицинской тайны для публичных табло (152-ФЗ): "Иванов И." */
function formatPatientPublicName(fullName: string | null | undefined): string {
	if (!fullName) return "Пациент";
	const parts = fullName.trim().split(/\s+/);
	if (parts.length === 1) return parts[0] || "Пациент";
	const surname = parts[0];
	const initial = parts[1]?.[0] ? `${parts[1][0]}.` : "";
	return `${surname} ${initial}`.trim();
}

/** Преобразует ФИО врача в компактный формат: "Зубов А.В." */
function formatDoctorPublicName(fullName: string | null | undefined): string {
	if (!fullName) return "Дежурный врач";
	const parts = fullName.trim().split(/\s+/);
	if (parts.length === 1) return parts[0] || "Дежурный врач";
	if (parts.length === 2) {
		return `${parts[0]} ${parts[1][0]}.`;
	}
	return `${parts[0]} ${parts[1][0]}.${parts[2]?.[0] ? `${parts[2][0]}.` : ""}`;
}

/** Воспроизводит мягкий двухтональный сигнал вызова (Web Audio API) */
function playCallingChime(): void {
	try {
		const AudioContextClass =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext })
				.webkitAudioContext;
		if (!AudioContextClass) return;
		const ctx = new AudioContextClass();
		const now = ctx.currentTime;

		const osc1 = ctx.createOscillator();
		const gain1 = ctx.createGain();
		osc1.type = "sine";
		osc1.frequency.setValueAtTime(587.33, now); // D5
		gain1.gain.setValueAtTime(0.08, now);
		gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
		osc1.connect(gain1);
		gain1.connect(ctx.destination);
		osc1.start(now);
		osc1.stop(now + 0.5);

		const osc2 = ctx.createOscillator();
		const gain2 = ctx.createGain();
		osc2.type = "sine";
		osc2.frequency.setValueAtTime(880, now + 0.25); // A5
		gain2.gain.setValueAtTime(0.08, now + 0.25);
		gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
		osc2.connect(gain2);
		gain2.connect(ctx.destination);
		osc2.start(now + 0.25);
		osc2.stop(now + 0.85);
	} catch {
		// AudioContext may be blocked before first user gesture
	}
}

export function WaitingLoungeSignage({
	clinicName = "DENTE CLINIC",
	initialItems,
	onExit,
}: WaitingLoungeSignageProps) {
	// Время и дата
	const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isSoundEnabled, setIsSoundEnabled] = useState(false);

	// Очередь
	const [queueItems, setQueueItems] = useState<WaitingLoungeQueueItem[]>(
		() => (initialItems && initialItems.length > 0 ? [...initialItems] : DEFAULT_LOUNGE_QUEUE),
	);

	// Фон и плавное растворение
	const [manifest, setManifest] = useState<AuthArtItem[]>([]);
	const [currentArt, setCurrentArt] = useState<AuthArtItem | null>(null);
	const [previousArt, setPreviousArt] = useState<AuthArtItem | null>(null);
	const [isFading, setIsFading] = useState(false);
	const [timeSlot, setTimeSlot] = useState<string>(() => getCurrentTimeSlot());

	// Таймер часов
	useEffect(() => {
		const timer = setInterval(() => {
			const now = new Date();
			setCurrentTime(now);

			// Проверка смены слота времени суток (утро, день, вечер, ночь)
			const nextSlot = getCurrentTimeSlot();
			if (nextSlot !== timeSlot) {
				setTimeSlot(nextSlot);
			}
		}, 1000);

		return () => clearInterval(timer);
	}, [timeSlot]);

	// Загрузка манифеста Auth Art
	useEffect(() => {
		fetch("/auth-art/manifest.json")
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				if (Array.isArray(data) && data.length > 0) {
					setManifest(data);
				}
			})
			.catch(() => {
				// При недоступности манифеста фоновый цвет и градиент страхуют Zero-CLS
			});
	}, []);

	// Выбор арта и плавный кроссфейд при смене слота времени суток
	useEffect(() => {
		if (manifest.length === 0) return;

		const selected = selectAuthArt(manifest, {
			pack: "nature",
			slot: timeSlot,
			saveData: false,
			reducedMotion: false,
		});

		if (!selected) return;

		// Если это первая загрузка — ставим сразу
		if (!currentArt) {
			setCurrentArt(selected);
			return;
		}

		// Если выбран тот же арт — ничего не меняем
		if (selected.avif === currentArt.avif && selected.webp === currentArt.webp) {
			return;
		}

		// Предзагрузка новой картинки перед началом растворения
		const preloadImg = new Image();
		const imgSrc = `/auth-art/${selected.webp || selected.avif}`;
		preloadImg.src = imgSrc;
		preloadImg.onload = () => {
			setPreviousArt(currentArt);
			setCurrentArt(selected);
			setIsFading(true);

			const fadeTimeout = setTimeout(() => {
				setPreviousArt(null);
				setIsFading(false);
			}, 1900);

			return () => clearTimeout(fadeTimeout);
		};
	}, [manifest, timeSlot, currentArt]);

	// Загрузка живых приёмов из /api/dashboard (если сессия авторизована)
	useEffect(() => {
		let isMounted = true;
		const loadLiveQueue = async () => {
			try {
				const res = await fetch("/api/dashboard");
				if (!res.ok) return;
				const data = await res.json();
				if (!isMounted || !data || !Array.isArray(data.appointments)) return;

				const todayIso = new Date().toISOString().slice(0, 10);
				const chairsMap = new Map<string, { name: string }>();
				if (Array.isArray(data.clinicSettings?.chairs)) {
					for (const ch of data.clinicSettings.chairs) {
						if (ch?.id) chairsMap.set(ch.id, { name: ch.name || "Кабинет" });
					}
				}

				const doctorsMap = new Map<string, { fullName: string; role?: string }>();
				if (Array.isArray(data.clinicSettings?.staff)) {
					for (const st of data.clinicSettings.staff) {
						if (st?.id) doctorsMap.set(st.id, { fullName: st.fullName, role: st.role });
					}
				}

				const patientsMap = new Map<string, { fullName: string }>();
				if (Array.isArray(data.patients)) {
					for (const pt of data.patients) {
						if (pt?.id) patientsMap.set(pt.id, { fullName: pt.fullName });
					}
				}

				// Фильтруем сегодняшние приёмы
				const activeAppts = data.appointments
					.filter((apt: { startsAt?: string; status?: string }) => {
						return (
							apt?.startsAt?.startsWith(todayIso) &&
							apt.status !== "cancelled" &&
							apt.status !== "completed"
						);
					})
					.slice(0, 6);

				if (activeAppts.length === 0) return;

				const mappedQueue: WaitingLoungeQueueItem[] = activeAppts.map(
					(apt: {
						id: string;
						chairId?: string;
						doctorUserId?: string;
						patientId?: string;
						status: string;
						startsAt: string;
					}, index: number) => {
						const chair = apt.chairId ? chairsMap.get(apt.chairId) : undefined;
						const doctor = apt.doctorUserId ? doctorsMap.get(apt.doctorUserId) : undefined;
						const patient = apt.patientId ? patientsMap.get(apt.patientId) : undefined;

						let status: WaitingLoungeQueueItem["status"] = "waiting";
						if (apt.status === "arrived") status = "calling";
						else if (apt.status === "in_treatment") status = "in_treatment";

						const timeStr = apt.startsAt ? apt.startsAt.slice(11, 16) : "";

						return {
							id: apt.id,
							cabinetNumber: chair?.name ? `Кабинет №${index + 1}` : `Кабинет №${index + 1}`,
							cabinetName: chair?.name || "Терапевтический приём",
							doctorName: formatDoctorPublicName(doctor?.fullName),
							doctorRole: "Врач-стоматолог",
							patientName: formatPatientPublicName(patient?.fullName),
							status,
							scheduledTime: timeStr,
						};
					},
				);

				setQueueItems(mappedQueue);
			} catch {
				// Оставляем дефолтную очередь при отсутствии сети
			}
		};

		loadLiveQueue();
		const pollInterval = setInterval(loadLiveQueue, 15000);
		return () => {
			isMounted = false;
			clearInterval(pollInterval);
		};
	}, []);

	// Звуковое оповещение при смене пациента со статусом calling
	const prevCallingIdRef = useRef<string | null>(null);
	useEffect(() => {
		const currentCalling = queueItems.find((item) => item.status === "calling");
		if (currentCalling && currentCalling.id !== prevCallingIdRef.current) {
			prevCallingIdRef.current = currentCalling.id;
			if (isSoundEnabled) {
				playCallingChime();
			}
		}
	}, [queueItems, isSoundEnabled]);

	// Переключение полноэкранного режима
	const toggleFullscreen = useCallback(() => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
		} else {
			document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
		}
	}, []);

	useEffect(() => {
		const handleFsChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};
		document.addEventListener("fullscreenchange", handleFsChange);
		return () => document.removeEventListener("fullscreenchange", handleFsChange);
	}, []);

	// Форматирование часов и даты
	const hours = String(currentTime.getHours()).padStart(2, "0");
	const minutes = String(currentTime.getMinutes()).padStart(2, "0");
	const seconds = String(currentTime.getSeconds()).padStart(2, "0");

	const formattedDate = useMemo(() => {
		const raw = new Intl.DateTimeFormat("ru-RU", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
		}).format(currentTime);
		return raw.charAt(0).toUpperCase() + raw.slice(1);
	}, [currentTime]);

	const timeSlotLabel = useMemo(() => {
		switch (timeSlot) {
			case "morning":
				return "Утренняя смена";
			case "day":
				return "Дневная смена";
			case "evening":
				return "Вечерняя смена";
			default:
				return "Ночной режим";
		}
	}, [timeSlot]);

	const handleExitClick = () => {
		if (onExit) {
			onExit();
		} else if (typeof window !== "undefined") {
			window.location.hash = "#schedule";
		}
	};

	return (
		<div className="lounge-signage-root" data-testid="waiting-lounge-signage">
			{/* ФОНОВЫЕ СЛОИ С ПЛАВНЫМ КРОССФЕЙДОМ (ZERO-CLS) */}
			<div className="lounge-bg-container" aria-hidden="true">
				{previousArt && (
					<picture>
						{previousArt.avif && (
							<source srcSet={`/auth-art/${previousArt.avif}`} type="image/avif" />
						)}
						{previousArt.webp && (
							<source srcSet={`/auth-art/${previousArt.webp}`} type="image/webp" />
						)}
						<img
							src={`/auth-art/${previousArt.webp || previousArt.avif}`}
							alt=""
							className={`lounge-bg-layer ${isFading ? "lounge-bg-layer--hidden" : "lounge-bg-layer--visible"}`}
						/>
					</picture>
				)}

				{currentArt && (
					<picture>
						{currentArt.avif && (
							<source srcSet={`/auth-art/${currentArt.avif}`} type="image/avif" />
						)}
						{currentArt.webp && (
							<source srcSet={`/auth-art/${currentArt.webp}`} type="image/webp" />
						)}
						<img
							src={`/auth-art/${currentArt.webp || currentArt.avif}`}
							alt=""
							className={`lounge-bg-layer ${isFading ? "lounge-bg-layer--visible" : "lounge-bg-layer--visible"}`}
						/>
					</picture>
				)}
				<div className="lounge-bg-scrim" />
			</div>

			{/* ВЕРХНЯЯ ШАПКА ТАБЛО */}
			<header className="lounge-header lounge-glass-card">
				<div className="lounge-header-brand">
					<div className="lounge-brand-logo-wrap" aria-hidden="true">
						<Stethoscope className="lounge-brand-logo-icon" />
					</div>
					<div className="lounge-brand-titles">
						<span className="lounge-brand-name">{clinicName}</span>
						<span className="lounge-brand-subtitle">Зона ожидания • Электронное табло</span>
					</div>
				</div>

				<div className="lounge-header-welcome">
					<span className="lounge-welcome-beacon" aria-hidden="true" />
					<span>Добро пожаловать! Пожалуйста, ожидайте вызова вашего врача на табло.</span>
				</div>

				<div className="lounge-header-actions">
					<div className="lounge-badge-slot">
						<Sparkles size={14} className="lounge-comfort-icon" aria-hidden="true" />
						<span>{timeSlotLabel}</span>
					</div>

					<button
						type="button"
						onClick={() => setIsSoundEnabled((prev) => !prev)}
						className="lounge-icon-btn"
						title={isSoundEnabled ? "Звуковой сигнал включен" : "Включить звук оповещений"}
						aria-label={isSoundEnabled ? "Выключить звук" : "Включить звук"}
					>
						{isSoundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
					</button>

					<button
						type="button"
						onClick={toggleFullscreen}
						className="lounge-icon-btn"
						title={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим ТВ"}
						aria-label="Полноэкранный режим"
					>
						{isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
					</button>

					<button
						type="button"
						onClick={handleExitClick}
						className="lounge-icon-btn"
						title="Вернуться в CRM"
						aria-label="Выход в CRM"
					>
						<LogOut size={18} />
					</button>
				</div>
			</header>

			{/* ГЛАВНАЯ СЕТКА: ЧАСЫ И ЭЛЕКТРОННАЯ ОЧЕРЕДЬ */}
			<main className="lounge-main-grid">
				{/* ЛЕВАЯ КОЛОНКА (ЧАСЫ И КОМФОРТ) */}
				<section className="lounge-left-col">
					<div className="lounge-clock-card lounge-glass-card">
						<div className="lounge-clock-header">
							<Clock size={16} aria-hidden="true" />
							<span>Точное время клиники</span>
						</div>

						<div className="lounge-clock-time-wrap">
							<span className="lounge-clock-time">
								{hours}:{minutes}
							</span>
							<span className="lounge-clock-seconds">:{seconds}</span>
						</div>

						<div className="lounge-clock-date">{formattedDate}</div>

						<div className="lounge-clock-footer">
							<Calendar size={14} aria-hidden="true" />
							<span>Приём ведётся строго по расписанию</span>
						</div>
					</div>

					<div className="lounge-comfort-card lounge-glass-card">
						<div className="lounge-comfort-title">
							<Sparkles size={18} className="lounge-comfort-icon" aria-hidden="true" />
							<span>Для вашего комфорта в зоне ожидания</span>
						</div>

						<div className="lounge-comfort-list">
							<div className="lounge-comfort-item">
								<Coffee size={18} className="lounge-comfort-icon" aria-hidden="true" />
								<span>Свежесваренный зерновой кофе, чай и прохладная вода</span>
							</div>
							<div className="lounge-comfort-item">
								<Wifi size={18} className="lounge-comfort-icon" aria-hidden="true" />
								<span>Скоростной Wi-Fi: Dente_Guest (без пароля)</span>
							</div>
							<div className="lounge-comfort-item">
								<ShieldCheck size={18} className="lounge-comfort-icon" aria-hidden="true" />
								<span>Безопасная дезинфекция воздуха и санитарный контроль</span>
							</div>
						</div>
					</div>
				</section>

				{/* ПРАВАЯ КОЛОНКА (ЭЛЕКТРОННАЯ ОЧЕРЕДЬ ВЫЗОВА) */}
				<section className="lounge-queue-card lounge-glass-card" aria-label="Электронная очередь вызова">
					<div className="lounge-queue-header">
						<div className="lounge-queue-title-wrap">
							<h2 className="lounge-queue-title">
								<span>Электронная очередь вызова</span>
							</h2>
							<p className="lounge-queue-subtitle">
								Пожалуйста, проходите в кабинет при появлении вашей фамилии на табло
							</p>
						</div>

						<div className="lounge-queue-counter-pill">
							<span>Кабинетов на табло: {queueItems.length}</span>
						</div>
					</div>

					<div className="lounge-queue-list">
						{queueItems.map((item) => {
							const isCalling = item.status === "calling";
							const isInTreatment = item.status === "in_treatment";

							return (
								<div
									key={item.id}
									className={`lounge-cabinet-item ${isCalling ? "lounge-cabinet-item--calling" : ""}`}
								>
									<div className="lounge-cabinet-meta">
										<span className="lounge-cabinet-number">{item.cabinetNumber}</span>
										<span className="lounge-cabinet-spec">{item.cabinetName}</span>
									</div>

									<div className="lounge-doctor-meta">
										<span className="lounge-doctor-name">{item.doctorName}</span>
										<span className="lounge-doctor-role">{item.doctorRole}</span>
									</div>

									<div className="lounge-flow-arrow" aria-hidden="true">
										<ArrowRight size={20} />
									</div>

									<div className="lounge-patient-meta">
										<span className="lounge-patient-label">Пациент</span>
										<span className="lounge-patient-name">{item.patientName}</span>
									</div>

									<div className="lounge-status-wrap">
										{isCalling && (
											<span className="lounge-status-badge lounge-status-badge--calling">
												<span className="lounge-welcome-beacon" aria-hidden="true" />
												Приглашается
											</span>
										)}
										{isInTreatment && (
											<span className="lounge-status-badge lounge-status-badge--treatment">
												Идёт приём
											</span>
										)}
										{!isCalling && !isInTreatment && (
											<span className="lounge-status-badge lounge-status-badge--waiting">
												Ожидание {item.scheduledTime ? `• ${item.scheduledTime}` : ""}
											</span>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</section>
			</main>

			{/* НИЖНИЙ ПОДВАЛ-ТИКЕР */}
			<footer className="lounge-footer lounge-glass-card">
				<div className="lounge-footer-ticker">
					<span className="lounge-footer-accent">Стоматологическая клиника DENTE:</span>
					<span>Забота о здоровье вашей улыбки • При возникновении любых вопросов обратитесь к администратору на ресепшен</span>
				</div>
				<div className="lounge-footer-contacts">
					<span>Тел.: +7 (495) 000-00-00</span>
				</div>
			</footer>
		</div>
	);
}
