import type React from "react";
import { useState } from "react";
import type { StaffProfileExtended } from "@dental/shared";
import { DoctorPayrollStudioModal } from "../payroll/DoctorPayrollStudioModal";
import { StaffAuthorityPanel } from "./StaffAuthorityPanel";
import { StaffCommissionsPanel } from "./StaffCommissionsPanel";
import { StaffProfileCard } from "./StaffProfileCard";
import { StaffActiveList } from "./staff/StaffActiveList";
import { StaffAddForm } from "./staff/StaffAddForm";
import { useStaffMutations } from "./staff/useStaffMutations";
import { reloadStaffList, type SettingsAccessHeaders } from "./staffMutationRequest";

interface SettingsStaffTabProps {
	props: {
		dashboard?: {
			clinicSettings?: {
				staff?: StaffProfileExtended[];
				name?: string;
			};
			clinicName?: string;
		};
		loadDashboard?: (() => Promise<unknown>) | undefined;
		auth?: {
			settingsAccessHeaders?: SettingsAccessHeaders;
			user?: {
				role?: string;
			};
		};
		[key: string]: unknown;
	};
}

export function SettingsStaffTab({ props }: SettingsStaffTabProps) {
	const { dashboard, loadDashboard, auth } = props;
	const staff = dashboard?.clinicSettings?.staff || [];
	const accessHeaders = auth?.settingsAccessHeaders as SettingsAccessHeaders | undefined;
	const clinicDataLoaded = Boolean(dashboard?.clinicSettings);

	const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
	const [selectedStaffForCard, setSelectedStaffForCard] = useState<StaffProfileExtended | null>(null);

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
					onOpenPayroll={() => setIsPayrollModalOpen(true)}
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
					callerRole={auth?.user?.role || "doctor"}
					isOpen={Boolean(selectedStaffForCard)}
					onClose={() => setSelectedStaffForCard(null)}
					onSaved={async () => {
						await reloadStaffList(loadDashboard);
						setSelectedStaffForCard(null);
					}}
				/>
			)}

			{isPayrollModalOpen && (
				<DoctorPayrollStudioModal
					isOpen={isPayrollModalOpen}
					onClose={() => setIsPayrollModalOpen(false)}
					clinicName={dashboard?.clinicSettings?.name || dashboard?.clinicName}
					doctorsList={staff
						.filter((s: StaffProfileExtended) => s.role === "doctor" || s.role === "owner")
						.map((s: StaffProfileExtended) => ({
							id: s.id,
							name: s.fullName || (s as { name?: string }).name || "",
							specialtyId: (s as { specialties?: string[] }).specialties?.[0] || "general_dentist",
						}))}
				/>
			)}
		</section>
	);
}
