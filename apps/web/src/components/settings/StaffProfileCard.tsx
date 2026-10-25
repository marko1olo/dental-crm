import type { StaffProfileExtended } from "@dental/shared";
import React, { useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { StaffProfileContent } from "./staff/profile/StaffProfileContent";
import { StaffProfileFooter } from "./staff/profile/StaffProfileFooter";
import { StaffProfileHeader } from "./staff/profile/StaffProfileHeader";
import { useStaffProfileForm } from "./staff/profile/useStaffProfileForm";
import "./staffProfile.css";

export interface StaffProfileCardProps {
	readonly staffMember: StaffProfileExtended;
	readonly callerRole?: string;
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSaved: (updated: StaffProfileExtended) => void;
}

export const StaffProfileCard: React.FC<StaffProfileCardProps> = ({
	staffMember,
	callerRole = "owner",
	isOpen,
	onClose,
	onSaved,
}) => {
	const appLogic = useOptionalAppLogicContext();
	const dashboard = appLogic?.dashboard;
	const clinicsList = dashboard?.clinicSettings?.clinics || [];
	const chairsList = dashboard?.clinicSettings?.chairs || [];
	const [activeTabMobile, setActiveTabMobile] = useState<"requisites" | "payroll" | "security">("requisites");

	const form = useStaffProfileForm(staffMember, onSaved, onClose);

	if (!isOpen) return null;

	return (
		<div className="staff-profile-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs">
			<div className="staff-profile-modal-surface bg-[var(--paper-card)] border border-[var(--line)] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92dvh] flex flex-col overflow-hidden">
				<StaffProfileHeader
					staffMember={staffMember}
					fullName={form.fullName}
					color={form.color}
					setColor={form.setColor}
					onClose={onClose}
					activeTabMobile={activeTabMobile}
					setActiveTabMobile={setActiveTabMobile}
				/>

				<StaffProfileContent
					form={form}
					staffMember={staffMember}
					callerRole={callerRole}
					clinicsList={clinicsList}
					chairsList={chairsList}
					activeTabMobile={activeTabMobile}
				/>

				<StaffProfileFooter onClose={onClose} onSave={form.handleSave} isSaving={form.isSaving} />
			</div>
		</div>
	);
};

export default StaffProfileCard;
