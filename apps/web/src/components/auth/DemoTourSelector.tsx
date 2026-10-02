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
import type { StaffRole } from "@dental/shared";
import type { AppView } from "../../utils/routeUtils";
import {
	DEMO_SHOWCASE_ORG_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_DOCTOR_ORTHOPEDIST_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_DOCTOR_SURGEON_ID,
	DEMO_OWNER_ID,
	DEMO_ADMIN_ID,
	enableDemoShowcaseMode,
} from "../../lib/demoMode";
import { cacheActiveStaffUser } from "../../lib/offlineStorage";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { showToast } from "../GlobalToast";

export interface DemoRoleOption {
	id: string;
	title: string;
	subtitle: string;
	badge: string;
	doctorName: string;
	role: StaffRole;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	highlights: string[];
	avatarInitials: string;
	colorTheme: string;
	targetView: AppView;
	targetPatientId?: string;
	staffId?: string;
}

export const DEMO_ROLES: DemoRoleOption[] = [
	{
		id: "therapist",
		title: "Терапевт",
		subtitle: "Кариес 16, пломба 24, пульпит 36",
		badge: "Клинический Hot Path",
		doctorName: "Д-р Соколов А. В.",
		role: "doctor",
		icon: Stethoscope,
		highlights: [
			"Интерактивная зубная формула FDI (кариес 16, пломба 24, пульпит 36)",
			"Дневник приёма по форме 043/у с протоколом анестезии и реставрации",
			"Автоматический расчёт сметы лечения на 8 600 ₽",
		],
		avatarInitials: "СА",
		colorTheme: "teal",
		targetView: "patients",
		targetPatientId: "01a00000-0000-0000-0000-000000000001",
		staffId: DEMO_DOCTOR_1_ID,
	},
	{
		id: "orthopedist",
		title: "Ортопед",
		subtitle: "Протезирование и наряды в ЗТЛ",
		badge: "Лаборатория и CAD/CAM",
		doctorName: "Д-р Орлов А. В.",
		role: "doctor",
		icon: Crown,
		highlights: [
			"Заказ-наряд ЗТЛ: коронка ZrO2 Prettau на зуб 11, расцветка VITA A2",
			"Отслеживание 7 этапов: оттиск, CAD-моделирование, примерка каркаса",
			"Интраоральный 3D-скан STL и расчет себестоимости лабораторных работ",
		],
		avatarInitials: "ОА",
		colorTheme: "amber",
		targetView: "patients",
		targetPatientId: "01a00000-0000-0000-0000-000000000002",
		staffId: DEMO_DOCTOR_ORTHOPEDIST_ID,
	},
	{
		id: "orthodontist",
		title: "Ортодонт",
		subtitle: "Карта прикуса и элайнеры",
		badge: "Эстетика и прикус",
		doctorName: "Д-р Морозова Е. И.",
		role: "doctor",
		icon: Sparkles,
		highlights: [
			"Карта прикуса: дистальный прикус, скученность резцов 12-22",
			"Этапы элайнеров: капа 12 из 30, фиксация аттачментов на 14, 13, 23, 24",
			"Клинический фотопротокол окклюзии, протокол IPR и эластики II класса",
		],
		avatarInitials: "МЕ",
		colorTheme: "indigo",
		targetView: "patients",
		targetPatientId: "01a00000-0000-0000-0000-000000000003",
		staffId: DEMO_DOCTOR_2_ID,
	},
	{
		id: "surgeon",
		title: "Хирург-имплантолог",
		subtitle: "Имплантация и хирургические операции",
		badge: "Хирургия и шаблоны",
		doctorName: "Д-р Громов К. Д.",
		role: "doctor",
		icon: Activity,
		highlights: [
			"План имплантации: зуб 46, система Straumann BLX 4.5x10, торк 35 Н·см",
			"Протокол проводниковой анестезии и установка формирователя десны",
			"Информированное добровольное согласие (ИДС 1051н) и послеоперационный лист",
		],
		avatarInitials: "ГК",
		colorTheme: "rose",
		targetView: "patients",
		targetPatientId: "01a00000-0000-0000-0000-000000000004",
		staffId: DEMO_DOCTOR_SURGEON_ID,
	},
	{
		id: "owner",
		title: "Главврач / Владелец",
		subtitle: "Управление клиникой и финансовая аналитика",
		badge: "Финансы и KPI",
		doctorName: "Д-р Воронов М. С.",
		role: "owner",
		icon: Wrench,
		highlights: [
			"Выручка за месяц 2.45М ₽ при загрузке 3 кресел 78%",
			"Средний чек клиники 6 200 ₽ и конверсия первичных приемов 78.4%",
			"Сдельный расчет зарплаты врачей (терапевт 25%, ортопед 20%, хирург 22%)",
		],
		avatarInitials: "ВМ",
		colorTheme: "amber",
		targetView: "analytics",
		staffId: DEMO_OWNER_ID,
	},
	{
		id: "admin",
		title: "Старший администратор",
		subtitle: "Ресепшен, расписание и касса 54-ФЗ",
		badge: "Ресепшен и касса",
		doctorName: "Смирнова А. П.",
		role: "administrator",
		icon: FileSpreadsheet,
		highlights: [
			"Умная сетка расписания по креслам и кабинетам с длительными блоками",
			"Быстрый чек по кассе 54-ФЗ без очередей и без блокировок",
			"Уведомления пациентов в WhatsApp и Telegram",
		],
		avatarInitials: "СП",
		colorTheme: "emerald",
		targetView: "schedule",
		staffId: DEMO_ADMIN_ID,
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
				id: roleOption.staffId || `demo-${roleOption.id}-user`,
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

			// Мгновенная синхронизация активной роли, навигации и карточки в Zustand
			useAppStore.getState().setSelectedWorkspaceRole(roleOption.role);
			useAppStore.getState().setCurrentView(roleOption.targetView);
			if (roleOption.targetPatientId) {
				usePatientStore.getState().setSelectedPatientId(roleOption.targetPatientId);
			}

			if (typeof window !== "undefined") {
				window.location.hash = `#${roleOption.targetView}`;
			}

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
