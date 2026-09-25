/**
 * DENTE Dental CRM — Booking Contacts & Submission Section
 *
 * Mandate 8s (Modular Architecture & Anti-Bloat)
 */

import type React from "react";
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	MessageSquare,
	Phone,
	Send,
	User,
} from "lucide-react";
import { BookingSmsBlock } from "./BookingSmsBlock";

export interface BookingContactsSectionProps {
	isTelegramContext: boolean;
	patientName: string;
	setPatientName: (name: string) => void;
	patientPhone: string;
	handlePhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	patientComment: string;
	setPatientComment: (comment: string) => void;
	hasAgreedToPrivacy: boolean;
	setHasAgreedToPrivacy: (agreed: boolean) => void;
	showSmsVerification: boolean;
	smsCodeSent: boolean;
	enteredSmsCode: string;
	setEnteredSmsCode: (code: string) => void;
	isSmsVerified: boolean;
	smsResendCountdown: number;
	smsError: string | null;
	handleSendSmsCode: () => void;
	handleVerifySmsCode: () => void;
	handleTelegramShareContact: () => void;
	submitError: string | null;
	setSubmitError: (error: string | null) => void;
	isSubmitting: boolean;
	onSubmit: (e?: React.FormEvent) => void;
}

export const BookingContactsSection: React.FC<BookingContactsSectionProps> = ({
	isTelegramContext,
	patientName,
	setPatientName,
	patientPhone,
	handlePhoneChange,
	patientComment,
	setPatientComment,
	hasAgreedToPrivacy,
	setHasAgreedToPrivacy,
	showSmsVerification,
	smsCodeSent,
	enteredSmsCode,
	setEnteredSmsCode,
	isSmsVerified,
	smsResendCountdown,
	smsError,
	handleSendSmsCode,
	handleVerifySmsCode,
	handleTelegramShareContact,
	submitError,
	setSubmitError,
	isSubmitting,
	onSubmit,
}) => {
	return (
		<section aria-labelledby="booking-contacts-heading" className="dbw-contacts-section">
			<h3 id="booking-contacts-heading" className="dbw-section-heading">
				<User size={18} /> Ваши контактные данные
			</h3>

			{/* Telegram 1-Tap Booking Banner when in Telegram context */}
			{isTelegramContext && (
				<div className="dbw-tg-1tap-card mb-4" data-testid="telegram-1tap-card">
					<div className="flex items-center justify-between gap-3 flex-wrap">
						<div className="flex items-center gap-2.5 min-w-0">
							<div className="w-8 h-8 rounded-full bg-[#229ED9]/15 text-[#229ED9] flex items-center justify-center shrink-0">
								<Send size={15} />
							</div>
							<div className="min-w-0">
								<div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
									<span>Telegram 1-тап запись</span>
									<span className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded font-semibold">
										Без ввода
									</span>
								</div>
								<div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
									{patientName ? `Профиль: ${patientName}` : "Автозаполнение данных профиля"}
								</div>
							</div>
						</div>

						<button
							type="button"
							onClick={handleTelegramShareContact}
							className="dbw-tg-share-btn text-xs font-bold px-3 py-2 rounded-lg bg-[#229ED9] hover:bg-[#1c8ec4] text-white flex items-center gap-1.5 transition-all active:scale-[0.98] min-h-[40px] shadow-sm"
							aria-label="Поделиться номером в Telegram"
						>
							<Phone size={13} />
							<span>Поделиться номером в Telegram</span>
						</button>
					</div>
				</div>
			)}

			<form onSubmit={onSubmit} noValidate>
				<div className="dbw-form-grid">
					<div className="dbw-form-group">
						<label htmlFor="patient-name-input" className="dbw-label">
							<User size={16} /> Ваше имя *
						</label>
						<input
							id="patient-name-input"
							data-testid="patient-name-input"
							type="text"
							placeholder="Иван Петров"
							value={patientName}
							onChange={(e) => {
								setPatientName(e.target.value);
								if (submitError) setSubmitError(null);
							}}
							className="dbw-input min-h-[44px]"
							required
						/>
					</div>

					<div className="dbw-form-group">
						<label htmlFor="patient-phone-input" className="dbw-label">
							<Phone size={16} /> Номер мобильного телефона *
						</label>
						<input
							id="patient-phone-input"
							data-testid="patient-phone-input"
							type="tel"
							placeholder="+7 (999) 000-00-00"
							value={patientPhone}
							onChange={handlePhoneChange}
							className="dbw-input font-mono min-h-[44px]"
							required
						/>
					</div>

					<div className="dbw-form-group">
						<label htmlFor="patient-comment-input" className="dbw-label">
							<MessageSquare size={16} /> Пожелания / Что вас беспокоит?
						</label>
						<textarea
							id="patient-comment-input"
							placeholder="Опишите цель визита (например: консультация, острая боль)"
							value={patientComment}
							onChange={(e) => setPatientComment(e.target.value)}
							rows={2}
							className="dbw-textarea"
						/>
					</div>
				</div>

				{/* Respectful callback notice (Mandates 8e, 8k, 8n) */}
				{!showSmsVerification && (
					<div
						className="dbw-callback-notice"
						data-testid="patient-callback-notice"
					>
						<Phone size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>
							Администратор клиники перезвонит вам по номеру <strong>{patientPhone || "телефона"}</strong> для согласования деталей визита.
						</span>
					</div>
				)}

				{/* Clinic SMS Verification Block if configured */}
				{showSmsVerification && (
					<BookingSmsBlock
						patientPhone={patientPhone}
						smsCodeSent={smsCodeSent}
						enteredSmsCode={enteredSmsCode}
						isSmsVerified={isSmsVerified}
						smsResendCountdown={smsResendCountdown}
						smsError={smsError}
						onSendSmsCode={handleSendSmsCode}
						onVerifySmsCode={handleVerifySmsCode}
						onCodeChange={setEnteredSmsCode}
					/>
				)}

				{/* Privacy Policy Checkbox (Mandate 8e: Non-blocking, default accepted) */}
				<div className="dbw-privacy-row">
					<input
						id="privacy-checkbox"
						data-testid="privacy-checkbox"
						type="checkbox"
						checked={hasAgreedToPrivacy}
						onChange={(e) => setHasAgreedToPrivacy(e.target.checked)}
						className="w-5 h-5 cursor-pointer min-w-[20px] min-h-[20px]"
					/>
					<label
						htmlFor="privacy-checkbox"
						className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-snug cursor-pointer py-2 flex items-center"
					>
						Я согласен на обработку персональных данных в соответствии с 152-ФЗ
					</label>
				</div>

				{submitError && (
					<div
						role="alert"
						className="dbw-alert-error"
						data-testid="step4-submit-error"
					>
						<AlertCircle size={18} /> {submitError}
					</div>
				)}

				<div className="dbw-submit-row pt-2">
					<button
						type="submit"
						disabled={isSubmitting}
						className="dbw-btn-confirm w-full min-h-[44px]"
						data-testid="step4-confirm-btn"
						aria-label="Подтвердить запись и записаться на приём"
					>
						{isSubmitting ? (
							<>
								<Clock size={18} className="animate-spin" />
								<span>Оформление записи...</span>
							</>
						) : (
							<>
								<CheckCircle2 size={18} />
								<span>Записаться на приём</span>
							</>
						)}
					</button>
				</div>
			</form>
		</section>
	);
};
