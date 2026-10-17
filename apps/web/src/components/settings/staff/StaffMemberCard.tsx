import React, { useState } from "react";
import { KeyRound, MoreVertical, Phone, ShieldCheck, UserPlus } from "lucide-react";
import { staffRoleTitle } from "../settingsInviteRoles";
import { StaffMemberCredentialsForm } from "./StaffMemberCredentialsForm";
import type { StaffCredentialKind } from "../staffMutationRequest";

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
	const [menuOpen, setMenuOpen] = useState(false);

	const handleStartEdit = (mode: "phone" | "pin" | "password", initial = "") => {
		setEditMode(mode);
		setDraft(initial);
		setMenuOpen(false);
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
					<div className="flex items-center gap-2">
						<button
							type="button"
							className="flex-1 h-8 px-2.5 rounded-lg border border-[var(--teal)]/40 bg-[var(--teal-soft)] text-[var(--teal)] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
							onClick={() => onOpenProfile(member)}
						>
							<UserPlus size={14} /> Карточка
						</button>
						<button
							type="button"
							className="flex-1 h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
							onClick={() => handleStartEdit("phone", member.phone || "")}
						>
							<Phone size={14} /> Телефон
						</button>
						<div className="relative">
							<button
								type="button"
								className="w-8 h-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] flex items-center justify-center cursor-pointer"
								onClick={() => setMenuOpen(!menuOpen)}
								aria-label="Меню доступов"
							>
								<MoreVertical size={14} />
							</button>
							{menuOpen && (
								<div className="absolute right-0 bottom-full mb-1 w-32 py-1 bg-[var(--paper-card)] rounded-xl shadow-lg border border-[var(--line)] z-10 flex flex-col text-xs">
									<button type="button" className="px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--paper-soft)] cursor-pointer" onClick={() => handleStartEdit("pin")}>
										<KeyRound size={13} /> <span>PIN-код</span>
									</button>
									<button type="button" className="px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--paper-soft)] cursor-pointer" onClick={() => handleStartEdit("password")}>
										<ShieldCheck size={13} /> <span>Пароль</span>
									</button>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
