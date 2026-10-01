/**
 * WorkspaceFeaturesSelector
 * Glassmorphic feature-toggle panel shown in Settings → "Внешний вид и модули"
 * Reads from useWorkspaceProfileStore and persists changes to the server.
 *
 * Specialization & Personalization:
 * - 5 clinical doctor roles (Therapist, Orthopedist, Orthodontist, Surgeon, Pediatrician).
 * - Visual clutter ceiling: <= 7 primary controls on the immediate view.
 * - Frontline priority modules per role.
 * - Collapsible drawer for all 22 system flags.
 * - Strict mandate compliance: zero tomography or scan modifications.
 */

import React, { useState } from "react";
import {
	Activity,
	Blocks,
	CheckCircle2,
	ChevronDown,
	CreditCard,
	FlaskConical,
	LayoutGrid,
	Loader2,
	MessageSquare,
	Server,
	ShieldPlus,
	Sparkles,
	Stethoscope,
	Users,
	XCircle,
	Zap,
} from "lucide-react";
import {
	saveWorkspaceFlags,
	useWorkspaceProfileStore,
	type WorkspaceFeatureFlags,
} from "../../hooks/useWorkspaceProfile";
import {
	useDoctorPreferencesStore,
	type DoctorSpecialtyKey,
} from "../../store/doctorPreferencesStore";
import {
	CLINICAL_ROLE_PRESETS,
	type ClinicalRolePreset,
} from "./workspaceRolePresets";

export { CLINICAL_ROLE_PRESETS, type ClinicalRolePreset };

// ──────────────────────────────────────────────────────────────────────────────
// Toggle definition
// ──────────────────────────────────────────────────────────────────────────────
export interface FeatureToggleDef {
	key: keyof Pick<
		WorkspaceFeatureFlags,
		| "hasAssistants"
		| "hasMultipleChairs"
		| "hasDentalLab"
		| "hasInsuranceCoPay"
		| "hasInstallments"
		| "hasPayrollModule"
		| "hasMarketingModule"
		| "hasAnalyticsModule"
		| "hasCsoScanner"
		| "hasLeadsKanban"
		| "hasOmnichannel"
		| "hasOrthodontics"
		| "hasGnathology"
		| "hasTasks"
		| "hasReclamations"
		| "hasPediatricMode"
		| "hasInventoryModule"
		| "aiEnableTreatmentPlan"
		| "aiEnableRecommendations"
		| "aiEnableDocuments"
		| "hasEngineeringStatus"
		| "hasClinicalRules"
	>;
	label: string;
	description: string;
	icon: React.ReactNode;
	color: string; // CSS variable or hsl string
}

export const FEATURE_TOGGLES: FeatureToggleDef[] = [
	{
		key: "hasAssistants",
		label: "Ассистенты",
		description:
			"Отключите, если работаете без ассистента — подписывать карты приёмов станет одним кликом, без промежуточного черновика.",
		icon: <Users size={20} />,
		color: "hsl(262 80% 65%)",
	},
	{
		key: "hasMultipleChairs",
		label: "Несколько кресел",
		description:
			"Отключите для кабинета с одной установкой — календарь схлопнется в чистый вертикальный таймлайн без заголовков кресел.",
		icon: <LayoutGrid size={20} />,
		color: "hsl(210 80% 60%)",
	},
	{
		key: "hasDentalLab",
		label: "Зуботехническая лаборатория",
		description:
			"Отключите, если не занимаетесь протезированием — скроет вкладку «Заказы в лабораторию» и индикаторы доставки коронок в расписании.",
		icon: <FlaskConical size={20} />,
		color: "hsl(160 70% 50%)",
	},
	{
		key: "hasInsuranceCoPay",
		label: "Страховое со-платёж (ДМС)",
		description:
			"Отключите, если не работаете по ДМС — из планировщика смет исчезнет колонка «Оплачивает страховая», останется чистая цена.",
		icon: <ShieldPlus size={20} />,
		color: "hsl(40 85% 55%)",
	},
	{
		key: "hasInstallments",
		label: "Рассрочка платежей",
		description:
			"Отключите, если не предлагаете рассрочку — из сметы удалится калькулятор и слайдер ежемесячных платежей.",
		icon: <CreditCard size={20} />,
		color: "hsl(340 75% 60%)",
	},
	{
		key: "hasPayrollModule",
		label: "Модуль «Зарплаты и комиссии»",
		description:
			"Отключите, если вы работаете один или считаете зарплаты в другой программе.",
		icon: <LayoutGrid size={20} />,
		color: "hsl(140 70% 45%)",
	},
	{
		key: "hasMarketingModule",
		label: "Модуль «Маркетинг»",
		description:
			"Отключите, если не ведете рекламные кампании и не используете воронку конверсий.",
		icon: <Users size={20} />,
		color: "hsl(35 90% 55%)",
	},
	{
		key: "hasAnalyticsModule",
		label: "Модуль «Аналитика»",
		description:
			"Отключите для максимального упрощения интерфейса, если вам не нужны сложные отчеты.",
		icon: <LayoutGrid size={20} />,
		color: "hsl(280 80% 65%)",
	},
	{
		key: "hasOrthodontics",
		label: "Ортодонтия",
		description: "Лечение на брекет-системах и элайнерах.",
		icon: <ShieldPlus size={20} />,
		color: "hsl(200 80% 50%)",
	},
	{
		key: "hasGnathology",
		label: "Гнатология и Остеопатия",
		description: "Специализированные протоколы для диагностики и лечения ВНЧС.",
		icon: <Stethoscope size={20} />,
		color: "hsl(180 80% 40%)",
	},
	{
		key: "hasTasks",
		label: "Задачи по пациентам",
		description:
			"Включает функционал поручений (тикетов) для администраторов и врачей прямо в карточке.",
		icon: <CheckCircle2 size={20} />,
		color: "hsl(100 70% 45%)",
	},
	{
		key: "hasReclamations",
		label: "Рекламации и осложнения",
		description:
			"Включает модуль фиксации жалоб, осложнений и гарантийных случаев.",
		icon: <XCircle size={20} />,
		color: "hsl(350 80% 60%)",
	},
	{
		key: "hasPediatricMode",
		label: "Детский прием",
		description:
			"Включает детскую зубную формулу (молочные зубы) и специальные детские протоколы.",
		icon: <CheckCircle2 size={20} />,
		color: "hsl(320 70% 60%)",
	},
	{
		key: "hasInventoryModule",
		label: "Складской учет (Inventory)",
		description:
			"Учет расходных материалов, контроль остатков и планирование закупок.",
		icon: <LayoutGrid size={20} />,
		color: "hsl(220 80% 50%)",
	},
	{
		key: "hasCsoScanner",
		label: "Сканнер лотков (ЦСО)",
		description:
			"Модуль стерилизации: учет медицинских лотков, сканирование штрих-кодов и контроль сроков.",
		icon: <CheckCircle2 size={20} />,
		color: "hsl(210 80% 50%)",
	},
	{
		key: "hasLeadsKanban",
		label: "Канбан Лидов (CRM)",
		description:
			"Воронка продаж: учет потенциальных пациентов, статусы сделок и контроль первичных записей.",
		icon: <LayoutGrid size={20} />,
		color: "hsl(25 80% 50%)",
	},
	{
		key: "hasOmnichannel",
		label: "Омниканальная Почта",
		description:
			"Единый инбокс для мессенджеров (WhatsApp, Telegram) и email для общения с пациентами.",
		icon: <MessageSquare size={20} />,
		color: "hsl(200 80% 45%)",
	},
	{
		key: "aiEnableTreatmentPlan",
		label: "AI: Генерация планов лечения",
		description:
			"Нейросеть автоматически формирует персонализированный план лечения на основе диктовки.",
		icon: <Blocks size={20} />,
		color: "hsl(280 80% 65%)",
	},
	{
		key: "aiEnableRecommendations",
		label: "AI: Выдача рекомендаций",
		description:
			"Нейросеть автоматически подбирает и персонализирует рекомендации после приёма.",
		icon: <Blocks size={20} />,
		color: "hsl(280 80% 65%)",
	},
	{
		key: "aiEnableDocuments",
		label: "AI: Подбор ИДС и документов",
		description:
			"Нейросеть автоматически предлагает необходимые юридические документы для подписания.",
		icon: <Blocks size={20} />,
		color: "hsl(280 80% 65%)",
	},
	{
		key: "hasEngineeringStatus",
		label: "Инженерный статус (Отладка)",
		description:
			"Отображает полоску статуса синхронизации черновиков и техническую отладку. Отключите для частного кабинета, чтобы не перегружать интерфейс.",
		icon: <Server size={20} />,
		color: "hsl(215 16% 47%)",
	},
	{
		key: "hasClinicalRules",
		label: "Клинические правила и протоколы",
		description:
			"Сложная система валидации приёма и стандартов лечения. Отключите, если у вас частная практика без жестких регламентов.",
		icon: <Activity size={20} />,
		color: "hsl(348 83% 47%)",
	},
];

// ──────────────────────────────────────────────────────────────────────────────
// Toggle switch component
// ──────────────────────────────────────────────────────────────────────────────
function ToggleSwitch({
	checked,
	onChange,
	color,
}: {
	checked: boolean;
	onChange: (v: boolean) => void;
	color: string;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={() => onChange(!checked)}
			style={
				{
					"--glow": color,
					display: "inline-flex",
					alignItems: "center",
					width: 48,
					height: 26,
					borderRadius: 13,
					background: checked ? color : "var(--line-strong, #cbd5e1)",
					transition: "background .25s, box-shadow .25s",
					cursor: "pointer",
					flexShrink: 0,
					boxShadow: checked ? `0 0 10px 2px ${color}55` : "none",
					padding: 0,
					border: "none",
				} as React.CSSProperties
			}
		>
			<span
				style={{
					width: 20,
					height: 20,
					borderRadius: "50%",
					background: "var(--paper-strong, #ffffff)",
					boxShadow: "0 1px 4px rgba(0,0,0,.25)",
					transform: `translateX(${checked ? 24 : 3}px)`,
					transition: "transform .22s cubic-bezier(.4,0,.2,1)",
					display: "block",
				}}
			/>
		</button>
	);
}

// ──────────────────────────────────────────────────────────────────────────────
// Reusable Feature Toggle Card
// ──────────────────────────────────────────────────────────────────────────────
function FeatureToggleCard({
	def,
	isOn,
	isSaving,
	isSaved,
	failureText,
	onToggle,
}: {
	def: FeatureToggleDef;
	isOn: boolean;
	isSaving: boolean;
	isSaved: boolean;
	failureText?: string | null;
	onToggle: (v: boolean) => void;
}) {
	return (
		<div
			id={`feature-toggle-${def.key}`}
			className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border transition-all ${
				isOn
					? "bg-white dark:bg-slate-900/80 shadow-sm"
					: "bg-slate-50/60 dark:bg-slate-900/40 opacity-80"
			}`}
			style={{
				borderColor: isOn ? `${def.color}55` : "var(--line, #e2e8f0)",
			}}
		>
			<div
				className="mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
				style={{
					background: isOn ? `${def.color}20` : "var(--paper-soft, rgba(0,0,0,.04))",
					color: isOn ? def.color : "var(--muted, #64748b)",
				}}
			>
				{def.icon}
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-1">
					<span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
						{def.label}
					</span>
					{isSaving && (
						<Loader2
							size={14}
							className="animate-spin text-slate-400"
						/>
					)}
					{isSaved && (
						<CheckCircle2 size={14} className="text-emerald-500" />
					)}
				</div>
				<p className="m-0 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
					{def.description}
				</p>
				{failureText && (
					<p
						role="alert"
						className="mt-1.5 m-0 text-xs leading-relaxed text-rose-600 dark:text-rose-400 font-semibold"
					>
						{failureText}
					</p>
				)}
			</div>

			<div className="mt-1">
				<ToggleSwitch
					checked={isOn}
					onChange={onToggle}
					color={def.color}
				/>
			</div>
		</div>
	);
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────
export function WorkspaceFeaturesSelector() {
	const store = useWorkspaceProfileStore();
	const doctorSpecialty = useDoctorPreferencesStore(
		(s) => s.preferences.specialty,
	);
	const [selectedRoleKey, setSelectedRoleKey] = useState<DoctorSpecialtyKey>(
		() =>
			doctorSpecialty &&
			CLINICAL_ROLE_PRESETS.some((p) => p.key === doctorSpecialty)
				? doctorSpecialty
				: "therapist",
	);
	const [applyingPreset, setApplyingPreset] = useState<boolean>(false);
	const [presetFeedback, setPresetFeedback] = useState<string | null>(null);

	const [saving, setSaving] = useState<string | null>(null);
	const [saved, setSaved] = useState<string | null>(null);
	/**
	 * Почему набор не сохранился на сервере — словами, рядом с переключателем.
	 */
	const [failure, setFailure] = useState<{ key: string; text: string } | null>(
		null,
	);

	const activePreset =
		CLINICAL_ROLE_PRESETS.find((p) => p.key === selectedRoleKey) ??
		CLINICAL_ROLE_PRESETS[0]!;

	async function handleApplyRolePreset(preset: ClinicalRolePreset) {
		setApplyingPreset(true);
		setFailure(null);
		setPresetFeedback(null);
		try {
			// 1. Update doctor clinical preferences store (specialty, materials, durations)
			useDoctorPreferencesStore.getState().applySpecialtyPreset(preset.key);

			// 2. Persist workspace feature flags to server and local store
			const result = await saveWorkspaceFlags(preset.presetFlags);
			if (result.savedOnServer) {
				setPresetFeedback(
					`Профиль «${preset.shortTitle}» успешно активирован и сохранён в базе данных`,
				);
				setTimeout(() => setPresetFeedback(null), 3500);
			} else {
				setFailure({
					key: "role-preset",
					text:
						result.failureText ??
						"Профиль применён локально, но не сохранён на сервере клиники.",
				});
			}
		} catch (err: unknown) {
			setFailure({
				key: "role-preset",
				text: err instanceof Error ? err.message : "Ошибка применения профиля",
			});
		} finally {
			setApplyingPreset(false);
		}
	}

	async function handleToggle(
		key: keyof WorkspaceFeatureFlags,
		value: boolean,
	) {
		setSaving(key);
		setFailure((current) => (current && current.key === key ? null : current));
		try {
			const result = await saveWorkspaceFlags({ [key]: value });
			if (result.savedOnServer) {
				setSaved(key);
				setTimeout(() => setSaved(null), 1800);
			} else {
				setFailure({
					key,
					text:
						result.failureText ??
						"Набор модулей не сохранён на сервере. Повторите переключение.",
				});
			}
		} finally {
			setSaving(null);
		}
	}

	return (
		<div
			id="workspace-features-selector"
			className="flex flex-col gap-4"
		>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
				<div>
					<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
						Клиническая специализация и модули рабочего места
					</h3>
					<p className="m-0 text-xs text-slate-500 dark:text-slate-400">
						Быстрая адаптация интерфейса под врачебную роль без лишнего визуального шума
					</p>
				</div>
				<div className="text-xs text-slate-500 dark:text-slate-400">
					Активный профиль:{" "}
					<strong className="capitalize text-slate-800 dark:text-slate-200">
						{store.workspacePreset.replace(/_/g, " ")}
					</strong>
				</div>
			</div>

			{/* 1. Clinical Role Selector Segmented Bar (5 roles <= 7 primary controls) */}
			<div
				className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
				data-testid="clinical-role-selector-bar"
				role="tablist"
				aria-label="Выбор клинической специализации врача"
			>
				{CLINICAL_ROLE_PRESETS.map((preset) => {
					const isSelected = selectedRoleKey === preset.key;
					const isCurrentDoctorRole = doctorSpecialty === preset.key;
					return (
						<button
							key={preset.key}
							type="button"
							role="tab"
							aria-selected={isSelected}
							data-testid={`clinical-role-btn-${preset.key}`}
							onClick={() => setSelectedRoleKey(preset.key)}
							className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all select-none min-h-[44px] cursor-pointer ${
								isSelected
									? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/80 dark:border-slate-700 font-bold"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50"
							}`}
							style={{
								minHeight: "44px",
							}}
						>
							<span
								className="w-2.5 h-2.5 rounded-full shrink-0"
								style={{
									background: preset.color,
									boxShadow: isSelected ? `0 0 8px 1px ${preset.color}` : "none",
								}}
								aria-hidden="true"
							/>
							<span className="truncate">{preset.shortTitle}</span>
							{isCurrentDoctorRole && (
								<span
									className="text-[10px] px-1 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold"
									title="Текущая роль в профиле врача"
								>
									✓
								</span>
							)}
						</button>
					);
				})}
			</div>

			{/* 2. Clinical Role Spotlight Card (1 Primary CTA <= 7 controls) */}
			<div
				className="p-4 rounded-xl border transition-all bg-gradient-to-br from-white to-slate-50/80 dark:from-slate-900 dark:to-slate-950/80 shadow-sm"
				style={{
					borderColor: `${activePreset.color}66`,
				}}
				data-testid="clinical-role-spotlight-card"
			>
				<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
					<div>
						<div className="flex items-center gap-2 mb-1 flex-wrap">
							<span
								className="text-xs font-bold px-2 py-0.5 rounded-full"
								style={{
									background: `${activePreset.color}20`,
									color: activePreset.color,
								}}
							>
								{activePreset.badge}
							</span>
							<h4 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
								{activePreset.title}
							</h4>
							{doctorSpecialty === activePreset.key && (
								<span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
									<CheckCircle2 size={13} /> Активна
								</span>
							)}
						</div>
						<p className="m-0 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
							{activePreset.description}
						</p>
						<p className="m-0 mt-1.5 text-xs text-slate-500 dark:text-slate-400 italic">
							Фокус: {activePreset.clinicalFocus}
						</p>
					</div>

					<button
						type="button"
						data-testid="apply-clinical-role-preset-btn"
						onClick={() => handleApplyRolePreset(activePreset)}
						disabled={applyingPreset}
						className="primary-button flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 self-start sm:self-center transition-all cursor-pointer shadow-sm hover:shadow"
						style={{
							minHeight: "44px",
							background: "var(--teal, #0d9488)",
							color: "#ffffff",
						}}
					>
						{applyingPreset ? (
							<Loader2 size={16} className="animate-spin" />
						) : (
							<Zap size={16} />
						)}
						<span>Применить профиль: {activePreset.shortTitle} (1 клик)</span>
					</button>
				</div>

				{presetFeedback && (
					<div
						data-testid="role-preset-feedback"
						className="p-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 font-medium"
					>
						<CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
						<span>{presetFeedback}</span>
					</div>
				)}

				{failure?.key === "role-preset" && (
					<div
						role="alert"
						className="p-2 px-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 font-medium"
					>
						<XCircle size={14} className="shrink-0 text-rose-500" />
						<span>{failure.text}</span>
					</div>
				)}
			</div>

			{/* 3. Frontline Priority Modules for the Active Role (3-4 items) */}
			<div className="flex flex-col gap-2.5">
				<div className="flex items-center justify-between">
					<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 m-0">
						Приоритетные модули для роли «{activePreset.shortTitle}»
					</h4>
					<span className="text-[11px] text-slate-400">
						{activePreset.priorityToggleKeys.length} модуля
					</span>
				</div>

				<div className="flex flex-col gap-2.5">
					{FEATURE_TOGGLES.filter((def) =>
						(activePreset.priorityToggleKeys as readonly string[]).includes(
							def.key,
						),
					).map((def) => {
						const isOn = store[def.key] as boolean;
						const isSaving = saving === def.key;
						const isSaved = saved === def.key;
						const failureText = failure?.key === def.key ? failure.text : null;
						return (
							<FeatureToggleCard
								key={def.key}
								def={def}
								isOn={isOn}
								isSaving={isSaving}
								isSaved={isSaved}
								failureText={failureText}
								onToggle={(v) => handleToggle(def.key, v)}
							/>
						);
					})}
				</div>
			</div>

			{/* 4. Collapsible section for all 22 system toggles (hides clutter by default) */}
			<details
				data-testid="all-system-features-details"
				className="group border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60 overflow-hidden"
			>
				<summary className="flex items-center justify-between p-3.5 sm:p-4 cursor-pointer font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 select-none hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors min-h-[44px]">
					<div className="flex items-center gap-2">
						<LayoutGrid size={16} className="text-slate-400 group-open:text-teal-500 transition-colors" />
						<span>Все системные модули ({FEATURE_TOGGLES.length})</span>
					</div>
					<div className="flex items-center gap-2 text-xs text-slate-500">
						<span className="hidden sm:inline">Полный каталог флагов</span>
						<ChevronDown size={16} className="transition-transform duration-200 group-open:rotate-180" />
					</div>
				</summary>

				<div className="p-3.5 sm:p-4 pt-2 flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800/60">
					{FEATURE_TOGGLES.map((def) => {
						const isOn = store[def.key] as boolean;
						const isSaving = saving === def.key;
						const isSaved = saved === def.key;
						const failureText = failure?.key === def.key ? failure.text : null;
						return (
							<FeatureToggleCard
								key={def.key}
								def={def}
								isOn={isOn}
								isSaving={isSaving}
								isSaved={isSaved}
								failureText={failureText}
								onToggle={(v) => handleToggle(def.key, v)}
							/>
						);
					})}
				</div>
			</details>

			<div className="mt-1 p-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
				<Stethoscope size={14} className="text-teal-500 shrink-0" />
				<span>
					Изменения применяются мгновенно и сохраняются в базе данных клиники.
				</span>
			</div>
		</div>
	);
}
