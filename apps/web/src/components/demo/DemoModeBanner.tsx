import type React from "react";
import { useCallback, useState, useEffect } from "react";
import {
	Activity,
	Award,
	Crown,
	Eye,
	FileSpreadsheet,
	HelpCircle,
	Sparkles,
	Stethoscope,
	X,
} from "lucide-react";
import {
	isDemoShowcaseMode,
	disableDemoShowcaseMode,
} from "../../utils/demoModeEngine.js";
import {
	switchDemoRole,
	DEMO_CLINICAL_ROLE_PROFILES,
	type DemoRoleProfile,
} from "../../utils/demo/demoInteractiveSimulation.js";
import { DemoCaseViewerModal } from "./DemoCaseViewerModal.js";
import { useAppStore } from "../../store/appStore.js";
import { usePatientStore } from "../../store/patientStore.js";
import { showToast } from "../GlobalToast.js";

export interface DemoModeBannerProps {
	readonly onExitDemo?: () => void;
	readonly onRegisterClinic?: () => void;
}

export const DemoModeBanner: React.FC<DemoModeBannerProps> = ({
	onExitDemo,
	onRegisterClinic,
}) => {
	const isDemo = isDemoShowcaseMode();
	const [isDismissed, setIsDismissed] = useState(false);
	const [activeRoleKey, setActiveRoleKey] = useState<string>("therapist");
	const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);

	useEffect(() => {
		if (typeof window !== "undefined") {
			try {
				const savedRole = localStorage.getItem("dente_demo_active_role");
				if (savedRole && DEMO_CLINICAL_ROLE_PROFILES[savedRole]) {
					setActiveRoleKey(savedRole);
				}
			} catch {
				// storage restricted
			}
		}
	}, []);

	const handleExitDemo = useCallback(() => {
		disableDemoShowcaseMode();
		if (onExitDemo) {
			onExitDemo();
		} else if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("demo");
			url.searchParams.delete("showcase");
			if (url.hash.includes("demo")) {
				url.hash = "";
			}
			window.location.href = url.pathname + (url.search ? url.search : "");
		}
	}, [onExitDemo]);

	const handleRegisterClinic = useCallback(() => {
		disableDemoShowcaseMode();
		if (onRegisterClinic) {
			onRegisterClinic();
		} else if (typeof window !== "undefined") {
			try {
				localStorage.removeItem("dente_clinic_token");
				localStorage.removeItem("dente_staff_token");
				localStorage.removeItem("dente_demo_showcase");
				localStorage.removeItem("dente_demo_active_role");
			} catch {
				// storage error
			}
			const url = new URL(window.location.href);
			url.searchParams.delete("demo");
			url.searchParams.delete("showcase");
			url.hash = "#/auth/register";
			window.location.href = url.pathname + (url.search ? url.search : "") + url.hash;
			window.location.reload();
		}
	}, [onRegisterClinic]);

	const handleRoleSwitch = useCallback((roleKey: string) => {
		const result = switchDemoRole(roleKey);
		if (result.success && result.profile) {
			setActiveRoleKey(roleKey);

			// Мгновенная синхронизация Zustand без падений
			try {
				const appState = useAppStore.getState();
				if (appState?.setSelectedWorkspaceRole) {
					appState.setSelectedWorkspaceRole(result.profile.role);
				}
				if (appState?.setCurrentView) {
					appState.setCurrentView(result.profile.targetView as any);
				}
				if (result.profile.targetPatientId) {
					const patientState = usePatientStore.getState();
					if (patientState?.setSelectedPatientId) {
						patientState.setSelectedPatientId(result.profile.targetPatientId);
					}
				}
			} catch {
				// non-react context
			}

			showToast(
				`Роль переключена: ${result.profile.doctorName} (${result.profile.title})`,
				"success",
			);
		}
	}, []);

	if (!isDemo || isDismissed) {
		return null;
	}

	const roleButtons: Array<{
		key: string;
		label: string;
		icon: React.ComponentType<{ size?: number }>;
		color: string;
	}> = [
		{ key: "therapist", label: "Терапевт", icon: Stethoscope, color: "var(--teal, #0d9488)" },
		{ key: "orthopedist", label: "Ортопед", icon: Crown, color: "var(--amber, #f59e0b)" },
		{ key: "orthodontist", label: "Ортодонт", icon: Sparkles, color: "var(--accent, #6366f1)" },
		{ key: "surgeon", label: "Хирург", icon: Activity, color: "var(--danger, #ef4444)" },
		{ key: "owner", label: "Главврач", icon: Award, color: "var(--gold, #d97706)" },
		{ key: "admin", label: "Ресепшен", icon: FileSpreadsheet, color: "var(--ok-fg, #10b981)" },
	];

	return (
		<>
			<aside
				role="status"
				aria-label="Уведомление о демонстрационном режиме"
				data-testid="demo-mode-banner"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "12px",
					padding: "5px 16px",
					background: "var(--brand-accent-bg, rgba(99, 102, 241, 0.12))",
					borderBottom: "1px solid var(--brand-accent-border, rgba(99, 102, 241, 0.3))",
					color: "var(--ink, #1e293b)",
					fontSize: "12px",
					fontWeight: 500,
					lineHeight: "1.4",
					zIndex: 35,
					flexWrap: "wrap",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
					<Eye
						size={15}
						style={{ color: "var(--brand-accent, #6366f1)", flexShrink: 0 }}
						aria-hidden="true"
					/>
					<span>
						<strong>ДЕМО-РЕЖИМ (Витрина):</strong> Ознакомительный режим: живой клинический симулятор
					</span>
				</div>

				{/* 1-клик переключатель между 5 клиническими ролями (Zero Dead-Ends) */}
				<div
					className="demo-role-quick-switcher"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "4px",
						background: "var(--paper-strong, #ffffff)",
						padding: "2px 4px",
						borderRadius: "6px",
						border: "1px solid var(--line, #cbd5e1)",
					}}
				>
					<span
						style={{
							fontSize: "11px",
							color: "var(--muted, #64748b)",
							fontWeight: 600,
							marginRight: "4px",
							paddingLeft: "4px",
						}}
					>
						Роль:
					</span>
					{roleButtons.map((r) => {
						const Icon = r.icon;
						const isSelected = activeRoleKey === r.key;
						return (
							<button
								key={r.key}
								type="button"
								data-testid={`demo-role-btn-${r.key}`}
								onClick={() => handleRoleSwitch(r.key)}
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "4px",
									minHeight: "28px",
									padding: "0 8px",
									fontSize: "12px",
									fontWeight: isSelected ? 700 : 500,
									borderRadius: "4px",
									border: isSelected
										? `1px solid ${r.color}`
										: "1px solid transparent",
									background: isSelected ? "var(--paper, #f1f5f9)" : "transparent",
									color: isSelected ? r.color : "var(--ink, #334155)",
									cursor: "pointer",
									transition: "all 0.15s ease",
								}}
								title={`Переключить на роль: ${r.label}`}
							>
								<Icon size={13} />
								<span>{r.label}</span>
							</button>
						);
					})}
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
					{/* Кнопка открытия деталей клинического кейса */}
					<button
						type="button"
						onClick={() => setIsCaseModalOpen(true)}
						data-testid="open-demo-case-btn"
						style={{
							background: "var(--paper-strong, #ffffff)",
							color: "var(--brand-accent, #6366f1)",
							border: "1px solid var(--brand-accent-border, rgba(99, 102, 241, 0.4))",
							borderRadius: "4px",
							minHeight: "28px",
							padding: "0 10px",
							fontSize: "12px",
							fontWeight: 600,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "5px",
						}}
						title="Посмотреть клинический кейс роли, дневник 043/у и смету"
					>
						<HelpCircle size={14} aria-hidden="true" />
						Клинический кейс роли
					</button>

					<button
						type="button"
						onClick={handleRegisterClinic}
						data-testid="create-clinic-free-btn"
						style={{
							background: "var(--teal, #0d9488)",
							color: "#ffffff",
							border: "none",
							borderRadius: "4px",
							minHeight: "28px",
							padding: "0 12px",
							fontSize: "12px",
							fontWeight: 600,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "5px",
						}}
					>
						<Sparkles size={14} aria-hidden="true" />
						Создать свою клинику бесплатно
					</button>

					<button
						type="button"
						onClick={handleExitDemo}
						data-testid="exit-demo-button"
						style={{
							background: "var(--brand-accent, #6366f1)",
							color: "#ffffff",
							border: "none",
							borderRadius: "4px",
							minHeight: "28px",
							padding: "0 10px",
							fontSize: "12px",
							fontWeight: 600,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
						}}
					>
						Выйти из демо
					</button>

					<button
						type="button"
						onClick={() => setIsDismissed(true)}
						aria-label="Скрыть предупреждение"
						title="Скрыть"
						style={{
							background: "transparent",
							border: "none",
							color: "var(--muted, #64748b)",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							width: "28px",
							height: "28px",
							minWidth: "28px",
							minHeight: "28px",
							borderRadius: "4px",
						}}
					>
						<X size={15} />
					</button>
				</div>
			</aside>

			{/* Модалка с подробным клиническим сценарием текущей роли */}
			<DemoCaseViewerModal
				isOpen={isCaseModalOpen}
				activeRoleKey={activeRoleKey}
				onClose={() => setIsCaseModalOpen(false)}
				onSelectRole={handleRoleSwitch}
			/>
		</>
	);
};
