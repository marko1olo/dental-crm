/**
 * apps/web/src/components/settings/mobile/MobileSettingsStaffView.tsx
 *
 * Dedicated Mobile Staff View compliant with Apple HIG & Grouped Inset Cards:
 * - Grouped Inset Cards of doctors and staff
 * - Clickable phone numbers (tel:...) with direct call button
 * - Native Bottom Sheet for adding staff and setting PIN credentials
 * - Floating Bottom Bar with primary CTA in natural thumb zone
 * - 0px horizontal drift
 */

import React, { useState, useMemo } from "react";
import type { StaffMember, StaffRole } from "@dental/shared";
import {
	ChevronLeft,
	KeyRound,
	Phone,
	Plus,
	Search,
	ShieldCheck,
	UserPlus,
	Users,
	X,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import { staffRoleTitle, CREATABLE_STAFF_ROLES } from "../settingsInviteRoles";
import {
	requestStaffMutation,
	reloadStaffList,
	planStaffCredentialUpdate,
	staffCredentialFailedAction,
	staffCredentialSavedMessage,
} from "../staffMutationRequest";
import { actionFailureToast } from "../../../lib/panelStateText";

export interface MobileSettingsStaffViewProps {
	// biome-ignore lint/suspicious/noExplicitAny: app logic props bag
	readonly appLogic: Record<string, any>;
	readonly onBackToSettings: () => void;
}

export const MobileSettingsStaffView: React.FC<MobileSettingsStaffViewProps> = ({
	appLogic,
	onBackToSettings,
}) => {
	const { dashboard, loadDashboard, auth } = appLogic;
	const staffList = (dashboard?.clinicSettings?.staff ?? []) as StaffMember[];

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
	const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
	const [isPinModalOpen, setIsPinModalOpen] = useState(false);
	const [pinTargetStaff, setPinTargetStaff] = useState<StaffMember | null>(null);
	const [pinValue, setPinValue] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const STAFF_ROLE_FILTERS = [
		{ key: "all", label: "Все" },
		{ key: "doctor", label: "Врачи" },
		{ key: "assistant", label: "Ассистенты" },
		{ key: "administrator", label: "Администраторы" },
		{ key: "owner", label: "Руководство" },
	];

	// New staff form state
	const [newName, setNewName] = useState("");
	const [newRole, setNewRole] = useState<StaffRole>("doctor");
	const [newPhone, setNewPhone] = useState("");
	const [newEmail, setNewEmail] = useState("");
	const [newSnils, setNewSnils] = useState("");

	const accessHeaders = auth?.settingsAccessHeaders;

	const filteredStaff = useMemo(() => {
		let list = staffList;
		if (selectedRoleFilter !== "all") {
			list = list.filter((s) => s.role === selectedRoleFilter);
		}
		if (!searchQuery.trim()) return list;
		const q = searchQuery.toLowerCase().trim();
		return list.filter((s) => {
			const nameMatch = s.fullName?.toLowerCase().includes(q);
			const phoneMatch = s.phone?.toLowerCase().includes(q);
			const roleMatch = staffRoleTitle(String(s.role || ""))
				.toLowerCase()
				.includes(q);
			return nameMatch || phoneMatch || roleMatch;
		});
	}, [staffList, searchQuery, selectedRoleFilter]);

	// Create staff
	const handleCreateStaff = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newName.trim() || isSubmitting) return;

		setIsSubmitting(true);
		const addedName = newName.trim();
		const failedAction = `Сотрудник «${addedName}» не добавлен`;
		try {
			const outcome = await requestStaffMutation({
				url: "/api/settings/staff",
				method: "POST",
				accessHeaders,
				logLabel: "сотрудник не добавлен",
				body: {
					fullName: addedName,
					role: newRole,
					phone: newPhone.trim() || null,
					email: newEmail.trim() || null,
					snils: newSnils.trim() || null,
					active: true,
					canSignMedicalRecords: newRole === "doctor",
					canManageMoney: newRole === "administrator" || newRole === "owner",
					canManageImports: true,
					color: "#0d9488",
				},
			});

			if (!outcome.ok) {
				showToast(
					outcome.message ?? actionFailureToast(failedAction, outcome.status),
					"error",
				);
				return;
			}

			setNewName("");
			setNewPhone("");
			setNewEmail("");
			setNewSnils("");
			setIsAddStaffOpen(false);

			if (typeof loadDashboard === "function") {
				await reloadStaffList(loadDashboard);
			}
			showToast(`Сотрудник «${addedName}» успешно добавлен`, "success");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Save PIN
	const handleSavePin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!pinTargetStaff || isSubmitting) return;

		const plan = planStaffCredentialUpdate("pin", pinValue);
		if (!plan.ok) {
			showToast(plan.warning, "warning");
			return;
		}

		setIsSubmitting(true);
		const staffName = pinTargetStaff.fullName ? `«${pinTargetStaff.fullName}»` : "сотрудника";
		const failedAction = staffCredentialFailedAction("pin", staffName);
		try {
			const outcome = await requestStaffMutation({
				url: `/api/settings/staff/${pinTargetStaff.id}/credentials`,
				method: "POST",
				accessHeaders,
				logLabel: failedAction,
				body: plan.body,
			});

			if (!outcome.ok) {
				showToast(
					outcome.message ?? actionFailureToast(failedAction, outcome.status),
					"error",
				);
				return;
			}

			setIsPinModalOpen(false);
			setPinValue("");
			showToast(staffCredentialSavedMessage("pin", staffName), "success");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div
			className="mobile-staff-view flex flex-col w-full max-w-[100vw] overflow-x-clip pb-28"
			data-testid="mobile-settings-staff-view"
		>
			{/* Top Navigation Bar */}
			<div className="sticky top-0 z-30 bg-[var(--paper)]/95 backdrop-blur-md border-b border-[var(--line)] px-4 py-2.5 flex items-center justify-between">
				<button
					type="button"
					onClick={onBackToSettings}
					className="min-w-[44px] min-h-[44px] -ml-2 px-2 flex items-center gap-1 text-[15px] font-medium text-[var(--teal)] hover:opacity-80 active:scale-95 transition-transform cursor-pointer"
					aria-label="Назад в настройки"
					data-testid="btn-mobile-back-to-settings-from-staff"
				>
					<ChevronLeft size={20} className="shrink-0" />
					<span>Настройки</span>
				</button>

				<div className="text-center min-w-0 px-2 flex flex-col items-center">
					<h2 className="text-[17px] font-semibold text-[var(--ink)] tracking-tight truncate leading-tight">
						Врачи и персонал
					</h2>
					<span className="text-[11px] font-medium text-[var(--muted)]">
						{staffList.length} сотрудников в штате
					</span>
				</div>

				<button
					type="button"
					onClick={() => setIsAddStaffOpen(true)}
					className="min-w-[44px] min-h-[44px] -mr-2 w-11 h-11 rounded-full flex items-center justify-center text-[var(--teal)] hover:bg-[var(--teal-soft)] active:scale-95 transition-transform cursor-pointer"
					aria-label="Добавить сотрудника"
					data-testid="btn-mobile-add-staff-top"
				>
					<Plus size={22} />
				</button>
			</div>

			{/* Search */}
			<div className="px-4 pt-3 pb-2">
				<div className="dente-search-wrap">
					<Search
						size={14}
						className="dente-search-icon"
						aria-hidden="true"
					/>
					<input
						type="search"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по имени, роли или телефону..."
						className="dente-search-input"
						data-testid="input-mobile-staff-search"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="dente-search-clear"
							aria-label="Очистить поиск"
						>
							<X size={14} />
						</button>
					)}
				</div>
			</div>

			{/* Role Filter Chips */}
			<div className="px-4 pb-2 overflow-x-auto">
				<div className="dente-filter-chips flex-nowrap" role="group" aria-label="Фильтр сотрудников по ролям">
					{STAFF_ROLE_FILTERS.map((f) => {
						const count = f.key === "all"
							? staffList.length
							: staffList.filter((s) => s.role === f.key).length;
						return (
							<button
								key={f.key}
								type="button"
								onClick={() => setSelectedRoleFilter(f.key)}
								className={`dente-filter-chip ${selectedRoleFilter === f.key ? "active" : ""}`}
								data-active={selectedRoleFilter === f.key}
							>
								<span>{f.label}</span>
								{count > 0 && <span className="opacity-70 text-[10px] ml-1 font-mono">({count})</span>}
							</button>
						);
					})}
				</div>
			</div>

			{/* Grouped Inset Staff List */}
			<div className="px-4 mt-2">
				{filteredStaff.length > 0 ? (
					<div className="rounded-[16px] bg-[var(--paper)] border border-[var(--line)] overflow-hidden divide-y divide-[var(--line-subtle)] shadow-xs">
						{filteredStaff.map((member) => (
							<div
								key={member.id}
								className="p-3.5 flex flex-col gap-2.5 transition-colors"
								data-testid={`mobile-staff-row-${member.id}`}
							>
								{/* Main Info Row */}
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-3 min-w-0 flex-1">
										<div
											className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-base text-white shrink-0 shadow-xs"
											style={{
												backgroundColor:
													member.color || "var(--teal, #0d9488)",
											}}
										>
											{member.fullName ? member.fullName.charAt(0) : "S"}
										</div>

										<div className="min-w-0 flex-1">
											<h4 className="text-[15px] font-semibold text-[var(--ink)] truncate leading-tight">
												{member.fullName}
											</h4>
											<div className="flex items-center gap-2 mt-0.5">
												<span className="text-[12px] font-medium text-[var(--muted)]">
													{staffRoleTitle(String(member.role ?? ""))}
												</span>
												{member.role === "doctor" && (
													<span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-800 dark:text-teal-300">
														<ShieldCheck size={10} /> Автономия
													</span>
												)}
											</div>
										</div>
									</div>

									{/* Call Button if phone exists */}
									{member.phone && (
										<a
											href={`tel:${String(member.phone).replace(/[^\d+]/g, "")}`}
											className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
											aria-label={`Позвонить ${member.fullName}`}
										>
											<Phone size={18} />
										</a>
									)}
								</div>

								{/* Action Buttons Row */}
								<div className="flex items-center gap-2 pt-2 border-t border-[var(--line-subtle)]">
									<button
										type="button"
										onClick={() => {
											setPinTargetStaff(member);
											setPinValue("");
											setIsPinModalOpen(true);
										}}
										className="flex-1 min-h-[38px] h-9 px-3 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
									>
										<KeyRound size={13} className="text-[var(--teal)]" />
										<span>PIN-код планшета</span>
									</button>

									{member.phone ? (
										<span className="text-xs font-mono text-[var(--muted)] px-2">
											{member.phone}
										</span>
									) : (
										<span className="text-xs text-[var(--muted)] px-2">
											телефон не указан
										</span>
									)}
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="p-6 my-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs text-center flex flex-col items-center gap-3">
						<Users size={32} className="text-[var(--muted)]" />
						<h4 className="text-[16px] font-bold text-[var(--ink)]">
							Сотрудники не найдены
						</h4>
						<p className="text-[13px] text-[var(--muted)] max-w-xs">
							Добавьте нового врача или администратора клиники.
						</p>
					</div>
				)}
			</div>

			{/* Floating Bottom Bar */}
			<div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-[var(--paper-strong)]/90 backdrop-blur-md border-t border-[var(--line)] pb-[max(16px,env(safe-area-inset-bottom))] shadow-lg">
				<button
					type="button"
					onClick={() => setIsAddStaffOpen(true)}
					className="w-full min-h-[50px] h-12 rounded-xl text-[16px] font-semibold bg-[var(--teal)] hover:bg-[var(--teal-dark)] active:scale-[0.99] text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
					data-testid="btn-mobile-add-staff-bottom"
				>
					<UserPlus size={20} />
					<span>Добавить нового сотрудника</span>
				</button>
			</div>

			{/* Add Staff Bottom Sheet */}
			{isAddStaffOpen && (
				<div
					className="fixed inset-0 z-50 flex flex-col justify-end"
					role="dialog"
					aria-modal="true"
				>
					<div
						className="fixed inset-0 bg-black/60 backdrop-blur-xs"
						onClick={() => setIsAddStaffOpen(false)}
					/>
					<div className="relative z-10 w-full max-h-[90dvh] flex flex-col rounded-t-[24px] bg-[var(--paper)] border-t border-[var(--line)] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250">
						<div
							className="flex justify-center pt-3 pb-2 cursor-grab"
							onClick={() => setIsAddStaffOpen(false)}
						>
							<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
						</div>

						<div className="flex items-center justify-between px-5 py-2.5 border-b border-[var(--line-subtle)] shrink-0">
							<h3 className="text-[17px] font-semibold text-[var(--ink)]">
								Новый сотрудник
							</h3>
							<button
								type="button"
								onClick={() => setIsAddStaffOpen(false)}
								className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)]"
							>
								<X size={20} />
							</button>
						</div>

						<form
							onSubmit={handleCreateStaff}
							className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5"
						>
							<div className="space-y-1">
								<label className="text-xs font-medium text-[var(--muted)]">
									ФИО сотрудника *
								</label>
								<input
									type="text"
									required
									placeholder="Иванов Алексей Владимирович"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									className="w-full h-11 px-3 text-[14px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>

							<div className="space-y-1">
								<label className="text-xs font-medium text-[var(--muted)]">
									Должность / Роль
								</label>
								<select
									value={newRole}
									onChange={(e) => setNewRole(e.target.value as StaffRole)}
									className="w-full h-11 px-3 text-[14px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] cursor-pointer"
								>
									{CREATABLE_STAFF_ROLES.map((r) => (
										<option key={r} value={r}>
											{staffRoleTitle(r)}
										</option>
									))}
								</select>
							</div>

							<div className="space-y-1">
								<label className="text-xs font-medium text-[var(--muted)]">
									Телефон сотрудника
								</label>
								<input
									type="tel"
									inputMode="tel"
									placeholder="+7 (999) 000-00-00"
									value={newPhone}
									onChange={(e) => setNewPhone(e.target.value)}
									className="w-full h-11 px-3 text-[14px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>

							<div className="space-y-1">
								<label className="text-xs font-medium text-[var(--muted)]">
									СНИЛС (для ЕГИСЗ)
								</label>
								<input
									type="text"
									placeholder="000-000-000 00"
									value={newSnils}
									onChange={(e) => setNewSnils(e.target.value)}
									className="w-full h-11 px-3 text-[14px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>

							<div className="pt-2">
								<button
									type="submit"
									disabled={isSubmitting}
									className="w-full h-12 rounded-xl text-[16px] font-semibold bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white shadow-md flex items-center justify-center cursor-pointer disabled:opacity-50"
								>
									<span>{isSubmitting ? "Добавление..." : "Добавить сотрудника"}</span>
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Set PIN Bottom Sheet */}
			{isPinModalOpen && pinTargetStaff && (
				<div
					className="fixed inset-0 z-50 flex flex-col justify-end"
					role="dialog"
					aria-modal="true"
				>
					<div
						className="fixed inset-0 bg-black/60 backdrop-blur-xs"
						onClick={() => setIsPinModalOpen(false)}
					/>
					<div className="relative z-10 w-full flex flex-col rounded-t-[24px] bg-[var(--paper)] border-t border-[var(--line)] shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-250 pb-[max(16px,env(safe-area-inset-bottom))]">
						<div
							className="flex justify-center -mt-2 cursor-grab"
							onClick={() => setIsPinModalOpen(false)}
						>
							<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
						</div>

						<div className="flex items-center justify-between border-b border-[var(--line-subtle)] pb-2">
							<h3 className="text-[17px] font-semibold text-[var(--ink)]">
								PIN-код для планшета
							</h3>
							<button
								type="button"
								onClick={() => setIsPinModalOpen(false)}
								className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)]"
							>
								<X size={18} />
							</button>
						</div>

						<p className="text-xs text-[var(--muted)]">
							Установите 4-значный PIN-код для быстрой авторизации сотрудника{" "}
							<strong>{pinTargetStaff.fullName}</strong> на планшете у кресла.
						</p>

						<form onSubmit={handleSavePin} className="space-y-4">
							<input
								type="password"
								maxLength={4}
								inputMode="numeric"
								required
								autoFocus
								placeholder="••••"
								value={pinValue}
								onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
								className="w-full h-14 text-center text-3xl font-mono tracking-widest rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
							/>

							<button
								type="submit"
								disabled={isSubmitting || pinValue.length !== 4}
								className="w-full h-12 rounded-xl text-[16px] font-semibold bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white shadow-md flex items-center justify-center cursor-pointer disabled:opacity-50"
							>
								<span>{isSubmitting ? "Сохранение..." : "Сохранить PIN-код"}</span>
							</button>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default MobileSettingsStaffView;
