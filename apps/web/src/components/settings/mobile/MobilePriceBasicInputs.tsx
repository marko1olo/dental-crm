import React from "react";

interface MobilePriceBasicInputsProps {
	title: string;
	setTitle: (val: string) => void;
	code: string;
	setCode: (val: string) => void;
	priceInput: string;
	setPriceInput: (val: string) => void;
	priceProblem: string | null;
	setPriceProblem: (val: string | null) => void;
}

export const MobilePriceBasicInputs: React.FC<MobilePriceBasicInputsProps> = ({
	title,
	setTitle,
	code,
	setCode,
	priceInput,
	setPriceInput,
	priceProblem,
	setPriceProblem,
}) => {
	return (
		<>
			<div className="space-y-1.5">
				<label htmlFor="drawer-service-title" className="text-[13px] font-medium text-[var(--muted)]">
					Название услуги (по прейскуранту) *
				</label>
				<textarea
					id="drawer-service-title"
					rows={2}
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					required
					placeholder="Например: Первичный осмотр и консультация врача-стоматолога"
					className="w-full p-3 text-[15px] font-medium rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--teal)] transition-all resize-none"
					data-testid="input-drawer-service-title"
				/>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1.5">
					<label htmlFor="drawer-service-code" className="text-[13px] font-medium text-[var(--muted)]">
						Код услуги (номенклатура)
					</label>
					<div className="relative">
						<input
							id="drawer-service-code"
							type="text"
							value={code}
							onChange={(e) => setCode(e.target.value)}
							placeholder="A16.07.002"
							className="w-full h-11 px-3 text-[14px] font-mono rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--teal)] transition-all"
							data-testid="input-drawer-service-code"
						/>
					</div>
				</div>

				<div className="space-y-1.5">
					<label htmlFor="drawer-service-price" className="text-[13px] font-semibold text-[var(--ink)]">
						Цена услуги (₽) *
					</label>
					<div className="relative">
						<input
							id="drawer-service-price"
							type="text"
							inputMode="decimal"
							value={priceInput}
							onChange={(e) => {
								setPriceInput(e.target.value);
								setPriceProblem(null);
							}}
							required
							placeholder="4 500"
							className="w-full h-11 px-3 pr-8 text-[16px] font-bold font-mono rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--teal)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--teal)] transition-all"
							data-testid="input-drawer-service-price"
						/>
						<span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[var(--muted)] pointer-events-none">
							₽
						</span>
					</div>
					{priceProblem && (
						<p className="text-[11px] text-rose-500 font-medium">
							{priceProblem}
						</p>
					)}
				</div>
			</div>
		</>
	);
};
