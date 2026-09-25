import {
	CheckCircle2,
	Delete,
	Lock,
	LogOut,
	Pause,
	ShieldCheck,
	UserCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_INACTIVITY_TIMEOUT_KEY,
	DENTE_PRIVACY_SHIELD_LOCKED_KEY,
	DENTE_STAFF_TOKEN_KEY,
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import {
	type AuthArtItem,
	getCurrentTimeSlot,
	selectAuthArt,
} from "./authArtSelector";

export {
	DENTE_INACTIVITY_TIMEOUT_KEY,
	DENTE_PRIVACY_SHIELD_LOCKED_KEY,
};

export interface DoctorProfile {
	id?: string | number | undefined;
	fullName?: string | undefined;
	name?: string | undefined;
	role?: string | undefined;
	avatarUrl?: string | undefined;
	pinCode?: string | undefined;
	[key: string]: unknown;
}

export interface DoctorPrivacyShieldProps {
	readonly isOpen: boolean;
	readonly doctor?: DoctorProfile | null | undefined;
	readonly onUnlock: (user?: unknown) => void;
	readonly onClinicLogout?: (() => void) | undefined;
	readonly onFullLock?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export function getDoctorInitials(name?: string | null): string {
	if (!name || !name.trim()) return "ВР";
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		const first = parts[0]?.[0] || "";
		const second = parts[1]?.[0] || "";
		return `${first}${second}`.toUpperCase();
	}
	return (parts[0]?.slice(0, 2) || "ВР").toUpperCase();
}

export function formatDoctorRole(role?: string | null): string {
	switch (role) {
		case "doctor":
			return "Врач-стоматолог";
		case "assistant":
			return "Ассистент врача";
		case "admin":
			return "Администратор клиники";
		case "director":
		case "owner":
			return "Главный врач / Руководитель";
		default:
			return role || "Клинический специалист";
	}
}

/**
 * Получает таймаут неактивности в миллисекундах из localStorage.
 * Настраивается ключом `dente_inactivity_timeout_minutes` (по умолчанию: 5 минут).
 */
export function getInactivityTimeoutMs(): number {
	const raw = safeLocalStorageGetItem(DENTE_INACTIVITY_TIMEOUT_KEY);
	if (raw) {
		const val = Number.parseFloat(raw);
		if (!Number.isNaN(val) && val > 0) {
			return val * 60 * 1000;
		}
	}
	return 5 * 60 * 1000; // default 5 minutes
}

const PIN_KEYS = [
	["1", "2", "3"],
	["4", "5", "6"],
	["7", "8", "9"],
	["C", "0", "BACKSPACE"],
] as const;

/**
 * Экран приватности врача (152-ФЗ / Защита врачебной тайны)
 *
 * 1. Полностью перекрывает интерфейс с медицинскими данными тёмным стеклянным арт-фоном
 *    (selectAuthArt(manifest, { pack: 'dental-epic' })).
 * 2. Центрированная карточка: аватар текущего врача, статус «Приём приостановлен»,
 *    цифровой PIN-пад (4 цифры) для мгновенной разблокировки без перезагрузки страницы.
 * 3. Позволяет врачу мгновенно вернуться к открытой карточке пациента без потери
 *    набранного текста анамнеза, зубной формулы и несохраненных черновиков.
 */
export function DoctorPrivacyShield({
	isOpen,
	doctor,
	onUnlock,
	onClinicLogout,
	onFullLock,
	className = "",
}: DoctorPrivacyShieldProps) {
	const [manifest, setManifest] = useState<AuthArtItem[]>([]);
	const [selectedArt, setSelectedArt] = useState<AuthArtItem | null>(null);
	const [artLoaded, setArtLoaded] = useState(false);
	const [artError, setArtError] = useState(false);
	const [pin, setPin] = useState("");
	const [errorShake, setErrorShake] = useState(false);
	const [loading, setLoading] = useState(false);
	const [errorText, setErrorText] = useState<string | null>(null);

	const shakeTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);

	// Очистка таймеров при размонтировании
	useEffect(() => {
		return () => {
			if (shakeTimeoutRef.current) {
				clearTimeout(shakeTimeoutRef.current);
			}
		};
	}, []);

	// Сброс состояний загрузки арта при смене выбранного фона
	useEffect(() => {
		setArtLoaded(false);
		setArtError(false);
	}, [selectedArt]);

	// Загрузка манифеста арт-фонов
	useEffect(() => {
		if (!isOpen) return;

		let isMounted = true;
		fetch("/auth-art/manifest.json")
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				if (isMounted && Array.isArray(data)) {
					setManifest(data);
				}
			})
			.catch((err) => {
				logger.warn("[DoctorPrivacyShield] Failed to load auth art manifest:", err);
			});

		return () => {
			isMounted = false;
		};
	}, [isOpen]);

	// Выбор арт-фона из пакета 'dental-epic'
	useEffect(() => {
		if (!isOpen || manifest.length === 0) {
			setSelectedArt(null);
			return;
		}

		const slot = getCurrentTimeSlot();
		const isReducedMotion =
			typeof window !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		const art = selectAuthArt(manifest, {
			pack: "dental-epic",
			slot,
			saveData: false,
			reducedMotion: isReducedMotion,
		});

		setSelectedArt(art);
	}, [isOpen, manifest]);

	const failUnlock = useCallback((message: string) => {
		showToast(message, "error");
		setErrorText(message);
		setErrorShake(true);
		setPin("");
		if (shakeTimeoutRef.current) {
			clearTimeout(shakeTimeoutRef.current);
		}
		shakeTimeoutRef.current = setTimeout(() => setErrorShake(false), 500);
	}, []);

	const submitPin = useCallback(
		async (completedPin: string) => {
			setLoading(true);
			setErrorShake(false);
			setErrorText(null);

			try {
				const clinicToken = safeLocalStorageGetItem(DENTE_CLINIC_TOKEN_KEY);
				const targetUserId = doctor?.id;

				if (targetUserId) {
					const response = await fetch("/api/auth/staff/unlock", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"x-dente-clinic-token": clinicToken || "",
						},
						body: JSON.stringify({
							userId: targetUserId,
							pinCode: completedPin,
						}),
					});

					const rawBody = await response.text();
					let payload: {
						message?: unknown;
						staffToken?: unknown;
						user?: unknown;
					} | null = null;

					if (rawBody) {
						try {
							payload = JSON.parse(rawBody);
						} catch {
							logger.error(
								"[DoctorPrivacyShield] Server response is not JSON",
								response.status,
								rawBody.slice(0, 100),
							);
						}
					}

					if (response.ok) {
						const staffToken =
							typeof payload?.staffToken === "string"
								? payload.staffToken.trim()
								: "";
						if (staffToken) {
							safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, staffToken);
						}
						safeLocalStorageRemoveItem(DENTE_PRIVACY_SHIELD_LOCKED_KEY);
						setPin("");
						showToast("Приём возобновлен. Все данные на месте.", "success");
						onUnlock(payload?.user || doctor);
						return;
					}

					const rawMessage =
						typeof payload?.message === "string" ? payload.message.trim() : "";
					const serverMessage = /[А-Яа-яЁё]/.test(rawMessage)
						? rawMessage
						: "Неверный PIN-код сотрудника.";
					failUnlock(serverMessage);
					return;
				}

				// Автономный фоллбэк: если профиль врача передан с локальным pinCode
				if (doctor?.pinCode && doctor.pinCode !== completedPin) {
					failUnlock("Неверный PIN-код сотрудника.");
					return;
				}

				// Безопасная локальная разблокировка
				safeLocalStorageRemoveItem(DENTE_PRIVACY_SHIELD_LOCKED_KEY);
				setPin("");
				showToast("Приём возобновлен. Все данные на месте.", "success");
				onUnlock(doctor);
			} catch (err) {
				logger.error("[DoctorPrivacyShield] Unlock request error:", err);
				failUnlock("Ошибка связи с сервером при проверке PIN.");
			} finally {
				setLoading(false);
			}
		},
		[doctor, onUnlock, failUnlock],
	);

	const handleKeyPress = useCallback(
		(num: string) => {
			if (loading || pin.length >= 4) return;
			if (errorText) setErrorText(null);

			const nextPin = pin + num;
			setPin(nextPin);

			if (nextPin.length === 4) {
				void submitPin(nextPin);
			}
		},
		[loading, pin, errorText, submitPin],
	);

	const handleBackspace = useCallback(() => {
		if (loading || pin.length === 0) return;
		if (errorText) setErrorText(null);
		setPin((prev) => prev.slice(0, -1));
	}, [loading, pin.length, errorText]);

	const handleClear = useCallback(() => {
		if (loading) return;
		setPin("");
		setErrorText(null);
	}, [loading]);

	// Перехват клавиш физической клавиатуры (захват событий на уровне window)
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (/^[0-9]$/.test(e.key)) {
				e.preventDefault();
				e.stopPropagation();
				handleKeyPress(e.key);
			} else if (e.key === "Backspace") {
				e.preventDefault();
				e.stopPropagation();
				handleBackspace();
			} else if (e.key === "Escape" || e.key === "c" || e.key === "C") {
				e.preventDefault();
				e.stopPropagation();
				handleClear();
			}
		};

		window.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => {
			window.removeEventListener("keydown", handleKeyDown, { capture: true });
		};
	}, [isOpen, handleKeyPress, handleBackspace, handleClear]);

	const doctorDisplayName = useMemo(() => {
		return doctor?.fullName || doctor?.name || "Врач-стоматолог";
	}, [doctor]);

	const doctorInitials = useMemo(() => {
		return getDoctorInitials(doctorDisplayName);
	}, [doctorDisplayName]);

	const doctorRoleLabel = useMemo(() => {
		return formatDoctorRole(doctor?.role);
	}, [doctor?.role]);

	if (!isOpen) {
		return null;
	}

	return (
		<div
			className={`dnt-doctor-privacy-shield ${className}`}
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				zIndex: 9999,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				overflow: "hidden",
				padding: "16px",
				userSelect: "none",
				fontFamily: "Inter, system-ui, -apple-system, sans-serif",
			}}
			role="dialog"
			aria-modal="true"
			aria-label="Экран приватности врача (152-ФЗ)"
			data-testid="doctor-privacy-shield"
		>
			{/* 1. Тёмный стеклянный арт-фон (selectAuthArt) */}
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					zIndex: 0,
					overflow: "hidden",
					backgroundColor: selectedArt?.dominantColor || "var(--paper-strong, #090d16)",
					pointerEvents: "none",
				}}
			>
				{selectedArt?.lqip && (
					<div
						style={{
							position: "absolute",
							top: "-10px",
							left: "-10px",
							right: "-10px",
							bottom: "-10px",
							backgroundImage: `url(${selectedArt.lqip})`,
							backgroundSize: "cover",
							backgroundPosition: "center",
							filter: "blur(20px)",
							transform: "scale(1.05)",
							opacity: artLoaded && !artError ? 0.35 : 0.85,
							transition: "opacity 0.8s ease-in-out",
						}}
					/>
				)}

				{selectedArt && (
					<picture
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							display: "block",
						}}
					>
						{selectedArt.avif && (
							<source
								srcSet={`/auth-art/${selectedArt.avif}`}
								type="image/avif"
							/>
						)}
						{selectedArt.webp && (
							<source
								srcSet={`/auth-art/${selectedArt.webp}`}
								type="image/webp"
							/>
						)}
						<img
							src={`/auth-art/${selectedArt.webp || selectedArt.avif}`}
							alt=""
							loading="lazy"
							decoding="async"
							onLoad={() => setArtLoaded(true)}
							onError={() => setArtError(true)}
							style={{
								width: "100%",
								height: "100%",
								objectFit: "cover",
								objectPosition: "center",
								opacity: artLoaded && !artError ? 0.45 : 0,
								transition: "opacity 0.8s ease-in-out",
								display: "block",
							}}
						/>
					</picture>
				)}

				{/* Глубокий затемняющий слой матового стекла для 100% перекрытия медданных */}
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: "rgba(10, 15, 29, 0.86)",
						backdropFilter: "blur(28px)",
						WebkitBackdropFilter: "blur(28px)",
					}}
				/>

				{/* Мягкое радиальное биолюминесцентное свечение */}
				<div
					style={{
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%)",
						width: "600px",
						height: "600px",
						borderRadius: "50%",
						background:
							"radial-gradient(circle, rgba(13, 148, 136, 0.16) 0%, rgba(15, 23, 42, 0) 70%)",
						pointerEvents: "none",
					}}
				/>
			</div>

			{/* 2. Центрированная карточка врача */}
			<div
				className={`dnt-privacy-card ${errorShake ? "animate-shake" : "animate-fade-in-up"}`}
				style={{
					position: "relative",
					zIndex: 1,
					width: "100%",
					maxWidth: "360px",
					padding: "28px 24px 24px",
					background: "rgba(22, 27, 46, 0.78)",
					border: "1px solid rgba(255, 255, 255, 0.12)",
					borderRadius: "24px",
					boxShadow:
						"0 24px 48px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
					backdropFilter: "blur(20px)",
					WebkitBackdropFilter: "blur(20px)",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					textAlign: "center",
					color: "#ffffff",
				}}
			>
				{/* 152-ФЗ Бейдж врачебной тайны */}
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
						padding: "4px 10px",
						borderRadius: "9999px",
						backgroundColor: "rgba(13, 148, 136, 0.18)",
						border: "1px solid rgba(45, 212, 191, 0.35)",
						color: "#2dd4bf",
						fontSize: "11px",
						fontWeight: 600,
						marginBottom: "16px",
						letterSpacing: "0.02em",
					}}
				>
					<ShieldCheck size={13} className="shrink-0" />
					<span>152-ФЗ · Врачебная тайна</span>
				</div>

				{/* Аватар текущего врача */}
				<div
					style={{
						position: "relative",
						marginBottom: "12px",
					}}
				>
					{doctor?.avatarUrl ? (
						<img
							src={doctor.avatarUrl}
							alt={doctorDisplayName}
							style={{
								width: "68px",
								height: "68px",
								borderRadius: "50%",
								objectFit: "cover",
								border: "2px solid rgba(45, 212, 191, 0.6)",
								boxShadow: "0 0 20px rgba(13, 148, 136, 0.4)",
							}}
						/>
					) : (
						<div
							style={{
								width: "68px",
								height: "68px",
								borderRadius: "50%",
								backgroundColor: "rgba(30, 41, 59, 0.9)",
								border: "2px solid rgba(45, 212, 191, 0.6)",
								boxShadow: "0 0 20px rgba(13, 148, 136, 0.4)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "22px",
								fontWeight: 700,
								color: "#ffffff",
								letterSpacing: "0.05em",
							}}
						>
							{doctorInitials}
						</div>
					)}
					<div
						style={{
							position: "absolute",
							bottom: "-2px",
							right: "-2px",
							width: "24px",
							height: "24px",
							borderRadius: "50%",
							backgroundColor: "#0d9488",
							border: "2px solid #0f172a",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "#ffffff",
							boxShadow: "0 2px 4px rgba(0, 0, 0, 0.4)",
						}}
					>
						<Lock size={12} />
					</div>
				</div>

				{/* Имя и роль врача */}
				<h2
					style={{
						fontSize: "16px",
						fontWeight: 700,
						margin: "0 0 4px 0",
						color: "#ffffff",
						lineHeight: 1.25,
					}}
				>
					{doctorDisplayName}
				</h2>
				<p
					style={{
						fontSize: "12px",
						color: "rgba(255, 255, 255, 0.65)",
						margin: "0 0 12px 0",
					}}
				>
					{doctorRoleLabel}
				</p>

				{/* Статус «Приём приостановлен» */}
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
						padding: "4px 12px",
						borderRadius: "8px",
						backgroundColor: "rgba(245, 158, 11, 0.15)",
						border: "1px solid rgba(245, 158, 11, 0.35)",
						color: "#fbbf24",
						fontSize: "12px",
						fontWeight: 600,
						marginBottom: "14px",
					}}
				>
					<Pause size={13} className="shrink-0" />
					<span>Приём приостановлен</span>
				</div>

				{/* Описание сохранности данных */}
				<p
					style={{
						fontSize: "11px",
						color: "rgba(255, 255, 255, 0.65)",
						margin: "0 0 18px 0",
						lineHeight: 1.4,
						maxWidth: "280px",
					}}
				>
					Карточка пациента и набранный текст анамнеза сохранены. Введите 4-значный PIN-код для мгновенного возврата к работе.
				</p>

				{/* 4 точки PIN-кода */}
				<div
					style={{
						display: "flex",
						gap: "14px",
						marginBottom: "16px",
						justifyContent: "center",
					}}
					aria-label={`Введено цифр PIN-кода: ${pin.length} из 4`}
				>
					{[0, 1, 2, 3].map((idx) => {
						const isFilled = idx < pin.length;
						return (
							<div
								key={idx}
								style={{
									width: "14px",
									height: "14px",
									borderRadius: "50%",
									backgroundColor: isFilled
										? "#2dd4bf"
										: "rgba(255, 255, 255, 0.2)",
									boxShadow: isFilled
										? "0 0 10px rgba(45, 212, 191, 0.8)"
										: "none",
									transform: isFilled ? "scale(1.2)" : "scale(1)",
									transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
								}}
							/>
						);
					})}
				</div>

				{/* Сообщение об ошибке */}
				{errorText && (
					<div
						style={{
							color: "#f87171",
							fontSize: "12px",
							fontWeight: 600,
							marginBottom: "12px",
							lineHeight: 1.3,
						}}
						role="alert"
					>
						{errorText}
					</div>
				)}

				{/* Цифровой PIN-пад (4 ряда кнопок) */}
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(3, 1fr)",
						gap: "10px",
						width: "100%",
						maxWidth: "230px",
						marginBottom: "16px",
					}}
				>
					{PIN_KEYS.flat().map((key) => {
						if (key === "C") {
							return (
								<button
									key="clear"
									type="button"
									onClick={handleClear}
									disabled={loading || pin.length === 0}
									style={{
										width: "56px",
										height: "56px",
										borderRadius: "50%",
										border: "1px solid rgba(255, 255, 255, 0.08)",
										backgroundColor: "rgba(255, 255, 255, 0.04)",
										color: "rgba(255, 255, 255, 0.65)",
										fontSize: "14px",
										fontWeight: 600,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										cursor: loading || pin.length === 0 ? "default" : "pointer",
										opacity: loading || pin.length === 0 ? 0.4 : 1,
										transition: "all 0.15s ease",
									}}
									title="Очистить PIN-код (Esc)"
									aria-label="Очистить ввод"
								>
									C
								</button>
							);
						}

						if (key === "BACKSPACE") {
							return (
								<button
									key="backspace"
									type="button"
									onClick={handleBackspace}
									disabled={loading || pin.length === 0}
									style={{
										width: "56px",
										height: "56px",
										borderRadius: "50%",
										border: "1px solid rgba(255, 255, 255, 0.08)",
										backgroundColor: "rgba(255, 255, 255, 0.04)",
										color: "rgba(255, 255, 255, 0.75)",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										cursor: loading || pin.length === 0 ? "default" : "pointer",
										opacity: loading || pin.length === 0 ? 0.4 : 1,
										transition: "all 0.15s ease",
									}}
									title="Стереть последнюю цифру (Backspace)"
									aria-label="Стереть последнюю цифру"
								>
									<Delete size={18} />
								</button>
							);
						}

						return (
							<button
								key={key}
								type="button"
								onClick={() => handleKeyPress(key)}
								disabled={loading || pin.length >= 4}
								style={{
									width: "56px",
									height: "56px",
									borderRadius: "50%",
									border: "1px solid rgba(255, 255, 255, 0.09)",
									backgroundColor: "rgba(255, 255, 255, 0.06)",
									color: "#ffffff",
									fontSize: "20px",
									fontWeight: 600,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									cursor: loading || pin.length >= 4 ? "default" : "pointer",
									opacity: loading || pin.length >= 4 ? 0.5 : 1,
									transition: "all 0.15s ease",
								}}
								aria-label={`Цифра ${key}`}
							>
								{key}
							</button>
						);
					})}
				</div>

				{/* Дополнительные действия: завершение смены / смена сотрудника */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "12px",
						paddingTop: "6px",
						width: "100%",
						borderTop: "1px solid rgba(255, 255, 255, 0.08)",
					}}
				>
					{(onFullLock || onClinicLogout) && (
						<button
							type="button"
							onClick={() => {
								if (onFullLock) {
									onFullLock();
								} else if (onClinicLogout) {
									onClinicLogout();
								}
							}}
							style={{
								background: "none",
								border: "none",
								color: "rgba(255, 255, 255, 0.75)",
								fontSize: "11px",
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								cursor: "pointer",
								padding: "6px 8px",
								borderRadius: "6px",
								transition: "color 0.2s ease",
							}}
							title="Завершить смену и выйти на экран выбора сотрудника"
						>
							<LogOut size={12} />
							<span>Сменить врача / Завершить смену</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
