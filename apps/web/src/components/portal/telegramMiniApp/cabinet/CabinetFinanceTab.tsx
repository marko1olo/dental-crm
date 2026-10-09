import React, { memo } from "react";
import { Share2 } from "lucide-react";

export interface CabinetFinanceTabProps {
	readonly bonusBalance: number;
	readonly depositBalance: number;
	readonly isDemo: boolean;
	readonly onShareReferral: () => void;
}

export const CabinetFinanceTab: React.FC<CabinetFinanceTabProps> = memo(({
	bonusBalance,
	depositBalance,
	isDemo,
	onShareReferral,
}) => {
	return (
		<main className="tg-tab-content">
			<div className="tg-section-header">
				<div>
					<h2 className="tg-section-title">Финансы & Бонусы</h2>
					<p className="tg-section-desc">
						Баланс клиники, кэшбэк и программа «Приведи друга»
					</p>
				</div>
			</div>

			{/* Карточка баланса */}
			<div className="tg-finance-balance-card">
				<div className="flex justify-between items-center mb-2">
					<span className="text-xs text-slate-400">Бонусный счет DENTE</span>
					<span className="text-xs font-bold text-teal-400">1 бонус = 1 рубль</span>
				</div>
				<div className="text-3xl font-black text-slate-100">
					{bonusBalance.toLocaleString("ru-RU")} ₽
				</div>

				<div className="mt-4 pt-3 border-t border-slate-700/60 flex justify-between items-center text-xs">
					<span className="text-slate-400">Депозит клиники (аванс):</span>
					<span className="font-bold text-slate-200">{depositBalance.toLocaleString("ru-RU")} ₽</span>
				</div>
			</div>

			{/* Карточка акции «Подари другу 1 000 ₽» */}
			<div className="tg-referral-card">
				<div className="flex items-center gap-2 mb-2">
					<div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
						🎁
					</div>
					<div>
						<div className="text-sm font-bold text-slate-100">Подари другу 1 000 ₽</div>
						<div className="text-xs text-slate-400">И получи +500 бонусов себе на счет</div>
					</div>
				</div>
				<p className="text-xs text-slate-300 leading-relaxed mb-3">
					Ваш друг получит персональный сертификат на 1 000 ₽ на первый визит или комплексную чистку, а вы — 500 бонусов DENTE сразу после его записи.
				</p>
				<button
					type="button"
					className="tg-cta-button bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
					onClick={onShareReferral}
				>
					<Share2 size={16} />
					<span>Отправить приглашение другу в Telegram</span>
				</button>
			</div>

			{/* Детализация начислений и списаний */}
			<div className="tg-grouped-card p-4">
				<div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
					История начислений и операций:
				</div>

				{isDemo ? (
					<div className="space-y-3">
						<div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
							<div>
								<div className="font-bold text-slate-200">+1 250 ₽ — Кэшбэк 5% за профгигиену</div>
								<div className="text-[11px] text-slate-400">28 сентября 2026</div>
							</div>
							<span className="text-xs font-bold text-emerald-400">+1 250</span>
						</div>

						<div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
							<div>
								<div className="font-bold text-slate-200">+500 ₽ — Бонус за друга (Михаил)</div>
								<div className="text-[11px] text-slate-400">14 сентября 2026</div>
							</div>
							<span className="text-xs font-bold text-emerald-400">+500</span>
						</div>

						<div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
							<div>
								<div className="font-bold text-slate-200">+1 000 ₽ — Приветственный бонус</div>
								<div className="text-[11px] text-slate-400">01 сентября 2026</div>
							</div>
							<span className="text-xs font-bold text-emerald-400">+1 000</span>
						</div>
					</div>
				) : (
					<div className="text-xs text-slate-400 py-3 text-center">
						Операций по программе лояльности пока не зарегистрировано
					</div>
				)}
			</div>
		</main>
	);
});

CabinetFinanceTab.displayName = "CabinetFinanceTab";
