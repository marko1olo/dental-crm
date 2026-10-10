/**
 * apps/web/src/components/patient/familyWalletModal/FamilyMembersBalanceList.tsx
 *
 * Layer 4: Overview of Family Pooled Balance & Member Cards.
 * Features:
 * - Aggregated pooled balance (exact kopecks via money()).
 * - Relative status badges (Глава семьи, Текущий пациент, Дети/Супруги).
 * - Individual balance display.
 * - Non-blocking toggle for spending permissions from pooled balance.
 * - 0% clinic commission guarantee (Mandates 8d, 8e).
 */

import React from "react";
import {
	ArrowDownRight,
	Plus,
	ShieldCheck,
	UserCheck,
	UserX,
	Wallet,
} from "lucide-react";
import { money } from "../../../AppHelpers";
import type { FamilyGroupDetails, FamilyWalletTab } from "./types";

export interface FamilyMembersBalanceListProps {
	readonly familyData: FamilyGroupDetails | null;
	readonly familyBalanceNumeric: number;
	readonly patientId: string;
	readonly spendingPermissions: Record<string, boolean>;
	readonly onTogglePermission: (memberId: string) => void;
	readonly onNavigateTab: (tab: FamilyWalletTab) => void;
}

export const FamilyMembersBalanceList: React.FC<FamilyMembersBalanceListProps> =
	React.memo(function FamilyMembersBalanceList({
		familyData,
		familyBalanceNumeric,
		patientId,
		spendingPermissions,
		onTogglePermission,
		onNavigateTab,
	}) {
		const membersList = familyData?.members ?? [];

		return (
			<div className="flex flex-col gap-4">
				{/* Карточка агрегированного семейного баланса */}
				<div
					data-testid="family-wallet-pooled-balance"
					className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
				>
					<div>
						<div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-medium">
							<Wallet className="w-4 h-4 text-[var(--teal)]" />
							<span>Общий семейный аванс (депозит):</span>
						</div>
						<div className="text-2xl font-black text-[var(--teal)] tracking-tight mt-1">
							{money(familyBalanceNumeric)}
						</div>
						<p className="text-[11px] text-[var(--muted)] m-0 mt-0.5">
							Доступен для оплаты процедур любого члена семьи без ограничений и комиссий.
						</p>
					</div>

					<div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
						<button
							type="button"
							onClick={() => onNavigateTab("topup")}
							style={{
								backgroundColor: "#0d9488",
								color: "#ffffff",
								borderColor: "#0d9488",
								padding: "0 14px",
							}}
							className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[36px] h-9 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:opacity-95 transition-opacity whitespace-nowrap"
						>
							<Plus className="w-4 h-4 shrink-0" />
							<span>Пополнить</span>
						</button>
						<button
							type="button"
							onClick={() => onNavigateTab("spend")}
							style={{ padding: "0 14px" }}
							className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[36px] h-9 border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:bg-[var(--paper-soft)] transition-colors whitespace-nowrap"
						>
							<ArrowDownRight className="w-4 h-4 shrink-0" />
							<span>Оплатить</span>
						</button>
					</div>
				</div>

				{/* Список членов семьи */}
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
							Члены семьи ({membersList.length} чел.)
						</span>
						<span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
							<ShieldCheck className="w-3.5 h-3.5" />
							0% комиссия клиники
						</span>
					</div>

					<div
						data-testid="family-wallet-members-list"
						className="border border-[var(--line)] rounded-xl divide-y divide-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-2xs"
					>
						{membersList.length === 0 ? (
							<div className="p-4 text-center text-xs text-[var(--muted)]">
								В семейной группе пока нет зарегистрированных участников.
							</div>
						) : (
							membersList.map((member) => {
								const isCurrent = member.id === patientId;
								const isHead = member.id === familyData?.headPatientId;
								const canSpend = spendingPermissions[member.id] !== false;
								const initialLetter =
									member.fullName?.trim().charAt(0).toUpperCase() || "П";

								return (
									<div
										key={member.id}
										className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--paper-soft)] transition-colors"
									>
										<div className="flex items-center gap-2.5 min-w-0">
											<div className="w-9 h-9 rounded-full bg-[var(--teal)]/10 text-[var(--teal)] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
												{initialLetter}
											</div>
											<div className="min-w-0">
												<div className="flex items-center gap-1.5 flex-wrap">
													<span className="text-xs font-semibold text-[var(--ink)] truncate">
														{member.fullName}
													</span>
													{isHead && (
														<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300">
															Глава
														</span>
													)}
													{isCurrent && (
														<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/15 text-teal-800 dark:text-teal-300">
															Текущий
														</span>
													)}
													{member.roleRu && (
														<span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]">
															{member.roleRu}
														</span>
													)}
												</div>
												<div className="flex items-center gap-2 text-[11px] text-[var(--muted)] mt-0.5">
													{member.phone && <span>{member.phone}</span>}
													{member.personalBalanceRub !== undefined && (
														<span>
															Личный баланс: {money(member.personalBalanceRub)}
														</span>
													)}
												</div>
											</div>
										</div>

										<div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--line)]">
											<div className="text-left sm:text-right">
												<span className="text-xs font-semibold text-[var(--ink)] block">
													{canSpend ? "Доступ к общему счету" : "Списание ограничено"}
												</span>
												<span
													className={`text-[10px] block font-medium ${
														canSpend
															? "text-emerald-600 dark:text-emerald-400"
															: "text-amber-600 dark:text-amber-400"
													}`}
												>
													{canSpend ? "✓ 100% покрытие" : "Требуется согласие главы"}
												</span>
											</div>

											{/* Переключатель «Разрешить списание» */}
											<button
												type="button"
												onClick={() => onTogglePermission(member.id)}
												style={{ padding: "0 12px" }}
												title={
													canSpend
														? "Запретить списание с общего счета"
														: "Разрешить списание с общего счета"
												}
												aria-label={`Переключить права списания для ${member.fullName}`}
												className={`min-h-[44px] sm:min-h-[32px] h-8 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
													canSpend
														? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
														: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]"
												}`}
											>
												{canSpend ? (
													<>
														<UserCheck className="w-3.5 h-3.5" />
														<span>Списание разрешено</span>
													</>
												) : (
													<>
														<UserX className="w-3.5 h-3.5" />
														<span>Списание закрыто</span>
													</>
												)}
											</button>
										</div>
									</div>
								);
							})
						)}
					</div>
				</div>
			</div>
		);
	});
