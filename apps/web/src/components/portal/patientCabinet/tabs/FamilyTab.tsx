/**
 * Family Tab (Domain: Portal Patient Cabinet)
 *
 * Family pool management & multi-member healthcare ledger:
 * - Shared family balance & loyalty bonus pool.
 * - Family member cards with clinical status, cards, and permissions.
 * - 1-click appointment booking for family members.
 * - Inline non-blocking member addition form (Autonomy Mandate 8e).
 * - Zero cartoon emojis, strictly Lucide icons.
 * - Strict <= 800 lines ceiling.
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	Users,
	UserPlus,
	CreditCard,
	Sparkles,
	Calendar,
	CheckCircle2,
	XCircle,
	ShieldCheck,
	Clock,
	Phone,
	User,
	Lock,
	Unlock,
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import type {
	PatientCabinetFamilyMember,
	PatientPersonalCabinetData,
} from "../patientCabinetEngine";
import { formatRubles } from "../patientCabinetEngine";
import { isDemoShowcaseMode, isDemoPatientId } from "../../../../lib/demoMode.js";

export interface FamilyTabProps {
	readonly data: PatientPersonalCabinetData;
	readonly onOpenBookingForMember?: ((member: PatientCabinetFamilyMember) => void) | undefined;
	readonly onOpenBooking?: (() => void) | undefined;
	readonly onShowToast?: ((message: string) => void) | undefined;
}

const RELATIONSHIP_OPTIONS: readonly string[] = [
	"Супруг(а)",
	"Сын",
	"Дочь",
	"Родитель",
	"Другой родственник",
];

const DEFAULT_FAMILY_MEMBERS: readonly PatientCabinetFamilyMember[] = [
	{
		id: "fam-member-spouse",
		fullName: "Воронова Екатерина Павловна",
		relationshipRu: "Супруг(а)",
		birthDate: "1987-03-22",
		phone: "+7 (999) 765-43-21",
		cardNumber: "043-8843",
		avatarInitials: "ЕВ",
		allowSpendFamilyBalance: true,
		allowBooking: true,
		nextAppointmentDateIso: "2026-09-12",
		nextAppointmentTimeRu: "14:00",
		nextAppointmentTitleRu: "Профессиональная гигиена и AirFlow",
		nextAppointmentDoctor: "Д-р Лебедева Е. М.",
	},
	{
		id: "fam-member-child",
		fullName: "Воронов Михаил Алексеевич",
		relationshipRu: "Сын",
		birthDate: "2016-08-10",
		cardNumber: "043-8844",
		avatarInitials: "МВ",
		allowSpendFamilyBalance: true,
		allowBooking: true,
		nextAppointmentDateIso: "2026-09-18",
		nextAppointmentTimeRu: "11:30",
		nextAppointmentTitleRu: "Детский профилактический осмотр",
		nextAppointmentDoctor: "Д-р Васильева Т. А.",
	},
];

export const FamilyTab: React.FC<FamilyTabProps> = ({
	data,
	onOpenBookingForMember,
	onOpenBooking,
	onShowToast,
}) => {
	const isDemo = isDemoShowcaseMode() || isDemoPatientId(data.patientId);

	const initialMembers = useMemo(() => {
		if (data.familyMembers && data.familyMembers.length > 0) {
			return data.familyMembers;
		}
		if (isDemo) {
			return DEFAULT_FAMILY_MEMBERS;
		}
		return [];
	}, [data.familyMembers, isDemo]);

	const [members, setMembers] = useState<readonly PatientCabinetFamilyMember[]>(initialMembers);
	const [isAddingMember, setIsAddingMember] = useState(false);

	// New member form fields
	const [newFullName, setNewFullName] = useState("");
	const [newRelationship, setNewRelationship] = useState(RELATIONSHIP_OPTIONS[0] || "Супруг(а)");
	const [newBirthDate, setNewBirthDate] = useState("");
	const [newPhone, setNewPhone] = useState("");
	const [newAllowSpend, setNewAllowSpend] = useState(true);
	const [newAllowBooking, setNewAllowBooking] = useState(true);

	const familyBalance = data.familyBalanceRub ?? (isDemo ? 84000 : 0);
	const familyBonusPool = data.familyBonusPool ?? (isDemo ? 18500 : 0);

	// Calculate age from birthDate
	const calculateAge = (birthDate?: string): number | null => {
		if (!birthDate) return null;
		try {
			const b = new Date(birthDate);
			const now = new Date();
			let age = now.getFullYear() - b.getFullYear();
			const m = now.getMonth() - b.getMonth();
			if (m < 0 || (m === 0 && now.getDate() < b.getDate())) {
				age--;
			}
			return age > 0 ? age : null;
		} catch {
			return null;
		}
	};

	// Toggle member balance permission
	const handleToggleBalancePermission = useCallback((memberId: string) => {
		setMembers((prev) =>
			prev.map((m) => {
				if (m.id === memberId) {
					const updated = !m.allowSpendFamilyBalance;
					onShowToast?.(
						updated
							? `Оплата с семейного баланса разрешена для: ${m.fullName}`
							: `Оплата с семейного баланса приостановлена для: ${m.fullName}`,
					);
					return { ...m, allowSpendFamilyBalance: updated };
				}
				return m;
			}),
		);
	}, [onShowToast]);

	// Handle adding new member (Non-blocking Mandate 8e)
	const handleAddMemberSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			const cleanName = newFullName.trim();
			if (!cleanName) {
				onShowToast?.("Пожалуйста, укажите ФИО члена семьи");
				return;
			}

			const initials = cleanName
				.split(" ")
				.filter(Boolean)
				.map((part) => part[0])
				.slice(0, 2)
				.join("")
				.toUpperCase();

			const newMember: PatientCabinetFamilyMember = {
				id: `fam-custom-${Date.now()}`,
				fullName: cleanName,
				relationshipRu: newRelationship,
				birthDate: newBirthDate || undefined,
				phone: newPhone.trim() || undefined,
				cardNumber: `043-${Math.floor(1000 + Math.random() * 9000)}`,
				avatarInitials: initials || "ФС",
				allowSpendFamilyBalance: newAllowSpend,
				allowBooking: newAllowBooking,
			};

			setMembers((prev) => [...prev, newMember]);
			setIsAddingMember(false);
			setNewFullName("");
			setNewBirthDate("");
			setNewPhone("");
			onShowToast?.(`Член семьи ${cleanName} успешно добавлен в семейный профиль`);
		},
		[newFullName, newRelationship, newBirthDate, newPhone, newAllowSpend, newAllowBooking, onShowToast],
	);

	return (
		<div className="pc-family-tab" data-testid="pc-family-tab" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
			{/* Shared Family Pool Summary Banner */}
			<div
				className="pc-family-summary-banner"
				style={{
					background: "linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(14, 165, 233, 0.04) 100%)",
					border: "1px solid rgba(2, 132, 199, 0.2)",
					borderRadius: "12px",
					padding: "16px 20px",
					display: "flex",
					flexDirection: "column",
					gap: "12px",
				}}
			>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<Users size={20} style={{ color: "var(--pc-primary, #0284c7)" }} />
						<strong style={{ fontSize: "1.0625rem", color: "var(--pc-text-main, #0f172a)" }}>
							Семейный депозит и бонусный пул
						</strong>
					</div>
					<span
						style={{
							fontSize: "0.8125rem",
							fontWeight: 600,
							color: "var(--pc-primary, #0284c7)",
							background: "rgba(2, 132, 199, 0.12)",
							padding: "3px 10px",
							borderRadius: "9999px",
						}}
					>
						{members.length} {members.length === 1 ? "родственник" : members.length < 5 ? "родственника" : "родственников"}
					</span>
				</div>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
						gap: "12px",
					}}
				>
					<div
						style={{
							background: "var(--pc-surface, #ffffff)",
							border: "1px solid var(--pc-border, #e2e8f0)",
							borderRadius: "8px",
							padding: "12px 14px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", color: "var(--pc-text-muted, #64748b)" }}>
							<CreditCard size={15} style={{ color: "#059669" }} />
							<span>Общий семейный счет</span>
						</div>
						<div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#059669", marginTop: "4px" }}>
							{formatRubles(familyBalance)}
						</div>
					</div>

					<div
						style={{
							background: "var(--pc-surface, #ffffff)",
							border: "1px solid var(--pc-border, #e2e8f0)",
							borderRadius: "8px",
							padding: "12px 14px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", color: "var(--pc-text-muted, #64748b)" }}>
							<Sparkles size={15} style={{ color: "#d97706" }} />
							<span>Семейный бонусный пул</span>
						</div>
						<div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#d97706", marginTop: "4px" }}>
							{familyBonusPool.toLocaleString("ru-RU")} бонусов
						</div>
					</div>
				</div>

				<p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--pc-text-muted, #64748b)", lineHeight: 1.4 }}>
					Авторизованные члены семьи могут списывать средства с общего баланса для оплаты стоматологических услуг и процедур в клинике DENTE.
				</p>
			</div>

			{/* Controls: Add Member Button */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
				<h3 style={{ margin: 0, fontSize: "1rem", color: "var(--pc-text-main, #0f172a)" }}>
					Состав семейного аккаунта
				</h3>

				<button
					type="button"
					className="pc-btn-primary"
					onClick={() => setIsAddingMember((prev) => !prev)}
					data-testid="btn-toggle-add-family-member"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
						padding: "6px 14px",
						borderRadius: "8px",
						fontSize: "0.8125rem",
						fontWeight: 600,
						cursor: "pointer",
					}}
				>
					<UserPlus size={15} />
					<span>{isAddingMember ? "Скрыть форму" : "Добавить члена семьи"}</span>
				</button>
			</div>

			{/* Inline Non-Blocking Add Member Form (Mandate 8e) */}
			{isAddingMember && (
				<form
					onSubmit={handleAddMemberSubmit}
					data-testid="form-add-family-member"
					style={{
						background: "var(--pc-surface, #ffffff)",
						border: "1px solid var(--pc-primary, #0284c7)",
						borderRadius: "10px",
						padding: "16px",
						display: "flex",
						flexDirection: "column",
						gap: "12px",
						boxShadow: "0 2px 10px rgba(2, 132, 199, 0.08)",
					}}
				>
					<strong style={{ fontSize: "0.9375rem", color: "var(--pc-text-main, #0f172a)" }}>
						Новый член семьи
					</strong>

					<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
						<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
							<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pc-text-main, #334155)" }}>
								ФИО родственника *
							</label>
							<input
								type="text"
								value={newFullName}
								onChange={(e) => setNewFullName(e.target.value)}
								placeholder="Фамилия Имя Отчество"
								required
								style={{
									padding: "7px 10px",
									fontSize: "0.8125rem",
									borderRadius: "6px",
									border: "1px solid var(--pc-border, #cbd5e1)",
									background: "var(--pc-surface, #ffffff)",
									color: "var(--pc-text-main, #0f172a)",
								}}
							/>
						</div>

						<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
							<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pc-text-main, #334155)" }}>
								Степень родства *
							</label>
							<select
								value={newRelationship}
								onChange={(e) => setNewRelationship(e.target.value)}
								style={{
									padding: "7px 10px",
									fontSize: "0.8125rem",
									borderRadius: "6px",
									border: "1px solid var(--pc-border, #cbd5e1)",
									background: "var(--pc-surface, #ffffff)",
									color: "var(--pc-text-main, #0f172a)",
								}}
							>
								{RELATIONSHIP_OPTIONS.map((rel) => (
									<option key={rel} value={rel}>{rel}</option>
								))}
							</select>
						</div>

						<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
							<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pc-text-muted, #64748b)" }}>
								Дата рождения
							</label>
							<input
								type="date"
								value={newBirthDate}
								onChange={(e) => setNewBirthDate(e.target.value)}
								style={{
									padding: "7px 10px",
									fontSize: "0.8125rem",
									borderRadius: "6px",
									border: "1px solid var(--pc-border, #cbd5e1)",
									background: "var(--pc-surface, #ffffff)",
									color: "var(--pc-text-main, #0f172a)",
								}}
							/>
						</div>

						<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
							<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pc-text-muted, #64748b)" }}>
								Телефон (для уведомлений)
							</label>
							<input
								type="tel"
								value={newPhone}
								onChange={(e) => setNewPhone(e.target.value)}
								placeholder="+7 (___) ___-__-__"
								style={{
									padding: "7px 10px",
									fontSize: "0.8125rem",
									borderRadius: "6px",
									border: "1px solid var(--pc-border, #cbd5e1)",
									background: "var(--pc-surface, #ffffff)",
									color: "var(--pc-text-main, #0f172a)",
								}}
							/>
						</div>
					</div>

					<div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "4px" }}>
						<label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", cursor: "pointer" }}>
							<input
								type="checkbox"
								checked={newAllowSpend}
								onChange={(e) => setNewAllowSpend(e.target.checked)}
							/>
							<span>Разрешить списание с общего баланса</span>
						</label>

						<label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", cursor: "pointer" }}>
							<input
								type="checkbox"
								checked={newAllowBooking}
								onChange={(e) => setNewAllowBooking(e.target.checked)}
							/>
							<span>Разрешить онлайн-запись</span>
						</label>
					</div>

					<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
						<button
							type="button"
							className="pc-btn-secondary"
							onClick={() => setIsAddingMember(false)}
							style={{ padding: "6px 14px", fontSize: "0.8125rem" }}
						>
							Отмена
						</button>
						<button
							type="submit"
							className="pc-btn-primary"
							style={{ padding: "6px 16px", fontSize: "0.8125rem", fontWeight: 600 }}
						>
							Добавить в семью
						</button>
					</div>
				</form>
			)}

			{/* Member Cards Grid or Honest Empty State */}
			{members.length === 0 ? (
				<div
					className="pc-family-empty-state"
					data-testid="pc-family-empty-state"
					style={{
						background: "var(--pc-surface, #ffffff)",
						border: "1px dashed var(--pc-border, #cbd5e1)",
						borderRadius: "12px",
						padding: "36px 20px",
						textAlign: "center",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "12px",
					}}
				>
					<Users size={36} style={{ color: "var(--pc-text-muted, #94a3b8)", opacity: 0.7 }} />
					<div style={{ maxWidth: "420px" }}>
						<strong style={{ fontSize: "0.9375rem", color: "var(--pc-text-main, #0f172a)", display: "block", marginBottom: "4px" }}>
							Семейный профиль пока не заполнен
						</strong>
						<span style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted, #64748b)" }}>
							Добавьте членов семьи для совместной записи к врачу и единого баланса
						</span>
					</div>
					{!isAddingMember && (
						<button
							type="button"
							onClick={() => setIsAddingMember(true)}
							className="pc-btn-primary"
							data-testid="btn-add-family-member-empty"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								padding: "8px 16px",
								fontSize: "0.8125rem",
								fontWeight: 600,
								borderRadius: "8px",
								cursor: "pointer",
								marginTop: "4px",
							}}
						>
							<UserPlus size={16} />
							<span>+ Добавить члена семьи</span>
						</button>
					)}
				</div>
			) : (
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px" }}>
					{members.map((member) => {
					const age = calculateAge(member.birthDate);
					return (
						<article
							key={member.id}
							className="pc-family-member-card"
							data-testid={`family-member-${member.id}`}
							style={{
								background: "var(--pc-surface, #ffffff)",
								border: "1px solid var(--pc-border, #e2e8f0)",
								borderRadius: "12px",
								padding: "16px",
								display: "flex",
								flexDirection: "column",
								gap: "12px",
								boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
							}}
						>
							{/* Member Header */}
							<div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
								<div
									style={{
										width: "44px",
										height: "44px",
										borderRadius: "50%",
										background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
										color: "#ffffff",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontSize: "0.9375rem",
										fontWeight: 700,
										flexShrink: 0,
									}}
								>
									{member.avatarInitials || "ФС"}
								</div>

								<div style={{ flex: 1, minWidth: 0 }}>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "6px" }}>
										<strong
											style={{
												fontSize: "0.9375rem",
												color: "var(--pc-text-main, #0f172a)",
												whiteSpace: "nowrap",
												overflow: "hidden",
												textOverflow: "ellipsis",
											}}
										>
											{member.fullName}
										</strong>
									</div>

									<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", color: "var(--pc-text-muted, #64748b)", marginTop: "2px" }}>
										<span style={{ fontWeight: 600, color: "var(--pc-primary, #0284c7)" }}>
											{member.relationshipRu}
										</span>
										{age !== null && <span>&bull; {age} лет</span>}
										{member.cardNumber && <span>&bull; № {member.cardNumber}</span>}
									</div>
								</div>
							</div>

							{/* Permissions & Balance Status */}
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									padding: "8px 12px",
									background: "var(--pc-bg-subtle, #f8fafc)",
									borderRadius: "8px",
									fontSize: "0.8125rem",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
									{member.allowSpendFamilyBalance ? (
										<Unlock size={14} style={{ color: "#059669" }} />
									) : (
										<Lock size={14} style={{ color: "#dc2626" }} />
									)}
									<span style={{ color: member.allowSpendFamilyBalance ? "var(--pc-text-main, #1e293b)" : "var(--pc-text-muted, #64748b)" }}>
										Оплата с общего счета
									</span>
								</div>

								<button
									type="button"
									onClick={() => handleToggleBalancePermission(member.id)}
									style={{
										border: "none",
										background: "none",
										color: member.allowSpendFamilyBalance ? "#059669" : "#dc2626",
										fontWeight: 600,
										fontSize: "0.75rem",
										cursor: "pointer",
										textDecoration: "underline",
									}}
								>
									{member.allowSpendFamilyBalance ? "Разрешено" : "Запрещено"}
								</button>
							</div>

							{/* Upcoming appointment if scheduled */}
							{member.nextAppointmentDateIso && (
								<div
									style={{
										display: "flex",
										alignItems: "flex-start",
										gap: "8px",
										padding: "8px 12px",
										background: "rgba(2, 132, 199, 0.05)",
										border: "1px solid rgba(2, 132, 199, 0.15)",
										borderRadius: "8px",
										fontSize: "0.8125rem",
									}}
								>
									<Calendar size={14} style={{ color: "var(--pc-primary, #0284c7)", flexShrink: 0, marginTop: "2px" }} />
									<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
										<span style={{ fontWeight: 600, color: "var(--pc-text-main, #0f172a)" }}>
											{member.nextAppointmentDateIso} в {member.nextAppointmentTimeRu || "12:00"}
										</span>
										<span style={{ color: "var(--pc-text-muted, #64748b)" }}>
											{member.nextAppointmentTitleRu} ({member.nextAppointmentDoctor || "Врач клиники"})
										</span>
									</div>
								</div>
							)}

							{/* Action: Book for Member */}
							<div style={{ marginTop: "auto", paddingTop: "4px" }}>
								<button
									type="button"
									className="pc-btn-secondary"
									onClick={() => {
										if (onOpenBookingForMember) {
											onOpenBookingForMember(member);
										} else if (onOpenBooking) {
											onOpenBooking();
										}
										onShowToast?.(`Запись на приём для: ${member.fullName}`);
									}}
									data-testid={`btn-book-for-${member.id}`}
									style={{
										width: "100%",
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "6px",
										padding: "7px 12px",
										borderRadius: "6px",
										fontSize: "0.8125rem",
										fontWeight: 600,
										cursor: "pointer",
									}}
								>
									<Calendar size={14} />
									<span>Записать к врачу</span>
								</button>
							</div>
						</article>
					);
				})}
			</div>
			)}
		</div>
	);
};

export default FamilyTab;
