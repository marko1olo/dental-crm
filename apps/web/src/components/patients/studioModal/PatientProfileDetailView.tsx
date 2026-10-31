/**
 * PatientProfileDetailView.tsx — Отображение анкеты, баланса и истории пациента.
 *
 * МАНДАТЫ:
 * - Apple HIG: группированные карточки (Grouped List Cards), аккуратные отступы, контраст.
 * - Мандат 8e (Автономия врача): соматическая норма видна в 1 клик, аллергии не блокируют работу.
 * - Мандат 8n (Семейный баланс): бесшовная интеграция с семейным кошельком.
 * - Мандат 8b (Sweet Spot: 120–220 строк).
 */

import React from "react";
import { ShieldCheck, AlertCircle, Clock, Calendar, FileText, CheckCircle2 } from "lucide-react";
import {
	type PatientCatalogItem,
	type PatientFamilyGroup,
	type FamilyMember,
	PATIENT_CATEGORIES_CATALOG,
	formatKopecksToRub,
	formatPhoneDisplay,
} from "../patientCatalogData";
import { PatientFamilyWalletSection } from "./PatientFamilyWalletSection";
import type { PatientStudioTab } from "./usePatientStudioState";

export interface PatientProfileDetailViewProps {
	readonly currentPatient: PatientCatalogItem;
	readonly currentFamily: PatientFamilyGroup | null;
	readonly activeTab: PatientStudioTab;
	readonly onPayDebtFromRelative: (payer: FamilyMember) => void;
}

export const PatientProfileDetailView: React.FC<PatientProfileDetailViewProps> = React.memo(
	function PatientProfileDetailView({
		currentPatient,
		currentFamily,
		activeTab,
		onPayDebtFromRelative,
	}) {
		return (
			<div className="space-y-4" data-testid="patient-studio-detail-view">
				{/* Основная карточка статуса, категории и баланса */}
				{(activeTab === "profile" || activeTab === "family") && (
					<div className="p-4 rounded-2xl bg-[var(--paper-subtle)] border border-[var(--line)] space-y-3">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								<span
									className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
										currentPatient.category === "vip"
											? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
											: "bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/20"
									}`}
								>
									{PATIENT_CATEGORIES_CATALOG[currentPatient.category].labelRu}
								</span>
								{currentPatient.isSomaticNorm && (
									<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
										<ShieldCheck size={12} />
										Соматически здоров
									</span>
								)}
							</div>
							<div className="text-right">
								<span className="text-xs text-[var(--muted)] block">Баланс пациента</span>
								<span
									className={`text-base font-bold ${
										currentPatient.balanceKopecks < 0
											? "text-red-500"
											: currentPatient.balanceKopecks > 0
											? "text-emerald-500"
											: "text-[var(--ink)]"
									}`}
									data-testid="patient-studio-balance"
								>
									{formatKopecksToRub(currentPatient.balanceKopecks)}
								</span>
							</div>
						</div>

						{/* Клинические заметки и аллергии */}
						{currentPatient.allergies.length > 0 && (
							<div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
								<AlertCircle size={14} className="shrink-0" />
								<span>Аллергия: {currentPatient.allergies.join(", ")}</span>
							</div>
						)}

						{currentPatient.notes && (
							<p className="text-xs text-[var(--ink-secondary)] bg-[var(--paper)] p-2.5 rounded-xl border border-[var(--line)]">
								{currentPatient.notes}
							</p>
						)}
					</div>
				)}

				{/* Секция семейного баланса и общего кошелька */}
				{(activeTab === "profile" || activeTab === "family") && (
					<PatientFamilyWalletSection
						currentPatient={currentPatient}
						currentFamily={currentFamily}
						onPayDebtFromRelative={onPayDebtFromRelative}
					/>
				)}

				{/* Вкладка истории приёмов и визитов */}
				{activeTab === "history" && (
					<div className="p-4 rounded-2xl bg-[var(--paper-subtle)] border border-[var(--line)] space-y-3">
						<div className="flex items-center gap-2">
							<Clock size={16} className="text-[var(--teal)]" />
							<h3 className="text-xs font-semibold text-[var(--ink)]">
								История приёмов и плановых осмотров
							</h3>
						</div>

						<div className="space-y-2.5">
							{currentPatient.lastVisitDate && (
								<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
									<div className="flex items-center gap-2">
										<CheckCircle2 size={15} className="text-emerald-500" />
										<div>
											<span className="text-xs font-medium text-[var(--ink)] block">
												Завершенный приём
											</span>
											<span className="text-[11px] text-[var(--muted)]">
												{currentPatient.doctorName || "Лечащий врач"}
											</span>
										</div>
									</div>
									<span className="text-xs font-medium text-[var(--muted)]">
										{currentPatient.lastVisitDate}
									</span>
								</div>
							)}

							{currentPatient.nextAppointmentDate && (
								<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--teal)]/30 flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Calendar size={15} className="text-[var(--teal)]" />
										<div>
											<span className="text-xs font-semibold text-[var(--ink)] block">
												Запланированный визит
											</span>
											<span className="text-[11px] text-[var(--muted)]">
												{currentPatient.notes || "Плановое лечение"}
											</span>
										</div>
									</div>
									<span className="text-xs font-semibold text-[var(--teal)]">
										{currentPatient.nextAppointmentDate}
									</span>
								</div>
							)}

							{!currentPatient.lastVisitDate && !currentPatient.nextAppointmentDate && (
								<p className="text-xs text-[var(--muted)] text-center py-4">
									История визитов пуста. Пациент зарегистрирован в базе данных клиники.
								</p>
							)}
						</div>
					</div>
				)}
			</div>
		);
	},
);
