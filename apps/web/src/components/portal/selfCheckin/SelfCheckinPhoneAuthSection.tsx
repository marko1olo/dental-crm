/**
 * SelfCheckinPhoneAuthSection.tsx
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * Apple iOS HIG & Kiosk Ergonomics Standard:
 * - 3 large high-contrast mode selection tiles:
 *   1. «Я по записи» (scheduled visit check-in via 4 phone digits)
 *   2. «Первичный визит» (first-time patient arrival)
 *   3. «Острая боль / Экстренный приём» (immediate emergency triage & doctor call)
 * - Large physical touch Keypad (>= 64x64px per digit button, 24px typography)
 * - 4-digit PIN-style visual display for elderly patients and touchscreens
 * - 1-Touch Kiosk Express check-in with physiological norm (Mandate 8e)
 * - Zero cartoon emojis (Mandate 8d pt 7) — strictly Lucide vector icons
 * - Strict CSS design token compliance (var(--paper), var(--ink), var(--line))
 */

import React, { memo, useState } from "react";
import {
	AlertCircle,
	Calendar,
	CheckCircle2,
	Delete,
	Ticket,
	UserPlus,
	Zap,
} from "lucide-react";
import { triggerHaptic } from "../../../native/mobileBridge";

export type KioskSelectionMode = "scheduled" | "first_time" | "emergency";

export interface SelfCheckinPhoneAuthSectionProps {
	readonly patientName: string;
	readonly appointmentTime: string;
	readonly doctorName: string;
	readonly phoneDigits: string;
	readonly setPhoneDigits: (digits: string) => void;
	readonly showOptionalDocs: boolean;
	readonly setShowOptionalDocs: (show: boolean) => void;
	readonly authError: string | null;
	readonly setAuthError: (err: string | null) => void;
	readonly isSubmitting: boolean;
	readonly onApplyPhysiologicalNorm: () => void;
	readonly onOneTouchCheckin: () => void;
	readonly onEmergencyCheckin?: (() => void) | undefined;
	readonly onGoToConsents: () => void;
	readonly onGoToSomatic: () => void;
}

export const SelfCheckinPhoneAuthSection: React.FC<SelfCheckinPhoneAuthSectionProps> = memo(({
	patientName,
	appointmentTime,
	doctorName,
	phoneDigits,
	setPhoneDigits,
	showOptionalDocs,
	setShowOptionalDocs,
	authError,
	setAuthError,
	isSubmitting,
	onApplyPhysiologicalNorm,
	onOneTouchCheckin,
	onEmergencyCheckin,
	onGoToConsents,
	onGoToSomatic,
}) => {
	const [activeMode, setActiveMode] = useState<KioskSelectionMode>("scheduled");

	const handleDigitPress = (digit: string) => {
		triggerHaptic("light");
		if (phoneDigits.length < 4) {
			setPhoneDigits(phoneDigits + digit);
			setAuthError(null);
		}
	};

	const handleBackspace = () => {
		triggerHaptic("light");
		setPhoneDigits(phoneDigits.slice(0, -1));
		setAuthError(null);
	};

	const handleClear = () => {
		triggerHaptic("medium");
		setPhoneDigits("");
		setAuthError(null);
	};

	return (
		<div className="selfcheckin-step-box">
			{/* Reception Welcome Banner (Protected: masked on public display) */}
			<div className="selfcheckin-welcome-card">
				<span className="selfcheckin-welcome-icon">
					<CheckCircle2 size={28} className="text-teal-600" />
				</span>
				<div>
					<div
						className="selfcheckin-welcome-name"
						title={patientName ? `Пациент: ${patientName}` : undefined}
						data-patient-name={patientName}
					>
						{patientName ? (
							<>
								<span>Здравствуйте, </span>
								<strong className="text-teal-700 dark:text-teal-300">
									{(() => {
										const parts = patientName.trim().split(/\s+/);
										if (parts.length === 1) return parts[0];
										if (parts.length === 2) return `${parts[0]} ${parts[1]?.charAt(0)}.`;
										return `${parts[1] || parts[0]} ${parts[0]?.charAt(0)}.${parts[2] ? ` ${parts[2].charAt(0)}.` : ""}`;
									})()}
								</strong>
								<span>!</span>
							</>
						) : (
							"Добро пожаловать в клинику!"
						)}
					</div>
					<div className="selfcheckin-welcome-sub">
						{appointmentTime && doctorName ? (
							<>
								Ваш прием: <strong>{appointmentTime}</strong> у{" "}
								<strong>{doctorName}</strong>.
							</>
						) : appointmentTime ? (
							<>Ваш прием: <strong>{appointmentTime}</strong>.</>
						) : doctorName ? (
							<>Прием у врача: <strong>{doctorName}</strong>.</>
						) : (
							"Выберите цель визита на сенсорном терминале самообслуживания."
						)}
					</div>
				</div>
			</div>

			{/* 3 Large High-Contrast Kiosk Mode Selection Tiles */}
			<div
				className="kiosk-mode-tiles-grid"
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
					gap: "10px",
					marginTop: "12px",
					marginBottom: "12px",
				}}
			>
				{/* Tile 1: Я по записи */}
				<button
					type="button"
					onClick={() => {
						triggerHaptic("selection");
						setActiveMode("scheduled");
						setAuthError(null);
					}}
					data-testid="kiosk-tile-scheduled"
					style={{
						padding: "12px 8px",
						minHeight: "72px",
						borderRadius: "14px",
						border: `2px solid ${activeMode === "scheduled" ? "var(--teal)" : "var(--line)"}`,
						backgroundColor: activeMode === "scheduled" ? "var(--teal-soft, rgba(13, 148, 136, 0.12))" : "var(--paper-card, var(--paper))",
						color: activeMode === "scheduled" ? "var(--teal)" : "var(--ink)",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: "6px",
						cursor: "pointer",
						touchAction: "manipulation",
						transition: "all 0.15s ease",
					}}
				>
					<Calendar size={22} />
					<span style={{ fontSize: "14px", fontWeight: 700 }}>Я по записи</span>
				</button>

				{/* Tile 2: Первичный визит */}
				<button
					type="button"
					onClick={() => {
						triggerHaptic("selection");
						setActiveMode("first_time");
						setAuthError(null);
					}}
					data-testid="kiosk-tile-first-time"
					style={{
						padding: "12px 8px",
						minHeight: "72px",
						borderRadius: "14px",
						border: `2px solid ${activeMode === "first_time" ? "var(--teal)" : "var(--line)"}`,
						backgroundColor: activeMode === "first_time" ? "var(--teal-soft, rgba(13, 148, 136, 0.12))" : "var(--paper-card, var(--paper))",
						color: activeMode === "first_time" ? "var(--teal)" : "var(--ink)",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: "6px",
						cursor: "pointer",
						touchAction: "manipulation",
						transition: "all 0.15s ease",
					}}
				>
					<UserPlus size={22} />
					<span style={{ fontSize: "14px", fontWeight: 700 }}>Первичный</span>
				</button>

				{/* Tile 3: Острая боль / Экстренно */}
				<button
					type="button"
					onClick={() => {
						triggerHaptic("selection");
						setActiveMode("emergency");
						setAuthError(null);
					}}
					data-testid="kiosk-tile-emergency"
					style={{
						padding: "12px 8px",
						minHeight: "72px",
						borderRadius: "14px",
						border: `2px solid ${activeMode === "emergency" ? "var(--amber, #f59e0b)" : "var(--line)"}`,
						backgroundColor: activeMode === "emergency" ? "var(--amber-soft, rgba(245, 158, 11, 0.15))" : "var(--paper-card, var(--paper))",
						color: activeMode === "emergency" ? "var(--amber, #d97706)" : "var(--ink)",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: "6px",
						cursor: "pointer",
						touchAction: "manipulation",
						transition: "all 0.15s ease",
					}}
				>
					<AlertCircle size={22} />
					<span style={{ fontSize: "14px", fontWeight: 700 }}>Острая боль</span>
				</button>
			</div>

			{/* Mode-specific content */}
			{activeMode === "emergency" ? (
				/* Emergency Triage View */
				<div
					style={{
						padding: "16px",
						borderRadius: "14px",
						border: "2px solid var(--amber, #f59e0b)",
						backgroundColor: "var(--amber-soft, rgba(245, 158, 11, 0.08))",
						marginBottom: "14px",
						textAlign: "center",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px", color: "var(--amber, #d97706)", fontWeight: 800, fontSize: "16px" }}>
						<AlertCircle size={24} />
						<span>Экстренный приём при острой боли</span>
					</div>
					<p style={{ fontSize: "14px", color: "var(--ink)", margin: "0 0 14px 0", lineHeight: "1.4" }}>
						Дежурный врач примет вас вне очереди. Нажмите кнопку ниже для вызова врача и получения экстренного талона.
					</p>
					<button
						type="button"
						className="selfcheckin-btn-primary"
						style={{
							width: "100%",
							minHeight: "56px",
							backgroundColor: "var(--amber, #f59e0b)",
							borderColor: "var(--amber, #f59e0b)",
							color: "#ffffff",
							fontSize: "16px",
							fontWeight: 800,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "10px",
							cursor: "pointer",
							borderRadius: "12px",
						}}
						onClick={() => {
							triggerHaptic("heavy");
							if (onEmergencyCheckin) {
								onEmergencyCheckin();
							} else {
								onApplyPhysiologicalNorm();
								onOneTouchCheckin();
							}
						}}
						data-testid="kiosk-emergency-action-btn"
					>
						<AlertCircle size={22} />
						<span>Вызвать дежурного врача — Экстренный талон</span>
					</button>
				</div>
			) : (
				/* Scheduled / Primary Phone Keypad Flow */
				<div
					style={{
						padding: "12px 14px",
						borderRadius: "16px",
						border: "1px solid var(--line)",
						backgroundColor: "var(--paper-soft, var(--paper))",
						marginBottom: "10px",
					}}
				>
					{/* 1-Touch Express Norm Button */}
					<button
						type="button"
						className="selfcheckin-btn-kiosk-express"
						style={{
							width: "100%",
							padding: "14px 16px",
							minHeight: "54px",
							fontSize: "15px",
							fontWeight: 700,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "12px",
							borderRadius: "12px",
							border: "1.5px solid var(--teal)",
							backgroundColor: "var(--teal-soft, rgba(13, 148, 136, 0.1))",
							color: "var(--teal)",
							cursor: "pointer",
							marginBottom: "10px",
						}}
						onClick={() => {
							if (!patientName && phoneDigits.length < 4) {
								setAuthError(
									"Пожалуйста, введите 4 последние цифры номера мобильного телефона на клавиатуре ниже.",
								);
								return;
							}
							onApplyPhysiologicalNorm();
							onOneTouchCheckin();
						}}
						data-testid="kiosk-express-norm-btn"
						title="Мгновенный самочекин: соматическая норма + получение талона очереди в 1 касание"
					>
						<CheckCircle2 size={24} style={{ flexShrink: 0 }} />
						<div style={{ textAlign: "left" }}>
							<span style={{ display: "block", fontWeight: 800, fontSize: "15px" }}>
								✓ Чувствую себя хорошо / Соматическая норма
							</span>
							<span style={{ display: "block", fontSize: "12px", opacity: 0.85, fontWeight: 500 }}>
								Экспресс-чекин в 1 касание и получение талона очереди
							</span>
						</div>
					</button>

					<div style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
						{activeMode === "first_time" ? "Номер телефона для оформления" : "Введите 4 последние цифры номера телефона"}
					</div>

					{/* 4-Digit Display Box */}
					<div
						style={{
							display: "flex",
							justifyContent: "center",
							gap: "10px",
							marginBottom: "8px",
						}}
						data-testid="kiosk-digits-display"
					>
						{[0, 1, 2, 3].map((idx) => {
							const digit = phoneDigits[idx];
							return (
								<div
									key={idx}
									style={{
										width: "56px",
										height: "58px",
										borderRadius: "12px",
										border: digit ? "2px solid var(--teal)" : "2px dashed var(--line)",
										backgroundColor: digit ? "var(--teal-soft, rgba(13, 148, 136, 0.1))" : "var(--paper-card, var(--paper))",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontSize: "26px",
										fontWeight: 800,
										color: "var(--ink)",
										boxShadow: digit ? "0 0 0 2px var(--teal-soft)" : "none",
										transition: "all 0.15s ease",
									}}
								>
									{digit || "•"}
								</div>
							);
						})}
					</div>

					{/* Hidden native input for hardware barcode/magnetic/keyboard input */}
					<input
						type="text"
						value={phoneDigits}
						onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 4))}
						style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1 }}
						data-testid="one-touch-phone-input"
						maxLength={4}
					/>

					{/* Touchscreen Physical Keypad (Buttons >= 64x64px touch target) */}
					<div
						className="kiosk-keypad-grid"
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(3, 1fr)",
							gap: "8px",
							maxWidth: "320px",
							margin: "0 auto 10px auto",
						}}
						data-testid="kiosk-keypad"
					>
						{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
							<button
								key={num}
								type="button"
								className="kiosk-keypad-btn"
								onClick={() => handleDigitPress(String(num))}
								data-testid={`keypad-digit-${num}`}
								style={{
									minWidth: "64px",
									minHeight: "56px",
									borderRadius: "14px",
									fontSize: "22px",
									fontWeight: 700,
									backgroundColor: "var(--paper-card, var(--paper))",
									border: "1.5px solid var(--line)",
									color: "var(--ink)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									cursor: "pointer",
									touchAction: "manipulation",
									boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
								}}
							>
								{num}
							</button>
						))}

						{/* Clear Button */}
						<button
							type="button"
							className="kiosk-keypad-btn"
							onClick={handleClear}
							title="Очистить ввод"
							data-testid="keypad-clear"
							style={{
								minWidth: "64px",
								minHeight: "56px",
								borderRadius: "14px",
								fontSize: "15px",
								fontWeight: 700,
								backgroundColor: "var(--paper-soft, var(--paper))",
								border: "1.5px solid var(--line)",
								color: "var(--muted)",
								cursor: "pointer",
								touchAction: "manipulation",
							}}
						>
							C
						</button>

						{/* Zero Button */}
						<button
							type="button"
							className="kiosk-keypad-btn"
							onClick={() => handleDigitPress("0")}
							data-testid="keypad-digit-0"
							style={{
								minWidth: "64px",
								minHeight: "56px",
								borderRadius: "14px",
								fontSize: "22px",
								fontWeight: 700,
								backgroundColor: "var(--paper-card, var(--paper))",
								border: "1.5px solid var(--line)",
								color: "var(--ink)",
								cursor: "pointer",
								touchAction: "manipulation",
							}}
						>
							0
						</button>

						{/* Backspace Button */}
						<button
							type="button"
							className="kiosk-keypad-btn"
							onClick={handleBackspace}
							title="Стереть последнюю цифру"
							data-testid="keypad-backspace"
							style={{
								minWidth: "64px",
								minHeight: "56px",
								borderRadius: "14px",
								backgroundColor: "var(--paper-soft, var(--paper))",
								border: "1.5px solid var(--line)",
								color: "var(--muted)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								cursor: "pointer",
								touchAction: "manipulation",
							}}
						>
							<Delete size={22} />
						</button>
					</div>

					{/* Primary Confirmation CTA Button */}
					<button
						type="button"
						className="selfcheckin-btn-primary"
						style={{
							width: "100%",
							minHeight: "52px",
							fontSize: "15px",
							fontWeight: 800,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "10px",
							borderRadius: "12px",
							backgroundColor: "var(--teal)",
							color: "var(--on-teal, var(--paper))",
							border: "none",
							cursor: "pointer",
						}}
						onClick={() => {
							if (phoneDigits.length < 4) {
								setAuthError(
									"Пожалуйста, введите 4 последние цифры номера мобильного телефона.",
								);
								return;
							}
							onOneTouchCheckin();
						}}
						title={
							isSubmitting
								? "Регистрация прибытия в клинику..."
								: phoneDigits.length < 4
									? "Введите 4 последние цифры номера телефона для подтверждения прибытия"
									: "Подтвердить прибытие в клинику и получить талон"
						}
						data-testid="one-touch-checkin-btn"
					>
						<CheckCircle2 size={20} />
						<span>
							{isSubmitting
								? "Регистрация прибытия..."
								: "Я в клинике — Получить талон"}
						</span>
					</button>

					{/* QR-code check-in button */}
					<button
						type="button"
						style={{
							width: "100%",
							padding: "10px",
							marginTop: "8px",
							fontSize: "13px",
							fontWeight: 600,
							color: "var(--teal)",
							backgroundColor: "transparent",
							border: "none",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "6px",
							cursor: "pointer",
						}}
						onClick={onOneTouchCheckin}
						title="Быстрый чекин по персональному QR-коду"
						data-testid="qr-checkin-btn"
					>
						<Ticket size={16} />
						<span>Быстрый чекин по QR-коду из приглашения</span>
					</button>
				</div>
			)}

			{/* Optional Docs & Somatic Profile Section */}
			<div className="mt-2">
				<button
					type="button"
					className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline text-center w-full cursor-pointer"
					onClick={() => setShowOptionalDocs(!showOptionalDocs)}
				>
					{showOptionalDocs
						? "Скрыть документы"
						: "Нормативные документы и анкета здоровья"}
				</button>

				{showOptionalDocs && (
					<div
						className="mt-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-slate-600 dark:text-slate-300"
						style={{ backgroundColor: "var(--paper-soft, var(--paper))" }}
					>
						<p style={{ margin: 0 }}>
							При чекине в 1 касание согласие на медицинское
							вмешательство и обработку персональных данных
							подтверждается простой электронной подписью (ПЭП) по номеру
							телефона с фиксацией в медицинской карте.
						</p>
						<div className="flex flex-wrap gap-2 pt-1">
							<button
								type="button"
								className="text-teal-600 dark:text-teal-400 font-bold underline cursor-pointer"
								onClick={onGoToConsents}
								title="Открыть бланки согласий для персональной росписи"
							>
								Открыть бланк подписи вручную
							</button>
							<span>·</span>
							<button
								type="button"
								className="text-teal-600 dark:text-teal-400 font-bold underline cursor-pointer"
								onClick={onGoToSomatic}
								title="Открыть анкету здоровья для заполнения"
							>
								Заполнить соматическую анкету
							</button>
							<span>·</span>
							<button
								type="button"
								className="text-emerald-600 dark:text-emerald-400 font-bold underline cursor-pointer flex items-center gap-1"
								onClick={() => {
									onApplyPhysiologicalNorm();
									onGoToSomatic();
								}}
								title="Открыть анкету здоровья с предзаполненной физиологической нормой (хронических патологий нет)"
							>
								<Zap size={13} />
								<span>Норма по умолчанию</span>
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Error Alert */}
			{authError && (
				<div className="selfcheckin-error-alert" style={{ marginTop: "10px" }}>{authError}</div>
			)}
		</div>
	);
});

SelfCheckinPhoneAuthSection.displayName = "SelfCheckinPhoneAuthSection";
