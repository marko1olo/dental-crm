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
	Lock,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Stethoscope,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

const ROLE_DISPLAY_NAMES: Record<GranularStaffRole, string> = {
	owner: "Главный врач / Владелец",
	head_doctor: "Главный врач",
	doctor: "Врач-стоматолог",
	assistant: "Ассистент врача",
	senior_nurse: "Старшая медсестра",
	senior_admin: "Старший администратор",
	registrar: "Администратор",
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

	// Подсчет статистики полномочий для выбранной роли
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
			{/* HEADER: МАТРИЦА ПРАВ ДОСТУПА & ЗАЩИТА 152-ФЗ (МАНДАТЫ 8e, 8n, 8z) */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-[var(--line)] min-w-0">
				<div className="flex flex-col gap-0.5 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<h2 className="text-base font-bold text-[var(--ink)] m-0 flex items-center gap-2">
							<Shield className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Матрица прав доступа</span>
						</h2>
						<span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800">
							Безопасность и врачебная автономия
						</span>
					</div>
					<p className="text-xs text-[var(--muted)] m-0 leading-normal">
						Разграничение прав соло-врача, клинициста и руководства. Защита базы от увода (маскирование телефонов), финансовая изоляция и врачебная автономия у кресла.
					</p>
				</div>
			</div>

			{/* SCALE SOVEREIGNTY: СОЛО-ВРАЧ vs КЛИНИКА (МАНДАТЫ 8e, 8n) */}
			<div
				className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5"
				data-testid="practice-scale-sovereignty-banner"
			>
				<div className="flex items-start gap-2.5 min-w-0 flex-1">
					<div className="p-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] shrink-0 mt-0.5 shadow-2xs">
						<Stethoscope size={16} className="text-teal-600 dark:text-teal-400" />
					</div>
					<div className="flex flex-col gap-0.5 min-w-0">
						<span className="font-bold text-[var(--ink)] text-xs">
							Масштаб практики и режим работы:
						</span>
						<p className="text-[11px] text-[var(--muted)] m-0 leading-snug">
							<strong>Соло-врач (кабинет / аренда):</strong> полный доступ к своим пациентам, медицинским картам и кассе.
							<span className="mx-1.5 hidden sm:inline text-[var(--line)]">•</span>
							<strong className="block sm:inline mt-0.5 sm:mt-0">Клиника (многопрофильная):</strong> активируется финансовая изоляция (P&L клиники и чужие зарплаты скрыты) и защита клиентской базы (маскирование телефонов, запрет массовой выгрузки базы клиники).
						</p>
					</div>
				</div>
			</div>

			{/* TIER 1 CONTROLS: 2-Level Role Category Switcher + Role Tabs + Module Selector */}
			<div className="flex flex-col gap-2 pb-2 border-b border-[var(--line)] min-w-0">
				{/* Level 1: Category Selector + Module Filter + Super-Rights Filter */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 min-w-0">
					{/* Category Selector Tabs */}
					<div
						className="flex flex-wrap items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] shrink-0 gap-2"
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
									? "bg-[var(--paper)] text-[var(--teal-dark)] shadow-xs border border-[var(--teal)]/40"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
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
							className={`px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation flex-1 sm:flex-initial ${
								activeCategory === "administrative"
									? "bg-[var(--paper)] text-[var(--teal-dark)] shadow-xs border border-[var(--teal)]/40"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="rbac-category-administrative"
						>
							<ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Административный блок (4)</span>
						</button>
					</div>

					{/* Filters: Super-Rights quick toggle & Module Filter */}
					<div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-auto">
						<button
							type="button"
							onClick={() => setOnlySuperRights(!onlySuperRights)}
							className={`px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer touch-manipulation transition-colors ${
								onlySuperRights
									? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700 shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
							}`}
							data-testid="rbac-filter-super-rights"
							title="Фильтровать только полномочия повышенной ответственности (P&L, Зарплаты, Персональные данные, Подпись карты)"
						>
							<AlertTriangle size={14} className={onlySuperRights ? "text-amber-600 dark:text-amber-400" : "text-slate-400"} />
							<span>Только супер-права</span>
						</button>

						<div className="flex items-center gap-1.5 shrink-0">
							<label
								htmlFor="rbac-module-filter"
								className="text-xs font-semibold text-[var(--ink)] shrink-0"
							>
								Модуль:
							</label>
							<select
								id="rbac-module-filter"
								value={selectedModuleFilter}
								onChange={(e) => setSelectedModuleFilter(e.target.value)}
								className="px-3 py-2 h-11 min-h-[44px] rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] cursor-pointer touch-manipulation"
								aria-label="Фильтр по функциональному модулю"
							>
								<option value="all">Все модули ({PERMISSION_DEFINITIONS.length})</option>
								<option value="clinical">ЭМК и протоколы</option>
								<option value="schedule">Расписание и смены</option>
								<option value="patients">Пациенты и персональные данные</option>
								<option value="finance_cashier">Касса и платежи</option>
								<option value="finance_reports">P&L и финансы</option>
								<option value="payroll">Зарплата и сделка</option>
								<option value="inventory">Склад и стерилизация</option>
								<option value="settings">Настройки клиники</option>
								<option value="egisz">ЕГИСЗ Минздрава</option>
								<option value="communications">Коммуникации</option>
							</select>
						</div>
					</div>
				</div>

				{/* Level 2: Role Selector Tabs */}
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
										: "bg-[var(--paper-card)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
								}`}
								data-testid={`role-matrix-tab-${roleKey}`}
							>
								<span>{roleTitle}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* ACTIVE ROLE SUMMARY STRIP & COUNTERS */}
			<div className="py-2.5 px-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 min-w-0 text-xs">
				<div className="flex flex-col gap-1 min-w-0 flex-1">
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="font-bold text-[var(--ink)] text-xs sm:text-sm">
							{ROLE_DISPLAY_NAMES[selectedMatrixRole] || activeRoleMeta.title}
						</span>
						<span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--teal-soft)] text-[var(--teal-dark)] font-bold border border-[var(--line-subtle)]">
							{grantedPermsCount} разрешено
						</span>
						<span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--line)] text-[var(--muted)] font-medium">
							{blockedPermsCount} заблокировано
						</span>
					</div>
					<p className="text-[var(--muted)] text-[11px] leading-snug break-words m-0 min-w-0">
						{activeRoleMeta.description}
					</p>
				</div>

				<div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto mt-1 sm:mt-0 flex-wrap">
					{activeRoleMeta.role === "doctor" && (
						<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-200 border border-purple-300 dark:border-purple-700 whitespace-nowrap shadow-xs">
							<Lock size={12} className="shrink-0 text-purple-700 dark:text-purple-300" />
							<span>P&L: Скрыт (Изоляция)</span>
						</span>
					)}
					{activeRoleMeta.role === "assistant" && (
						<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700 whitespace-nowrap shadow-xs">
							<Shield size={12} className="shrink-0 text-amber-700 dark:text-amber-300" />
							<span>Данные защищены</span>
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

			{/* CRITICAL BARRIERS NOTIFICATION BANNER */}
			{selectedMatrixRole === "doctor" && (
				<div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs flex flex-col gap-2 text-teal-900 dark:text-teal-200" data-testid="doctor-security-barriers">
					<div className="font-bold flex items-center justify-between gap-1.5 text-teal-800 dark:text-teal-300 flex-wrap">
						<div className="flex items-center gap-1.5">
							<ShieldCheck size={16} className="text-teal-600 dark:text-teal-400" />
							<span className="text-xs sm:text-sm">Ключевые принципы безопасности и автономии для роли «Врач-стоматолог»:</span>
						</div>
						<span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 font-semibold border border-teal-300 dark:border-teal-700">
							Врачебная автономия и защита базы
						</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Shield size={14} className="text-blue-600 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-slate-900 dark:text-white">Защита пациентской базы:</strong>
								<span>Врач видит карты своих пациентов, но лишён массового экспорта телефонной базы клиники (защита от увода клиентской базы). В общих реестрах телефоны маскируются.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Lock size={14} className="text-purple-600 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-slate-900 dark:text-white">Финансовая изоляция:</strong>
								<span>Врач видит личные начисления и услуги (сделка), но P&L клиники, маржинальность и зарплатные ведомости коллег надёжно скрыты.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-slate-900 dark:text-white">Врачебная автономия у кресла:</strong>
								<span>Свободное ведение дневника ЭМК, назначение услуг и применение клинических скидок без ввода мастер-пароля администратора.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Lock size={14} className="text-amber-600 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-slate-900 dark:text-white">Защита прейскуранта:</strong>
								<span>Базовые расценки услуг открыты только для чтения — изменение утверждённого прейскуранта доступно руководству.</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{selectedMatrixRole === "owner" && (
				<div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs flex flex-col gap-2 text-purple-900 dark:text-purple-200" data-testid="owner-security-barriers">
					<div className="font-bold flex items-center justify-between gap-1.5 text-purple-800 dark:text-purple-300 flex-wrap">
						<div className="flex items-center gap-1.5">
							<ShieldCheck size={16} className="text-purple-600 dark:text-purple-400" />
							<span className="text-xs sm:text-sm">Полномочия и суверенитет роли «Главный врач / Владелец»:</span>
						</div>
						<span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 font-semibold border border-purple-300 dark:border-purple-700">
							Root / Полный суверенитет
						</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Coins size={14} className="text-purple-600 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-slate-900 dark:text-white">P&L и финансы:</strong>
								<span>Полная аналитика клиники: чистая прибыль, выручка, маржинальность по креслам и средний чек.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Lock size={14} className="text-indigo-600 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-slate-900 dark:text-white">Управление ФОТ:</strong>
								<span>Настройка процентных ставок врачей, окладов, правил удержания за ЗТЛ и сводные зарплатные ведомости.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Shield size={14} className="text-emerald-600 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-slate-900 dark:text-white">Безопасность базы данных:</strong>
								<span>Право санкционированного экспорта пациентской базы и аудит всех обращений к персональным данным.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Check size={14} className="text-teal-600 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-slate-900 dark:text-white">Врачебная автономия:</strong>
								<span>Право клинического контроля и утверждения протоколов лечения без помех лечебному процессу.</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{selectedMatrixRole === "assistant" && (
				<div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs flex flex-col gap-2 text-amber-900 dark:text-amber-200" data-testid="assistant-security-barriers">
					<div className="font-bold flex items-center justify-between gap-1.5 text-amber-800 dark:text-amber-300 flex-wrap">
						<div className="flex items-center gap-1.5">
							<ShieldAlert size={16} className="text-amber-600 dark:text-amber-400" />
							<span className="text-xs sm:text-sm">Барьеры безопасности для роли «Ассистент врача»:</span>
						</div>
						<span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 font-semibold border border-amber-300 dark:border-amber-700">
							Безопасность сестринского сектора
						</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Shield size={14} className="text-amber-600 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-slate-900 dark:text-white">Маскирование телефонов:</strong>
								<span>Номера телефонов, паспорта и адреса пациентов скрыты маской в реестрах для исключения утечек ПДн.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Lock size={14} className="text-rose-600 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-slate-900 dark:text-white">Запрет подписи ЭМК:</strong>
								<span>Подписание дневников визита за врача заблокировано (требуется диплом врача-стоматолога).</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-slate-900 dark:text-white">Расходники и стерилизация:</strong>
								<span>Списание материалов на визите, фиксация карпул анестетиков и ведение журналов автоклавирования.</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{(selectedMatrixRole === "senior_admin" || selectedMatrixRole === "registrar") && (
				<div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs flex flex-col gap-2 text-sky-900 dark:text-sky-200" data-testid="admin-security-barriers">
					<div className="font-bold flex items-center justify-between gap-1.5 text-sky-800 dark:text-sky-300 flex-wrap">
						<div className="flex items-center gap-1.5">
							<ShieldCheck size={16} className="text-sky-600 dark:text-sky-400" />
							<span className="text-xs sm:text-sm">
								Барьеры безопасности для роли «{selectedMatrixRole === "senior_admin" ? "Старший администратор" : "Администратор"}»:
							</span>
						</div>
						<span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 font-semibold border border-sky-300 dark:border-sky-700">
							Ресепшен & Касса
						</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Coins size={14} className="text-teal-600 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-slate-900 dark:text-white">Касса и чеки:</strong>
								<span>Приём оплаты (нал, карта, СБП, депозит), пробитие чеков, запись на приём и подтверждение визитов.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Lock size={14} className="text-purple-600 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-slate-900 dark:text-white">Изоляция зарплат и P&L:</strong>
								<span>Зарплатные ведомости врачей, оклады и чистая прибыль клиники надёжно закрыты от ресепшена.</span>
							</div>
						</div>
						<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<Lock size={14} className="text-rose-600 shrink-0 mt-0.5" />
							<div>
								<strong className="block text-slate-900 dark:text-white">Запрет правки ЭМК:</strong>
								<span>Администратор не имеет доступа к изменению клинических протоколов и медицинских диагнозов.</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* MONOLITHIC PERMISSIONS REGISTRY TABLE WITH VISUAL GREEN/GRAY SWITCH TOGGLES (Desktop / Tablet >= 640px) */}
			<div className="hidden sm:block overflow-x-auto min-w-0 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
				<table className="w-full text-left text-xs border-collapse">
					<thead>
						<tr className="sticky top-0 bg-slate-100 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold z-10">
							<th className="py-2.5 px-3">Полномочие и назначение</th>
							<th className="py-2.5 px-3 w-28">Модуль</th>
							<th className="py-2.5 px-3 text-right w-56">Статус и тумблер доступа</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
						{filteredPermissions.map((perm) => {
							const level = activeRolePermissions[perm.key] || "none";
							const badge = getAccessLevelBadge(level);
							const superInfo = SUPER_PERMISSIONS_MAP[perm.key];
							const isGranted = level === "full" || level === "read" || level === "own";

							return (
								<tr
									key={perm.key}
									className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
									data-testid={`perm-row-${perm.key}`}
								>
									<td className="py-2 px-3">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="font-bold text-slate-900 dark:text-white leading-tight">
												{perm.title}
											</span>
											{superInfo && (
												<span
													className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
														superInfo.isCritical
															? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
															: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
													}`}
													title={superInfo.hint}
												>
													<AlertTriangle size={10} className="shrink-0" />
													<span>{superInfo.badge}</span>
												</span>
											)}
										</div>
										<span className="text-[11px] text-slate-600 dark:text-slate-400 block mt-0.5 leading-normal">
											{perm.description}
										</span>
										{superInfo && (
											<span className="text-[10px] text-slate-500 dark:text-slate-400 italic block mt-0.5">
												Защита: {superInfo.hint}
											</span>
										)}
									</td>
									<td className="py-2 px-3">
										<span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
											{perm.module}
										</span>
									</td>
									<td className="py-2 px-3 text-right">
										{/* Зеленый/серый визуальный тумблер прав */}
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

											{/* Визуальный тумблер (Switch Indicator) */}
											<div
												className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
													level === "full"
														? "bg-emerald-500 justify-end"
														: level === "read"
															? "bg-sky-500 justify-center"
															: level === "own"
																? "bg-amber-500 justify-center"
																: "bg-slate-300 dark:bg-slate-700 justify-start"
												}`}
												title={`Уровень доступа: ${badge.label}`}
												aria-hidden="true"
											>
												<div className="w-4 h-4 rounded-full bg-white shadow-xs" />
											</div>
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* COMPACT PERMISSION LIST WITH GREEN/GRAY TOGGLES (Mobile < 640px) */}
			<div
				className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800 sm:hidden min-w-0 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900"
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
							className="p-3 flex flex-col gap-2 min-w-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 touch-manipulation"
							data-testid={`perm-card-mobile-${perm.key}`}
						>
							<div className="flex items-start justify-between gap-2 min-w-0">
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-1.5 flex-wrap">
										<span className="font-bold text-xs text-slate-900 dark:text-white break-words">
											{perm.title}
										</span>
										<span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
											{perm.module}
										</span>
									</div>
									{superInfo && (
										<span
											className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border mt-1 ${
												superInfo.isCritical
													? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
													: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
											}`}
										>
											<AlertTriangle size={10} className="shrink-0" />
											<span>{superInfo.badge}</span>
										</span>
									)}
								</div>

								{/* Mobile Toggle & Badge */}
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
														: "bg-slate-300 dark:bg-slate-700 justify-start"
										}`}
										aria-hidden="true"
									>
										<div className="w-3 h-3 rounded-full bg-white shadow-xs" />
									</div>
								</div>
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
