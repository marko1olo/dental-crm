import React, { useCallback, useState, useEffect } from "react";
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
	restoreLiveStaffSessionAfterDemo,
	DEMO_CLINICAL_ROLE_PROFILES,
	type DemoRoleProfile,
} from "../../utils/demo/demoInteractiveSimulation.js";
import { syncAuthTokensFromStorage } from "../../lib/apiAuthFetch.js";
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
	const [isDismissed, setIsDismissed] = useState(() => {
		if (typeof window !== "undefined") {
			try {
				return localStorage.getItem("dente_demo_banner_dismissed") === "true";
			} catch {
				return false;
			}
		}
		return false;
	});
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
		restoreLiveStaffSessionAfterDemo();
		syncAuthTokensFromStorage();
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
		restoreLiveStaffSessionAfterDemo();
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
			syncAuthTokensFromStorage();
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
			syncAuthTokensFromStorage();
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
	}> = [
		{ key: "therapist", label: "Терапевт", icon: Stethoscope },
		{ key: "orthopedist", label: "Ортопед", icon: Crown },
		{ key: "orthodontist", label: "Ортодонт", icon: Sparkles },
		{ key: "surgeon", label: "Хирург", icon: Activity },
		{ key: "owner", label: "Главврач", icon: Award },
		{ key: "admin", label: "Ресепшен", icon: FileSpreadsheet },
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
					gap: "10px",
					height: "36px",
					minHeight: "36px",
					maxHeight: "36px",
					padding: "0 12px",
					background: "var(--paper-soft, #f8fafc)",
					borderBottom: "1px solid var(--line, #e2e8f0)",
					color: "var(--ink, #1e293b)",
					fontSize: "12px",
					fontWeight: 500,
					lineHeight: "1.4",
					zIndex: 35,
					flexWrap: "nowrap",
					overflow: "hidden",
					boxSizing: "border-box",
				}}
			>
				<div
					style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
					title="Ознакомительный режим: живой клинический симулятор"
				>
					<Eye
						size={14}
						style={{ color: "var(--teal, #0d9488)", flexShrink: 0 }}
						aria-hidden="true"
					/>
					<span style={{ whiteSpace: "nowrap" }}>
						<strong>Демо-симулятор</strong>
					</span>
					<span style={{ display: "none" }}>Ознакомительный режим:</span>
				</div>

				{/* 1-клик переключатель между 6 клиническими ролями (Zero Dead-Ends) */}
				<div
					className="demo-role-quick-switcher"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "2px",
						background: "var(--paper-strong, #ffffff)",
						padding: "1px 3px",
						borderRadius: "6px",
						border: "1px solid var(--line, #cbd5e1)",
						flexShrink: 0,
					}}
				>
					<span
						style={{
							fontSize: "11px",
							color: "var(--muted, #64748b)",
							fontWeight: 600,
							marginRight: "2px",
							paddingLeft: "2px",
							whiteSpace: "nowrap",
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
									gap: "3px",
									height: "26px",
									minHeight: "26px",
									padding: "0 6px",
									fontSize: "11.5px",
									fontWeight: isSelected ? 700 : 500,
									borderRadius: "4px",
									border: isSelected
										? "1px solid var(--teal, #0d9488)"
										: "1px solid transparent",
									background: isSelected
										? "var(--teal-surface, rgba(13,148,136,0.1))"
										: "transparent",
									color: isSelected ? "var(--teal-dark, #0f766e)" : "var(--ink, #334155)",
									cursor: "pointer",
									whiteSpace: "nowrap",
									transition: "all 0.15s ease",
								}}
								title={`Переключить на роль: ${r.label}`}
							>
								<Icon size={12} />
								<span>{r.label}</span>
							</button>
						);
					})}
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
					{/* Кнопка открытия деталей клинического кейса */}
					<button
						type="button"
						onClick={() => setIsCaseModalOpen(true)}
						data-testid="open-demo-case-btn"
						style={{
							background: "var(--paper-strong, #ffffff)",
							color: "var(--ink, #1e293b)",
							border: "1px solid var(--line, #cbd5e1)",
							borderRadius: "4px",
							height: "26px",
							minHeight: "26px",
							padding: "0 8px",
							fontSize: "11.5px",
							fontWeight: 600,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							whiteSpace: "nowrap",
						}}
						title="Посмотреть клинический кейс роли, дневник 043/у и смету"
					>
						<HelpCircle size={13} aria-hidden="true" />
						Кейс роли
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
							height: "26px",
							minHeight: "26px",
							padding: "0 10px",
							fontSize: "11.5px",
							fontWeight: 600,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							whiteSpace: "nowrap",
						}}
						title="Создать свою клинику бесплатно"
					>
						<Sparkles size={13} aria-hidden="true" />
						<span>Создать клинику</span>
						<span style={{ display: "none" }}>Создать свою клинику бесплатно</span>
					</button>

					<button
						type="button"
						onClick={handleExitDemo}
						data-testid="exit-demo-button"
						style={{
							background: "var(--paper-strong, #ffffff)",
							color: "var(--muted, #64748b)",
							border: "1px solid var(--line, #cbd5e1)",
							borderRadius: "4px",
							height: "26px",
							minHeight: "26px",
							padding: "0 8px",
							fontSize: "11.5px",
							fontWeight: 600,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							whiteSpace: "nowrap",
						}}
					>
						Выйти
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
							width: "24px",
							height: "24px",
							minWidth: "24px",
							minHeight: "24px",
							borderRadius: "4px",
						}}
					>
						<X size={14} />
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
