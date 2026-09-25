import type React from "react";
import { Coins, CreditCard, Plus, Users } from "lucide-react";
import type { FamilyMember, FamilyPoolResult } from "./loyaltyEngine";

export interface LoyaltyFamilyTabProps {
	readonly familyPool: FamilyPoolResult;
	readonly familyMembers: readonly FamilyMember[];
	readonly isFamilyModeActive: boolean;
	readonly onToggleFamilyMode: () => void;
	readonly onCreditFamilyBalance: (amountRub: number) => void;
	readonly onSelectMemberForPayment: (memberId: string) => void;
	readonly onToggleMemberPermission: (memberId: string) => void;
	readonly newMemberName: string;
	readonly onNewMemberNameChange: (name: string) => void;
	readonly newMemberRole: FamilyMember["roleRu"];
	readonly onNewMemberRoleChange: (role: FamilyMember["roleRu"]) => void;
	readonly onAddFamilyMember: () => void;
}

export const LoyaltyFamilyTab: React.FC<LoyaltyFamilyTabProps> = ({
	familyPool,
	familyMembers,
	isFamilyModeActive,
	onToggleFamilyMode,
	onCreditFamilyBalance,
	onSelectMemberForPayment,
	onToggleMemberPermission,
	newMemberName,
	onNewMemberNameChange,
	newMemberRole,
	onNewMemberRoleChange,
	onAddFamilyMember,
}) => {
	return (
		<div>
			<div
				style={{
					background: "linear-gradient(135deg, var(--ok-fg) 0%, var(--teal) 100%)",
					color: "var(--on-teal, var(--paper))",
					borderRadius: "1rem",
					padding: "1.5rem",
					marginBottom: "1.5rem",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<div>
					<div
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "0.375rem",
							background: "rgba(255, 255, 255, 0.2)",
							padding: "0.25rem 0.625rem",
							borderRadius: "9999px",
							fontSize: "0.75rem",
							fontWeight: 700,
						}}
					>
						<Users size={14} />
						{familyPool.effectiveTier.badgeLabelRu}
					</div>
					<h3 style={{ fontSize: "1.375rem", fontWeight: 700, marginTop: "0.375rem" }}>
						{familyPool.familyName}
					</h3>
					<p style={{ fontSize: "0.8125rem", opacity: 0.9 }}>
						Единый счет: повышенный кэшбэк {familyPool.effectiveTier.cashbackPercent}% за
						визиты всех членов семьи.
					</p>
				</div>
				<div style={{ textAlign: "right" }}>
					<div style={{ fontSize: "0.8125rem", opacity: 0.9 }}>Общий баланс семьи</div>
					<div style={{ fontSize: "2.25rem", fontWeight: 800 }}>
						{familyPool.totalPooledPoints.toLocaleString("ru-RU")} ₽
					</div>
					<button
						type="button"
						onClick={onToggleFamilyMode}
						style={{
							marginTop: "0.5rem",
							padding: "0.375rem 0.875rem",
							minHeight: "44px",
							borderRadius: "0.5rem",
							border: "1px solid var(--on-teal, var(--paper))",
							background: isFamilyModeActive ? "var(--on-teal, var(--paper))" : "transparent",
							color: isFamilyModeActive
								? "var(--ok-fg, var(--teal))"
								: "var(--on-teal, var(--paper))",
							fontSize: "0.8125rem",
							fontWeight: 700,
							cursor: "pointer",
						}}
					>
						{isFamilyModeActive ? "Семейный режим включен" : "Включить семейный счет"}
					</button>
				</div>
			</div>

			{/* Пополнение общего семейного кошелька */}
			<div
				style={{
					background: "var(--paper-soft)",
					border: "1px solid var(--line)",
					borderRadius: "0.75rem",
					padding: "1rem",
					marginBottom: "1.5rem",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "0.75rem",
				}}
			>
				<div>
					<div
						style={{
							fontWeight: 700,
							fontSize: "0.875rem",
							color: "var(--ink)",
							display: "flex",
							alignItems: "center",
							gap: "0.375rem",
						}}
					>
						<Coins size={16} color="var(--teal)" />
						Пополнение общего семейного кошелька:
					</div>
					<p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", color: "var(--muted)" }}>
						Единый кошелек: родители пополняют баланс, дети и супруг оплачивают приёмы без
						комиссий и ручных переводов
					</p>
				</div>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
						flexWrap: "wrap",
					}}
				>
					{[1000, 3000, 5000, 10000].map((amt) => (
						<button
							key={amt}
							type="button"
							onClick={() => onCreditFamilyBalance(amt)}
							style={{
								padding: "0.375rem 0.625rem",
								minHeight: "36px",
								borderRadius: "0.375rem",
								border: "1px solid var(--line)",
								background: "var(--paper)",
								color: "var(--ink)",
								fontSize: "0.75rem",
								fontWeight: 600,
								cursor: "pointer",
							}}
						>
							+{amt.toLocaleString("ru-RU")} ₽
						</button>
					))}
				</div>
			</div>

			{/* Family Members Grid */}
			<h4 className="loyalty-section-title">
				<Users size={20} color="var(--teal)" />
				Члены семьи и права списания баллов
			</h4>

			{familyMembers.length === 0 ? (
				<div
					style={{
						border: "2px dashed var(--line)",
						borderRadius: "0.875rem",
						padding: "2rem",
						textAlign: "center",
						color: "var(--muted)",
						background: "var(--paper-soft)",
					}}
				>
					<Users size={36} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
					<div style={{ fontWeight: 600, color: "var(--ink)" }}>Члены семьи не добавлены</div>
					<p style={{ fontSize: "0.8125rem", marginTop: "4px" }}>
						Добавьте родственников через форму ниже для объединения бонусного счета семьи.
					</p>
				</div>
			) : (
				<div className="loyalty-family-grid">
					{familyMembers.map((member) => (
						<div key={member.patientId} className="loyalty-family-member-card">
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "flex-start",
								}}
							>
								<div>
									<span className="loyalty-member-role-badge">{member.roleRu}</span>
									<h5
										style={{
											fontSize: "0.9375rem",
											fontWeight: 700,
											marginTop: "0.25rem",
											color: "var(--ink)",
										}}
									>
										{member.fullName}
									</h5>
								</div>
							</div>

							<div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
								Личные траты: {(member.lifetimeSpentKop / 100).toLocaleString("ru-RU")} ₽
								<br />
								Накоплено баллов: {member.individualPointsBalance} ₽
							</div>

							<button
								type="button"
								onClick={() => onSelectMemberForPayment(member.patientId)}
								style={{
									marginTop: "0.5rem",
									marginBottom: "0.5rem",
									width: "100%",
									padding: "0.375rem 0.5rem",
									minHeight: "36px",
									borderRadius: "0.375rem",
									border: "1px solid var(--teal)",
									background: "transparent",
									color: "var(--teal)",
									fontSize: "0.75rem",
									fontWeight: 700,
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: "0.25rem",
								}}
							>
								<CreditCard size={14} />
								Оплатить лечение из семейного счета
							</button>

							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									borderTop: "1px solid var(--line)",
									paddingTop: "0.5rem",
									marginTop: "auto",
								}}
							>
								<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
									Списание бонусов:
								</span>
								<button
									type="button"
									onClick={() => onToggleMemberPermission(member.patientId)}
									style={{
										fontSize: "0.75rem",
										fontWeight: 700,
										minHeight: "44px",
										padding: "0.25rem 0.625rem",
										borderRadius: "0.375rem",
										border: "none",
										cursor: "pointer",
										background: member.isBonusSpendingAllowed
											? "rgba(16, 185, 129, 0.15)"
											: "rgba(239, 68, 68, 0.15)",
										color: member.isBonusSpendingAllowed ? "var(--ok-fg)" : "var(--bad-fg)",
									}}
								>
									{member.isBonusSpendingAllowed ? "Разрешено" : "Заблокировано"}
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Add Member Form */}
			<div
				style={{
					background: "var(--paper-soft)",
					border: "1px solid var(--line)",
					borderRadius: "0.5rem",
					padding: "0.75rem 1rem",
					marginTop: "1rem",
					display: "flex",
					gap: "0.75rem",
					alignItems: "flex-end",
					flexWrap: "wrap",
				}}
			>
				<div style={{ flex: 2, minWidth: "200px" }}>
					<label
						style={{
							display: "block",
							fontSize: "0.8125rem",
							fontWeight: 600,
							color: "var(--muted)",
							marginBottom: "0.25rem",
						}}
					>
						ФИО родственника
					</label>
					<input
						type="text"
						placeholder="Например: Воронова Анна Михайловна"
						value={newMemberName}
						onChange={(e) => onNewMemberNameChange(e.target.value)}
						style={{
							width: "100%",
							padding: "0.5rem 0.75rem",
							borderRadius: "0.5rem",
							border: "1px solid var(--line)",
							fontSize: "0.875rem",
						}}
					/>
				</div>

				<div style={{ flex: 1, minWidth: "160px" }}>
					<label
						style={{
							display: "block",
							fontSize: "0.8125rem",
							fontWeight: 600,
							color: "var(--muted)",
							marginBottom: "0.25rem",
						}}
					>
						Роль в семье
					</label>
					<select
						value={newMemberRole}
						onChange={(e) =>
							onNewMemberRoleChange(e.target.value as FamilyMember["roleRu"])
						}
						style={{
							width: "100%",
							padding: "0.5rem 0.75rem",
							borderRadius: "0.5rem",
							border: "1px solid var(--line)",
							fontSize: "0.875rem",
							background: "var(--paper)",
						}}
					>
						<option value="Супруг / Супруга">Супруг / Супруга</option>
						<option value="Ребенок">Ребенок</option>
						<option value="Родитель">Родитель</option>
						<option value="Родственник">Родственник</option>
					</select>
				</div>

				<button
					type="button"
					onClick={onAddFamilyMember}
					style={{
						padding: "0.5rem 1.25rem",
						minHeight: "44px",
						borderRadius: "0.5rem",
						border: "none",
						background: "var(--teal)",
						color: "var(--on-teal, var(--paper))",
						fontWeight: 700,
						fontSize: "0.875rem",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "0.375rem",
					}}
				>
					<Plus size={16} />
					Добавить в семейный пул
				</button>
			</div>
		</div>
	);
};
