import type { Patient } from "@dental/shared";
import {
	Building2,
	CreditCard,
	FileCheck,
	Receipt,
	ShieldCheck,
	Users,
	Wallet,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useAppStore } from "../../store/appStore";
import { formatOmsPolicy } from "../../utils/inputSanitation";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import { FamilyWalletModal } from "../patient/FamilyWalletModal";

export interface PatientFamilyAndInsuranceWidgetProps {
	readonly patient: Patient;
	readonly patientBalance: number;
	readonly insurancePolicyNumber?: string;
	readonly onUpdateInsurancePolicy?: (policy: string) => void;
}

export interface FamilyGroupData {
	id: string;
	name: string;
	balance?: number | string;
	sharedBalanceRub?: number;
	headPatientId?: string | null;
	members: Array<{
		id?: string;
		patientId?: string;
		fullName?: string;
		patientName?: string;
		phone?: string | null;
		role?: string;
		individualBalanceRub?: number;
	}>;
}

export function PatientFamilyAndInsuranceWidget({
	patient,
	patientBalance,
	insurancePolicyNumber,
	onUpdateInsurancePolicy,
}: PatientFamilyAndInsuranceWidgetProps) {
	const [familyData, setFamilyData] = useState<FamilyGroupData | null>(null);
	const [isLoadingFamily, setIsLoadingFamily] = useState(false);
	const [isEditingPolicy, setIsEditingPolicy] = useState(false);
	const [localPolicy, setLocalPolicy] = useState(insurancePolicyNumber || "");
	const [isFamilyWalletModalOpen, setIsFamilyWalletModalOpen] = useState(false);

	useEffect(() => {
		setLocalPolicy(insurancePolicyNumber || "");
	}, [insurancePolicyNumber]);

	const loadFamily = useCallback(() => {
		if (!patient?.id) {
			setFamilyData(null);
			return;
		}
		setIsLoadingFamily(true);
		fetch(`/api/finance/family/patient/${patient.id}`)
			.then(async (res) => {
				if (res.ok) {
					const data = await res.json();
					setFamilyData(data);
				} else {
					setFamilyData(null);
				}
			})
			.catch((err) => {
				logger.warn("Не удалось загрузить данные семейного счёта:", err);
				setFamilyData(null);
			})
			.finally(() => {
				setIsLoadingFamily(false);
			});
	}, [patient?.id]);

	useEffect(() => {
		loadFamily();
	}, [loadFamily]);

	const handleSavePolicy = () => {
		setIsEditingPolicy(false);
		if (onUpdateInsurancePolicy) {
			onUpdateInsurancePolicy(localPolicy);
			showToast("Полис ДМС / ОМС обновлен", "success");
		}
	};

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
				{/* Family Wallet Section */}
				<div className="flex flex-col gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
					<div className="flex items-center justify-between gap-1.5">
						<span className="flex items-center gap-1.5 font-semibold text-xs text-[var(--ink)]">
							<Users size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
							<span>Семейный счёт</span>
						</span>
						{familyData ? (
							<span className="font-mono font-bold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">
								Баланс: {Number(familyData.balance ?? familyData.sharedBalanceRub ?? 0).toLocaleString("ru-RU")} ₽
							</span>
						) : (
							<span className="text-[11px] text-[var(--muted)]">
								{isLoadingFamily ? "Загрузка..." : "Индивидуальный счёт"}
							</span>
						)}
					</div>
					{familyData ? (
						<div className="text-[11px] text-[var(--muted)]">
							<span>Группа: <strong>{familyData.name}</strong></span>
							{familyData.members?.length ? (
								<p className="mt-0.5 mb-0 text-[11px]">
									Участников: {familyData.members.length} чел.
								</p>
							) : null}
						</div>
					) : (
						<p className="text-[11px] text-[var(--muted)] m-0 leading-relaxed">
							Пациент обслуживается с индивидуальным балансом. При объединении с родственниками доступен единый семейный кошелёк.
						</p>
					)}
					<button
						type="button"
						data-testid="widget-open-family-wallet-btn"
						onClick={() => setIsFamilyWalletModalOpen(true)}
						className="mt-1 min-h-[44px] sm:min-h-[32px] h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
					>
						<Wallet size={13} className="text-[var(--teal)] shrink-0" />
						<span>Управление семейным кошельком</span>
					</button>
				</div>

				{/* Insurance Policy DMS / OMS Section */}
				<div className="flex flex-col gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
					<div className="flex items-center justify-between gap-1.5">
						<span className="flex items-center gap-1.5 font-semibold text-xs text-[var(--ink)]">
							<ShieldCheck size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Страховой полис</span>
						</span>
						{localPolicy ? (
							<span className="text-[11px] font-medium text-teal-700 dark:text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
								<FileCheck size={12} />
								<span>Прикреплён</span>
							</span>
						) : (
							<span className="text-[11px] text-[var(--muted)]">Не указан</span>
						)}
					</div>

					{isEditingPolicy ? (
						<div className="flex items-center gap-1.5 mt-1">
							<input
								type="text"
								value={localPolicy}
								onChange={(e) => setLocalPolicy(formatOmsPolicy(e.target.value))}
								placeholder="Номер полиса ДМС / ОМС"
								className="flex-1 h-7 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
								autoFocus
							/>
							<button
								type="button"
								onClick={handleSavePolicy}
								className="primary-button h-7 px-2 text-xs font-semibold rounded"
							>
								OK
							</button>
							<button
								type="button"
								onClick={() => setIsEditingPolicy(false)}
								className="secondary-button h-7 px-1.5 text-xs rounded"
							>
								✕
							</button>
						</div>
					) : (
						<div className="flex items-center justify-between gap-1.5 mt-0.5">
							<span className="font-mono text-xs text-[var(--ink)]">
								{localPolicy || "Нет полиса ДМС / ОМС"}
							</span>
							<button
								type="button"
								onClick={() => setIsEditingPolicy(true)}
								className="text-button text-[11px] text-[var(--teal)] font-medium hover:underline p-0"
							>
								{localPolicy ? "Изменить" : "+ Добавить"}
							</button>
						</div>
					)}
					<p className="text-[11px] text-[var(--muted)] m-0 flex items-center gap-1">
						<Building2 size={11} className="shrink-0" />
						<span>Согласование услуг по гарантийным письмам страховых компаний</span>
					</p>
				</div>
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
