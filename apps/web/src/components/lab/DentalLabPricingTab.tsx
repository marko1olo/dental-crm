import React from "react";
import { CheckCircle2 } from "lucide-react";
import { money } from "../../AppHelpers";

export interface DentalLabPricingTabProps {
	priceRubInput: string;
	setPriceRubInput: (val: string) => void;
	clinicSharePct: number;
	setClinicSharePct: (val: number) => void;
	doctorSharePct: number;
	setDoctorSharePct: (val: number) => void;
	totalLabPriceRub: number;
	clinicAmountRub: number;
	doctorAmountRub: number;
	isBalanced: boolean;
	handleSharePreset: (clinic: number, doctor: number) => void;
}

export function DentalLabPricingTab({
	priceRubInput,
	setPriceRubInput,
	clinicSharePct,
	setClinicSharePct,
	doctorSharePct,
	setDoctorSharePct,
	totalLabPriceRub,
	clinicAmountRub,
	doctorAmountRub,
	isBalanced,
	handleSharePreset,
}: DentalLabPricingTabProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
					Себестоимость ЗТЛ и распределение расходов (Копеечная точность)
				</h3>
				<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
					Расчет удержания стоимости лабораторных услуг из гонорара лечащего врача с гарантией копеечного баланса.
				</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="space-y-1.5">
					<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
						Счет от зуботехнической лаборатории (Себестоимость, ₽)
					</label>
					<div className="relative">
						<input
							type="text"
							inputMode="decimal"
							placeholder="0.00"
							value={priceRubInput}
							onChange={(e) => setPriceRubInput(e.target.value)}
							className="w-full h-11 pl-3.5 pr-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
						/>
						<span className="absolute right-3.5 top-3 text-slate-400 font-bold">₽</span>
					</div>
				</div>

				<div className="space-y-1.5">
					<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
						Быстрые пресеты распределения
					</label>
					<div className="flex gap-2 pt-0.5">
						{[
							{ label: "100 / 0", c: 100, d: 0 },
							{ label: "50 / 50", c: 50, d: 50 },
							{ label: "70 / 30", c: 70, d: 30 },
							{ label: "0 / 100", c: 0, d: 100 },
						].map((p) => (
							<button
								key={p.label}
								type="button"
								onClick={() => handleSharePreset(p.c, p.d)}
								className={`min-h-[44px] flex-1 rounded-xl border text-xs font-bold transition-colors ${
									clinicSharePct === p.c && doctorSharePct === p.d
										? "bg-teal-600 text-white border-teal-600"
										: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
								}`}
							>
								{p.label}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Sliders & Percentage Input */}
			<div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 space-y-4">
				<div className="grid grid-cols-2 gap-4">
					<div>
						<div className="flex justify-between text-xs font-bold mb-1">
							<span className="text-blue-700 dark:text-blue-400">Доля клиники:</span>
							<span className="font-mono text-sm">{clinicSharePct}%</span>
						</div>
						<input
							type="range"
							min="0"
							max="100"
							value={clinicSharePct}
							onChange={(e) => {
								const c = Number(e.target.value);
								setClinicSharePct(c);
								setDoctorSharePct(100 - c);
							}}
							className="w-full h-3 accent-blue-600 cursor-pointer"
						/>
					</div>

					<div>
						<div className="flex justify-between text-xs font-bold mb-1">
							<span className="text-amber-700 dark:text-amber-400">Доля врача (Удержание):</span>
							<span className="font-mono text-sm">{doctorSharePct}%</span>
						</div>
						<input
							type="range"
							min="0"
							max="100"
							value={doctorSharePct}
							onChange={(e) => {
								const d = Number(e.target.value);
								setDoctorSharePct(d);
								setClinicSharePct(100 - d);
							}}
							className="w-full h-3 accent-amber-600 cursor-pointer"
						/>
					</div>
				</div>

				{/* Calculated Breakdown Card (>= 14px bold) */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
					<div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
						<span className="text-xs text-slate-500 dark:text-slate-400 block font-bold">
							Полная себестоимость ЗТЛ:
						</span>
						<span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-mono">
							{money(totalLabPriceRub)}
						</span>
					</div>

					<div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
						<span className="text-xs text-blue-700 dark:text-blue-300 block font-bold">
							Оплачивает клиника ({clinicSharePct}%):
						</span>
						<span className="text-base sm:text-lg font-extrabold text-blue-900 dark:text-blue-100 font-mono">
							{money(clinicAmountRub)}
						</span>
					</div>

					<div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
						<span className="text-xs text-amber-700 dark:text-amber-300 block font-bold">
							Удержание из гонорара врача ({doctorSharePct}%):
						</span>
						<span className="text-base sm:text-lg font-extrabold text-amber-900 dark:text-amber-100 font-mono">
							{money(doctorAmountRub)}
						</span>
					</div>
				</div>

				{isBalanced && (
					<div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
						<CheckCircle2 className="w-4 h-4" />
						<span>Баланс сверен с точностью до копейки (Penny-Drift Invariant OK)</span>
					</div>
				)}
			</div>
		</div>
	);
}
