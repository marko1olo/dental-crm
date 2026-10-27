import type React from "react";
import { useState } from "react";
import { staffRoleTitle } from "../settingsInviteRoles";
import type { StaffCredentialKind } from "../staffMutationRequest";
import { StaffMemberCardActions } from "./StaffMemberCardActions";
import { StaffMemberCredentialsForm } from "./StaffMemberCredentialsForm";

interface StaffMemberCardProps {
	// biome-ignore lint/suspicious/noExplicitAny: staff row
	member: any;
	onOpenProfile: (member: any) => void;
	onUpdatePhone: (staffId: string, phone: string) => Promise<void>;
	onUpdateCredential: (staffId: string, kind: StaffCredentialKind, value: string) => Promise<void>;
	loading: boolean;
}

export const StaffMemberCard: React.FC<StaffMemberCardProps> = ({
	member,
	onOpenProfile,
	onUpdatePhone,
	onUpdateCredential,
	loading,
}) => {
	const [editMode, setEditMode] = useState<"phone" | "pin" | "password" | null>(null);
	const [draft, setDraft] = useState("");

	const handleStartEdit = (mode: "phone" | "pin" | "password", initial = "") => {
		setEditMode(mode);
		setDraft(initial);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editMode) return;
		if (editMode === "phone") {
			await onUpdatePhone(member.id, draft);
		} else {
			await onUpdateCredential(member.id, editMode, draft);
		}
		setEditMode(null);
		setDraft("");
	};

	return (
		<div className="border border-[var(--line)] bg-[var(--paper-card)] rounded-xl p-3.5 flex flex-col gap-3 shadow-xs">
			<div className="flex items-center gap-3">
				<div
					className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white shrink-0"
					style={{ backgroundColor: member.color || "var(--accent, #3b82f6)" }}
				>
					{member.fullName ? member.fullName.charAt(0) : "S"}
				</div>
				<div className="min-w-0 flex-1">
					<h5 className="m-0 text-sm font-semibold text-[var(--ink)] break-words leading-snug truncate">
						{member.fullName}
					</h5>
					<span className="text-xs text-[var(--muted)] block">{staffRoleTitle(String(member.role ?? ""))}</span>
					{member.phone ? (
						<a className="block text-xs text-[var(--ink)] hover:text-[var(--teal)]" href={`tel:${String(member.phone).replace(/[^\d+]/g, "")}`}>
							{member.phone}
						</a>
					) : (
						<span className="block text-xs text-[var(--muted)]">телефон не указан</span>
					)}
				</div>
			</div>
			<div className="pt-2.5 border-t border-[var(--line-subtle)]">
				{editMode ? (
					<StaffMemberCredentialsForm
						mode={editMode}
						draftValue={draft}
						onChangeDraft={setDraft}
						onSubmit={handleSubmit}
						onCancel={() => setEditMode(null)}
						loading={loading}
						fullName={member.fullName}
					/>
				) : (
					<StaffMemberCardActions
						member={member}
						onOpenProfile={onOpenProfile}
						onStartEdit={handleStartEdit}
					/>
				)}
			</div>
		</div>
	);
};

export default StaffMemberCard;
