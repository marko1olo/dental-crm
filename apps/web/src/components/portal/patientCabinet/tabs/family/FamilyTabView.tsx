import React from "react";
import { UserPlus } from "lucide-react";
import type { PatientCabinetFamilyMember, PatientPersonalCabinetData } from "../../patientCabinetEngine";
import { FamilySummaryBanner } from "./FamilySummaryBanner";
import { FamilyAddMemberForm } from "./FamilyAddMemberForm";
import { FamilyMemberCard } from "./FamilyMemberCard";
import { FamilyEmptyState } from "./FamilyEmptyState";
import { useFamilyTabState } from "./useFamilyTabState";

export interface FamilyTabProps {
	readonly data: PatientPersonalCabinetData;
	readonly onOpenBookingForMember?: ((member: PatientCabinetFamilyMember) => void) | undefined;
	readonly onOpenBooking?: (() => void) | undefined;
	readonly onShowToast?: ((message: string) => void) | undefined;
}

export const FamilyTab: React.FC<FamilyTabProps> = ({
	data,
	onOpenBookingForMember,
	onOpenBooking,
	onShowToast,
}) => {
	const state = useFamilyTabState(data, onShowToast);

	return (
		<div className="pc-family-tab" data-testid="pc-family-tab" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
			<FamilySummaryBanner membersCount={state.members.length} familyBalance={state.familyBalance} familyBonusPool={state.familyBonusPool} />
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
				<h3 style={{ margin: 0, fontSize: "1rem", color: "var(--pc-text-main, #0f172a)" }}>Состав семейного аккаунта</h3>
				<button
					type="button"
					className="pc-btn-primary"
					onClick={() => state.setIsAddingMember((prev) => !prev)}
					data-testid="btn-toggle-add-family-member"
					style={{ display: "inline-flex", alignItems: "center", gap: "6px", minHeight: "44px", padding: "8px 16px", borderRadius: "8px", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}
				>
					<UserPlus size={15} />
					<span>{state.isAddingMember ? "Скрыть форму" : "Добавить члена семьи"}</span>
				</button>
			</div>
			{state.isAddingMember && (
				<FamilyAddMemberForm
					newFullName={state.newFullName} setNewFullName={state.setNewFullName}
					newRelationship={state.newRelationship} setNewRelationship={state.setNewRelationship}
					newBirthDate={state.newBirthDate} setNewBirthDate={state.setNewBirthDate}
					newPhone={state.newPhone} setNewPhone={state.setNewPhone}
					newCardNumber={state.newCardNumber} setNewCardNumber={state.setNewCardNumber}
					newAllowSpend={state.newAllowSpend} setNewAllowSpend={state.setNewAllowSpend}
					newAllowBooking={state.newAllowBooking} setNewAllowBooking={state.setNewAllowBooking}
					cardPlaceholder={state.cardPlaceholder}
					onSubmit={state.handleAddMemberSubmit}
					onCancel={() => state.setIsAddingMember(false)}
				/>
			)}
			{state.members.length === 0 ? (
				<FamilyEmptyState isAddingMember={state.isAddingMember} onStartAddMember={() => state.setIsAddingMember(true)} />
			) : (
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px" }}>
					{state.members.map((member) => (
						<FamilyMemberCard
							key={member.id}
							member={member}
							onToggleBalancePermission={state.handleToggleBalancePermission}
							onOpenBookingForMember={onOpenBookingForMember}
							onOpenBooking={onOpenBooking}
							onShowToast={onShowToast}
						/>
					))}
				</div>
			)}
		</div>
	);
};

export default FamilyTab;
