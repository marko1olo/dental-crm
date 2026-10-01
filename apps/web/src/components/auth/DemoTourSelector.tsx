import {
	Activity,
	ArrowRight,
	Crown,
	FileSpreadsheet,
	Sparkles,
	Stethoscope,
	Users,
	Wrench,
	Zap,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
	DEMO_SHOWCASE_ORG_ID,
	enableDemoShowcaseMode,
} from "../../lib/demoMode";
import { cacheActiveStaffUser } from "../../lib/offlineStorage";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { showToast } from "../GlobalToast";

export interface DemoRoleOption {
	id: string;
	title: string;
	subtitle: string;
	badge: string;
	doctorName: string;
	role: "doctor" | "owner" | "admin";
	icon: React.ComponentType<{ size?: number; className?: string }>;
	highlights: string[];
	avatarInitials: string;
	colorTheme: string;
}

export const DEMO_ROLES: DemoRoleOption[] = [
	{
		id: "therapist",
		title: "Терапевт / Ортопед",
		subtitle: "Дневной клинический приём",
		badge: "Клинический Hot Path",
		doctorName: "Д-р Соколов А. В.",
		role: "doctor",
		icon: Stethoscope,
		highlights: [
			"Интерактивная зубная формула FDI 11–48",
			"Дневник приёма по форме 043/у за 1 клик",
			"Сметы лечения, коронки и реставрации",
		],
		avatarInitials: "СА",
		colorTheme: "teal",
	},
	{
		id: "orthodontist",
		title: "Ортодонт",
		subtitle: "Элайнеры и исправление прикуса",
		badge: "Эстетика и прикус",
		doctorName: "Д-р Морозова Е. И.",
		role: "doctor",
		icon: Sparkles,
		highlights: [
			"Этапы лечения на элайнерах и брекетах",
			"Клинический фотопротокол и фотометрия",
			"Планы визитов с автонапоминаниями",
		],
		avatarInitials: "МЕ",
		colorTheme: "indigo",
	},
	{
		id: "surgeon",
		title: "Хирург-имплантолог",
		subtitle: "Хирургические вмешательства",
		badge: "Хирургия и шаблоны",
		doctorName: "Д-р Громов К. Д.",
		role: "doctor",
		icon: Activity,
		highlights: [
			"Протоколы имплантации и синус-лифтинга",
			"Списание костных материалов и мембран",
			"Шаблоны согласий и послеоперационный надзор",
		],
		avatarInitials: "ГК",
		colorTheme: "rose",
	},
	{
		id: "owner",
		title: "Главврач / Владелец",
		subtitle: "Управление клиникой и финансы",
		badge: "Финансы и KPI",
		doctorName: "Д-р Воронов М. С.",
		role: "owner",
		icon: Crown,
		highlights: [
			"Дашборд выручки, загрузки кресел и среднего чека",
			"Расчёт сдельной зарплаты врачей и ассистентов",
			"Складской учёт и маржинальность услуг",
		],
		avatarInitials: "ВМ",
		colorTheme: "amber",
	},
	{
		id: "admin",
		title: "Старший администратор",
		subtitle: "Ресепшен, расписание и касса",
		badge: "Ресепшен и 54-ФЗ",
		doctorName: "Смирнова А. П.",
		role: "admin",
		icon: FileSpreadsheet,
		highlights: [
			"Умная сетка расписания по креслам и кабинетам",
			"Быстрый чек по кассе 54-ФЗ без очередей",
			"Уведомления пациентов в WhatsApp и Telegram",
		],
		avatarInitials: "СА",
		colorTheme: "emerald",
	},
];

interface DemoTourSelectorProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	onSuccess: (clinicProfile: any, userProfile: any) => void;
	onBackToLogin: () => void;
}

export function DemoTourSelector({
	onSuccess,
	onBackToLogin,
}: DemoTourSelectorProps) {
	const [selectedRole, setSelectedRole] = useState<string>("therapist");
	const [loading, setLoading] = useState(false);

	const handleLaunchRole = async (roleOption: DemoRoleOption) => {
		setLoading(true);
		try {
			enableDemoShowcaseMode();

			const clinicProfile = {
				id: DEMO_SHOWCASE_ORG_ID,
				organizationId: DEMO_SHOWCASE_ORG_ID,
				name: "Демонстрационная Клиника DENTE",
				email: "demo@dente.ru",
				phone: "+7 (800) 555-35-35",
			};

			const userProfile = {
				id: `demo-${roleOption.id}-user`,
				fullName: roleOption.doctorName,
				role: roleOption.role,
				email: `${roleOption.id}@dente-demo.ru`,
				organizationId: DEMO_SHOWCASE_ORG_ID,
				specialization: roleOption.title,
			};

			safeLocalStorageSetItem(
				DENTE_CLINIC_TOKEN_KEY,
				`demo-showcase-token-${roleOption.id}`,
			);
			safeLocalStorageSetItem(
				DENTE_STAFF_TOKEN_KEY,
				`demo-showcase-staff-token-${roleOption.id}`,
			);

			cacheActiveStaffUser(userProfile);

			showToast(
				`Демо-тур активирован: ${roleOption.doctorName} (${roleOption.title})`,
				"success",
			);

			onSuccess(clinicProfile, userProfile);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="auth-demo-tour-container animate-fade-in-up">
			<div className="auth-demo-tour-header">
				<div className="auth-demo-tour-badge">
					<Zap size={14} /> Без регистрации и паролей
				</div>
				<h3 className="auth-demo-tour-title">
					Выберите клиническую роль для ознакомления
				</h3>
				<p className="auth-demo-tour-subtitle">
					Система мгновенно загрузится с реальными карточками пациентов,
					зубными формулами, планами лечения и расписанием.
				</p>
			</div>

			<div className="auth-demo-roles-grid">
				{DEMO_ROLES.map((r) => {
					const Icon = r.icon;
					const isSelected = selectedRole === r.id;

					return (
						<button
							key={r.id}
							type="button"
							onClick={() => setSelectedRole(r.id)}
							onDoubleClick={() => handleLaunchRole(r)}
							className={`auth-demo-role-card ${isSelected ? "selected" : ""} auth-demo-role-card--${r.colorTheme}`}
						>
							<div className="auth-demo-role-top">
								<div className="auth-demo-role-avatar">
									<Icon size={20} />
								</div>
								<div className="auth-demo-role-meta">
									<div className="auth-demo-role-badge-pill">{r.badge}</div>
									<h4 className="auth-demo-role-name">{r.title}</h4>
									<div className="auth-demo-role-doctor">{r.doctorName}</div>
								</div>
							</div>

							<ul className="auth-demo-role-highlights">
								{r.highlights.map((h) => (
									<li key={h} className="auth-demo-role-highlight-item">
										<span className="auth-demo-role-bullet">✓</span>
										<span>{h}</span>
									</li>
								))}
							</ul>

							<div className="auth-demo-role-footer">
								<span className="auth-demo-role-cta">
									{isSelected ? "Выбрано для входа" : "Нажмите для выбора"}
								</span>
								<ArrowRight size={14} />
							</div>
						</button>
					);
				})}
			</div>

			<div className="auth-demo-tour-actions">
				<button
					type="button"
					disabled={loading}
					onClick={() => {
						const activeRole =
							DEMO_ROLES.find((r) => r.id === selectedRole) || DEMO_ROLES[0]!;
						handleLaunchRole(activeRole);
					}}
					className="auth-submit-btn auth-submit-btn--glow"
				>
					{loading ? (
						<div className="auth-spinner" />
					) : (
						<>
							<Zap size={18} /> Войти в демо-тур как{" "}
							{DEMO_ROLES.find((r) => r.id === selectedRole)?.title ||
								"Врач"}{" "}
							<ArrowRight size={18} />
						</>
					)}
				</button>

				<button
					type="button"
					onClick={onBackToLogin}
					className="auth-link-btn auth-link-btn--muted"
				>
					← Вернуться к стандартному входу
				</button>
			</div>
		</div>
	);
}
