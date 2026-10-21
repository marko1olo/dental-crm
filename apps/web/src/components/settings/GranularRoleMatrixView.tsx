/**
 * apps/web/src/components/settings/GranularRoleMatrixView.tsx
 *
 * Dedicated Role-Based Access Control (RBAC) workspace tailored for dental clinics.
 * Mandates 8e, 8n, 8x, 8am, 8ze:
 * - 4 Canonical Profiles front & center: Doctor, Administrator/Reception, Assistant, Owner/Chief Doctor.
 * - Solo Doctor & Small Clinic Sovereignty: zero enterprise clutter or bureaucratic matrix hell.
 * - Strict CSS Tokens & Apple HIG Mobile touch ergonomics (Touch targets >= 44x44px, row height >= 52px).
 * - Strictly <= 800 lines ceiling (Mandate 8b).
 */

import {
	type GranularStaffRole,
	GRANULAR_ROLE_MATRIX,
	PERMISSION_DEFINITIONS,
	ROLE_METADATA_REGISTRY,
	getAccessLevelBadge,
} from "@dental/shared";
import {
	AlertTriangle,
	Check,
	Coins,
	FileText,
	HeartPulse,
	Lock,
	Shield,
	ShieldAlert,
	ShieldCheck,
	SlidersHorizontal,
	Stethoscope,
	UserCheck,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

export const ROLE_DISPLAY_NAMES: Record<GranularStaffRole, string> = {
	owner: "Главный врач / Владелец",
	head_doctor: "Главный врач",
	doctor: "Врач-стоматолог",
	assistant: "Ассистент врача",
	senior_nurse: "Старшая медсестра",
	senior_admin: "Старший администратор",
	registrar: "Администратор / Ресепшен",
	accountant: "Бухгалтер",
};

export type RoleCategory = "clinical" | "administrative";

export const CLINICAL_ROLES: GranularStaffRole[] = [
	"doctor",
	"assistant",
	"head_doctor",
	"senior_nurse",
];

export const ADMINISTRATIVE_ROLES: GranularStaffRole[] = [
	"registrar",
	"owner",
	"senior_admin",
	"accountant",
];

export interface CanonicalRoleProfile {
	readonly id: GranularStaffRole;
	readonly title: string;
	readonly badge: string;
	readonly summary: string;
	readonly icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const CANONICAL_ROLE_PROFILES: readonly CanonicalRoleProfile[] = [
	{
		id: "doctor",
		title: "Врач-стоматолог",
		badge: "Клиническая автономия",
		summary: "Приём пациентов, ЭМК, зубная формула, назначения. Доступ к P&L и чужим зарплатам закрыт.",
		icon: Stethoscope,
	},
	{
		id: "registrar",
		title: "Администратор",
		badge: "Расписание & Касса",
		summary: "Запись на приём, касса и чеки, WhatsApp/SMS. Правка диагнозов в ЭМК и P&L закрыты.",
		icon: UserCheck,
	},
	{
		id: "assistant",
		title: "Ассистент врача",
		badge: "Стерилизация & Расход",
		summary: "Списание расходников на приёме, журналы автоклавирования. Подпись ЭМК закрыта.",
		icon: HeartPulse,
	},
	{
		id: "owner",
		title: "Главврач / Владелец",
		badge: "Root / Суверенитет",
		summary: "Полный доступ: P&L и прибыль, ставки ЗП и ФОТ, прейскурант, аудит безопасности.",
		icon: Shield,
	},
];

const getCategoryForRole = (role: GranularStaffRole): RoleCategory => {
	return CLINICAL_ROLES.includes(role) ? "clinical" : "administrative";
};

export interface SuperPermissionInfo {
	readonly badge: string;
	readonly hint: string;
	readonly isCritical: boolean;
}

export const SUPER_PERMISSIONS_MAP: Record<string, SuperPermissionInfo> = {
	"finance.reports_pnl": {
		badge: "Супер-право: P&L клиники",
		hint: "Коммерческая тайна: раскрывает прибыль, маржинальность и чистую выручку всей клиники (доступно только Владельцу / Главному врачу).",
		isCritical: true,
	},
	"payroll.view_all_staff": {
		badge: "Супер-право: Чужие зарплаты",
		hint: "Конфиденциально: доступ к зарплатным табелям, окладам и сдельной выработке всех коллег (финансовая изоляция рядового врача).",
		isCritical: true,
	},
	"payroll.manage_rates": {
		badge: "Супер-право: Управление ФОТ",
		hint: "Финансовый контроль: установка индивидуальных процентов и условий списания ЗТЛ.",
		isCritical: true,
	},
	"patients.pii_full": {
		badge: "Защита пациентской базы",
		hint: "Защита клиентской базы: полный просмотр и экспорт телефонов. Рядовой врач видит свои медкарты, но лишён массовой выгрузки базы клиники.",
		isCritical: true,
	},
	"clinical.records.write": {
		badge: "Врачебная автономия",
		hint: "Право врача свободно вести дневник, ставить диагноз и назначать услуги без подтверждения администратора.",
		isCritical: true,
	},
	"settings.staff_authority": {
		badge: "Супер-право: Эскалация ролей",
		hint: "Административный доступ: назначение ролей, разграничение прав и выдача индивидуальных привилегий доступа.",
		isCritical: true,
	},
	"finance.refunds": {
		badge: "Возвраты из кассы",
		hint: "Кассовая дисциплина: выдача наличных и безналичных возвратов по кассовым чекам.",
		isCritical: false,
	},
	"finance.tariffs_manage": {
		badge: "Супер-право: Прейскурант",
		hint: "Ценовая политика: изменение цен на медицинские услуги и технологических карт расходов.",
		isCritical: true,
	},
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
	const [onlySuperRights, setOnlySuperRights] = useState<boolean>(false);
	const [showAdvancedRoles, setShowAdvancedRoles] = useState<boolean>(false);
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
		if (onlySuperRights && !SUPER_PERMISSIONS_MAP[perm.key]) return false;
		if (selectedModuleFilter === "all") return true;
		return perm.module === selectedModuleFilter;
	});

	const visibleRoles = activeCategory === "clinical" ? CLINICAL_ROLES : ADMINISTRATIVE_ROLES;

	const totalPermsCount = PERMISSION_DEFINITIONS.length;
	const grantedPermsCount = PERMISSION_DEFINITIONS.filter((p) => {
		const lvl = activeRolePermissions[p.key];
		return lvl === "full" || lvl === "read" || lvl === "own";
	}).length;
	const blockedPermsCount = totalPermsCount - grantedPermsCount;

	return (
		<article
			className={`flex flex-col gap-3.5 min-w-0 w-full pb-20 sm:pb-8 ${className}`}
			data-testid="granular-role-matrix-panel"
		>
			{/* HEADER: МАТРИЦА ПРАВ ДОСТУПА & ВРАЧЕБНАЯ АВТОНОМИЯ (МАНДАТЫ 8e, 8n) */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-[var(--line)] min-w-0">
				<div className="flex flex-col gap-0.5 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<h2 className="text-base font-bold text-[var(--ink)] m-0 flex items-center gap-2">
							<Shield className="w-5 h-5 text-[var(--teal)] shrink-0" />
							<span>Матрица прав доступа</span>
						</h2>
						<span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--teal-soft)] text-[var(--teal-dark)] font-bold border border-[var(--line-subtle)]">
							Безопасность и врачебная автономия
						</span>
					</div>
					<p className="text-xs text-[var(--muted)] m-0 leading-normal">
						4 канонические роли: Врач, Администратор, Ассистент, Главврач. Защита базы (маскирование телефонов), финансовая изоляция и автономия врача.
					</p>
				</div>
			</div>

			{/* 4 CANONICAL PROFILES GRID (МАНДАТ 8n: СОЛО-ВРАЧ И 1–3 КРЕСЛА) */}
			<div className="space-y-1.5" data-testid="canonical-roles-section">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
						Канонические профили клиники (4)
					</span>
					<button
						type="button"
						onClick={() => setShowAdvancedRoles(!showAdvancedRoles)}
						className="text-[11px] font-medium text-[var(--teal)] hover:underline inline-flex items-center gap-1 cursor-pointer"
					>
						<SlidersHorizontal size={12} />
						<span>{showAdvancedRoles ? "Скрыть расширенные роли" : "Расширенные роли (8)"}</span>
					</button>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
					{CANONICAL_ROLE_PROFILES.map((canonical) => {
						const isSelected = selectedMatrixRole === canonical.id ||
							(canonical.id === "registrar" && selectedMatrixRole === "senior_admin") ||
							(canonical.id === "owner" && selectedMatrixRole === "head_doctor");
						const Icon = canonical.icon;

						return (
							<button
								key={canonical.id}
								type="button"
								onClick={() => handleRoleSelect(canonical.id)}
								data-testid={`canonical-role-${canonical.id}`}
								className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 min-h-[56px] ${
									isSelected
										? "bg-[var(--paper)] border-[var(--teal)] shadow-xs ring-1 ring-[var(--teal)]/30"
										: "bg-[var(--paper-soft)] border-[var(--line)] hover:border-[var(--line-strong)]"
								}`}
							>
								<div className="flex items-start justify-between gap-2 w-full">
									<div className="flex items-center gap-2 min-w-0">
										<div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
											isSelected ? "bg-[var(--teal)] text-[var(--on-teal)]" : "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"
										}`}>
											<Icon size={15} />
										</div>
										<span className="font-bold text-xs text-[var(--ink)] truncate">
											{canonical.title}
										</span>
									</div>
									<span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold whitespace-nowrap shrink-0 ${
										isSelected ? "bg-[var(--teal-soft)] text-[var(--teal-dark)]" : "bg-[var(--paper)] text-[var(--muted)]"
									}`}>
										{canonical.badge}
									</span>
								</div>
								<p className="text-[11px] text-[var(--muted)] m-0 line-clamp-2 leading-snug">
									{canonical.summary}
								</p>
							</button>
						);
					})}
				</div>
			</div>

			{/* ADVANCED ROLES BAR (EXPANDABLE) */}
			{showAdvancedRoles && (
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
					<div
						className="flex flex-wrap items-center p-1 rounded-xl bg-[var(--paper)] border border-[var(--line)] shrink-0 gap-2"
						role="tablist"
						aria-label="Категория ролей матрицы доступа"
						data-testid="rbac-category-switcher"
					>
						<button
							type="button"
							role="tab"
							aria-selected={activeCategory === "clinical"}
							onClick={() => handleCategoryChange("clinical")}
							className={`px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation flex-1 sm:flex-initial ${
								activeCategory === "clinical"
									? "bg-[var(--paper-soft)] text-[var(--teal-dark)] shadow-xs border border-[var(--teal)]/40"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="rbac-category-clinical"
						>
							<Shield className="w-4 h-4 text-[var(--teal)] shrink-0" />
							<span>Клинический блок (4)</span>
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeCategory === "administrative"}
							onClick={() => handleCategoryChange("administrative")}
							className={`px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation flex-1 sm:flex-initial ${
								activeCategory === "administrative"
									? "bg-[var(--paper-soft)] text-[var(--teal-dark)] shadow-xs border border-[var(--teal)]/40"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="rbac-category-administrative"
						>
							<ShieldCheck className="w-4 h-4 text-[var(--teal)] shrink-0" />
							<span>Административный блок (4)</span>
						</button>
					</div>

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
									className={`px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-all text-center whitespace-normal break-words sm:whitespace-nowrap border cursor-pointer touch-manipulation flex items-center justify-center gap-1.5 ${
										isSelected
											? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-xs font-bold"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
									}`}
									data-testid={`role-matrix-tab-${roleKey}`}
								>
									<span>{roleTitle}</span>
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* SCALE SOVEREIGNTY: СОЛО-ВРАЧ vs КЛИНИКА (МАНДАТЫ 8e, 8n) */}
			<div
				className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5"
				data-testid="practice-scale-sovereignty-banner"
			>
				<div className="flex items-start gap-2.5 min-w-0 flex-1">
					<div className="p-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] shrink-0 mt-0.5 shadow-2xs">
						<Stethoscope size={16} className="text-[var(--teal)]" />
					</div>
					<div className="flex flex-col gap-0.5 min-w-0">
						<span className="font-bold text-[var(--ink)] text-xs">
							Масштаб практики и автономия врача:
						</span>
						<p className="text-[11px] text-[var(--muted)] m-0 leading-snug">
							<strong>Соло-врач (кабинет / аренда):</strong> полный доступ к своим пациентам, медицинской карте и кассе.
							<span className="mx-1.5 hidden sm:inline text-[var(--line)]">•</span>
							<strong className="block sm:inline mt-0.5 sm:mt-0">Клиника (многопрофильная):</strong> активируется финансовая изоляция (P&L клиники и чужие зарплаты скрыты) и защита клиентской базы (маскирование телефонов, запрет массового экспорта).
						</p>
					</div>
				</div>
			</div>

			{/* FILTERS & MODULE SELECTOR */}
			<div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-[var(--line)]">
				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={() => setOnlySuperRights(!onlySuperRights)}
						className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer touch-manipulation transition-colors ${
							onlySuperRights
								? "bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/40 shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
						}`}
						data-testid="rbac-filter-super-rights"
						title="Фильтровать только полномочия повышенной ответственности"
					>
						<AlertTriangle size={14} className={onlySuperRights ? "text-amber-600 dark:text-amber-400" : "text-[var(--muted)]"} />
						<span>Только супер-права</span>
					</button>

					<div className="flex items-center gap-1.5">
						<label htmlFor="rbac-module-filter" className="text-xs font-semibold text-[var(--ink)]">
							Модуль:
						</label>
						<select
							id="rbac-module-filter"
							value={selectedModuleFilter}
							onChange={(e) => setSelectedModuleFilter(e.target.value)}
							className="px-2.5 py-1.5 h-9 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] cursor-pointer"
						>
							<option value="all">Все модули ({PERMISSION_DEFINITIONS.length})</option>
							<option value="clinical">ЭМК и протоколы</option>
							<option value="schedule">Расписание и смены</option>
							<option value="patients">Пациенты и данные</option>
							<option value="finance_cashier">Касса и платежи</option>
							<option value="finance_reports">P&L и финансы</option>
							<option value="payroll">Зарплата и сделка</option>
							<option value="inventory">Склад и стерилизация</option>
							<option value="settings">Настройки клиники</option>
							<option value="egisz">Минздрав и реестры</option>
							<option value="communications">Коммуникации</option>
						</select>
					</div>
				</div>

				<div className="flex items-center gap-1.5 text-xs">
					<span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--teal-soft)] text-[var(--teal-dark)] font-bold border border-[var(--line-subtle)]">
						{grantedPermsCount} разрешено
					</span>
					<span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--paper-soft)] text-[var(--muted)] font-medium border border-[var(--line)]">
						{blockedPermsCount} закрыто
					</span>
				</div>
			</div>

			{/* CRITICAL BARRIERS NOTIFICATION BANNERS */}
			{selectedMatrixRole === "doctor" && (
				<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs flex flex-col gap-2" data-testid="doctor-security-barriers">
					<div className="font-bold flex items-center justify-between gap-1.5 text-[var(--ink)] flex-wrap">
						<div className="flex items-center gap-1.5">
							<ShieldCheck size={16} className="text-[var(--teal)]" />
							<span className="text-xs sm:text-sm">Ключевые принципы безопасности и автономии для роли «Врач-стоматолог»:</span>
						</div>
						<span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--teal-soft)] text-[var(--teal-dark)] font-semibold border border-[var(--line-subtle)]">
							Врачебная автономия и защита базы
						</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-[var(--ink)]">
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Shield size={14} className="text-blue-500 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-[var(--ink)]">Защита пациентской базы:</strong>
								<span className="text-[var(--muted)]">Врач видит карты своих пациентов, но лишён массового экспорта телефонной базы клиники. Телефоны маскируются.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Lock size={14} className="text-purple-500 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-[var(--ink)]">Финансовая изоляция:</strong>
								<span className="text-[var(--muted)]">Врач видит личные начисления и услуги (сделка), но P&L клиники и зарплатные ведомости коллег надёжно скрыты.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-[var(--ink)]">Врачебная автономия у кресла:</strong>
								<span className="text-[var(--muted)]">Свободное ведение дневника ЭМК, назначение услуг и применение скидок без подтверждения администратора.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Lock size={14} className="text-amber-500 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-[var(--ink)]">Защита прейскуранта:</strong>
								<span className="text-[var(--muted)]">Базовые расценки услуг открыты для чтения — изменение прейскуранта доступно только руководству.</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{(selectedMatrixRole === "owner" || selectedMatrixRole === "head_doctor") && (
				<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs flex flex-col gap-2" data-testid="owner-security-barriers">
					<div className="font-bold flex items-center justify-between gap-1.5 text-[var(--ink)] flex-wrap">
						<div className="flex items-center gap-1.5">
							<ShieldCheck size={16} className="text-purple-500" />
							<span className="text-xs sm:text-sm">Полномочия роли «Главный врач / Владелец»:</span>
						</div>
						<span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 font-semibold border border-purple-500/30">
							Root / Полный суверенитет
						</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-[var(--ink)]">
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Coins size={14} className="text-purple-500 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-[var(--ink)]">P&L и финансы:</strong>
								<span className="text-[var(--muted)]">Полная аналитика клиники: чистая прибыль, выручка, маржинальность по креслам и средний чек.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Lock size={14} className="text-indigo-500 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-[var(--ink)]">Управление ФОТ:</strong>
								<span className="text-[var(--muted)]">Настройка процентных ставок врачей, окладов, удержаний за ЗТЛ и сводные зарплатные ведомости.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Shield size={14} className="text-emerald-500 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-[var(--ink)]">Безопасность базы данных:</strong>
								<span className="text-[var(--muted)]">Право экспорта пациентской базы и аудит всех обращений к персональным данным.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Check size={14} className="text-[var(--teal)] shrink-0 mt-0.5" />
							<div>
								<strong className="block text-[var(--ink)]">Врачебная автономия:</strong>
								<span className="text-[var(--muted)]">Право клинического контроля и утверждения протоколов лечения без помех лечебному процессу.</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{(selectedMatrixRole === "assistant" || selectedMatrixRole === "senior_nurse") && (
				<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs flex flex-col gap-2" data-testid="assistant-security-barriers">
					<div className="font-bold flex items-center justify-between gap-1.5 text-[var(--ink)] flex-wrap">
						<div className="flex items-center gap-1.5">
							<ShieldAlert size={16} className="text-amber-500" />
							<span className="text-xs sm:text-sm">Барьеры безопасности для роли «Ассистент врача»:</span>
						</div>
						<span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold border border-amber-500/30">
							Сестринский сектор & Стерилизация
						</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[var(--ink)]">
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Shield size={14} className="text-amber-500 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-[var(--ink)]">Маскирование телефонов:</strong>
								<span className="text-[var(--muted)]">Номера телефонов, паспорта и адреса пациентов скрыты маской в реестрах для исключения утечек ПДн.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Lock size={14} className="text-rose-500 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-[var(--ink)]">Запрет подписи ЭМК:</strong>
								<span className="text-[var(--muted)]">Подписание дневников визита за врача заблокировано (требуется диплом врача-стоматолога).</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-[var(--ink)]">Расходники и стерилизация:</strong>
								<span className="text-[var(--muted)]">Списание материалов на визите, фиксация карпул анестетиков и ведение журналов автоклавирования.</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{(selectedMatrixRole === "senior_admin" || selectedMatrixRole === "registrar") && (
				<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs flex flex-col gap-2" data-testid="admin-security-barriers">
					<div className="font-bold flex items-center justify-between gap-1.5 text-[var(--ink)] flex-wrap">
						<div className="flex items-center gap-1.5">
							<ShieldCheck size={16} className="text-sky-500" />
							<span className="text-xs sm:text-sm">
								Барьеры безопасности для роли «{selectedMatrixRole === "senior_admin" ? "Старший администратор" : "Администратор"}»:
							</span>
						</div>
						<span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-800 dark:text-sky-300 font-semibold border border-sky-500/30">
							Ресепшен & Касса
						</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[var(--ink)]">
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Coins size={14} className="text-[var(--teal)] shrink-0 mt-0.5" />
							<div>
								<strong className="block text-[var(--ink)]">Касса и чеки:</strong>
								<span className="text-[var(--muted)]">Приём оплаты (нал, карта, СБП, депозит), пробитие чеков, запись на приём и подтверждение визитов.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Lock size={14} className="text-purple-500 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-[var(--ink)]">Изоляция зарплат и P&L:</strong>
								<span className="text-[var(--muted)]">Зарплатные ведомости врачей, оклады и чистая прибыль клиники надёжно закрыты от ресепшена.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Lock size={14} className="text-rose-500 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-[var(--ink)]">Запрет правки ЭМК:</strong>
								<span className="text-[var(--muted)]">Администратор не имеет доступа к изменению клинических протоколов и медицинских диагнозов.</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* DESKTOP PERMISSIONS REGISTRY TABLE (>= 640px) */}
			<div className="hidden sm:block overflow-x-auto min-w-0 border border-[var(--line)] rounded-xl bg-[var(--paper)] shadow-2xs">
				<table className="w-full text-left text-xs border-collapse">
					<thead>
						<tr className="sticky top-0 bg-[var(--paper-soft)] border-b border-[var(--line)] text-[var(--ink)] font-bold z-10">
							<th className="py-2.5 px-3">Полномочие и назначение</th>
							<th className="py-2.5 px-3 w-28">Модуль</th>
							<th className="py-2.5 px-3 text-right w-56">Статус и тумблер доступа</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--line-subtle)]">
						{filteredPermissions.map((perm) => {
							const level = activeRolePermissions[perm.key] || "none";
							const badge = getAccessLevelBadge(level);
							const superInfo = SUPER_PERMISSIONS_MAP[perm.key];
							const isGranted = level === "full" || level === "read" || level === "own";

							return (
								<tr
									key={perm.key}
									className="hover:bg-[var(--paper-soft)]/50 transition-colors"
									data-testid={`perm-row-${perm.key}`}
								>
									<td className="py-2 px-3">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="font-bold text-[var(--ink)] leading-tight">
												{perm.title}
											</span>
											{superInfo && (
												<span
													className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
														superInfo.isCritical
															? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
															: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
													}`}
													title={superInfo.hint}
												>
													<AlertTriangle size={10} className="shrink-0" />
													<span>{superInfo.badge}</span>
												</span>
											)}
										</div>
										<span className="text-[11px] text-[var(--muted)] block mt-0.5 leading-normal">
											{perm.description}
										</span>
									</td>
									<td className="py-2 px-3">
										<span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]">
											{perm.module}
										</span>
									</td>
									<td className="py-2 px-3 text-right">
										<div className="inline-flex items-center gap-2 justify-end">
											<span
												className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-2xs ${badge.badgeClass} ${badge.borderClass}`}
												data-testid={`perm-badge-${perm.key}-${level}`}
											>
												{isGranted ? (
													<Check size={12} className="stroke-[3]" />
												) : (
													<Lock size={12} />
												)}
												<span>{badge.label}</span>
											</span>

											<div
												className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
													level === "full"
														? "bg-emerald-500 justify-end"
														: level === "read"
															? "bg-sky-500 justify-center"
															: level === "own"
																? "bg-amber-500 justify-center"
																: "bg-[var(--line)] justify-start"
												}`}
												title={`Уровень доступа: ${badge.label}`}
												aria-hidden="true"
											>
												<div className="w-4 h-4 rounded-full bg-[var(--paper)] shadow-xs" />
											</div>
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* MOBILE GROUPED LIST CARDS (< 640px per Apple HIG) */}
			<div
				className="flex flex-col divide-y divide-[var(--line-subtle)] sm:hidden min-w-0 border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--paper)] shadow-2xs"
				data-testid="rbac-mobile-cards"
			>
				{filteredPermissions.map((perm) => {
					const level = activeRolePermissions[perm.key] || "none";
					const badge = getAccessLevelBadge(level);
					const superInfo = SUPER_PERMISSIONS_MAP[perm.key];
					const isGranted = level === "full" || level === "read" || level === "own";

					return (
						<div
							key={`mobile-${perm.key}`}
							className="p-3.5 flex flex-col gap-2 min-w-0 min-h-[52px] hover:bg-[var(--paper-soft)]/50 touch-manipulation"
							data-testid={`perm-card-mobile-${perm.key}`}
						>
							<div className="flex items-start justify-between gap-2 min-w-0">
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-1.5 flex-wrap">
										<span className="font-bold text-xs text-[var(--ink)] break-words">
											{perm.title}
										</span>
										<span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]">
											{perm.module}
										</span>
									</div>
									{superInfo && (
										<span
											className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border mt-1 ${
												superInfo.isCritical
													? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
													: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
											}`}
										>
											<AlertTriangle size={10} className="shrink-0" />
											<span>{superInfo.badge}</span>
										</span>
									)}
								</div>

								<div className="flex items-center gap-2 shrink-0">
									<span
										className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 min-h-[44px] rounded-lg text-xs font-bold border touch-manipulation ${badge.badgeClass} ${badge.borderClass}`}
										data-testid={`perm-badge-mobile-${perm.key}-${level}`}
									>
										{isGranted ? (
											<Check size={14} className="stroke-[3]" />
										) : (
											<Lock size={14} />
										)}
										<span>{badge.label}</span>
									</span>
									<div
										className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${
											level === "full"
												? "bg-emerald-500 justify-end"
												: level === "read"
													? "bg-sky-500 justify-center"
													: level === "own"
														? "bg-amber-500 justify-center"
														: "bg-[var(--line)] justify-start"
										}`}
										aria-hidden="true"
									>
										<div className="w-3 h-3 rounded-full bg-[var(--paper)] shadow-xs" />
									</div>
								</div>
							</div>
							<p className="text-xs text-[var(--muted)] m-0 leading-normal break-words min-w-0">
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
