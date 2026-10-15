/**
 * TELEGRAM MINI APP BOOKING — SERVICE, TEETH COMPLAINTS & CONTACT INPUTS
 * (DOMAIN: Teeth Complaints Banner, 804n Services & Patient Contact Form)
 */

import React from "react";
import { Activity, Info, User } from "lucide-react";
import type { ToothComplaint } from "../TelegramInteractiveToothPicker";

export interface BookingServiceSelectorProps {
	attachedComplaints: readonly ToothComplaint[];
	patientFullName: string;
	patientPhone: string;
	patientComment: string;
	onBackToTeeth?: (() => void) | undefined;
	onChangePatientFullName: (name: string) => void;
	onChangePatientPhone: (phone: string) => void;
	onChangePatientComment: (comment: string) => void;
}

export const BookingServiceSelector: React.FC<BookingServiceSelectorProps> = ({
	attachedComplaints,
	patientFullName,
	patientPhone,
	patientComment,
	onBackToTeeth,
	onChangePatientFullName,
	onChangePatientPhone,
	onChangePatientComment,
}) => {
	return (
		<div className="space-y-3">
			{/* Баннер прикрепленных жалоб из зубной формулы */}
			{attachedComplaints.length > 0 ? (
				<div className="tg-attached-teeth-banner">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2 min-w-0">
							<div className="tg-teeth-badge-icon">
								<Activity size={16} />
							</div>
							<div className="min-w-0">
								<div className="text-xs font-bold text-[var(--tg-text)]">
									Выбрано для осмотра: {attachedComplaints.length}{" "}
									{attachedComplaints.length === 1 ? "зуб" : "зуба"}
								</div>
								<div className="text-xs text-[var(--tg-accent)] font-semibold truncate">
									{attachedComplaints.map((c) => `#${c.toothNumber}`).join(", ")} (
									{attachedComplaints[0]?.symptomLabel})
								</div>
							</div>
						</div>

						{onBackToTeeth && (
							<button
								type="button"
								className="tg-edit-teeth-btn"
								onClick={onBackToTeeth}
							>
								Изменить
							</button>
						)}
					</div>
				</div>
			) : (
				<div className="bg-[var(--tg-card-inner)] border border-[var(--tg-border)] rounded-2xl p-2.5 flex items-center justify-between text-xs text-[var(--tg-text-muted)]">
					<div className="flex items-center gap-2">
						<Info size={16} className="text-[var(--tg-accent)]" />
						<span>Хотите отметить беспокоящий зуб перед записью?</span>
					</div>
					{onBackToTeeth && (
						<button
							type="button"
							className="text-[11px] font-bold text-[var(--tg-accent)] underline cursor-pointer"
							onClick={onBackToTeeth}
						>
							Формула
						</button>
					)}
				</div>
			)}

			{/* Контактные данные пациента */}
			<div className="bg-[var(--tg-card-inner)] border border-[var(--tg-border)] rounded-2xl p-3 space-y-2">
				<div className="text-xs font-bold text-[var(--tg-text)] flex items-center gap-1.5">
					<User size={14} className="text-[var(--tg-accent)]" />
					<span>Подтверждение контактов:</span>
				</div>

				<div className="grid grid-cols-2 gap-2">
					<div>
						<label className="text-[10px] font-semibold text-[var(--tg-text-muted)] mb-1 block">
							Имя пациента:
						</label>
						<input
							type="text"
							value={patientFullName}
							onChange={(e) => onChangePatientFullName(e.target.value)}
							className="w-full bg-[var(--tg-card-bg)] border border-[var(--tg-border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--tg-text)] focus:outline-none focus:border-[var(--tg-accent)]"
							placeholder="Ваше имя"
						/>
					</div>
					<div>
						<label className="text-[10px] font-semibold text-[var(--tg-text-muted)] mb-1 block">
							Телефон для связи:
						</label>
						<input
							type="tel"
							value={patientPhone}
							onChange={(e) => onChangePatientPhone(e.target.value)}
							className="w-full bg-[var(--tg-card-bg)] border border-[var(--tg-border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--tg-text)] focus:outline-none focus:border-[var(--tg-accent)]"
							placeholder="+7 (___) ___-__-__"
						/>
					</div>
				</div>

				<div>
					<label className="text-[10px] font-semibold text-[var(--tg-text-muted)] mb-1 block">
						Пожелания или комментарий (необязательно):
					</label>
					<input
						type="text"
						value={patientComment}
						onChange={(e) => onChangePatientComment(e.target.value)}
						className="w-full bg-[var(--tg-card-bg)] border border-[var(--tg-border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--tg-text)] placeholder:text-[var(--tg-text-muted)] focus:outline-none focus:border-[var(--tg-accent)]"
						placeholder="Например: боюсь уколов / нужен снимок КТ"
					/>
				</div>
			</div>
		</div>
	);
};
