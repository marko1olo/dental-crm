import type { Patient } from "@dental/shared";
import { User, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";

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
	onOpenCardTab,
}: MobilePatientFamilySectionProps) {
	const [familyData, setFamilyData] = useState<any>(null);

	useEffect(() => {
		let isMounted = true;
		if (!patient?.id) {
			setFamilyData(null);
			return;
		}
		fetch(`/api/finance/family/patient/${patient.id}`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then(async (res) => {
				if (!isMounted) return;
				if (res.ok) {
					const data = await res.json().catch(() => null);
					setFamilyData(data);
				} else {
					setFamilyData(null);
				}
			})
			.catch(() => {
				if (isMounted) setFamilyData(null);
			});

		return () => {
			isMounted = false;
		};
	}, [patient?.id]);

	const familyBalanceNum = Number(familyData?.balance ?? 0);
	const balanceColor = familyBalanceNum > 0 ? "text-emerald-700 dark:text-emerald-400" : familyBalanceNum < 0 ? "text-rose-700 dark:text-rose-400" : "text-[var(--ink)]";

	return (
		<section className="mobile-family-box" data-testid="mobile-family-box">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Users size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="text-xs font-bold text-[var(--ink)]">{familyData?.name || "Семейный счёт"}</span>
				</div>

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
			</div>

			{familyData?.members && familyData.members.length > 0 ? (
				<div className="flex flex-col gap-1.5 pt-1">
					<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
						Члены семьи (тап для переключения карты):
					</span>
					<div className="mobile-family-members-scroller" role="tablist" data-testid="mobile-family-members-list">
						{familyData.members.map((m: any) => {
							const isCurrent = m.id === patient.id;
							const isHead = m.id === familyData.headPatientId;
							return (
								<button
									key={m.id}
									type="button"
									onClick={() => onSelectPatient(m.id)}
									className={`mobile-family-member-chip ${isCurrent ? "active" : ""}`}
									data-testid={`mobile-family-member-${m.id}`}
									title={`Переключиться на карточку: ${m.fullName}`}
								>
									<User size={13} className={isCurrent ? "text-teal-600" : "text-[var(--muted)]"} />
									<span className="font-bold">{m.fullName}</span>
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
						onClick={() => {
							showToast("Раздел привязки семьи доступен во вкладке Медкарта", "info");
							onOpenCardTab?.();
						}}
						className="text-xs font-bold text-[var(--teal)] underline cursor-pointer"
					>
						Создать семью
					</button>
				</div>
			)}
		</section>
	);
}
