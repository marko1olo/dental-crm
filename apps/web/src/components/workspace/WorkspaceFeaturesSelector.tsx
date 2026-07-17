/**
 * WorkspaceFeaturesSelector
 * Glassmorphic feature-toggle panel shown in Settings → "Внешний вид и модули"
 * Reads from useWorkspaceProfileStore and persists changes to the server.
 */

import {
	CheckCircle2,
	CreditCard,
	FlaskConical,
	LayoutGrid,
	Loader2,
	ShieldPlus,
	Stethoscope,
	Users,
	XCircle,
	Blocks,
	Server,
	Activity,
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
		| "hasOrthodontics"
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
		label: "Ортодонтия (Трекер элайнеров)",
		description: "Включает виджет ортодонтического лечения и ведение плана брекетов в картах пациентов.",
		icon: <ShieldPlus size={20} />,
		color: "hsl(200 80% 50%)",
	},
	{
		key: "hasTasks",
		label: "Задачи по пациентам",
		description: "Включает функционал поручений (тикетов) для администраторов и врачей прямо в карточке.",
		icon: <CheckCircle2 size={20} />,
		color: "hsl(100 70% 45%)",
	},
	{
		key: "hasReclamations",
		label: "Рекламации и осложнения",
		description: "Включает модуль фиксации жалоб, осложнений и гарантийных случаев.",
		icon: <XCircle size={20} />,
		color: "hsl(350 80% 60%)",
	},
	{
		key: "hasPediatricMode",
		label: "Детский прием",
		description: "Включает детскую зубную формулу (молочные зубы) и специальные детские протоколы.",
		icon: <CheckCircle2 size={20} />,
		color: "hsl(320 70% 60%)",
	},
	{
		key: "hasInventoryModule",
		label: "Складской учет (Inventory)",
		description: "Учет расходных материалов, контроль остатков и планирование закупок.",
		icon: <LayoutGrid size={20} />,
		color: "hsl(220 80% 50%)",
	},
	{
		key: "aiEnableTreatmentPlan",
		label: "AI: Генерация планов лечения",
		description: "Нейросеть автоматически формирует персонализированный план лечения на основе диктовки.",
		icon: <Blocks size={20} />,
		color: "hsl(280 80% 65%)",
	},
	{
		key: "aiEnableRecommendations",
		label: "AI: Выдача рекомендаций",
		description: "Нейросеть автоматически подбирает и персонализирует рекомендации после приёма.",
		icon: <Blocks size={20} />,
		color: "hsl(280 80% 65%)",
	},
	{
		key: "aiEnableDocuments",
		label: "AI: Подбор ИДС и документов",
		description: "Нейросеть автоматически предлагает необходимые юридические документы для подписания.",
		icon: <Blocks size={20} />,
		color: "hsl(280 80% 65%)",
	},
	{
		key: "hasEngineeringStatus",
		label: "Инженерный статус (Отладка)",
		description: "Отображает полоску статуса синхронизации черновиков и техническую отладку. Отключите для частного кабинета, чтобы не перегружать интерфейс.",
		icon: <Server size={20} />,
		color: "hsl(215 16% 47%)",
	},
	{
		key: "hasClinicalRules",
		label: "Клинические правила и протоколы",
		description: "Сложная система валидации приёма и стандартов лечения. Отключите, если у вас частная практика без жестких регламентов.",
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
					border: "1.5px solid rgba(255,255,255,.15)",
					background: checked ? color : "rgba(255,255,255,.08)",
					transition: "background .25s, box-shadow .25s",
					cursor: "pointer",
					flexShrink: 0,
					boxShadow: checked ? `0 0 10px 2px ${color}55` : "none",
					padding: 0,
				} as React.CSSProperties
			}
		>
			<span
				style={{
					width: 20,
					height: 20,
					borderRadius: "50%",
					background: "#fff",
					boxShadow: "0 1px 4px rgba(0,0,0,.35)",
					transform: `translateX(${checked ? 24 : 2}px)`,
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

	async function handleToggle(
		key: keyof WorkspaceFeatureFlags,
		value: boolean,
	) {
		setSaving(key);
		try {
			await saveWorkspaceFlags({ [key]: value });
			setSaved(key);
			setTimeout(() => setSaved(null), 1800);
		} finally {
			setSaving(null);
		}
	}

	return (
		<div
			id="workspace-features-selector"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 12,
			}}
		>
			<p style={{ margin: "0 0 4px", opacity: 0.6, fontSize: 13 }}>
				Активный профиль:{" "}
				<strong style={{ textTransform: "capitalize" }}>
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
						style={{
							display: "flex",
							alignItems: "flex-start",
							gap: 14,
							padding: "14px 18px",
							borderRadius: 14,
							background: "rgba(255,255,255,.04)",
							backdropFilter: "blur(10px)",
							border: `1.5px solid ${isOn ? def.color + "55" : "rgba(255,255,255,.08)"}`,
							transition: "border-color .3s",
						}}
					>
						<div
							style={{
								marginTop: 2,
								width: 36,
								height: 36,
								borderRadius: 10,
								background: isOn ? def.color + "20" : "rgba(255,255,255,.06)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: isOn ? def.color : "rgba(255,255,255,.35)",
								flexShrink: 0,
								transition: "background .3s, color .3s",
							}}
						>
							{def.icon}
						</div>

						<div style={{ flex: 1, minWidth: 0 }}>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: 8,
									marginBottom: 4,
								}}
							>
								<span style={{ fontWeight: 600, fontSize: 15 }}>
									{def.label}
								</span>
								{isSaving && (
									<Loader2
										size={14}
										className="animate-spin"
										style={{ opacity: 0.5 }}
									/>
								)}
								{isSaved && (
									<CheckCircle2 size={14} style={{ color: "#4ade80" }} />
								)}
							</div>
							<p
								style={{
									margin: 0,
									fontSize: 13,
									opacity: 0.58,
									lineHeight: 1.5,
								}}
							>
								{def.description}
							</p>
						</div>

						<div style={{ marginTop: 8 }}>
							<ToggleSwitch
								checked={isOn}
								onChange={(v) => handleToggle(def.key, v)}
								color={def.color}
							/>
						</div>
					</div>
				);
			})}

			<div
				style={{
					marginTop: 8,
					padding: "10px 16px",
					borderRadius: 10,
					background: "rgba(255,255,255,.03)",
					border: "1px solid rgba(255,255,255,.07)",
					fontSize: 12,
					opacity: 0.5,
					display: "flex",
					alignItems: "center",
					gap: 6,
				}}
			>
				<Stethoscope size={13} />
				Изменения применяются мгновенно и сохраняются в базе данных клиники.
			</div>
		</div>
	);
}
