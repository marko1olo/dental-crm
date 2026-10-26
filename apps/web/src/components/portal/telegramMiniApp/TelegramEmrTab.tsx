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
		<div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 shadow-lg backdrop-blur-md">
			<div className="flex items-center justify-between mb-2">
				<div className="text-xs font-bold uppercase tracking-wider text-slate-400">План лечения</div>
				<span className="text-xs font-bold text-teal-400">75% выполнено</span>
			</div>
			<div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden mb-3">
				<div className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full w-3/4 transition-all duration-500" />
			</div>
			<div className="text-xs text-slate-300 space-y-1">
				<div className="flex items-center gap-1.5 text-emerald-400">
					<Check size={14} />
					<span>Профгигиена полости рта (Завершено)</span>
				</div>
				<div className="flex items-center gap-1.5 text-emerald-400">
					<Check size={14} />
					<span>Терапия кариеса зубов 16, 26 (Завершено)</span>
				</div>
				<div className="flex items-center gap-1.5 text-amber-400">
					<Clock size={14} />
					<span>Контрольный осмотр и герметизация (Ожидает)</span>
				</div>
			</div>
		</div>

		<div className="bg-gradient-to-br from-teal-950/60 to-slate-900 border border-teal-500/40 rounded-2xl p-4 shadow-md">
			<div className="flex items-center justify-between mb-2">
				<span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">Ближайший визит</span>
				<span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
					Подтвержден
				</span>
			</div>
			<div className="text-base font-bold text-slate-100">Четверг, 12 октября в 14:00</div>
			<div className="text-xs text-slate-300 mt-1">Доктор: Смирнов А.В. • Кабинет 3 (Терапия)</div>
		</div>

		<div className="bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-md">
			<div className="flex items-center gap-2 mb-2">
				<div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">🎁</div>
				<div>
					<div className="text-sm font-bold text-slate-100">Подари другу 1 000 ₽</div>
					<div className="text-xs text-slate-400">И получи +500 бонусов на свой счет</div>
				</div>
			</div>
			<p className="text-xs text-slate-300 leading-relaxed mb-3">
				Сертификат на 1 000 ₽ другу, а вам — 500 бонусов DENTE сразу после его записи.
			</p>
			<button
				type="button"
				className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
				onClick={onShareReferral}
			>
				<Share2 size={15} />
				<span>Отправить приглашение другу в Telegram</span>
			</button>
		</div>

		<div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 shadow-md">
			<div className="text-sm font-bold text-slate-100 mb-1">Оценка недавнего визита</div>
			<div className="text-xs text-slate-400 mb-3">Насколько вы довольны качеством лечения и сервисом?</div>

			{npsSubmitted ? (
				<div className="p-3 bg-slate-900/60 rounded-xl text-center space-y-2">
					<div className="text-xs text-teal-400 font-bold">
						{npsScore === 5 ? "⭐️ Спасибо за высшую оценку 5/5!" : "🙏 Спасибо за ваш отзыв!"}
					</div>
					<p className="text-[11px] text-slate-300">
						{npsScore === 5 ? "Поддержите клинику отзывом на картах Яндекс или 2GIS." : "Руководство клиники уже уведомлено."}
					</p>
				</div>
			) : (
				<div className="flex justify-between gap-1.5">
					{[1, 2, 3, 4, 5].map((star) => (
						<button
							key={star}
							type="button"
							className="flex-1 py-2.5 bg-slate-900/60 hover:bg-slate-700/80 border border-slate-700/60 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-200 transition-all active:scale-95"
							onClick={() => onRateNps(star)}
						>
							<Star size={18} className={star === 5 ? "text-amber-400 fill-amber-400" : "text-slate-400"} />
							<span className="text-xs font-bold">{star}</span>
						</button>
					))}
				</div>
			)}
		</div>
	</main>
);
