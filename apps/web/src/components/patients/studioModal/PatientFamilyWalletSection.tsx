/**
 * PatientFamilyWalletSection.tsx — Единый семейный кошелек родственников (Мандат 8n).
 *
 * МАНДАТЫ:
 * - Мандат 8n (Семейный баланс в 1 клик): родственники (дети, супруги, родители) объединяются
 *   в единый семейный кошелек. Аванс любого члена семьи списывается в пользу долга в 1 клик
 *   без заявлений на переброску средств.
 * - Apple HIG: адаптивные карточки, touch-targets >= 44x44px.
 * - Мандат 8b (Sweet Spot: 100–180 строк).
 */

import React from "react";
import { Users, ArrowRightLeft, ShieldCheck, Plus } from "lucide-react";
import {
	type PatientCatalogItem,
	type PatientFamilyGroup,
	type FamilyMember,
	FAMILY_ROLE_LABELS,
	formatPhoneDisplay,
	formatKopecksToRub,
	calculateFamilyBalanceKopecks,
} from "../patientCatalogData";

export interface PatientFamilyWalletSectionProps {
	readonly currentPatient: PatientCatalogItem;
	readonly currentFamily: PatientFamilyGroup | null;
	readonly onPayDebtFromRelative: (payer: FamilyMember) => void;
}

export const PatientFamilyWalletSection: React.FC<PatientFamilyWalletSectionProps> = React.memo(
	function PatientFamilyWalletSection({
		currentPatient,
		currentFamily,
		onPayDebtFromRelative,
	}) {
		const familyBalance = currentFamily ? calculateFamilyBalanceKopecks(currentFamily.members) : 0;

		return (
			<div
				className="p-4 rounded-2xl bg-[var(--paper-subtle)] border border-[var(--line)] space-y-3"
				data-testid="patient-family-balance-section"
			>
				{/* Шапка блока семейного кошелька */}
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<div className="w-7 h-7 rounded-lg bg-[var(--teal)]/15 text-[var(--teal)] flex items-center justify-center shrink-0">
							<Users size={15} />
						</div>
						<div>
							<h3 className="text-xs font-semibold text-[var(--ink)] leading-tight">
								Семейный доступ и кошелек
							</h3>
							{currentFamily && (
								<p className="text-[11px] text-[var(--muted)]">{currentFamily.familyName}</p>
							)}
						</div>
					</div>

					{currentFamily && (
						<div className="text-right">
							<span className="text-[11px] text-[var(--muted)] block">Общий баланс семьи</span>
							<span
								className={`text-xs sm:text-sm font-bold ${
									familyBalance < 0
										? "text-red-500"
										: familyBalance > 0
										? "text-emerald-500"
										: "text-[var(--ink)]"
								}`}
							>
								{formatKopecksToRub(familyBalance)}
							</span>
						</div>
					)}
				</div>

				{/* Список родственников или пустое состояние */}
				{currentFamily ? (
					<div className="space-y-2">
						{currentFamily.members.map((member) => {
							const isCurrentPatient = member.patientId === currentPatient.id;
							const hasAvailableAdvance = member.balanceKopecks > 0;
							const patientHasDebt = currentPatient.balanceKopecks < 0;

							return (
								<div
									key={member.id}
									className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
										isCurrentPatient
											? "bg-[var(--paper)] border-[var(--teal)]/30 ring-1 ring-[var(--teal)]/10"
											: "bg-[var(--paper)] border-[var(--line)]"
									}`}
								>
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
											<span className="text-xs font-semibold text-[var(--ink)] leading-snug">
												{member.fullName}
											</span>
											<span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--paper-subtle)] border border-[var(--line)] text-[var(--muted)] shrink-0">
												{FAMILY_ROLE_LABELS[member.role]}
											</span>
											{isCurrentPatient && (
												<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--teal)]/10 text-[var(--teal)] font-medium shrink-0">
													Текущий
												</span>
											)}
										</div>
										<span className="text-[11px] text-[var(--muted)] block mt-0.5">
											{formatPhoneDisplay(member.phone)}
										</span>
									</div>

									<div className="flex items-center gap-2 shrink-0">
										<span
											className={`text-xs font-bold ${
												member.balanceKopecks < 0
													? "text-red-500"
													: member.balanceKopecks > 0
													? "text-emerald-500"
													: "text-[var(--ink)]"
											}`}
										>
											{formatKopecksToRub(member.balanceKopecks)}
										</span>

										{/* Кнопка списания в 1 клик если у текущего пациента долг, а у родственника аванс */}
										{patientHasDebt && !isCurrentPatient && hasAvailableAdvance && (
											<button
												type="button"
												onClick={() => onPayDebtFromRelative(member)}
												className="h-8 px-2.5 text-xs font-medium rounded-lg bg-[var(--paper-subtle)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] flex items-center gap-1 transition-colors min-h-[44px] sm:min-h-0"
												title="Покрыть долг за счёт аванса родственника"
												data-testid={`pay-from-relative-${member.id}`}
											>
												<ArrowRightLeft size={12} className="text-[var(--teal)]" />
												<span>Оплатить</span>
											</button>
										)}
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-center space-y-2">
						<p className="text-xs text-[var(--muted)]">
							Пациент не привязан к семейной группе. Вы можете объединить карты родственников для единого баланса и списания авансов без бюрократии.
						</p>
					</div>
				)}
			</div>
		);
	},
);
