import type React from "react";
import { useState } from "react";
import { DoctorPayrollModal } from "../finance/payroll/DoctorPayrollModal";
import { StaffAuthorityPanel } from "./StaffAuthorityPanel";
import { StaffCommissionsPanel } from "./StaffCommissionsPanel";
import { StaffProfileCard } from "./StaffProfileCard";
import { StaffActiveList } from "./staff/StaffActiveList";
import { StaffAddForm } from "./staff/StaffAddForm";
import { useStaffMutations } from "./staff/useStaffMutations";
import { reloadStaffList, type SettingsAccessHeaders } from "./staffMutationRequest";

interface SettingsStaffTabProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	props: Record<string, any>;
}

export function SettingsStaffTab({ props }: SettingsStaffTabProps) {
	const { dashboard, loadDashboard, auth } = props;
	const staff = dashboard?.clinicSettings?.staff || [];
	const accessHeaders = auth?.settingsAccessHeaders as SettingsAccessHeaders | undefined;
	const clinicDataLoaded = Boolean(dashboard?.clinicSettings);

	const [isTimesheetT13Open, setIsTimesheetT13Open] = useState(false);
	// biome-ignore lint/suspicious/noExplicitAny: staff row
	const [selectedStaffForCard, setSelectedStaffForCard] = useState<any | null>(null);

	const { loading, updatePhone, updateCredential } = useStaffMutations(accessHeaders, loadDashboard);

	return (
		<section
			className="staff-management-studio bg-[var(--paper-card)] animate-fade-in w-full min-w-0"
			aria-label="Управление персоналом"
			data-testid="settings-staff-tab"
		>
			<div className="flex flex-col gap-1 mb-4">
				<h3 className="text-lg font-bold text-[var(--ink)] m-0">Управление персоналом</h3>
				<p className="text-xs text-[var(--muted)] m-0">
					Добавляйте врачей, ассистентов и администраторов. Устанавливайте PIN-коды для доступа к планшету.
				</p>
			</div>

			<div className="settings-grid">
				<StaffActiveList
					staff={staff}
					clinicDataLoaded={clinicDataLoaded}
					onOpenTimesheet={() => setIsTimesheetT13Open(true)}
					onOpenProfile={(member) => setSelectedStaffForCard(member)}
					onUpdatePhone={updatePhone}
					onUpdateCredential={updateCredential}
					loading={loading}
				/>
				<StaffAddForm accessHeaders={accessHeaders} loadDashboard={loadDashboard} />
				<StaffCommissionsPanel />
				<StaffAuthorityPanel />
			</div>

			{selectedStaffForCard && (
				<StaffProfileCard
					staffMember={selectedStaffForCard}
					callerRole={auth?.user?.role || "owner"}
					isOpen={Boolean(selectedStaffForCard)}
					onClose={() => setSelectedStaffForCard(null)}
					onSaved={async () => {
						await reloadStaffList(loadDashboard);
						setSelectedStaffForCard(null);
					}}
				/>
			)}

			{isTimesheetT13Open && (
				<DoctorPayrollModal
					isOpen={isTimesheetT13Open}
					onClose={() => setIsTimesheetT13Open(false)}
					clinicName={dashboard?.clinicSettings?.name || dashboard?.clinicName}
					doctorsList={staff.filter((s: any) => s.role === "doctor" || s.role === "owner").map((s: any) => ({
						id: s.id,
						name: s.fullName || s.name,
						specialtyId: s.specialties?.[0] || "general_dentist",
					}))}
				/>
			)}
		</section>
	);
}
