/**
 * @file RoleSwitcher.tsx
 * @description Master Clinical Role Switcher for DENTE Dental CRM.
 * Adheres to Mandate 8b (<= 800 lines), Mandate 8d (0 cartoon emojis),
 * Mandate 8e (Doctor Autonomy), Mandate 8n (Scale Sovereignty), and Hick's Law.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	Activity,
	Award,
	ChevronDown,
	Crown,
	FileSpreadsheet,
	Sparkles,
	Stethoscope,
	UserCheck,
} from "lucide-react";
import { isDemoShowcaseMode } from "../../utils/demoModeEngine.js";
import {
	switchDemoRole,
	DEMO_CLINICAL_ROLE_PROFILES,
} from "../../utils/demo/demoInteractiveSimulation.js";
import { syncAuthTokensFromStorage } from "../../lib/apiAuthFetch.js";
import { useAppStore } from "../../store/appStore.js";
import { usePatientStore } from "../../store/patientStore.js";
import { usePerspectiveStore, type WorkspacePerspective } from "../../store/perspectiveStore.js";
import { showToast } from "../GlobalToast.js";

export interface ClinicalRoleItem {
	key: string;
	title: string;
	specialty: string;
	doctorName: string;
	staffRole: "doctor" | "owner" | "administrator";
	perspective: WorkspacePerspective;
	icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const CLINICAL_ROLE_ITEMS: ClinicalRoleItem[] = [
	{
		key: "therapist",
		title: "Терапевт",
		specialty: "Стоматолог-терапевт",
		doctorName: "Д-р Соколов А. В.",
		staffRole: "doctor",
		perspective: "standard",
		icon: Stethoscope,
	},
	{
		key: "orthopedist",
		title: "Ортопед",
		specialty: "Стоматолог-ортопед",
		doctorName: "Д-р Орлов А. В.",
		staffRole: "doctor",
		perspective: "standard",
		icon: Crown,
	},
	{
		key: "orthodontist",
		title: "Ортодонт",
		specialty: "Стоматолог-ортодонт",
		doctorName: "Д-р Морозова Е. И.",
		staffRole: "doctor",
		perspective: "orthodontic",
		icon: Sparkles,
	},
	{
		key: "surgeon",
		title: "Хирург",
		specialty: "Хирург-имплантолог",
		doctorName: "Д-р Громов К. Д.",
		staffRole: "doctor",
		perspective: "chairsider",
		icon: Activity,
	},
	{
		key: "owner",
		title: "Главврач",
		specialty: "Главный врач клиники",
		doctorName: "Д-р Воронов М. С.",
		staffRole: "owner",
		perspective: "standard",
		icon: Award,
	},
	{
		key: "admin",
		title: "Ресепшен",
		specialty: "Старший администратор",
		doctorName: "Смирнова А. П.",
		staffRole: "administrator",
		perspective: "frontdesk",
		icon: FileSpreadsheet,
	},
];

export interface RoleSwitcherProps {
	className?: string;
	compact?: boolean;
	onRoleSwitched?: (roleKey: string) => void;
}

export function RoleSwitcher({
	className = "",
	compact = false,
	onRoleSwitched,
}: RoleSwitcherProps) {
	const isDemo = isDemoShowcaseMode();
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement | null>(null);

	const selectedWorkspaceRole = useAppStore((s) => s.selectedWorkspaceRole);
	const setSelectedWorkspaceRole = useAppStore((s) => s.setSelectedWorkspaceRole);
	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const setPerspective = usePerspectiveStore((s) => s.setPerspective);

	// Чтение активной роли из локального хранилища при монтировании (F5 устойчивость)
	const [activeRoleKey, setActiveRoleKey] = useState<string>(() => {
		if (typeof window !== "undefined") {
			try {
				const saved = localStorage.getItem("dente_active_clinical_role");
				if (saved && CLINICAL_ROLE_ITEMS.some((r) => r.key === saved)) {
					return saved;
				}
				const demoSaved = localStorage.getItem("dente_demo_active_role");
				if (demoSaved && CLINICAL_ROLE_ITEMS.some((r) => r.key === demoSaved)) {
					return demoSaved;
				}
			} catch {
				// storage error fallback
			}
		}
		if (selectedWorkspaceRole === "owner") return "owner";
		if (selectedWorkspaceRole === "administrator") return "admin";
		return "therapist";
	});

	// Синхронизация при внешних событиях переключения
	useEffect(() => {
		const handleExternalSwitch = (e: Event) => {
			const custom = e as CustomEvent<{ roleKey?: string }>;
			if (custom.detail?.roleKey) {
				setActiveRoleKey(custom.detail.roleKey);
			}
		};
		window.addEventListener("dente-demo-role-switched", handleExternalSwitch);
		return () =>
			window.removeEventListener("dente-demo-role-switched", handleExternalSwitch);
	}, []);

	// Закрытие по клику вне элемента и клавише Escape
	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	const currentRoleItem =
		CLINICAL_ROLE_ITEMS.find((r) => r.key === activeRoleKey) ??
		CLINICAL_ROLE_ITEMS[0]!;
	const CurrentIcon = currentRoleItem.icon;

	const handleSelectRole = useCallback(
		(roleKey: string) => {
			const target = CLINICAL_ROLE_ITEMS.find((r) => r.key === roleKey);
			if (!target) return;

			setActiveRoleKey(roleKey);
			setIsOpen(false);

			if (typeof window !== "undefined") {
				try {
					localStorage.setItem("dente_active_clinical_role", roleKey);
				} catch {
					// storage restricted
				}
			}

			// Сохраняем текущего пациента перед переключением (контекст врача сохраняется!)
			const currentPatientId = usePatientStore.getState().selectedPatientId;

			if (isDemo) {
				// Демо-контур: программный засев, токены демо-тура
				const res = switchDemoRole(roleKey);
				if (res.success && res.profile) {
					syncAuthTokensFromStorage();
					setSelectedWorkspaceRole(res.profile.role);
					setCurrentView(res.profile.targetView as any);
					setPerspective(target.perspective);

					// Если уже был открыт пациент — сохраняем его, иначе ставим целевого для роли
					if (currentPatientId) {
						usePatientStore.getState().setSelectedPatientId(currentPatientId);
					} else if (res.profile.targetPatientId) {
						usePatientStore
							.getState()
							.setSelectedPatientId(res.profile.targetPatientId);
					}

					showToast(
						`Роль врача активирована: ${res.profile.doctorName} (${target.title})`,
						"success",
					);
				}
			} else {
				// Боевой прод: переключаем роль в Zustand и перспективу без моков
				setSelectedWorkspaceRole(target.staffRole);
				setPerspective(target.perspective);

				if (target.staffRole === "administrator") {
					setCurrentView("schedule");
				} else if (target.staffRole === "owner") {
					setCurrentView("analytics");
				} else {
					setCurrentView("patients");
				}

				if (currentPatientId) {
					usePatientStore.getState().setSelectedPatientId(currentPatientId);
				}

				showToast(
					`Переключено рабочее место: ${target.title} (${target.specialty})`,
					"info",
				);
			}

			onRoleSwitched?.(roleKey);
		},
		[
			isDemo,
			onRoleSwitched,
			setCurrentView,
			setPerspective,
			setSelectedWorkspaceRole,
		],
	);

	return (
		<div
			ref={dropdownRef}
			className={`dnt-role-switcher relative inline-flex items-center ${className}`}
			data-testid="clinical-role-switcher"
		>
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="group h-7 min-h-[28px] max-h-7 px-2.5 rounded-md bg-transparent hover:bg-[var(--paper)] text-[var(--ink)] hover:shadow-xs flex items-center gap-1.5 transition-all cursor-pointer text-xs font-medium"
				aria-expanded={isOpen}
				aria-haspopup="listbox"
				aria-label="Переключение клинической роли"
				title={`Текущая роль: ${currentRoleItem.title} (${currentRoleItem.doctorName})`}
				data-testid="role-switcher-trigger"
			>
				<CurrentIcon size={13} className="text-[var(--muted)] group-hover:text-[var(--ink)] shrink-0 transition-colors" />
				<span className="truncate max-w-[90px] sm:max-w-[120px] font-semibold">
					{currentRoleItem.title}
				</span>
				{!compact && (
					<span className="hidden xl:inline text-[11px] font-normal text-[var(--muted)] truncate max-w-[100px]">
						· {currentRoleItem.doctorName.split(" ")[0]}
					</span>
				)}
				<ChevronDown
					size={11}
					className={`text-[var(--muted)] opacity-50 group-hover:opacity-100 transition-all duration-150 ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>

			{isOpen && (
				<div
					className="absolute top-full left-0 mt-1.5 w-64 p-1.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)] shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150"
					role="listbox"
					aria-label="Список клинических ролей"
					data-testid="role-switcher-menu"
				>
					<div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)] border-b border-[var(--line-subtle,#f1f5f9)] mb-1 flex items-center justify-between">
						<span>Клиническая роль</span>
						{isDemo ? (
							<span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 font-semibold">
								Демо
							</span>
						) : (
							<span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 font-semibold">
								Боевой
							</span>
						)}
					</div>

					<div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto">
						{CLINICAL_ROLE_ITEMS.map((item) => {
							const Icon = item.icon;
							const isSelected = item.key === activeRoleKey;
							return (
								<button
									key={item.key}
									type="button"
									role="option"
									aria-selected={isSelected}
									data-testid={`role-option-${item.key}`}
									onClick={() => handleSelectRole(item.key)}
									className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
										isSelected
											? "bg-[var(--teal-surface,#0d948814)] text-[var(--teal,#0d9488)] font-bold border border-[var(--teal-soft,#0d948833)]"
											: "text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] border border-transparent"
									}`}
								>
									<div className="flex items-center gap-2 min-w-0">
										<Icon
											size={14}
											className={`shrink-0 ${isSelected ? "text-[var(--teal,#0d9488)]" : "text-[var(--muted,#64748b)]"}`}
										/>
										<div className="flex flex-col min-w-0 leading-tight">
											<span className="truncate">{item.title}</span>
											<span className="text-[10px] text-[var(--muted,#64748b)] font-normal truncate">
												{item.doctorName} · {item.specialty}
											</span>
										</div>
									</div>
									{isSelected && (
										<UserCheck size={13} className="shrink-0 text-[var(--teal,#0d9488)]" />
									)}
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}

export default RoleSwitcher;
