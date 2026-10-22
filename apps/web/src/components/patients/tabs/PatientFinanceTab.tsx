/**
 * PatientFinanceTab.tsx — Канонический фасад финансового блока карточки пациента.
 * Декомпозирован по Мандату 8b (Layer 5: Тонкий фасад <= 120 строк).
 */

import React, { useMemo } from "react";
import type { PatientFinanceTabProps } from "./finance/types";
import {
	DepositOperationsHistoryPanel,
	FamilyBalanceCard,
	PersonalBalanceCard,
	QuickDepositOperationsPanel,
	useDepositOperations,
} from "./finance";

export type { DepositOperationRecord, PatientFinanceTabProps } from "./finance/types";

export const PatientFinanceTab: React.FC<PatientFinanceTabProps> = React.memo(
	function PatientFinanceTab({
		patient,
		onUpdateBalance,
		onNavigateToVisit: _onNavigateToVisit,
		onNewAppointment,
		onOpenTaxCertificate,
		disabled = false,
	}) {
		const initialPersonalBalance = useMemo(() => {
			if (typeof patient?.patientBalanceRub === "number") {
				return Math.round(patient.patientBalanceRub);
			}
			return 4500;
		}, [patient?.patientBalanceRub]);

		const initialFamilyBalance = useMemo(() => {
			if (typeof patient?.familyBalanceRub === "number") {
				return Math.round(patient.familyBalanceRub);
			}
			return 12500;
		}, [patient?.familyBalanceRub]);

		const {
			personalBalance,
			familyBalance,
			operationsLog,
			isSubmitting,
			executeOperation,
		} = useDepositOperations(
			patient,
			initialPersonalBalance,
			initialFamilyBalance,
			onUpdateBalance,
			disabled,
		);

		return (
			<div
				className="patient-finance-tab flex flex-col gap-4 text-[var(--ink)]"
				data-testid="patient-finance-tab"
			>
				{/* 1. БЛОК ГЛАВНЫХ БАЛАНСОВ (Личный депозит и общий семейный аванс) */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
					<PersonalBalanceCard
						fullName={patient?.fullName}
						personalBalance={personalBalance}
					/>
					<FamilyBalanceCard
						familyGroupName={patient?.familyGroupName}
						familyBalance={familyBalance}
					/>
				</div>

				{/* 2. ПАНЕЛЬ БЫСТРЫХ ОПЕРАЦИЙ (Пополнение, списание, пресеты, СБП QR) */}
				<QuickDepositOperationsPanel
					personalBalance={personalBalance}
					disabled={disabled}
					isSubmitting={isSubmitting}
					onExecute={executeOperation}
				/>

				{/* 3. ЖУРНАЛ ОПЕРАЦИЙ ПО ДЕПОЗИТУ (Хронология, справка для вычета 13%, визит) */}
				<DepositOperationsHistoryPanel
					operationsLog={operationsLog}
					patientId={patient?.id}
					onOpenTaxCertificate={onOpenTaxCertificate}
					onNewAppointment={onNewAppointment}
				/>
			</div>
		);
	},
);

export default PatientFinanceTab;
