import {
	type GranularStaffRole,
	GRANULAR_STAFF_ROLES,
	GRANULAR_ROLE_MATRIX,
	PERMISSION_DEFINITIONS,
	ROLE_METADATA_REGISTRY,
	type StaffRole,
	getAccessLevelBadge,
} from "@dental/shared";
import {
	Check,
	Coins,
	FileSpreadsheet,
	FileText,
	KeyRound,
	Link as LinkIcon,
	Lock,
	Mail,
	PhoneCall,
	Shield,
	ShieldAlert,
	ShieldCheck,
	UserCheck,
	Users,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import { readDenteStaffToken } from "../../lib/safeLocalStorage";
import { logger } from "../../utils/logger";
import { viewLabels as workspaceViewLabels } from "../../workspaceShell";
import { showToast } from "../GlobalToast";
import {
	INVITABLE_STAFF_ROLES,
	inviteRoleTitle,
	parseInviteCreationPayload,
} from "./settingsInviteRoles";

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
type WorkspaceProfile = any;
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
type RoleAccessPolicy = any;

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

export interface SettingsAccessTabProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	props?: any;
	settingsTab: string;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	[key: string]: any;
}

export function SettingsAccessTab({
	props = {},
	settingsTab,
}: SettingsAccessTabProps) {
	const {
		dashboard,
		activeWorkspaceProfile,
		workspaceScopeLabels = {},
		staffRoleLabels = {},
		clinicModeLabels = {},
		policyAuditEventLabels = {},
	} = props || {};
	const viewLabels = (workspaceViewLabels || {}) as Record<string, string>;

	// Hooks MUST be called before any conditional returns (React Rules of Hooks)
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState<StaffRole>("doctor");
	const [inviteLink, setInviteLink] = useState("");
	const [loading, setLoading] = useState(false);
	const [copied, setCopied] = useState(false);
	const [selectedMatrixRole, setSelectedMatrixRole] = useState<GranularStaffRole>("doctor");
	const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("all");

	if (settingsTab !== "access") return null;

	const handleGenerateInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!inviteEmail.trim()) {
			showToast(
				"Укажите рабочий адрес почты сотрудника — по нему он войдёт в программу",
				"warning",
			);
			return;
		}
		setLoading(true);
		setCopied(false);
		setInviteLink("");
		try {
			const staffToken = readDenteStaffToken();
			const response = await fetch("/api/auth/invites/create", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": staffToken,
				},
				body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
			});
			const raw = await response.text();
			const outcome = parseInviteCreationPayload(response.status, raw);
			if (!outcome.ok) {
				logger.error("[приглашение] не создано, ответ", outcome.status);
				showToast(
					outcome.message ??
						actionFailureToast(
							`Приглашение для ${inviteEmail.trim()} не создано`,
							outcome.status,
						),
					"error",
				);
				return;
			}
			setInviteLink(window.location.origin + outcome.inviteLink);
			showToast(
				`Ссылка для ${inviteRoleTitle(inviteRole).toLowerCase()} готова — скопируйте её и передайте сотруднику, она действует 7 дней`,
				"success",
			);
		} catch (err) {
			logger.error("[приглашение] запрос не дошёл до сервера", err);
			showToast(
				actionFailureToast(
					`Приглашение для ${inviteEmail.trim()} не создано`,
					null,
				),
				"error",
			);
		} finally {
			setLoading(false);
		}
	};

	const handleCopy = () => {
		navigator.clipboard.writeText(inviteLink);
		setCopied(true);
		showToast("Ссылка скопирована", "success");
		setTimeout(() => setCopied(false), 2000);
	};

	const typedActiveWorkspaceProfile =
		activeWorkspaceProfile as WorkspaceProfile | null;
	const typedWorkspaceProfiles = (dashboard?.clinicSettings
		?.workspaceProfiles ?? []) as WorkspaceProfile[];
	const typedRoleAccessPolicies = (dashboard?.clinicSettings
		?.roleAccessPolicies ?? []) as RoleAccessPolicy[];

	const activeRoleMeta = ROLE_METADATA_REGISTRY[selectedMatrixRole];
	const activeRolePermissions = GRANULAR_ROLE_MATRIX[selectedMatrixRole] || {};

	const filteredPermissions = PERMISSION_DEFINITIONS.filter((perm) => {
		if (selectedModuleFilter === "all") return true;
		return perm.module === selectedModuleFilter;
	});

	return (
		<section
			className="access-settings flex flex-col gap-6 pb-32 sm:pb-24"
			aria-label="Доступы, рабочие профили и роли"
		>
			<div className="import-copy p-4 sm:p-6 rounded-2xl">
				<UserCheck aria-hidden="true" />
				<div>
					<p className="eyebrow">Безопасность и RBAC</p>
					<h2 style={{ wordBreak: "normal", overflowWrap: "break-word", fontSize: "clamp(1.05rem, 3.5vw, 1.35rem)", lineHeight: 1.3 }}>
						Матрица прав доступа к модулям DENTE, 152-ФЗ защита и финансовая изоляция
					</h2>
					<p>
						Гранулярная ролевая модель для 8 клинических и административных ролей.
						Строгая изоляция финансовой отчётности клиники, маскирование персональных данных
						пациентов и расчёт сдельной мотивации в целых копейках.
					</p>
				</div>
			</div>

			{/* Ключевые гарантии безопасности системы */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="security-guarantees-grid">
				<div className="p-4 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/20 flex flex-col gap-2">
					<div className="flex items-center gap-2 text-teal-700 dark:text-teal-300 font-semibold text-sm">
						<ShieldCheck size={18} />
						<span>152-ФЗ Защита ПДн</span>
					</div>
					<p className="text-xs text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
						Телефоны, паспорта, СНИЛС и адреса проживания маскируются для ассистентов и младшего персонала.
						Врачи и администраторы видят необходимые контакты для связи и приёма.
					</p>
				</div>

				<div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 flex flex-col gap-2">
					<div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-semibold text-sm">
						<Lock size={18} />
						<span>Финансовая изоляция</span>
					</div>
					<p className="text-xs text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
						Сводный P&L, выручка клиники, маржинальность и общие зарплатные ведомости доступны только Директору,
						Главврачу и Бухгалтеру. Врач видит исключительно свою личную сдельную выработку.
					</p>
				</div>

				<div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col gap-2">
					<div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold text-sm">
						<Coins size={18} />
						<span>Сдельная оплата (Копейки)</span>
					</div>
					<p className="text-xs text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
						Расчёт мотивации (% от терапевтического/ортопедического приёма минус ЗТЛ и материалы)
						ведётся strictly в целых копейках с нулевой погрешностью округления.
					</p>
				</div>
			</div>

			{/* Гранулярная ролевая матрица (8 канонических ролей) */}
			<article
				className="p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-4"
				data-testid="granular-role-matrix-panel"
			>
				<div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
					<div>
						<h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 m-0">
							<Shield size={18} className="text-[var(--teal)]" />
							Гранулярная матрица прав персонала (8 ролей)
						</h3>
						<p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-1">
							Выберите роль для инспекции прав доступа к медицинским картам, кассе, 152-ФЗ ПДн, складу и настройкам.
						</p>
					</div>

					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-xs font-semibold text-slate-500">Модуль:</span>
						<select
							value={selectedModuleFilter}
							onChange={(e) => setSelectedModuleFilter(e.target.value)}
							className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
							aria-label="Фильтр по функциональному модулю"
						>
							<option value="all">Все модули (22 права)</option>
							<option value="clinical">ЭМК и протоколы</option>
							<option value="schedule">Расписание и смены</option>
							<option value="patients">Пациенты и 152-ФЗ</option>
							<option value="finance_cashier">Касса 54-ФЗ</option>
							<option value="finance_reports">P&L и финансы клиники</option>
							<option value="payroll">Зарплата и мотивация</option>
							<option value="inventory">Склад и СанПиН</option>
							<option value="settings">Настройки клиники</option>
							<option value="egisz">ЕГИСЗ Минздрава</option>
							<option value="communications">Коммуникации</option>
						</select>
					</div>
				</div>

				{/* 8 кнопок переключения ролей: гибкий адаптивный ряд с полными названиями */}
				<div className="w-full overflow-x-auto pb-1 scrollbar-thin">
					<div
						className="flex flex-wrap items-center gap-2 min-w-full"
						role="tablist"
						aria-label="Выбор роли для проверки матрицы прав"
					>
						{GRANULAR_STAFF_ROLES.map((roleKey) => {
							const roleTitle = ROLE_DISPLAY_NAMES[roleKey] || ROLE_METADATA_REGISTRY[roleKey]?.title;
							const isSelected = selectedMatrixRole === roleKey;
							return (
								<button
									key={roleKey}
									type="button"
									role="tab"
									aria-selected={isSelected}
									onClick={() => setSelectedMatrixRole(roleKey)}
									className={`flex-shrink-0 px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-all text-center whitespace-nowrap border cursor-pointer ${
										isSelected
											? "bg-[var(--teal-surface,#f0fdfa)] dark:bg-teal-500/15 text-[var(--teal,#0d9488)] dark:text-teal-300 border-[var(--teal,#0d9488)] dark:border-teal-500 shadow-sm font-bold ring-1 ring-[var(--teal,#0d9488)] dark:ring-teal-500/40"
											: "bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
									}`}
									data-testid={`role-matrix-tab-${roleKey}`}
								>
									<span>{roleTitle}</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* Карточка выбранной роли */}
				<div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-start justify-between flex-wrap gap-3">
					<div>
						<div className="flex items-center gap-2">
							<h4 className="m-0 text-sm font-bold text-slate-900 dark:text-white">
								{activeRoleMeta.title}
							</h4>
							<span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
								role: {activeRoleMeta.role}
							</span>
						</div>
						<p className="text-xs text-slate-600 dark:text-slate-400 m-0 mt-1">
							{activeRoleMeta.description}
						</p>
					</div>

					<div className="flex items-center gap-2 flex-wrap">
						{activeRoleMeta.role === "doctor" && (
							<span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 whitespace-nowrap">
								🔒 P&L: Скрыт (Изоляция)
							</span>
						)}
						{activeRoleMeta.role === "assistant" && (
							<span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 whitespace-nowrap">
								🛡️ 152-ФЗ: Маскирован
							</span>
						)}
					</div>
				</div>

				{/* Таблица полномочий для выбранной роли */}
				<div className="overflow-x-auto">
					<table className="w-full text-left text-xs border-collapse">
						<thead>
							<tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
								<th className="py-2.5 px-3">Полномочие и назначение</th>
								<th className="py-2.5 px-3">Модуль</th>
								<th className="py-2.5 px-3 text-right">Уровень доступа</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
							{filteredPermissions.map((perm) => {
								const level = activeRolePermissions[perm.key] || "none";
								const badge = getAccessLevelBadge(level);
								return (
									<tr
										key={perm.key}
										className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
										data-testid={`perm-row-${perm.key}`}
									>
										<td className="py-2.5 px-3">
											<span className="font-semibold text-slate-900 dark:text-white block">
												{perm.title}
											</span>
											<span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
												{perm.description}
											</span>
										</td>
										<td className="py-2.5 px-3">
											<span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
												{perm.module}
											</span>
										</td>
										<td className="py-2.5 px-3 text-right">
											<span
												className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border ${badge.badgeClass} ${badge.borderClass}`}
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
			</article>

			{/* Пригласить сотрудника */}
			<article className="p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-sm">
				<div className="mb-4">
					<h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 m-0">
						<Mail size={18} className="text-[var(--teal)]" /> Пригласить сотрудника
					</h3>
					<p className="text-xs text-slate-600 dark:text-slate-400 mt-1 m-0">
						Сгенерируйте уникальную ссылку для регистрации нового врача,
						ассистента или администратора.
					</p>
				</div>
				<form
					onSubmit={handleGenerateInvite}
					className="flex gap-3 items-center flex-wrap"
				>
					<input
						type="email"
						placeholder="email@example.com"
						value={inviteEmail}
						onChange={(e) => setInviteEmail(e.target.value)}
						disabled={loading}
						className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 flex-1 min-w-[200px] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
					/>
					<select
						id="invite-role"
						aria-label="Роль нового сотрудника"
						value={inviteRole}
						onChange={(e) => setInviteRole(e.target.value as StaffRole)}
						disabled={loading}
						className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 min-w-[150px] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
					>
						{INVITABLE_STAFF_ROLES.map((role) => (
							<option key={role} value={role}>
								{inviteRoleTitle(role)}
							</option>
						))}
					</select>
					<button
						type="submit"
						disabled={loading}
						className="px-4 py-2 rounded-lg bg-[var(--teal)] hover:opacity-90 text-white font-medium text-sm transition-opacity cursor-pointer disabled:opacity-50"
					>
						{loading ? "Создание..." : "Сгенерировать"}
					</button>
				</form>

				{inviteLink && (
					<div
						className="mt-4 p-3 rounded-lg border flex items-center justify-between"
						style={{
							borderColor: "var(--teal-ring, var(--line-strong))",
							background: "var(--teal-surface, var(--paper-soft))",
							color: "var(--ink)",
						}}
					>
						<span
							className="font-mono text-xs break-all"
							style={{ color: "var(--teal-dark, var(--teal))" }}
						>
							{inviteLink}
						</span>
						<button
							type="button"
							onClick={handleCopy}
							className="secondary-button ml-3 shrink-0"
							style={{ minHeight: "32px", fontSize: "12px" }}
						>
							{copied ? (
								<>
									<Check size={14} className="text-emerald-500" /> Скопировано
								</>
							) : (
								<>
									<LinkIcon size={14} /> Копировать
								</>
							)}
						</button>
					</div>
				)}
			</article>

			{typedActiveWorkspaceProfile ? (
				<article className="active-workspace-card">
					<div>
						<span>
							{workspaceScopeLabels[typedActiveWorkspaceProfile.scope]}
						</span>
						<h3>{typedActiveWorkspaceProfile.title}</h3>
						<p>{typedActiveWorkspaceProfile.description}</p>
					</div>
					<div className="workspace-token-row">
						<strong>
							Старт: {viewLabels[typedActiveWorkspaceProfile.defaultSection]}
						</strong>
						{typedActiveWorkspaceProfile.primaryRoles.map((role) => (
							<span key={role}>{staffRoleLabels[role]}</span>
						))}
					</div>
				</article>
			) : null}

			<div className="workspace-profile-grid">
				{typedWorkspaceProfiles.map((profile) => (
					<article
						className={`workspace-profile-card ${profile.mode === dashboard?.clinicSettings?.profile?.mode ? "active" : ""}`}
						key={profile.id}
					>
						<div className="workspace-profile-head">
							<span>{clinicModeLabels[profile.mode]?.title ?? profile.mode}</span>
							<strong>{profile.title}</strong>
							<p>{profile.description}</p>
						</div>
						<section
							className="workspace-token-row"
							aria-label="Разделы профиля"
						>
							{profile.visibleSections.map((section: string) => (
								<span key={section}>{viewLabels[section] ?? section}</span>
							))}
						</section>
						<ul>
							{profile.automations.slice(0, 3).map((automation: string) => (
								<li key={automation}>{automation}</li>
							))}
						</ul>
						<small>
							{profile.compactNavigation
								? "Компактная навигация для телефона"
								: "Расширенная навигация для команды"}
						</small>
					</article>
				))}
			</div>

			<div className="access-policy-grid">
				{typedRoleAccessPolicies.map((policy) => (
					<article className="access-policy-card" key={policy.role}>
						<div className="access-policy-head">
							<ShieldCheck aria-hidden="true" />
							<div>
								<span>{workspaceScopeLabels[policy.scope]}</span>
								<h3>{policy.title}</h3>
								<p>Первый экран: {viewLabels[policy.defaultSection]}</p>
							</div>
						</div>
						<div className="access-column-row">
							<div>
								<strong>Запись</strong>
								{(policy.canWrite ?? []).map((section: string) => (
									<span key={section}>{viewLabels[section] ?? section}</span>
								))}
							</div>
							<div>
								<strong>Ограничено</strong>
								{(policy.restricted ?? []).length ? (
									(policy.restricted ?? []).map((section: string) => (
										<span key={section}>{viewLabels[section] ?? section}</span>
									))
								) : (
									<span>нет</span>
								)}
							</div>
						</div>
						<ul>
							{(policy.requiresApprovalFor ?? [])
								.slice(0, 3)
								.map((item: string) => (
									<li key={item}>{item}</li>
								))}
						</ul>
						<small>
							Аудит:{" "}
							{(policy.auditEvents ?? [])
								.map((event: string) => policyAuditEventLabels[event] ?? event)
								.join(", ")}
						</small>
					</article>
				))}
			</div>

			{/* FAB clearance bottom spacer */}
			<div className="h-24 w-full shrink-0 pointer-events-none" aria-hidden="true" />
		</section>
	);
}
