import React from "react";
import { DollarSign } from "lucide-react";

export interface ImplantEconomicsSectionProps {
	readonly operationPriceRub: number;
	readonly setOperationPriceRub?: ((price: number) => void) | undefined;
	readonly implantCostRub: number;
	readonly consumablesCostRub: number;
	readonly doctorGrossMarginRub: number;
}


/**
 * Экономика соло-хирурга / частной клиники (Мандат 8n).
 * Прозрачный расчет: стоимость операции минус себестоимость винта и расходников НКР = чистая маржа врача.
 */
export const ImplantEconomicsSection: React.FC<ImplantEconomicsSectionProps> = ({
	operationPriceRub,
	setOperationPriceRub,
	implantCostRub,
	consumablesCostRub,
	doctorGrossMarginRub,
}) => {
	return (
		<div
			className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2"
			data-testid="doctor-economics-block"
		>
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="text-xs font-black uppercase text-[var(--muted)] tracking-wider flex items-center gap-1.5">
					<DollarSign size={15} className="text-[var(--teal,#0d9488)]" />
					<span>Экономика соло-хирурга / ИП (Мандат 8n):</span>
				</div>
				<span className="text-[11px] font-bold text-[var(--teal,#0d9488)]">
					Без сетевых поборов
				</span>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
				<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
					<label htmlFor="input-op-price" className="text-[10px] text-[var(--muted)] font-bold">
						Счет операции:
					</label>
					<div className="flex items-center gap-1 mt-0.5">
						<input
							id="input-op-price"
							type="number"
							value={operationPriceRub}
							onChange={(e) => setOperationPriceRub?.(Number(e.target.value) || 0)}
							className="font-mono font-black text-sm text-[var(--ink)] bg-transparent border-none p-0 focus:outline-none w-full"
							data-testid="input-operation-price"
							aria-label="Сумма счета за операцию имплантации"
						/>
						<span className="text-xs font-bold text-[var(--muted)]">₽</span>
					</div>
				</div>

				<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
					<span className="text-[10px] text-[var(--muted)] font-bold">Себестоимость винта:</span>
					<strong className="font-mono font-black text-sm text-[var(--warn,#f59e0b)] truncate mt-0.5">
						{implantCostRub.toLocaleString("ru-RU")} ₽
					</strong>
				</div>

				<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
					<span className="text-[10px] text-[var(--muted)] font-bold">Расходники НКР:</span>
					<strong className="font-mono font-black text-sm text-[var(--warn,#f59e0b)] truncate mt-0.5">
						{consumablesCostRub.toLocaleString("ru-RU")} ₽
					</strong>
				</div>

				<div className="p-2.5 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.1))] border border-[var(--teal,#0d9488)] flex flex-col justify-between">
					<span className="text-[10px] text-[var(--teal,#0d9488)] font-black">Чистый доход врача:</span>
					<strong
						className="font-mono font-black text-sm text-[var(--teal,#0d9488)] truncate mt-0.5"
						data-testid="doctor-net-margin"
					>
						{doctorGrossMarginRub.toLocaleString("ru-RU")} ₽
					</strong>
				</div>
			</div>
		</div>
	);
};
