import React from "react";
import { DentalLabPrintBlank } from "../DentalLabPrintBlank";

export interface DentalLabOrderPrintTabProps {
	readonly form: any;
	readonly totalLabPriceRub?: number | undefined;
	readonly priceRubInput?: string | undefined;
	readonly doctorAmountRub?: number | undefined;
	readonly doctorSharePct?: number | undefined;
	readonly onPrint: () => void;
	readonly onShareMessenger: () => void;
}

/**
 * Вкладка финансового расчета и печатного бланка заказ-наряда ЗТЛ (Мандат 8b: <= 90 строк).
 */
export function DentalLabOrderPrintTab({
	form,
	totalLabPriceRub,
	priceRubInput,
	doctorAmountRub,
	doctorSharePct,
	onPrint,
	onShareMessenger,
}: DentalLabOrderPrintTabProps): React.JSX.Element {
	return (
		<div className="space-y-4" data-testid="lab-order-print-tab">
			<div className="p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-3">
				<h3 className="text-xs font-bold text-[var(--ink,#0f172a)] m-0">
					Финансовый расчет наряда ЗТЛ (Целочисленные копейки / рубли):
				</h3>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
					<div className="p-3 bg-[var(--paper,#ffffff)] rounded-xl border border-[var(--line,#cbd5e1)]">
						<div className="text-[var(--muted,#64748b)] text-[11px]">Себестоимость ЗТЛ:</div>
						<div className="text-base font-extrabold text-[var(--ink,#0f172a)] mt-0.5">
							{totalLabPriceRub ? `${totalLabPriceRub.toLocaleString("ru-RU")} ₽` : "0 ₽"}
						</div>
					</div>
					<div className="p-3 bg-[var(--paper,#ffffff)] rounded-xl border border-[var(--line,#cbd5e1)]">
						<div className="text-[var(--muted,#64748b)] text-[11px]">Стоимость пациенту:</div>
						<div className="text-base font-extrabold text-[#0d9488] mt-0.5">
							{priceRubInput ? `${Number(priceRubInput).toLocaleString("ru-RU")} ₽` : "24 000 ₽"}
						</div>
					</div>
					<div className="p-3 bg-[var(--paper,#ffffff)] rounded-xl border border-[var(--line,#cbd5e1)]">
						<div className="text-[var(--muted,#64748b)] text-[11px]">Начисление врачу:</div>
						<div className="text-base font-extrabold text-[var(--ink,#0f172a)] mt-0.5">
							{doctorAmountRub ? `${doctorAmountRub.toLocaleString("ru-RU")} ₽` : "0 ₽"}
						</div>
					</div>
					<div className="p-3 bg-[var(--paper,#ffffff)] rounded-xl border border-[var(--line,#cbd5e1)]">
						<div className="text-[var(--muted,#64748b)] text-[11px]">Доля врача:</div>
						<div className="text-base font-extrabold text-[var(--ink,#0f172a)] mt-0.5">
							{doctorSharePct ?? 25}%
						</div>
					</div>
				</div>
			</div>

			<DentalLabPrintBlank
				gostOrderNumber={form.gostOrderNumber}
				secureToken={form.secureToken}
				formPatientName={form.formPatientName}
				formDoctorName={form.formDoctorName}
				selectedTeeth={form.selectedTeeth}
				jawScope={form.jawScope}
				constructionType={form.constructionType}
				material={form.material}
				shadeSystem={form.shadeSystem}
				shadeClassical={form.shadeClassical}
				shade3dMaster={form.shade3dMaster}
				shadeBleach={form.shadeBleach}
				shadeCervical={form.shadeCervical}
				shadeBody={form.shadeBody}
				shadeIncisal={form.shadeIncisal}
				shadeStump={form.shadeStump}
				translucency={form.translucency}
				mamelons={form.mamelons}
				calcifications={form.calcifications}
				opalescence={form.opalescence}
				impressionType={form.impressionType}
				frameworkTrialDate={form.frameworkTrialDate}
				ceramicTrialDate={form.ceramicTrialDate}
				dueDate={form.dueDate}
				clinicalNotes={form.clinicalNotes}
				totalLabPriceRub={form.totalLabPriceRub}
				portalUrl={form.portalUrl}
				handlePrint={onPrint}
				currentStage={form.currentStage}
				onShareMessenger={onShareMessenger}
			/>
		</div>
	);
}
