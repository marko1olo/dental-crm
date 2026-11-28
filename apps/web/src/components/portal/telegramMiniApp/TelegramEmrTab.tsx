/**
 * DENTE POCKET CLINIC — EMR & PATIENT RETENTION TAB
 * (DOMAIN: Health Index, Next Visit, Referrals & NPS Survey)
 */

import React from "react";
import { Check, Clock, Share2, Star } from "lucide-react";

export interface TelegramEmrTabProps {
	npsScore: number | null;
	npsSubmitted: boolean;
	onRateNps: (score: number) => void;
	onShareReferral: () => void;
}

export const TelegramEmrTab: React.FC<TelegramEmrTabProps> = ({
	npsScore,
	npsSubmitted,
	onRateNps,
	onShareReferral,
}) => (
	<main className="tg-tab-content">
		<div className="bg-[var(--tg-card-bg)] border border-[var(--tg-border)] rounded-2xl p-4 shadow-sm">
			<div className="flex items-center justify-between mb-2">
				<div className="text-xs font-medium text-[var(--tg-text-muted)]">План лечения</div>
				<span className="text-xs font-bold text-[var(--primary,#0d9488)]">75% выполнено</span>
			</div>
			<div className="w-full bg-[var(--tg-card-inner)] h-2.5 rounded-full overflow-hidden mb-3">
				<div className="bg-[var(--primary,#0d9488)] h-full rounded-full w-3/4 transition-all duration-500" />
			</div>
			<div className="text-xs text-[var(--tg-text-muted)] space-y-1">
				<div className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400">
					<Check size={14} />
					<span>Профгигиена полости рта (Завершено)</span>
				</div>
				<div className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400">
					<Check size={14} />
					<span>Терапия кариеса зубов 16, 26 (Завершено)</span>
				</div>
				<div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400">
					<Clock size={14} />
					<span>Контрольный осмотр и герметизация (Ожидает)</span>
				</div>
			</div>
		</div>

		<div className="bg-[var(--tg-card-bg)] border border-[var(--tg-border)] rounded-2xl p-4 shadow-sm">
			<div className="flex items-center justify-between mb-2">
				<span className="text-xs font-medium text-[var(--primary,#0d9488)]">Ближайший визит</span>
				<span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--primary,#0d9488)]/15 text-[var(--primary,#0d9488)] border border-[var(--primary,#0d9488)]/30">
					Подтвержден
				</span>
			</div>
			<div className="text-base font-bold text-[var(--tg-text)]">Четверг, 12 октября в 14:00</div>
			<div className="text-xs text-[var(--tg-text-muted)] mt-1">Доктор: Смирнов А.В. • Кабинет 3 (Терапия)</div>
		</div>

		<div className="bg-[var(--tg-card-bg)] border border-[var(--tg-border)] rounded-2xl p-4 shadow-sm">
			<div className="flex items-center gap-2 mb-2">
				<div className="w-8 h-8 rounded-lg bg-[var(--primary,#0d9488)]/15 text-[var(--primary,#0d9488)] flex items-center justify-center font-bold">🎁</div>
				<div>
					<div className="text-sm font-bold text-[var(--tg-text)]">Подари другу 1 000 ₽</div>
					<div className="text-xs text-[var(--tg-text-muted)]">И получи +500 бонусов на свой счет</div>
				</div>
			</div>
			<p className="text-xs text-[var(--tg-text-muted)] leading-relaxed mb-3">
				Сертификат на 1 000 ₽ другу, а вам — 500 бонусов DENTE сразу после его записи.
			</p>
			<button
				type="button"
				className="w-full min-h-[44px] py-2.5 px-4 border-0 rounded-xl bg-[var(--primary,#0d9488)] hover:bg-[var(--primary-hover,#0f766e)] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
				onClick={onShareReferral}
			>
				<Share2 size={15} />
				<span>Отправить приглашение другу в Telegram</span>
			</button>
		</div>

		<div className="bg-[var(--tg-card-bg)] border border-[var(--tg-border)] rounded-2xl p-4 shadow-sm">
			<div className="text-sm font-bold text-[var(--tg-text)] mb-1">Оценка недавнего визита</div>
			<div className="text-xs text-[var(--tg-text-muted)] mb-3">Насколько вы довольны качеством лечения и сервисом?</div>

			{npsSubmitted ? (
				<div className="p-3 bg-[var(--tg-card-inner)] rounded-xl text-center space-y-2">
					<div className="text-xs text-[var(--primary,#0d9488)] font-bold">
						{npsScore === 5 ? "Спасибо за высшую оценку 5/5!" : "Спасибо за ваш отзыв!"}
					</div>
					<p className="text-[11px] text-[var(--tg-text-muted)]">
						{npsScore === 5 ? "Поддержите клинику отзывом на картах Яндекс или 2GIS." : "Руководство клиники уже уведомлено."}
					</p>
				</div>
			) : (
				<div className="flex justify-between gap-1.5">
					{[1, 2, 3, 4, 5].map((star) => (
						<button
							key={star}
							type="button"
							className="flex-1 py-2.5 bg-[var(--tg-card-inner)] hover:bg-[var(--tg-border)] border border-[var(--tg-border)] rounded-xl flex flex-col items-center justify-center gap-1 text-[var(--tg-text)] transition-all active:scale-95"
							onClick={() => onRateNps(star)}
						>
							<Star size={18} className={star === 5 ? "text-amber-400 fill-amber-400" : "text-[var(--tg-text-muted)]"} />
							<span className="text-xs font-bold">{star}</span>
						</button>
					))}
				</div>
			)}
		</div>
	</main>
);
