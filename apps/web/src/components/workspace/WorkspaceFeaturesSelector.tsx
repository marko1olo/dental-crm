/**
 * WorkspaceFeaturesSelector
 * Glassmorphic feature-toggle panel shown in Settings
 * Grouped by domains, hides advanced features for solo practitioners.
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
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
	saveWorkspaceFlags,
	useWorkspaceProfileStore,
	type WorkspaceFeatureFlags,
} from "../../hooks/useWorkspaceProfile";

interface FeatureToggleDef {
	key: keyof WorkspaceFeatureFlags;
	label: string;
	description: string;
	icon: React.ReactNode;
	color: string;
	advanced?: boolean;
}

type FeatureDomain = "Clinical" | "Equipment" | "Finance" | "Growth" | "Organization" | "AI & System";

const FEATURE_DOMAINS: Record<FeatureDomain, FeatureToggleDef[]> = {
	"Organization": [
		{
			key: "hasMultipleChairs",
			label: "Несколько кресел",
			description: "Отключите для кабинета с одной установкой — календарь станет чистым вертикальным таймлайном.",
			icon: <LayoutGrid size={20} />,
			color: "hsl(210 80% 60%)",
		},
		{
			key: "hasAssistants",
			label: "Ассистенты",
			description: "Если вы работаете один — отключите. Подписывать карты станет можно в 1 клик.",
			icon: <Users size={20} />,
			color: "hsl(262 80% 65%)",
		},
	],
	"Clinical": [
		{
			key: "hasPediatricMode",
			label: "Детский прием",
			description: "Включает детскую зубную формулу и адаптационные протоколы.",
			icon: <CheckCircle2 size={20} />,
			color: "hsl(320 70% 60%)",
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
			label: "Гнатология",
			description: "Специализированные протоколы для диагностики ВНЧС.",
			icon: <Stethoscope size={20} />,
			color: "hsl(180 80% 40%)",
		},
		{
			key: "hasReclamations",
			label: "Рекламации и осложнения",
			description: "Включает модуль фиксации жалоб и гарантийных случаев.",
			icon: <XCircle size={20} />,
			color: "hsl(350 80% 60%)",
		},
	],
	"Equipment": [
		{
			key: "hasDentalLab",
			label: "Зуботехническая лаборатория",
			description: "Заказ-наряды и статусы работ.",
			icon: <FlaskConical size={20} />,
			color: "hsl(160 70% 50%)",
		},
		{
			key: "hasInventoryModule",
			label: "Складской учет",
			description: "Списание материалов, контроль остатков.",
			icon: <LayoutGrid size={20} />,
			color: "hsl(220 80% 50%)",
			advanced: true,
		},
	],
	"Finance": [
		{
			key: "hasInsuranceCoPay",
			label: "Работа по ДМС",
			description: "Гарантийные письма, со-платежи в сметах.",
			icon: <ShieldPlus size={20} />,
			color: "hsl(40 85% 55%)",
		},
		{
			key: "hasInstallments",
			label: "Рассрочка платежей",
			description: "Калькулятор ежемесячных платежей в сметах.",
			icon: <CreditCard size={20} />,
			color: "hsl(340 75% 60%)",
		},
		{
			key: "hasPayrollModule",
			label: "Зарплаты и комиссии",
			description: "Расчет процента для врачей и ассистентов.",
			icon: <LayoutGrid size={20} />,
			color: "hsl(140 70% 45%)",
			advanced: true,
		},
	],
	"Growth": [
		{
			key: "hasTasks",
			label: "Задачи по пациентам",
			description: "Включает функционал поручений прямо в карточке.",
			icon: <CheckCircle2 size={20} />,
			color: "hsl(100 70% 45%)",
		},
		{
			key: "hasMarketingModule",
			label: "Маркетинг",
			description: "Воронки конверсий, рекламные кампании.",
			icon: <Users size={20} />,
			color: "hsl(35 90% 55%)",
			advanced: true,
		},
		{
			key: "hasAnalyticsModule",
			label: "Аналитика",
			description: "Сложные финансовые отчеты.",
			icon: <LayoutGrid size={20} />,
			color: "hsl(280 80% 65%)",
			advanced: true,
		},
	],
	"AI & System": [
		{
			key: "aiEnableTreatmentPlan",
			label: "AI: План лечения",
			description: "Авто-формирование плана на основе диктовки.",
			icon: <Blocks size={20} />,
			color: "hsl(280 80% 65%)",
		},
		{
			key: "hasEngineeringStatus",
			label: "Инженерный статус",
			description: "Отображает полоску статуса синхронизации.",
			icon: <Server size={20} />,
			color: "hsl(215 16% 47%)",
			advanced: true,
		},
		{
			key: "hasClinicalRules",
			label: "Строгие клинические протоколы",
			description: "Система валидации стандартов лечения.",
			icon: <Activity size={20} />,
			color: "hsl(348 83% 47%)",
			advanced: true,
		},
	],
};

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

export function WorkspaceFeaturesSelector() {
	const store = useWorkspaceProfileStore();
	const [saving, setSaving] = useState<string | null>(null);
	const [saved, setSaved] = useState<string | null>(null);
	const [showAdvanced, setShowAdvanced] = useState(false);

	const isSolo = store.clinicMode === "solo_doctor";

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
		<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
			{Object.entries(FEATURE_DOMAINS).map(([domain, toggles]) => {
				const visibleToggles = isSolo && !showAdvanced 
					? toggles.filter(t => !t.advanced)
					: toggles;

				if (visibleToggles.length === 0) return null;

				return (
					<div key={domain}>
						<h3 style={{ fontSize: 14, fontWeight: 600, opacity: 0.6, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
							{domain}
						</h3>
						<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
							{visibleToggles.map((def) => {
								const isOn = store[def.key] as boolean;
								const isSaving = saving === def.key;
								const isSaved = saved === def.key;

								return (
									<div
										key={def.key}
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
											<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
												<span style={{ fontWeight: 600, fontSize: 15 }}>{def.label}</span>
												{isSaving && <Loader2 size={14} className="animate-spin" style={{ opacity: 0.5 }} />}
												{isSaved && <CheckCircle2 size={14} style={{ color: "#4ade80" }} />}
											</div>
											<p style={{ margin: 0, fontSize: 13, opacity: 0.58, lineHeight: 1.5 }}>
												{def.description}
											</p>
										</div>
										<div style={{ marginTop: 8 }}>
											<ToggleSwitch checked={isOn} onChange={(v) => handleToggle(def.key, v)} color={def.color} />
										</div>
									</div>
								);
							})}
						</div>
					</div>
				);
			})}

			{isSolo && (
				<button
					onClick={() => setShowAdvanced(!showAdvanced)}
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 8,
						padding: "12px",
						background: "transparent",
						border: "1px dashed rgba(255,255,255,0.2)",
						borderRadius: 12,
						color: "inherit",
						opacity: 0.7,
						cursor: "pointer"
					}}
				>
					{showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
					{showAdvanced ? "Скрыть расширенные настройки" : "Показать расширенные настройки (Склад, Зарплаты и др.)"}
				</button>
			)}
		</div>
	);
}
