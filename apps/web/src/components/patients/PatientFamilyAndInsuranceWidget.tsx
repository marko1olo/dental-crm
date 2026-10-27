import { CreditCard, Receipt } from "lucide-react";
import React, { useState } from "react";
import { useAppStore } from "../../store/appStore";
import { showToast } from "../GlobalToast";
import { FamilyWalletModal } from "./family/FamilyWalletModal";
import type { PatientFamilyAndInsuranceWidgetProps } from "./familyWidget/familyWidgetTypes";
import { FamilyWalletSection } from "./familyWidget/FamilyWalletSection";
import { InsurancePolicySection } from "./familyWidget/InsurancePolicySection";
import { useFamilyGroupData } from "./familyWidget/useFamilyGroupData";

export type { FamilyGroupData, PatientFamilyAndInsuranceWidgetProps } from "./familyWidget/familyWidgetTypes";

export function PatientFamilyAndInsuranceWidget({
	patient,
	patientBalance,
	insurancePolicyNumber,
	onUpdateInsurancePolicy,
}: PatientFamilyAndInsuranceWidgetProps) {
	const { familyData, isLoadingFamily, loadFamily } = useFamilyGroupData(patient?.id);
	const [isFamilyWalletModalOpen, setIsFamilyWalletModalOpen] = useState(false);

	const handleOpenFinance = () => {
		useAppStore.getState().setCurrentView("finance");
		showToast(`Касса и баланс: ${patient.fullName}`, "info");
	};

	return (
		<div
			className="patient-family-insurance-widget flex flex-col gap-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)] my-2"
			data-testid="patient-family-and-insurance-widget"
		>
			<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2 flex-wrap">
				<div className="flex items-center gap-2">
					<CreditCard size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="font-semibold text-xs text-[var(--ink)]">
						Финансы, семейный счёт и страхование ДМС/ОМС
					</span>
				</div>
				<button
					type="button"
					onClick={handleOpenFinance}
					className="secondary-button text-xs h-7 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 cursor-pointer font-medium"
					data-testid="patient-card-finance-btn"
					title="Перейти к счетам и кассе"
				>
					<Receipt size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>Касса / Оплата</span>
					<span
						data-testid="patient-quick-balance-btn"
						className={`font-mono font-bold px-1.5 py-0.2 rounded ${
							patientBalance > 0
								? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
								: patientBalance < 0
									? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
									: "text-[var(--muted)]"
						}`}
					>
						{patientBalance > 0
							? `+${patientBalance.toLocaleString("ru-RU")} ₽`
							: patientBalance < 0
								? `-${Math.abs(patientBalance).toLocaleString("ru-RU")} ₽`
								: "0 ₽"}
					</span>
				</button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
				<FamilyWalletSection
					familyData={familyData}
					isLoadingFamily={isLoadingFamily}
					onOpenModal={() => setIsFamilyWalletModalOpen(true)}
				/>
				<InsurancePolicySection
					initialPolicy={insurancePolicyNumber}
					onUpdatePolicy={onUpdateInsurancePolicy}
				/>
			</div>

			<FamilyWalletModal
				isOpen={isFamilyWalletModalOpen}
				onClose={() => setIsFamilyWalletModalOpen(false)}
				patientId={patient?.id}
				patientName={patient?.fullName}
				familyData={
					familyData
						? {
								id: familyData.id,
								name: familyData.name,
								balance: familyData.balance ?? familyData.sharedBalanceRub ?? 0,
								headPatientId: familyData.headPatientId,
								members: familyData.members?.map((m) => ({
									id: m.id || m.patientId || "",
									fullName: m.fullName || m.patientName || "Пациент",
									phone: m.phone,
									personalBalanceRub: m.individualBalanceRub,
									roleRu: m.role,
								})),
							}
						: undefined
				}
				onFamilyDataChanged={loadFamily}
			/>
		</div>
	);
}
