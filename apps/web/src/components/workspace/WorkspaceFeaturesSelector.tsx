/**
 * WorkspaceFeaturesSelector
 * Glassmorphic feature-toggle panel shown in Settings → "Внешний вид и модули"
 * Reads from useWorkspaceProfileStore and persists changes to the server.
 */

import {
	Activity,
	Blocks,
	CheckCircle2,
	CreditCard,
	FlaskConical,
	LayoutGrid,
	Loader2,
	MessageSquare,
	Server,
	ShieldPlus,
	Stethoscope,
	Users,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import {
	saveWorkspaceFlags,
	useWorkspaceProfileStore,
	type WorkspaceFeatureFlags,
} from "../../hooks/useWorkspaceProfile";

// ──────────────────────────────────────────────────────────────────────────────
// Toggle definition
// ──────────────────────────────────────────────────────────────────────────────
interface FeatureToggleDef {
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

const FEATURE_TOGGLES: FeatureToggleDef[] = [
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
					background: "#ffffff",
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
// Main component
// ──────────────────────────────────────────────────────────────────────────────
export function WorkspaceFeaturesSelector() {
	const store = useWorkspaceProfileStore();
	const [saving, setSaving] = useState<string | null>(null);
	const [saved, setSaved] = useState<string | null>(null);
	/**
	 * Почему набор не сохранился на сервере — словами, рядом с переключателем.
	 *
	 * ЗАЧЕМ. Здесь стояла зелёная галочка «сохранено», которая ставилась ВСЕГДА,
	 * что бы ни ответил сервер: saveWorkspaceFlags глотала отказ и правила только
	 * localStorage. Владелец выключал модуль, видел галочку и уходил — а на другом
	 * устройстве и у второго сотрудника модуль оставался включённым. Настройка,
	 * которая молча не сохраняется, хуже настройки, которой нет.
	 */
	const [failure, setFailure] = useState<{ key: string; text: string } | null>(
		null,
	);

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
			className="flex flex-col gap-3"
		>
			<p className="m-0 mb-1 text-xs text-slate-500 dark:text-slate-400">
				Активный профиль:{" "}
				<strong className="capitalize text-slate-800 dark:text-slate-200">
					{store.workspacePreset.replace(/_/g, " ")}
				</strong>
			</p>

			{FEATURE_TOGGLES.map((def) => {
				const isOn = store[def.key] as boolean;
				const isSaving = saving === def.key;
				const isSaved = saved === def.key;

				return (
					<div
						key={def.key}
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
							{failure?.key === def.key && (
								<p
									role="alert"
									className="mt-1.5 m-0 text-xs leading-relaxed text-rose-600 dark:text-rose-400 font-semibold"
								>
									{failure.text}
								</p>
							)}
						</div>

						<div className="mt-1">
							<ToggleSwitch
								checked={isOn}
								onChange={(v) => handleToggle(def.key, v)}
								color={def.color}
							/>
						</div>
					</div>
				);
			})}

			<div className="mt-2 p-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
				<Stethoscope size={14} className="text-teal-500 shrink-0" />
				<span>Изменения применяются мгновенно и сохраняются в базе данных клиники.</span>
			</div>
		</div>
	);
}
