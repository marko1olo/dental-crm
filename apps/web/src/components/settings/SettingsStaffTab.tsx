import { CalendarClock, Users } from "lucide-react";
import "./SettingsStaffTab.css";
import type React from "react";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { useStaffSettingsLogic } from "./staff/useStaffSettingsLogic";
import { StaffListSection } from "./staff/StaffListSection";
import { StaffScheduleSection } from "./staff/StaffScheduleSection";
import { StaffEditModal } from "./staff/StaffEditModal";
import { useWorkspaceProfileStore } from "../../hooks/useWorkspaceProfile";

export function SettingsStaffTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;

	const {
		dashboard,
		staffRoleLabels,
		specialtyLabels,
		staffScheduleDrafts,
		staffScheduleDirtyIds,
		staffScheduleSavingId,
		staffScheduleSaveStates,
		updateStaffScheduleDraft,
		toggleStaffWorkingDay,
		saveStaffSchedule,
		weekdayOptions,
	} = mergedProps;

	const { loading, handleSaveStaff } = useStaffSettingsLogic({
		auth: appLogic.auth,
		loadDashboard: appLogic.loadDashboard,
	});

	const typedWeekdayOptions = weekdayOptions || [];
	const staff = dashboard?.clinicSettings?.staff || [];
	const hasAssistants = useWorkspaceProfileStore((s) => s.hasAssistants);

	const [activeTab, setActiveTab] = useState<"staff_list" | "staff_schedule">(
		"staff_list",
	);
	const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<{
		fullName: string;
		role: string;
		email: string;
		phone: string;
		active: boolean;
		canSignMedicalRecords: boolean;
		canManageImports: boolean;
		canManageMoney: boolean;
		canManageSchedule: boolean;
		pin: string;
		password: string;
		color: string;
		specialties: string[];
		commissionRate: number;
	}>({
		fullName: "",
		role: "doctor",
		email: "",
		phone: "",
		active: true,
		canSignMedicalRecords: true,
		canManageImports: false,
		canManageMoney: false,
		canManageSchedule: false,
		pin: "",
		password: "",
		color: "#0d9488",
		specialties: ["universal"],
		commissionRate: 30,
	});

	const startEditing = (member: any) => {
		setEditingStaffId(member.id);
		setEditForm({
			fullName: member.fullName || "",
			role: member.role || "doctor",
			email: member.email || "",
			phone: member.phone || "",
			active: member.active !== false,
			canSignMedicalRecords: !!member.canSignMedicalRecords,
			canManageImports: !!member.canManageImports,
			canManageMoney: !!member.canManageMoney,
			canManageSchedule: !!member.canManageSchedule,
			pin: "",
			password: "",
			color: member.color || "#0d9488",
			specialties: member.specialties || ["universal"],
			commissionRate:
				member.commissionRate != null ? member.commissionRate : 30,
		});
	};

	const startCreating = () => {
		setEditingStaffId("new");
		setEditForm({
			fullName: "",
			role: "doctor",
			email: "",
			phone: "",
			active: true,
			canSignMedicalRecords: true,
			canManageImports: false,
			canManageMoney: false,
			canManageSchedule: false,
			pin: "",
			password: "",
			color: "#0d9488",
			specialties: ["universal"],
			commissionRate: 30,
		});
	};

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingStaffId) return;
		handleSaveStaff(editingStaffId, editForm, () => setEditingStaffId(null));
	};

	return (
		<div className="staff-studio-container animate-fade-in">
			<div className="staff-tabs-header">
				<button
					className={
						"staff-tab-btn" + (activeTab === "staff_list" ? " active" : "")
					}
					onClick={() => setActiveTab("staff_list")}
				>
					<Users size={18} />
					<span>Сотрудники и Доступы</span>
				</button>
				<button
					className={
						"staff-tab-btn" + (activeTab === "staff_schedule" ? " active" : "")
					}
					onClick={() => setActiveTab("staff_schedule")}
				>
					<CalendarClock size={18} />
					<span>Графики работы</span>
				</button>
			</div>

			{activeTab === "staff_list" && (
				<StaffListSection
					staff={staff}
					staffRoleLabels={staffRoleLabels}
					startCreating={startCreating}
					startEditing={startEditing}
				/>
			)}

			{activeTab === "staff_schedule" && (
				<StaffScheduleSection
					staff={staff}
					staffRoleLabels={staffRoleLabels}
					staffScheduleDrafts={staffScheduleDrafts}
					staffScheduleDirtyIds={staffScheduleDirtyIds}
					staffScheduleSavingId={staffScheduleSavingId}
					staffScheduleSaveStates={staffScheduleSaveStates}
					updateStaffScheduleDraft={updateStaffScheduleDraft}
					toggleStaffWorkingDay={toggleStaffWorkingDay}
					saveStaffSchedule={saveStaffSchedule}
					typedWeekdayOptions={typedWeekdayOptions}
				/>
			)}

			{editingStaffId && (
				<StaffEditModal
					editingStaffId={editingStaffId}
					editForm={editForm}
					setEditForm={setEditForm}
					setEditingStaffId={setEditingStaffId}
					handleSaveStaff={onSubmit}
					loading={loading}
					specialtyLabels={specialtyLabels}
					hasAssistants={hasAssistants}
				/>
			)}
		</div>
	);
}
