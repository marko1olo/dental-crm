import React from "react";

export interface PrintViewFooterAndSignaturesProps {
	readonly grandTotalFormatted: string;
	readonly doctorFullName: string;
	readonly patientName: string;
}

export const PrintViewFooterAndSignatures: React.FC<PrintViewFooterAndSignaturesProps> = ({
	grandTotalFormatted,
	doctorFullName,
	patientName,
}) => {
	return (
		<div className="relative z-10 pt-4 border-t-2 border-slate-800 space-y-4">
			<div className="flex justify-between items-baseline">
				<span className="text-sm font-bold text-slate-900 uppercase tracking-wide">
					Итоговая стоимость плана лечения:
				</span>
				<span className="text-2xl font-black text-slate-900 font-mono">
					{grandTotalFormatted}
				</span>
			</div>

			<div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed space-y-1">
				<div className="font-semibold text-slate-800 mb-1">Клинические и гарантийные условия:</div>
				<div>1. Лечение проводится в соответствии со стандартами медицинской помощи.</div>
				<div>2. Гарантийные обязательства клиники: Базовый — 1 год, Оптимальный — 2 года, Премиум — 5 лет при контрольных осмотрах каждые 6 месяцев.</div>
				<div>3. Пациент уведомлен о праве на налоговый вычет 13% НДФЛ от стоимости услуг (ст. 219 НК РФ).</div>
				<div>4. Стоимость услуг зафиксирована настоящей сметой.</div>
			</div>

			<div className="pt-6 grid grid-cols-2 gap-8 text-xs">
				<div>
					<div className="font-bold text-slate-800 mb-2">Исполнитель (Врач):</div>
					<div className="border-b border-slate-400 pb-1 mt-6 text-slate-700">
						_____________________ / {doctorFullName} /
					</div>
					<div className="text-[10px] text-slate-400 mt-1">подпись, расшифровка, М.П.</div>
				</div>

				<div>
					<div className="font-bold text-slate-800 mb-2">Заказчик (Пациент):</div>
					<div className="border-b border-slate-400 pb-1 mt-6 text-slate-700">
						_____________________ / {patientName} /
					</div>
					<div className="text-[10px] text-slate-400 mt-1">
						С планом лечения, этапами, сроками и сметой ознакомлен и согласен
					</div>
				</div>
			</div>
		</div>
	);
};
