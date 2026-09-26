/**
 * SelfCheckinPhoneAuthSection.tsx
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * Renders the Express Check-in & Phone Authentication step:
 * - 1-Touch Kiosk Express check-in with physiological norm
 * - 4-digit phone confirmation input
 * - 1-Click arrival confirmation button
 * - QR code check-in button
 * - Optional statutory documents and somatic questionnaire triggers
 */

import React, { memo } from "react";
import { CheckCircle2, Ticket, Zap } from "lucide-react";

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
	onGoToConsents,
	onGoToSomatic,
}) => {
	return (
		<div className="selfcheckin-step-box">
			<div className="selfcheckin-welcome-card">
				<span className="selfcheckin-welcome-icon">
					<CheckCircle2 size={28} className="text-teal-600" />
				</span>
				<div>
					<div className="selfcheckin-welcome-name">
						Здравствуйте, {patientName}!
					</div>
					<div className="selfcheckin-welcome-sub">
						Ваш прием: <strong>{appointmentTime}</strong> у{" "}
						<strong>{doctorName}</strong>.
					</div>
				</div>
			</div>

			<div className="p-4 rounded-xl border border-teal-500/30 bg-teal-500/5 my-3 space-y-3">
				<button
					type="button"
					className="selfcheckin-btn-kiosk-express w-full py-3.5 px-4 text-base font-bold flex items-center justify-center gap-3 cursor-pointer"
					onClick={() => {
						onApplyPhysiologicalNorm();
						onOneTouchCheckin();
					}}
					data-testid="kiosk-express-norm-btn"
					title="Мгновенный самочекин для киоска: физиологическая норма + получение талона очереди в 1 касание"
				>
					<CheckCircle2 size={24} className="selfcheckin-kiosk-check-icon shrink-0" />
					<div className="selfcheckin-kiosk-text-col text-left">
						<span className="selfcheckin-kiosk-title block font-extrabold text-base">
							✓ Чувствую себя хорошо / Соматическая норма
						</span>
						<span className="selfcheckin-kiosk-sub block text-xs opacity-90 font-medium">
							Экспресс-чекин в 1 касание и получение талона очереди
						</span>
					</div>
				</button>

				<div className="selfcheckin-divider-or text-center text-xs font-bold text-slate-400 uppercase tracking-widest my-1">
					или подтверждение по номеру телефона
				</div>

				<label className="selfcheckin-label font-bold text-sm block">
					Последние 4 цифры номера телефона для подтверждения:
				</label>
				<input
					type="text"
					className="selfcheckin-input text-center text-xl font-mono font-black tracking-widest"
					value={phoneDigits}
					onChange={(e) =>
						setPhoneDigits(
							e.target.value.replace(/\D/g, "").slice(0, 4),
						)
					}
					placeholder="••••"
					maxLength={4}
					data-testid="one-touch-phone-input"
					autoFocus
				/>
				<button
					type="button"
					className="selfcheckin-btn-primary w-full py-3 text-base font-bold flex items-center justify-center gap-2"
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
				<button
					type="button"
					className="w-full py-2.5 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline flex items-center justify-center gap-1.5 cursor-pointer"
					onClick={onOneTouchCheckin}
					title={
						isSubmitting
							? "Регистрация прибытия..."
							: "Быстрый чекин по персональному QR-коду"
					}
					data-testid="qr-checkin-btn"
				>
					<Ticket size={16} />
					<span>Быстрый чекин по QR-коду из приглашения</span>
				</button>
			</div>

			<div className="mt-3">
				<button
					type="button"
					className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline text-center w-full"
					onClick={() => setShowOptionalDocs(!showOptionalDocs)}
				>
					{showOptionalDocs
						? "Скрыть нормативные документы"
						: "Нормативные документы (ИДС 323-ФЗ, 152-ФЗ) и анкета (по желанию)"}
				</button>

				{showOptionalDocs && (
					<div className="mt-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs space-y-2 text-slate-600 dark:text-slate-300">
						<p>
							При чекине в 1 касание согласие на медицинское
							вмешательство (323-ФЗ) и обработку данных (152-ФЗ)
							подтверждается простой электронной подписью по номеру
							телефона (ПЭП 63-ФЗ).
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

			{authError && (
				<div className="selfcheckin-error-alert">{authError}</div>
			)}
		</div>
	);
});

SelfCheckinPhoneAuthSection.displayName = "SelfCheckinPhoneAuthSection";
