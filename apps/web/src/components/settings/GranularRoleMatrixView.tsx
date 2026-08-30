import {
	type GranularStaffRole,
	GRANULAR_STAFF_ROLES,
	GRANULAR_ROLE_MATRIX,
	PERMISSION_DEFINITIONS,
	ROLE_METADATA_REGISTRY,
	getAccessLevelBadge,
} from "@dental/shared";
import {
	Check,
	Lock,
	Shield,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

const ROLE_DISPLAY_NAMES: Record<GranularStaffRole, string> = {
	owner: "Владелец",
	head_doctor: "Главный врач",
	doctor: "Врач",
	assistant: "Ассистент",
	senior_nurse: "Старшая медсестра",
	senior_admin: "Старший администратор",
	registrar: "Регистратор",
	accountant: "Бухгалтер",
};

export type RoleCategory = "clinical" | "administrative";

const CLINICAL_ROLES: GranularStaffRole[] = [
	"head_doctor",
	"doctor",
	"assistant",
	"senior_nurse",
];

const ADMINISTRATIVE_ROLES: GranularStaffRole[] = [
	"owner",
	"senior_admin",
	"registrar",
	"accountant",
];

const getCategoryForRole = (role: GranularStaffRole): RoleCategory => {
	return CLINICAL_ROLES.includes(role) ? "clinical" : "administrative";
};

export interface GranularRoleMatrixViewProps {
	readonly initialRole?: GranularStaffRole;
	readonly initialModuleFilter?: string;
	readonly className?: string;
}

export const GranularRoleMatrixView: React.FC<GranularRoleMatrixViewProps> = ({
	initialRole = "doctor",
	initialModuleFilter = "all",
	className = "",
}) => {
	const [selectedMatrixRole, setSelectedMatrixRole] = useState<GranularStaffRole>(initialRole);
	const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>(initialModuleFilter);
	const [activeCategory, setActiveCategory] = useState<RoleCategory>(() =>
		getCategoryForRole(initialRole)
	);

	const handleCategoryChange = (category: RoleCategory) => {
		setActiveCategory(category);
		const targetRoles = category === "clinical" ? CLINICAL_ROLES : ADMINISTRATIVE_ROLES;
		if (!targetRoles.includes(selectedMatrixRole)) {
			setSelectedMatrixRole(targetRoles[0]!);
		}
	};

	const handleRoleSelect = (roleKey: GranularStaffRole) => {
		setSelectedMatrixRole(roleKey);
		setActiveCategory(getCategoryForRole(roleKey));
	};

	const activeRoleMeta = ROLE_METADATA_REGISTRY[selectedMatrixRole] || {
		role: selectedMatrixRole,
		title: ROLE_DISPLAY_NAMES[selectedMatrixRole] || selectedMatrixRole,
		description: "Ролевые права доступа в системе DENTE",
	};
	const activeRolePermissions = GRANULAR_ROLE_MATRIX[selectedMatrixRole] || {};

	const filteredPermissions = PERMISSION_DEFINITIONS.filter((perm) => {
		if (selectedModuleFilter === "all") return true;
		return perm.module === selectedModuleFilter;
	});

	const visibleRoles = activeCategory === "clinical" ? CLINICAL_ROLES : ADMINISTRATIVE_ROLES;

	return (
		<article
			className={`flex flex-col gap-2.5 min-w-0 w-full ${className}`}
			data-testid="granular-role-matrix-panel"
		>
			{/* TIER 1 CONTROLS: 2-Level Role Category Switcher + Role Tabs + Module Selector */}
			<div className="flex flex-col gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 min-w-0">
				{/* Level 1: Category Selector + Module Filter */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 min-w-0">
					{/* Category Selector Tabs */}
					<div
						className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shrink-0 gap-2"
						role="tablist"
						aria-label="Категория ролей матрицы доступа"
						data-testid="rbac-category-switcher"
					>
						<button
							type="button"
							role="tab"
							aria-selected={activeCategory === "clinical"}
							onClick={() => handleCategoryChange("clinical")}
							className={`px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer touch-manipulation ${
								activeCategory === "clinical"
									? "bg-white dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 shadow-xs border border-slate-200 dark:border-teal-700/60"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
							}`}
							data-testid="rbac-category-clinical"
						>
							<Shield className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Клинический блок (4)</span>
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeCategory === "administrative"}
							onClick={() => handleCategoryChange("administrative")}
							className={`px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer touch-manipulation ${
								activeCategory === "administrative"
									? "bg-white dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 shadow-xs border border-slate-200 dark:border-teal-700/60"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
							}`}
							data-testid="rbac-category-administrative"
						>
							<ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Административный блок (4)</span>
						</button>
					</div>

					{/* Module Filter Dropdown */}
					<div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
						<label
							htmlFor="rbac-module-filter"
							className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0"
						>
							Модуль:
						</label>
						<select
							id="rbac-module-filter"
							value={selectedModuleFilter}
							onChange={(e) => setSelectedModuleFilter(e.target.value)}
							className="px-3 py-2 h-11 min-h-[44px] rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer touch-manipulation"
							aria-label="Фильтр по функциональному модулю"
						>
							<option value="all">Все модули (22)</option>
							<option value="clinical">ЭМК и протоколы</option>
							<option value="schedule">Расписание и смены</option>
							<option value="patients">Пациенты и 152-ФЗ</option>
							<option value="finance_cashier">Касса 54-ФЗ</option>
							<option value="finance_reports">P&L и финансы</option>
							<option value="payroll">Зарплата и сделка</option>
							<option value="inventory">Склад и СанПиН</option>
							<option value="settings">Настройки клиники</option>
							<option value="egisz">ЕГИСЗ Минздрава</option>
							<option value="communications">Коммуникации</option>
						</select>
					</div>
				</div>

				{/* Level 2: Role Selector Tabs with Flex-Wrap (Zero Truncation Guarantee for 'Старший администратор' + 44px Touch Targets) */}
				<div
					className="flex flex-wrap items-center gap-2 py-1 min-w-0"
					role="tablist"
					aria-label="Выбор роли для матрицы доступа"
					data-testid="rbac-roles-scroll-strip"
				>
					{visibleRoles.map((roleKey) => {
						const roleTitle =
							ROLE_DISPLAY_NAMES[roleKey] || ROLE_METADATA_REGISTRY[roleKey]?.title;
						const isSelected = selectedMatrixRole === roleKey;
						return (
							<button
								key={roleKey}
								type="button"
								role="tab"
								aria-selected={isSelected}
								onClick={() => handleRoleSelect(roleKey)}
								className={`px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-all text-center whitespace-nowrap border cursor-pointer touch-manipulation flex items-center justify-center gap-1.5 ${
									isSelected
										? "bg-teal-500/15 dark:bg-teal-500/25 text-teal-800 dark:text-teal-200 border-teal-500/60 dark:border-teal-500 shadow-xs font-bold ring-1 ring-teal-500/40"
										: "bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200/80 dark:hover:bg-slate-700"
								}`}
								data-testid={`role-matrix-tab-${roleKey}`}
							>
								<span>{roleTitle}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* ACTIVE ROLE SUMMARY STRIP: Full Description without collision with P&L Isolation Badge */}
			<div className="py-2.5 px-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 min-w-0 text-xs">
				<div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
					<div className="flex items-center gap-1.5 shrink-0">
						<span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
							{activeRoleMeta.title}
						</span>
						<span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono font-medium">
							role: {activeRoleMeta.role}
						</span>
					</div>
					<span className="text-slate-700 dark:text-slate-300 text-[11px] leading-tight break-words min-w-0">
						— {activeRoleMeta.description}
					</span>
				</div>

				<div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
					{activeRoleMeta.role === "doctor" && (
						<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-200 border border-purple-300 dark:border-purple-700 whitespace-nowrap shadow-xs">
							<Lock size={12} className="shrink-0 text-purple-700 dark:text-purple-300" />
							<span>P&L: Скрыт (Изоляция)</span>
						</span>
					)}
					{activeRoleMeta.role === "assistant" && (
						<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700 whitespace-nowrap shadow-xs">
							<Shield size={12} className="shrink-0 text-amber-700 dark:text-amber-300" />
							<span>152-ФЗ: Маскирован</span>
						</span>
					)}
					{activeRoleMeta.role === "owner" && (
						<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 whitespace-nowrap shadow-xs">
							<ShieldCheck size={12} className="shrink-0 text-emerald-700 dark:text-emerald-300" />
							<span>Полный доступ (Root)</span>
						</span>
					)}
				</div>
			</div>

			{/* MONOLITHIC PERMISSIONS REGISTRY TABLE (Desktop / Tablet >= 640px) */}
			<div className="hidden sm:block overflow-x-auto min-w-0 border border-slate-200 dark:border-slate-800 rounded-xl">
				<table className="w-full text-left text-xs border-collapse">
					<thead>
						<tr className="sticky top-0 bg-slate-100 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold z-10">
							<th className="py-2 px-3">Полномочие и назначение</th>
							<th className="py-2 px-3 w-28">Модуль</th>
							<th className="py-2 px-3 text-right w-44">Уровень доступа</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
						{filteredPermissions.map((perm) => {
							const level = activeRolePermissions[perm.key] || "none";
							const badge = getAccessLevelBadge(level);
							return (
								<tr
									key={perm.key}
									className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
									data-testid={`perm-row-${perm.key}`}
								>
									<td className="py-2 px-3">
										<span className="font-bold text-slate-900 dark:text-white block leading-tight">
											{perm.title}
										</span>
										<span className="text-[11px] text-slate-600 dark:text-slate-400 block mt-0.5 leading-normal">
											{perm.description}
										</span>
									</td>
									<td className="py-2 px-3">
										<span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
											{perm.module}
										</span>
									</td>
									<td className="py-2 px-3 text-right">
										<span
											className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${badge.badgeClass} ${badge.borderClass}`}
											data-testid={`perm-badge-${perm.key}-${level}`}
										>
											{badge.label}
										</span>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* COMPACT PERMISSION LIST (Mobile < 640px) */}
			<div className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800 sm:hidden min-w-0 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900" data-testid="rbac-mobile-cards">
				{filteredPermissions.map((perm) => {
					const level = activeRolePermissions[perm.key] || "none";
					const badge = getAccessLevelBadge(level);
					const hasAccess = level !== "none";
					return (
						<div
							key={`mobile-${perm.key}`}
							className="p-3 flex flex-col gap-2 min-w-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 touch-manipulation"
							data-testid={`perm-card-mobile-${perm.key}`}
						>
							<div className="flex items-center justify-between gap-2 min-w-0">
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-1.5 flex-wrap">
										<span className="font-bold text-xs text-slate-900 dark:text-white break-words">
											{perm.title}
										</span>
										<span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
											{perm.module}
										</span>
									</div>
								</div>
								<span
									className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg text-xs font-bold border touch-manipulation ${badge.badgeClass} ${badge.borderClass}`}
									data-testid={`perm-badge-mobile-${perm.key}-${level}`}
								>
									{hasAccess ? (
										<Check size={14} className="stroke-[3]" />
									) : (
										<ShieldAlert size={14} />
									)}
									<span>{badge.label}</span>
								</span>
							</div>
							<p className="text-xs text-slate-600 dark:text-slate-400 m-0 leading-normal break-words min-w-0">
								{perm.description}
							</p>
						</div>
					);
				})}
			</div>
		</article>
	);
};

export default GranularRoleMatrixView;
