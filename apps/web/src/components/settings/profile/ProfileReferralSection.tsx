import { Copy, Gift } from "lucide-react";
import { showToast } from "../../GlobalToast";
import type { UserProfile } from "./useProfileSettingsLogic";

export function ProfileReferralSection({
	profile,
	dashboard,
}: {
	profile: UserProfile | null;
	dashboard: any;
}) {
	return (
		<section className="profile-section-card animate-fade-in">
			<div className="profile-section-header">
				<div
					className="profile-section-icon"
					style={{
						background: "rgba(245, 158, 11, 0.1)",
						color: "rgb(245, 158, 11)",
					}}
				>
					<Gift size={24} />
				</div>
				<div className="profile-section-title">
					<h3>Бонусы и Ссылка</h3>
					<p>Ваша персональная реферальная ссылка и баланс</p>
				</div>
			</div>

			<div className="profile-form-grid">
				<div className="profile-form-group full-width">
					<label>Ваша персональная онлайн-запись (виджет)</label>
					<div className="profile-input-with-toggle">
						<input
							type="text"
							readOnly
							value={`https://${dashboard?.clinicSettings?.profile?.slug || "app"}.dente.clinic/book/${profile?.id?.substring(0, 8) || "00000000"}`}
							style={{
								background: "var(--paper-2)",
								color: "var(--ink)",
								fontWeight: 500,
							}}
						/>
						<button
							type="button"
							onClick={(e) => {
								navigator.clipboard.writeText(
									`https://${dashboard?.clinicSettings?.profile?.slug || "app"}.dente.clinic/book/${profile?.id?.substring(0, 8) || "00000000"}`,
								);
								showToast("Ссылка онлайн-записи скопирована", "success");
								const target = e.currentTarget;
								const originalHtml = target.innerHTML;
								target.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle-2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`;
								setTimeout(() => {
									target.innerHTML = originalHtml;
								}, 2000);
							}}
							className="profile-input-toggle-btn"
							aria-label="Скопировать ссылку"
							title="Скопировать ссылку"
						>
							<Copy size={16} />
						</button>
					</div>
				</div>
				<div className="profile-form-group">
					<label>Пациентов по вашей ссылке</label>
					<input
						type="text"
						value={dashboard?.myReferralsCount || "0"}
						disabled
						style={{ fontWeight: 600, color: "var(--slate-700)" }}
					/>
				</div>
				<div className="profile-form-group">
					<label>Баланс бонусов</label>
					<input
						type="text"
						value="0 ₽"
						disabled
						style={{ fontWeight: 600, color: "var(--brand-600)" }}
					/>
				</div>
			</div>
			<p className="profile-form-hint">
				Делитесь ссылкой с пациентами. За каждого пациента, прошедшего
				первичный приём, вам начисляются бонусы.
			</p>
		</section>
	);
}
