import React from "react";
import type { StagePaymentModalBodyProps } from "./stagePaymentModalTypes";
import { StagePaymentScheduleTab } from "../StagePaymentScheduleTab.js";
import { StagePaymentEscrowTab } from "../StagePaymentEscrowTab.js";
import { StagePaymentActTab } from "../StagePaymentActTab.js";
import { StagePaymentTerminationTab } from "../StagePaymentTerminationTab.js";
import { StagePaymentFiscalTab } from "../StagePaymentFiscalTab.js";
import { StagePaymentAddendumTab } from "../StagePaymentAddendumTab.js";

export const StagePaymentModalBody: React.FC<StagePaymentModalBodyProps> = (props) => {
	return (
		<main className="stage-payment-body">
			{props.activeTab === "schedule" && (
				<StagePaymentScheduleTab
					stages={props.stages}
					totals={props.totals}
					activeStageMenuId={props.activeStageMenuId}
					onToggleStageMenu={props.onToggleStageMenu}
					onPayAdvance={props.onPayAdvance}
					onStageStatusChange={props.onStageStatusChange}
					onOpenActTab={props.onOpenActTab}
					onOpenInstallmentModal={props.onOpenInstallmentModal}
					onOpenFiscalTab={props.onOpenFiscalTab}
				/>
			)}
			{props.activeTab === "escrow" && (
				<StagePaymentEscrowTab
					depositWallet={props.depositWallet}
					topUpAmountRub={props.topUpAmountRub}
					onTopUpAmountChange={props.onTopUpAmountChange}
					onTopUpDeposit={props.onTopUpDeposit}
					onAutoAllocateDeposit={props.onAutoAllocateDeposit}
				/>
			)}
			{props.activeTab === "act" && (
				<StagePaymentActTab
					stages={props.stages}
					selectedStageForActId={props.selectedStageForActId}
					onSelectStageForAct={props.onSelectStageForAct}
					actNumberInput={props.actNumberInput}
					onActNumberChange={props.onActNumberChange}
					actSignDate={props.actSignDate}
					onActSignDateChange={props.onActSignDateChange}
					doctorFullName={props.doctorFullName}
					onSignStageAct={props.onSignStageAct}
				/>
			)}
			{props.activeTab === "termination" && (
				<StagePaymentTerminationTab
					terminationCalc={props.terminationCalc}
					newExpenseTitle={props.newExpenseTitle}
					onNewExpenseTitleChange={props.onNewExpenseTitleChange}
					newExpenseRub={props.newExpenseRub}
					onNewExpenseRubChange={props.onNewExpenseRubChange}
					newExpenseCategory={props.newExpenseCategory}
					onNewExpenseCategoryChange={props.onNewExpenseCategoryChange}
					onAddCustomExpense={props.onAddCustomExpense}
				/>
			)}
			{props.activeTab === "fiscal54fz" && (
				<StagePaymentFiscalTab
					stages={props.stages}
					selectedStageForFiscalId={props.selectedStageForFiscalId}
					onSelectStageForFiscal={props.onSelectStageForFiscal}
					fiscalPaymentType={props.fiscalPaymentType}
					onFiscalPaymentTypeChange={props.onFiscalPaymentTypeChange}
					fiscalPaymentMethod={props.fiscalPaymentMethod}
					onFiscalPaymentMethodChange={props.onFiscalPaymentMethodChange}
					onGenerateFiscalReceipt={props.onGenerateFiscalReceipt}
					activeFiscalReceipt={props.activeFiscalReceipt}
				/>
			)}
			{props.activeTab === "contract_addendum" && (
				<StagePaymentAddendumTab
					stages={props.stages}
					totals={props.totals}
					clinicName={props.clinicName}
					clinicInn={props.clinicInn}
					doctorFullName={props.doctorFullName}
					patientName={props.patientName}
					patientId={props.patientId}
					planTitle={props.planTitle}
				/>
			)}
		</main>
	);
};
