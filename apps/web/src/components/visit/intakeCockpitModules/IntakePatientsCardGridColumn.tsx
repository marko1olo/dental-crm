/**
 * apps/web/src/components/visit/intakeCockpitModules/IntakePatientsCardGridColumn.tsx
 *
 * Правая колонка картотеки и быстрого поиска пациентов для VisitIntakeCockpit.
 */

import React from "react";
import { AlertTriangle, Sparkles, Stethoscope, User } from "lucide-react";
import { getSomaticBadgeInfo } from "../../../utils/somaticNorm";
import type { Patient } from "@dental/shared";
import type { IntakePatientExtended } from "./intakeCockpitTypes";
import { calculatePatientAge } from "./IntakeQueueListColumn";

export function getPatientInitials(fullName?: string | null): string {
	if (!fullName) return "П";
	const parts = fullName.trim().split(/\s+/);
	if (parts.length >= 2) {
		return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
	}
	return (parts[0]?.slice(0, 2) ?? "П").toUpperCase();
}

export interface IntakePatientsCardGridColumnProps {
	readonly filteredPatients: readonly Patient[];
	readonly searchQuery: string;
	readonly onSelectPatient: (patientId: string) => void;
}

export function IntakePatientsCardGridColumn({
	filteredPatients,
	searchQuery,
	onSelectPatient,
}: IntakePatientsCardGridColumnProps) {
	return (
		<div className="xl:col-span-5 flex flex-col gap-3">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<User size={16} className="text-[var(--brand)] shrink-0" />
					<h3 className="m-0 text-sm font-extrabold text-[var(--ink)]">
						{searchQuery.trim()
							? `Результаты поиска (${filteredPatients.length})`
							: "Быстрый выбор из картотеки"}
					</h3>
				</div>
				<span className="text-[11px] text-[var(--muted)] font-medium">
					Открытие медицинской карты в 1 клик
				</span>
			</div>

			{filteredPatients.length === 0 ? (
				<div className="p-6 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--paper-soft)]/40 text-center space-y-2">
					<AlertTriangle size={22} className="mx-auto text-amber-500" />
					<div className="text-sm font-bold text-[var(--ink)]">
						Пациент «{searchQuery}» не найден
					</div>
				</div>
			) : (
				<div
					className="grid grid-cols-1 gap-2 max-h-[540px] overflow-y-auto pr-1"
					data-testid="visit-intake-patients-grid"
				>
					{filteredPatients.map((p) => {
						const ext = p as IntakePatientExtended;
						const ageText = calculatePatientAge(p.birthDate);
						const somaticInfo = getSomaticBadgeInfo(
							ext.allergies,
							ext.medicalFlags || ext.chronicDiseases,
						);

						return (
							<div
								key={p.id}
								onClick={() => onSelectPatient(p.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onSelectPatient(p.id);
									}
								}}
								role="button"
								tabIndex={0}
								className="p-3 rounded-xl bg-[var(--paper-soft)]/50 hover:bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--brand)]/50 transition-all cursor-pointer flex items-center justify-between gap-3 group"
								data-testid={`visit-patient-item-${p.id}`}
							>
								<div className="flex items-center gap-3 min-w-0">
									<div className="w-9 h-9 rounded-xl bg-[var(--brand)]/12 text-[var(--brand)] border border-[var(--brand)]/25 flex items-center justify-center text-xs font-black shrink-0">
										{getPatientInitials(p.fullName)}
									</div>
									<div className="min-w-0">
										<div className="flex items-center gap-1.5">
											<span className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate group-hover:text-[var(--brand)] transition-colors">
												{p.fullName}
											</span>
											{ext.isVip && (
												<span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 inline-flex items-center gap-0.5">
													<Sparkles size={10} />
													VIP
												</span>
											)}
										</div>
										<div className="text-[11px] text-[var(--muted)] flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
											{p.phone && <span className="font-mono">{p.phone}</span>}
											{ageText && <span>• {ageText}</span>}
											{somaticInfo.hasAllergy && (
												<span className="text-rose-600 dark:text-rose-400 font-bold">
													• Аллергия: {somaticInfo.allergyLabel}
												</span>
											)}
										</div>
									</div>
								</div>

								<span className="secondary-button min-h-[34px] h-[34px] px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors">
									<Stethoscope size={13} className="text-[var(--teal)] shrink-0" />
									<span>Открыть</span>
								</span>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
