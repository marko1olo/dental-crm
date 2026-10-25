/**
 * apps/web/src/components/settings/mobile/MobileSettingsStaffView.tsx
 *
 * Dedicated Mobile Staff View compliant with Apple HIG.
 * Facade <= 80 lines.
 */

import React, { useState, useMemo } from "react";
import type { StaffMember } from "@dental/shared";
import { staffRoleTitle } from "../settingsInviteRoles";
import { MobileStaffTopBar } from "./MobileStaffTopBar";
import { MobileStaffSearchFilterBar } from "./MobileStaffSearchFilterBar";
import { MobileStaffList } from "./MobileStaffList";
import { MobileAddStaffDrawer } from "./MobileAddStaffDrawer";
import { MobileStaffPinDrawer } from "./MobileStaffPinDrawer";
import { MobileStaffFloatingBottomBar } from "./MobileStaffFloatingBottomBar";
import { useMobileStaffActions } from "./useMobileStaffActions";

const ROLE_FILTERS = [
	{ key: "all", label: "Все" },
	{ key: "doctor", label: "Врачи" },
	{ key: "assistant", label: "Ассистенты" },
	{ key: "administrator", label: "Администраторы" },
	{ key: "owner", label: "Руководство" },
];

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

	const { isSubmitting, createStaff, savePin } = useMobileStaffActions({
		accessHeaders: auth?.settingsAccessHeaders,
		loadDashboard,
	});

	const filteredStaff = useMemo(() => {
		let list = staffList;
		if (selectedRoleFilter !== "all") list = list.filter((s) => s.role === selectedRoleFilter);
		if (!searchQuery.trim()) return list;
		const q = searchQuery.toLowerCase().trim();
		return list.filter((s) => {
			const nameMatch = s.fullName?.toLowerCase().includes(q);
			const phoneMatch = s.phone?.toLowerCase().includes(q);
			const roleMatch = staffRoleTitle(String(s.role || "")).toLowerCase().includes(q);
			return nameMatch || phoneMatch || roleMatch;
		});
	}, [staffList, searchQuery, selectedRoleFilter]);

	return (
		<div className="mobile-staff-view flex flex-col w-full max-w-[100vw] overflow-x-clip pb-28" data-testid="mobile-settings-staff-view">
			<MobileStaffTopBar
				onBackToSettings={onBackToSettings}
				staffCount={staffList.length}
				onOpenAddStaff={() => setIsAddStaffOpen(true)}
			/>

			<MobileStaffSearchFilterBar
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				selectedRoleFilter={selectedRoleFilter}
				setSelectedRoleFilter={setSelectedRoleFilter}
				roleFilters={ROLE_FILTERS}
				staffList={staffList}
			/>

			<div className="px-4 mt-2">
				<MobileStaffList
					staffMembers={filteredStaff}
					onOpenPinModal={(member) => {
						setPinTargetStaff(member);
						setIsPinModalOpen(true);
					}}
				/>
			</div>

			<MobileStaffFloatingBottomBar onOpenAddStaff={() => setIsAddStaffOpen(true)} />

			<MobileAddStaffDrawer
				isOpen={isAddStaffOpen}
				onClose={() => setIsAddStaffOpen(false)}
				isSubmitting={isSubmitting}
				onAddStaff={(data) => createStaff(data, () => setIsAddStaffOpen(false))}
			/>

			<MobileStaffPinDrawer
				isOpen={isPinModalOpen}
				onClose={() => setIsPinModalOpen(false)}
				pinTargetStaff={pinTargetStaff}
				isSubmitting={isSubmitting}
				onSavePin={(member, pin) => savePin(member, pin, () => setIsPinModalOpen(false))}
			/>
		</div>
	);
};

export default MobileSettingsStaffView;
