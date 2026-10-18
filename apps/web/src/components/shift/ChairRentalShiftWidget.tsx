import React, { useId } from "react";
import { Calculator, Printer } from "lucide-react";
import type { ChairRentalResult, ChairRentalModel } from "@dental/shared";
import "../../styles/modules/chair-rental-widget.css";
import { ChairRentalModelSelector } from "./chairRentalModules/ChairRentalModelSelector";
import { ChairRentalShiftTimeSelector } from "./chairRentalModules/ChairRentalShiftTimeSelector";
import { ChairRentalRateInputs } from "./chairRentalModules/ChairRentalRateInputs";
import { ChairRentalProfitBreakdown } from "./chairRentalModules/ChairRentalProfitBreakdown";
import { ChairRentalReconciliationModal } from "./chairRentalModules/ChairRentalReconciliationModal";
import { ChairRentalSessionStrip } from "./chairRentalModules/ChairRentalSessionStrip";
import { useChairRentalWidgetLogic } from "./chairRentalModules/useChairRentalWidgetLogic";

export interface ChairRentalShiftWidgetProps {
	readonly doctorFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly initialGrossRevenueRub?: number | undefined;
	readonly initialHoursWorked?: number | undefined;
	readonly initialLabExpensesRub?: number | undefined;
	readonly initialConsumablesRub?: number | undefined;
	readonly onPrintAct?: (() => void) | undefined;
	readonly onEconomicsChange?: ((econ: ChairRentalResult) => void) | undefined;
	readonly externalOpenActTrigger?: number | undefined;
	readonly className?: string | undefined;
	readonly initialRentalActive?: boolean | undefined;
	readonly initialChairId?: string | undefined;
	readonly onRentalSessionChange?: ((session: { isActive: boolean; chairId: string; startedAt?: string }) => void) | undefined;
}

export const ChairRentalShiftWidget: React.FC<ChairRentalShiftWidgetProps> = ({
	doctorFullName = "Барабаш С.В.",
	clinicName = "ООО «Денте Стоматология»",
	initialGrossRevenueRub = 0,
	initialHoursWorked = 0,
	initialLabExpensesRub = 0,
	initialConsumablesRub = 0,
	onEconomicsChange,
	externalOpenActTrigger = 0,
	className = "",
	initialRentalActive = false,
	initialChairId = "chair-01",
	onRentalSessionChange,
}) => {
	const widgetId = useId();
	const logic = useChairRentalWidgetLogic({
		initialGrossRevenueRub, initialHoursWorked, initialLabExpensesRub, initialConsumablesRub,
		initialRentalActive, initialChairId, externalOpenActTrigger, onEconomicsChange, onRentalSessionChange,
	});

	const formatRub = (val: number) => `${val.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽`;
	const todayDateStr = new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
	const actDocNumber = `ACT-CR-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-042`;
	const modelLabels: Record<ChairRentalModel, string> = {
		hourly: "Почасовая ставка", per_shift: "Посменная ставка", revenue_percent: "Процент выручки", fixed_monthly: "Фикс в месяц",
	};

	return (
		<section className={`chair-rental-widget ${className}`} data-testid="chair-rental-shift-widget" aria-label="Субаренда кресла и доход врача">
			<div className="chair-rental-header">
				<div className="chair-rental-title-group">
					<div className="chair-rental-icon-badge" aria-hidden="true"><Calculator size={18} /></div>
					<div>
						<h3 className="chair-rental-title">Субаренда кресла и доход врача</h3>
						<p className="chair-rental-subtitle">{doctorFullName} · Расчет смены без скрытых комиссий</p>
					</div>
				</div>
			</div>

			<ChairRentalSessionStrip
				isRentalActive={logic.isRentalActive}
				selectedChairId={logic.selectedChairId}
				onSelectChairId={logic.setSelectedChairId}
				sessionElapsedMinutes={logic.sessionElapsedMinutes}
				onStartRentalSession={logic.handleStartRentalSession}
				onStopRentalSession={logic.handleStopRentalSession}
				widgetId={widgetId}
			/>

			<ChairRentalModelSelector model={logic.model} onSelectModel={logic.setModel} />

			<div className="chair-rental-inputs-grid">
				<ChairRentalRateInputs
					model={logic.model}
					hourlyRateRub={logic.hourlyRateRub} onChangeHourlyRateRub={logic.setHourlyRateRub}
					shiftRateRub={logic.shiftRateRub} onChangeShiftRateRub={logic.setShiftRateRub}
					landlordPercent={logic.landlordPercent} onChangeLandlordPercent={logic.setLandlordPercent}
					monthlyRateRub={logic.monthlyRateRub} onChangeMonthlyRateRub={logic.setMonthlyRateRub}
					grossRevenueRub={logic.grossRevenueRub} onChangeGrossRevenueRub={logic.setGrossRevenueRub}
					widgetId={widgetId}
					timeSelector={
						<ChairRentalShiftTimeSelector
							model={logic.model} hoursWorked={logic.hoursWorked} onChangeHoursWorked={logic.setHoursWorked}
							shiftsCount={logic.shiftsCount} onChangeShiftsCount={logic.setShiftsCount}
							workingDaysInMonth={logic.workingDaysInMonth} onChangeWorkingDaysInMonth={logic.setWorkingDaysInMonth}
							widgetId={widgetId}
						/>
					}
				/>
			</div>

			<ChairRentalProfitBreakdown economics={logic.economics} formatRub={formatRub} />

			<div className="chair-rental-footer-actions">
				<button type="button" className="chair-rental-act-btn" onClick={() => logic.setIsActModalOpen(true)} data-testid="btn-print-reconciliation-act">
					<Printer size={16} />
					<span>Печать акта сверки субаренды</span>
				</button>
			</div>

			<ChairRentalReconciliationModal
				isOpen={logic.isActModalOpen} onClose={() => logic.setIsActModalOpen(false)}
				clinicName={clinicName} doctorFullName={doctorFullName} model={logic.model}
				hoursWorked={logic.hoursWorked} economics={logic.economics} formatRub={formatRub}
				modelLabels={modelLabels} actDocNumber={actDocNumber} todayDateStr={todayDateStr}
			/>
		</section>
	);
};
