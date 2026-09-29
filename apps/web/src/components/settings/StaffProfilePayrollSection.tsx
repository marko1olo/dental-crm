/**
 * apps/web/src/components/settings/StaffProfilePayrollSection.tsx
 *
 * Column 2 of StaffProfileCard: Role, specialties, branches, chairs, price category,
 * salary rates (base salary, commission %, material & lab deductions).
 *
 * Mandate 8b: Strictly <= 800 lines.
 * Mandate 8f: Fully tokenized theme variables (zero hardcoded slate/white).
 */

import React from "react";
import { Building2, DollarSign, Stethoscope } from "lucide-react";
import type { StaffRole } from "@dental/shared";
import { CREATABLE_STAFF_ROLES, staffRoleTitle } from "./settingsInviteRoles";

export const DENTAL_SPECIALTIES_LIST = [
	{ id: "universal", label: "Стоматолог общей практики" },
	{ id: "therapist", label: "Терапевт" },
	{ id: "surgeon", label: "Хирург" },
	{ id: "orthopedist", label: "Ортопед" },
	{ id: "orthodontist", label: "Ортодонт" },
	{ id: "periodontist", label: "Пародонтолог" },
	{ id: "implantologist", label: "Имплантолог" },
	{ id: "pediatric", label: "Детский стоматолог" },
	{ id: "hygienist", label: "Гигиенист" },
	{ id: "radiologist", label: "Рентгенолог" },
];

export const PRICE_CATEGORIES = [
	{ id: "standard", label: "Стандартная категория" },
	{ id: "first", label: "Первая категория" },
	{ id: "highest", label: "Высшая категория" },
	{ id: "vip", label: "Ведущий специалист / VIP" },
];

export interface StaffProfilePayrollSectionProps {
	readonly role: StaffRole;
	readonly setRole: (r: StaffRole) => void;
	readonly specialties: string[];
	readonly handleSpecialtyToggle: (id: string) => void;
	// biome-ignore lint/suspicious/noExplicitAny: dashboard clinic model
	readonly clinicsList: any[];
	readonly assignedBranches: string[];
	readonly handleBranchToggle: (id: string) => void;
	// biome-ignore lint/suspicious/noExplicitAny: dashboard chair model
	readonly chairsList: any[];
	readonly assignedChairIds: string[];
	readonly handleChairToggle: (id: string) => void;
	readonly priceCategory: string;
	readonly setPriceCategory: (cat: string) => void;
	readonly baseSalaryRub: number;
	readonly setBaseSalaryRub: (v: number) => void;
	readonly commissionPct: number;
	readonly setCommissionPct: (v: number) => void;
	readonly materialCostDeductionPct: number;
	readonly setMaterialCostDeductionPct: (v: number) => void;
	readonly labCostDeductionPct: number;
	readonly setLabCostDeductionPct: (v: number) => void;
	readonly activeTabMobile: "requisites" | "payroll" | "security";
}

export const StaffProfilePayrollSection: React.FC<StaffProfilePayrollSectionProps> = ({
	role,
	setRole,
	specialties,
	handleSpecialtyToggle,
	clinicsList,
	assignedBranches,
	handleBranchToggle,
	chairsList,
	assignedChairIds,
	handleChairToggle,
	priceCategory,
	setPriceCategory,
	baseSalaryRub,
	setBaseSalaryRub,
	commissionPct,
	setCommissionPct,
	materialCostDeductionPct,
	setMaterialCostDeductionPct,
	labCostDeductionPct,
	setLabCostDeductionPct,
	activeTabMobile,
}) => {
	return (
		<div
			className={`staff-profile-column ${
				activeTabMobile !== "payroll" ? "hidden md:flex" : ""
			}`}
		>
			<section className="staff-profile-card-section">
				<h4 className="staff-profile-section-title">
					<span className="staff-profile-section-title-left">
						<Stethoscope className="w-4 h-4" />
						<span>Роль и специальности</span>
					</span>
				</h4>

				<div className="staff-profile-form-group">
					<label htmlFor="staff-role-select">Должность в клинике</label>
					<select
						id="staff-role-select"
						value={role}
						onChange={(e) => setRole(e.target.value as StaffRole)}
					>
						{CREATABLE_STAFF_ROLES.map((r) => (
							<option key={r} value={r}>
								{staffRoleTitle(r)}
							</option>
						))}
					</select>
				</div>

				<div className="staff-profile-form-group">
					<label>Специализации врача</label>
					<div className="flex flex-wrap gap-1.5 mt-1">
						{DENTAL_SPECIALTIES_LIST.map((spec) => {
							const isSelected = specialties.includes(spec.id);
							return (
								<button
									key={spec.id}
									type="button"
									onClick={() => handleSpecialtyToggle(spec.id)}
									className={`text-xs px-3 py-1.5 min-h-[44px] rounded-lg border transition-all inline-flex items-center justify-center cursor-pointer ${
										isSelected
											? "bg-teal-600 text-white border-teal-600 font-semibold shadow-xs"
											: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-teal-500"
									}`}
								>
									{spec.label}
								</button>
							);
						})}
					</div>
				</div>
			</section>

			<section className="staff-profile-card-section">
				<h4 className="staff-profile-section-title">
					<span className="staff-profile-section-title-left">
						<Building2 className="w-4 h-4" />
						<span>Привязка филиалов и кабинетов</span>
					</span>
				</h4>

				<div className="staff-profile-form-group">
					<label>Филиалы клиники</label>
					{clinicsList.length === 0 ? (
						<span className="text-xs text-[var(--muted)]">
							Филиалы не настроены (основной филиал)
						</span>
					) : (
						<div className="flex flex-col gap-1.5">
							{clinicsList.map((clinic: any) => {
								const checked = assignedBranches.includes(clinic.id);
								return (
									<label
										key={clinic.id}
										className="flex items-center gap-2 text-xs font-normal cursor-pointer"
									>
										<input
											type="checkbox"
											checked={checked}
											onChange={() => handleBranchToggle(clinic.id)}
											className="rounded border-[var(--line)] text-teal-600 focus:ring-teal-500"
										/>
										<span>{clinic.name || "Филиал"}</span>
									</label>
								);
							})}
						</div>
					)}
				</div>

				<div className="staff-profile-form-group">
					<label>Рабочие кабинеты и кресла</label>
					{chairsList.length === 0 ? (
						<span className="text-xs text-[var(--muted)]">
							Кресла клиники не настроены
						</span>
					) : (
						<div className="grid grid-cols-2 gap-1.5">
							{chairsList.map((chair: any) => {
								const checked = assignedChairIds.includes(chair.id);
								return (
									<label
										key={chair.id}
										className="flex items-center gap-2 text-xs font-normal cursor-pointer p-1.5 rounded border border-[var(--line)] bg-[var(--paper-soft)]"
									>
										<input
											type="checkbox"
											checked={checked}
											onChange={() => handleChairToggle(chair.id)}
											className="rounded border-[var(--line)] text-teal-600 focus:ring-teal-500"
										/>
										<span className="truncate" title={chair.name || "Кресло"}>
											{chair.name || "Кресло"}
										</span>
									</label>
								);
							})}
						</div>
					)}
				</div>
			</section>

			<section className="staff-profile-card-section">
				<h4 className="staff-profile-section-title">
					<span className="staff-profile-section-title-left">
						<DollarSign className="w-4 h-4" />
						<span>Тарификация и ставки ЗП</span>
					</span>
				</h4>

				<div className="staff-profile-form-group">
					<label htmlFor="staff-price-category">Прайс-категория</label>
					<select
						id="staff-price-category"
						value={priceCategory}
						onChange={(e) => setPriceCategory(e.target.value)}
					>
						{PRICE_CATEGORIES.map((cat) => (
							<option key={cat.id} value={cat.id}>
								{cat.label}
							</option>
						))}
					</select>
				</div>

				<div className="grid grid-cols-2 gap-2">
					<div className="staff-profile-form-group">
						<label htmlFor="staff-salary-rub">Окладная часть (₽)</label>
						<input
							id="staff-salary-rub"
							type="number"
							min={0}
							step={1000}
							value={baseSalaryRub}
							onChange={(e) =>
								setBaseSalaryRub(Number(e.target.value) || 0)
							}
							placeholder="50 000"
						/>
					</div>
					<div className="staff-profile-form-group">
						<label htmlFor="staff-commission-pct">Ставка ЗП (%)</label>
						<input
							id="staff-commission-pct"
							type="number"
							min={0}
							max={100}
							step={0.5}
							value={commissionPct}
							onChange={(e) =>
								setCommissionPct(Number(e.target.value) || 0)
							}
							placeholder="25 %"
						/>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-2">
					<div className="staff-profile-form-group">
						<label htmlFor="staff-mat-deduction">
							Удержание расходников (%)
						</label>
						<input
							id="staff-mat-deduction"
							type="number"
							min={0}
							max={100}
							value={materialCostDeductionPct}
							onChange={(e) =>
								setMaterialCostDeductionPct(Number(e.target.value) || 0)
							}
							placeholder="0 %"
						/>
					</div>
					<div className="staff-profile-form-group">
						<label htmlFor="staff-lab-deduction">
							Удержание ЗТЛ (%)
						</label>
						<input
							id="staff-lab-deduction"
							type="number"
							min={0}
							max={100}
							value={labCostDeductionPct}
							onChange={(e) =>
								setLabCostDeductionPct(Number(e.target.value) || 0)
							}
							placeholder="0 %"
						/>
					</div>
				</div>
			</section>
		</div>
	);
};
