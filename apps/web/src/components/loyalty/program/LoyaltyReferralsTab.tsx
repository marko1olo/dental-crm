import type React from "react";
import { CheckCircle2, Sparkles, UserPlus, Users } from "lucide-react";
import type { PatientReferralRecord } from "./loyaltyEngine";
import {
	REFERRAL_PROGRAM_PRESETS,
	type ReferralRewardPreset,
} from "./loyaltyPresets";

export interface LoyaltyReferralsTabProps {
	readonly referrals: readonly PatientReferralRecord[];
	readonly selectedReferralPreset: ReferralRewardPreset;
	readonly onSelectReferralPreset: (preset: ReferralRewardPreset) => void;
	readonly newReferralName: string;
	readonly onNewReferralNameChange: (name: string) => void;
	readonly newReferralPhone: string;
	readonly onNewReferralPhoneChange: (phone: string) => void;
	readonly newReferralNote: string;
	readonly onNewReferralNoteChange: (note: string) => void;
	readonly onAddReferral: () => void;
	readonly onCreditReferral: (referralId: string) => void;
}

export const LoyaltyReferralsTab: React.FC<LoyaltyReferralsTabProps> = ({
	referrals,
	selectedReferralPreset,
	onSelectReferralPreset,
	newReferralName,
	onNewReferralNameChange,
	newReferralPhone,
	onNewReferralPhoneChange,
	newReferralNote,
	onNewReferralNoteChange,
	onAddReferral,
	onCreditReferral,
}) => {
	const minSpendRub = Math.round(
		((selectedReferralPreset.minFriendSpendKop ??
			selectedReferralPreset.minInvoiceSpendKop) ??
			250000) / 100,
	);

	const totalRewardedCount = referrals.filter((r) => r.isRewardCredited).length;
	const totalRewardedRub = totalRewardedCount * selectedReferralPreset.referrerRewardRub;

	return (
		<div>
			{/* Referral Program Preset Selector */}
			<div
				style={{
					display: "flex",
					gap: "8px",
					flexWrap: "wrap",
					marginBottom: "1rem",
				}}
			>
				{REFERRAL_PROGRAM_PRESETS.map((preset) => {
					const isSelected = selectedReferralPreset.id === preset.id;
					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => onSelectReferralPreset(preset)}
							style={{
								padding: "0.5rem 0.875rem",
								borderRadius: "0.5rem",
								border: isSelected ? "2px solid var(--teal)" : "1px solid var(--line)",
								background: isSelected ? "rgba(13, 148, 136, 0.1)" : "var(--paper)",
								color: isSelected ? "var(--teal)" : "var(--ink)",
								fontWeight: isSelected ? 700 : 500,
								fontSize: "0.8125rem",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "0.375rem",
							}}
						>
							<Sparkles size={13} color="var(--teal)" />
							<span>{preset.titleRu}</span>
						</button>
					);
				})}
			</div>

			{/* Referral Program Hero Banner */}
			<div className="loyalty-referral-banner">
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
							marginBottom: "0.5rem",
						}}
					>
						<Sparkles size={14} />
						Программа рекомендаций без корпоративных пирамид
					</div>
					<h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>
						{selectedReferralPreset.titleRu}
					</h3>
					<p style={{ fontSize: "0.8125rem", opacity: 0.95, margin: 0, lineHeight: 1.5 }}>
						{selectedReferralPreset.descriptionRu} (порог первого визита:{" "}
						{minSpendRub.toLocaleString("ru-RU")} ₽)
					</p>
				</div>
				<div style={{ textAlign: "right" }}>
					<div style={{ fontSize: "0.8125rem", opacity: 0.9 }}>Зарегистрировано</div>
					<div style={{ fontSize: "2rem", fontWeight: 800 }}>{referrals.length} чел.</div>
					<div style={{ fontSize: "0.75rem", opacity: 0.9 }}>
						Начислено: {totalRewardedRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>
			</div>

			{/* Referral Registration Form */}
			<h4 className="loyalty-section-title">
				<UserPlus size={20} color="var(--teal)" />
				Регистрация новой рекомендации
			</h4>

			<div
				style={{
					background: "var(--paper-soft)",
					border: "1px solid var(--line)",
					borderRadius: "0.5rem",
					padding: "1rem",
					marginBottom: "1.5rem",
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
					gap: "0.75rem",
					alignItems: "flex-end",
				}}
			>
				<div>
					<label
						style={{
							display: "block",
							fontSize: "0.8125rem",
							fontWeight: 600,
							color: "var(--muted)",
							marginBottom: "0.25rem",
						}}
					>
						ФИО приглашенного друга / родственника *
					</label>
					<input
						type="text"
						placeholder="Например: Смирнов Алексей"
						value={newReferralName}
						onChange={(e) => onNewReferralNameChange(e.target.value)}
						data-testid="referral-name-input"
						style={{
							width: "100%",
							padding: "0.5rem 0.75rem",
							borderRadius: "0.5rem",
							border: "1px solid var(--line)",
							fontSize: "0.875rem",
							background: "var(--paper)",
							color: "var(--ink)",
						}}
					/>
				</div>

				<div>
					<label
						style={{
							display: "block",
							fontSize: "0.8125rem",
							fontWeight: 600,
							color: "var(--muted)",
							marginBottom: "0.25rem",
						}}
					>
						Телефон (для сопоставления)
					</label>
					<input
						type="tel"
						placeholder="+7 (999) 000-00-00"
						value={newReferralPhone}
						onChange={(e) => onNewReferralPhoneChange(e.target.value)}
						data-testid="referral-phone-input"
						style={{
							width: "100%",
							padding: "0.5rem 0.75rem",
							borderRadius: "0.5rem",
							border: "1px solid var(--line)",
							fontSize: "0.875rem",
							background: "var(--paper)",
							color: "var(--ink)",
						}}
					/>
				</div>

				<div>
					<label
						style={{
							display: "block",
							fontSize: "0.8125rem",
							fontWeight: 600,
							color: "var(--muted)",
							marginBottom: "0.25rem",
						}}
					>
						Заметка / Причина обращения
					</label>
					<input
						type="text"
						placeholder="Например: Профгигиена / острая боль"
						value={newReferralNote}
						onChange={(e) => onNewReferralNoteChange(e.target.value)}
						data-testid="referral-note-input"
						style={{
							width: "100%",
							padding: "0.5rem 0.75rem",
							borderRadius: "0.5rem",
							border: "1px solid var(--line)",
							fontSize: "0.875rem",
							background: "var(--paper)",
							color: "var(--ink)",
						}}
					/>
				</div>

				<div>
					<button
						type="button"
						onClick={onAddReferral}
						data-testid="add-referral-btn"
						style={{
							width: "100%",
							padding: "0.5rem 1rem",
							minHeight: "40px",
							borderRadius: "0.5rem",
							border: "none",
							background: "var(--teal)",
							color: "var(--on-teal, var(--paper))",
							fontWeight: 700,
							fontSize: "0.875rem",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "0.375rem",
						}}
					>
						<UserPlus size={16} />
						Зафиксировать рекомендацию
					</button>
				</div>
			</div>

			{/* Referrals List */}
			<h4 className="loyalty-section-title">
				<Users size={20} color="var(--teal)" />
				Список рекомендаций пациента ({referrals.length})
			</h4>

			{referrals.length === 0 ? (
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
					<div style={{ fontWeight: 600, color: "var(--ink)" }}>
						Рекомендации пока не зарегистрированы
					</div>
					<p style={{ fontSize: "0.8125rem", marginTop: "4px" }}>
						Зарегистрируйте первого приглашенного пациента через форму выше. При первом визите и
						чеке от 2 500 ₽ вы сможете начислить рекомендателю 500 ₽ бонусов в 1 клик.
					</p>
				</div>
			) : (
				<div className="loyalty-referral-grid">
					{referrals.map((ref) => (
						<div
							key={ref.id}
							className="loyalty-referral-card"
							data-testid={`referral-card-${ref.id}`}
						>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "flex-start",
								}}
							>
								<div>
									<span
										className={`loyalty-referral-status-badge ${
											ref.isRewardCredited ? "credited" : "registered"
										}`}
									>
										{ref.isRewardCredited ? "Бонус начислен (500 ₽)" : "Зарегистрирован"}
									</span>
									<h5
										style={{
											fontSize: "0.9375rem",
											fontWeight: 700,
											marginTop: "0.375rem",
											color: "var(--ink)",
										}}
									>
										{ref.invitedPatientName}
									</h5>
									{ref.invitedPatientPhone && (
										<div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
											тел. {ref.invitedPatientPhone}
										</div>
									)}
								</div>
							</div>

							<div
								style={{
									fontSize: "0.8125rem",
									color: "var(--muted)",
									marginTop: "0.5rem",
								}}
							>
								{ref.noteRu || "Рекомендация пациента"}
							</div>

							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									borderTop: "1px solid var(--line)",
									paddingTop: "0.625rem",
									marginTop: "0.75rem",
								}}
							>
								<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
									Вознаграждение:
								</span>
								{ref.isRewardCredited ? (
									<span
										style={{
											fontSize: "0.75rem",
											fontWeight: 700,
											color: "var(--ok-fg)",
											display: "inline-flex",
											alignItems: "center",
											gap: "0.25rem",
										}}
									>
										<CheckCircle2 size={14} />
										+500 ₽ зачислено
									</span>
								) : (
									<button
										type="button"
										onClick={() => onCreditReferral(ref.id)}
										data-testid={`credit-referral-btn-${ref.id}`}
										style={{
											padding: "0.375rem 0.75rem",
											minHeight: "36px",
											borderRadius: "0.375rem",
											border: "none",
											background: "var(--teal)",
											color: "var(--on-teal, var(--paper))",
											fontSize: "0.75rem",
											fontWeight: 700,
											cursor: "pointer",
											display: "inline-flex",
											alignItems: "center",
											gap: "0.25rem",
										}}
									>
										<Sparkles size={13} />
										Начислить 500 ₽ бонусов
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
