import type { Patient } from "@dental/shared";
import { User, Users, Settings } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { FamilyWalletModal } from "../family/FamilyWalletModal";
import type { FamilyGroupData } from "../familyWidget/familyWidgetTypes";

export interface MobilePatientFamilySectionProps {
	readonly patient: Patient;
	readonly balanceRub: number;
	readonly money: (amountRub: number) => string;
	readonly onSelectPatient: (patientId: string) => void;
	readonly onOpenCardTab?: (() => void) | undefined;
}

export function MobilePatientFamilySection({
	patient,
	balanceRub,
	money,
	onSelectPatient,
	onOpenCardTab: _onOpenCardTab,
}: MobilePatientFamilySectionProps) {
	const [familyData, setFamilyData] = useState<FamilyGroupData | null>(null);
	const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

	const fetchFamily = useCallback(async () => {
		if (!patient?.id) {
			setFamilyData(null);
			return;
		}
		try {
			const res = await fetch(`/api/finance/family/patient/${patient.id}`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const data = await res.json().catch(() => null);
				setFamilyData(data as FamilyGroupData | null);
			} else {
				setFamilyData(null);
			}
		} catch {
			setFamilyData(null);
		}
	}, [patient?.id]);

	useEffect(() => {
		fetchFamily();
	}, [fetchFamily]);

	const familyBalanceNum = Number(familyData?.balance ?? 0);
	const balanceColor = familyBalanceNum > 0 ? "text-emerald-700 dark:text-emerald-400" : familyBalanceNum < 0 ? "text-rose-700 dark:text-rose-400" : "text-[var(--ink)]";

	return (
		<section className="mobile-family-box" data-testid="mobile-family-box">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setIsWalletModalOpen(true)}
						className="flex items-center gap-1.5 text-left group cursor-pointer"
						title="Открыть семейный кошелек"
						data-testid="btn-open-mobile-family-wallet"
					>
						<Users size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span className="text-xs font-bold text-[var(--ink)] group-hover:text-[var(--primary)] transition-colors">
							{familyData?.name || "Семейный счёт"}
						</span>
					</button>
				</div>

				<div className="flex items-center gap-2">
					<div className="text-right">
						<span className="text-[11px] text-[var(--muted)] block">Баланс семьи:</span>
						<span className={`text-sm font-black font-mono ${balanceColor}`} data-testid="mobile-family-balance-sum">
							{familyData?.balance !== undefined && familyData?.balance !== null
								? money(Number(familyData.balance))
								: balanceRub !== 0
									? `${money(balanceRub)} (личный)`
									: "0 ₽"}
						</span>
					</div>

					<button
						type="button"
						onClick={() => setIsWalletModalOpen(true)}
						className="w-7 h-7 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer transition-colors"
						title="Настройка семейного кошелька"
						data-testid="btn-mobile-family-settings"
					>
						<Settings size={13} />
					</button>
				</div>
			</div>

			{familyData?.members && familyData.members.length > 0 ? (
				<div className="flex flex-col gap-1.5 pt-1">
					<span className="text-xs font-semibold text-[var(--muted)]">
						Члены семьи (тап для переключения карты):
					</span>
					<div className="mobile-family-members-scroller" role="tablist" data-testid="mobile-family-members-list">
						{familyData.members.map((m) => {
							const memberId = m.id || m.patientId || "";
							const isCurrent = memberId === patient.id;
							const isHead = memberId === familyData.headPatientId;
							const memberName = m.fullName || m.patientName || "Член семьи";
							return (
								<button
									key={memberId || memberName}
									type="button"
									onClick={() => onSelectPatient(memberId)}
									className={`mobile-family-member-chip ${isCurrent ? "active" : ""}`}
									data-testid={`mobile-family-member-${memberId}`}
									title={`Переключиться на карточку: ${memberName}`}
								>
									<User size={13} className={isCurrent ? "text-teal-600" : "text-[var(--muted)]"} />
									<span className="font-bold">{memberName}</span>
									<span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]">
										{isHead ? "Родитель / Глава" : "Ребёнок / Член"}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			) : (
				<div className="text-xs text-[var(--muted)] flex items-center justify-between gap-2 pt-1 border-t border-[var(--line-subtle,#e2e8f0)]">
					<span>Пациент не состоит в семейной группе</span>
					<button
						type="button"
						onClick={() => setIsWalletModalOpen(true)}
						className="secondary-button text-xs font-semibold px-2.5 py-1 min-h-[32px] rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:text-[var(--teal,#0d9488)] transition-all cursor-pointer"
						data-testid="btn-mobile-create-family"
					>
						Создать семью
					</button>
				</div>
			)}

			<FamilyWalletModal
				isOpen={isWalletModalOpen}
				onClose={() => setIsWalletModalOpen(false)}
				patientId={patient.id}
				patientName={patient.fullName}
				onFamilyDataChanged={fetchFamily}
			/>
		</section>
	);
}
