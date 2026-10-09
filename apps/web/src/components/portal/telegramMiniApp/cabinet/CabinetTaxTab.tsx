import React, { memo } from "react";
import { FileCheck2 } from "lucide-react";

export interface CabinetTaxTabProps {
	readonly taxYear: number;
	readonly totalYearExpense: number;
	readonly calculatedDeduction: number;
	readonly onOpenTaxSheet: () => void;
}

export const CabinetTaxTab: React.FC<CabinetTaxTabProps> = memo(({
	taxYear,
	totalYearExpense,
	calculatedDeduction,
	onOpenTaxSheet,
}) => {
	return (
		<main className="tg-tab-content">
			<div className="tg-section-header">
				<div>
					<h2 className="tg-section-title">Налоговый вычет 13% (НДФЛ)</h2>
					<p className="tg-section-desc">
						Верните до 19 500 ₽ за стоматологическое лечение по форме ФНС КНД 1151156
					</p>
				</div>
			</div>

			{/* Главная карточка расчета вычета */}
			<div className="tg-tax-hero-card">
				<div className="flex items-center justify-between mb-3">
					<span className="tg-tax-period-tag">Налоговый период: {taxYear} год</span>
					<span className="tg-fns-law-pill">Приказ ФНС № ЕА-7-11/824@</span>
				</div>

				<div className="text-xs text-slate-400">Оплачено за лечение за {taxYear} год:</div>
				<div className="text-2xl font-black text-slate-100 mt-0.5">
					{totalYearExpense.toLocaleString("ru-RU")} ₽
				</div>

				<div className="tg-deduction-result-box mt-3">
					<div className="text-xs text-emerald-400 font-bold">Сумма к возврату на карту (13%):</div>
					<div className="text-3xl font-black text-emerald-400 mt-0.5">
						+{calculatedDeduction.toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-[11px] text-slate-400 mt-1">
						По ст. 219 НК РФ выплата поступает напрямую на ваш расчетный счет в банке
					</div>
				</div>

				<button
					type="button"
					className="tg-cta-button mt-4"
					onClick={onOpenTaxSheet}
				>
					<FileCheck2 size={18} />
					<span>Оформить справку КНД 1151156 в 1 тап</span>
				</button>
			</div>

			{/* Информационный гид в 3 шага */}
			<div className="tg-grouped-card p-4">
				<div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
					Как получить возврат 13% за 3 простых шага:
				</div>

				<div className="space-y-3">
					<div className="flex items-start gap-3">
						<div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
							1
						</div>
						<div>
							<div className="text-xs font-bold text-slate-200">Сформируйте справку здесь</div>
							<div className="text-[11px] text-slate-400">
								Мы мгновенно подставим все чеки, лицензию клиники и электронную подпись главврача.
							</div>
						</div>
					</div>

					<div className="flex items-start gap-3">
						<div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
							2
						</div>
						<div>
							<div className="text-xs font-bold text-slate-200">Отправьте в Личный кабинет ФНС</div>
							<div className="text-[11px] text-slate-400">
								Зайдите на nalog.gov.ru или приложение «Налоги ФЛ» и прикрепите готовый файл.
							</div>
						</div>
					</div>

					<div className="flex items-start gap-3">
						<div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
							3
						</div>
						<div>
							<div className="text-xs font-bold text-slate-200">Получите деньги на карту</div>
							<div className="text-[11px] text-slate-400">
								ФНС проверит заявление в ускоренном порядке (до 30 дней) и переведет средства.
							</div>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
});

CabinetTaxTab.displayName = "CabinetTaxTab";
