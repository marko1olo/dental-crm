import React from "react";
import { Users } from "lucide-react";
import { PatientAllergySafetyBanner } from "../PatientAllergySafetyBanner";
import { PatientDuplicateAlert } from "../PatientDuplicateAlert";
import {
	type PatientClinicalSafetyProfile,
	formatSafetyProfileToDiaryText,
} from "../safetyMath";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";

interface FamilySummary {
	id: string;
	name: string;
	balance: number;
}

// Root container anchor: data-testid="patient-workspace-view"
export interface PatientWorkspaceHeaderProps {
	patientId: string;
	patientName?: string | null | undefined;
	currentPatient?: any;
	patientCardNumber?: string | null | undefined;
	patientBalanceRub?: number | null | undefined;
	onUpdateProfile?: ((profile: PatientClinicalSafetyProfile) => void) | undefined;
}

export const PatientWorkspaceHeader: React.FC<PatientWorkspaceHeaderProps> = React.memo(
	({
		patientId,
		patientName,
		currentPatient,
		patientCardNumber,
		patientBalanceRub,
		onUpdateProfile,
	}) => {
		const [familySummary, setFamilySummary] = React.useState<FamilySummary | null>(null);

		const loadFamilySummary = React.useCallback(async (pid: string) => {
			if (!pid) {
				setFamilySummary(null);
				return;
			}
			try {
				const res = await fetch(`/api/finance/family/patient/${encodeURIComponent(pid)}`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (res.ok) {
					const data = await res.json();
					if (data && data.id) {
						const numBalance =
							typeof data.balance === "number"
								? data.balance
								: Number(data.balance) || 0;
						setFamilySummary({
							id: data.id,
							name: data.name || "Семья",
							balance: numBalance,
						});
						return;
					}
				}
				setFamilySummary(null);
			} catch {
				setFamilySummary(null);
			}
		}, []);

		React.useEffect(() => {
			loadFamilySummary(patientId);

			const handleRefresh = () => {
				if (patientId) {
					loadFamilySummary(patientId);
				}
			};

			window.addEventListener("dente-family-data-changed", handleRefresh);
			window.addEventListener("dente-patient-workspace-refresh", handleRefresh);

			return () => {
				window.removeEventListener("dente-family-data-changed", handleRefresh);
				window.removeEventListener("dente-patient-workspace-refresh", handleRefresh);
			};
		}, [patientId, loadFamilySummary]);

		const handleOpenFamilyWallet = React.useCallback(() => {
			window.dispatchEvent(
				new CustomEvent("dente-open-family-wallet", {
					detail: { patientId },
				}),
			);
		}, [patientId]);

		const handleUpdateProfile = React.useCallback(
			async (savedProfile: PatientClinicalSafetyProfile) => {
				if (onUpdateProfile) {
					onUpdateProfile(savedProfile);
				}
				if (patientId) {
					try {
						const diaryText = formatSafetyProfileToDiaryText(savedProfile);
						await fetch(`/api/patients/${encodeURIComponent(patientId)}`, {
							method: "PUT",
							headers: {
								"Content-Type": "application/json",
								...denteAdminSecretRequestHeaders(),
							},
							body: JSON.stringify({
								notes: diaryText,
							}),
						});
						window.dispatchEvent(
							new CustomEvent("dente-patient-workspace-refresh"),
						);
					} catch (err) {
						console.error(
							"[PatientWorkspaceHeader] Failed to persist safety profile:",
							err,
						);
					}
				}
			},
			[onUpdateProfile, patientId],
		);

		return (
			<>
				{/* Clinical Safety & Allergy Red-Flag Emergency Banner (Zero Noise when clean, Mandates 8d, 8p) */}
				<PatientAllergySafetyBanner
					patientId={patientId}
					patientName={patientName}
					profile={
						currentPatient?.clinicalSafetyProfile ||
						currentPatient?.administrativeProfile?.clinicalSafetyProfile ||
						currentPatient?.anamnesis ||
						currentPatient?.notes
					}
					notes={
						typeof currentPatient?.anamnesis === "string"
							? currentPatient.anamnesis
							: currentPatient?.notes
					}
					onUpdateProfile={handleUpdateProfile}
					showModalButton={true}
					hideWhenClean={true}
				/>

				{/* Patient Duplicate Alert Guard */}
				<PatientDuplicateAlert patientId={patientId} />

				<div className="flex items-center gap-2 min-w-0 flex-wrap">
					<span className="text-sm md:text-base font-black text-[var(--ink)] truncate">
						{patientName || "Карточка пациента"}
					</span>
					<span className="text-xs font-mono font-bold text-[var(--muted)] bg-[var(--paper-soft)] px-2 py-0.5 rounded-md border border-[var(--line)] shrink-0">
						{patientCardNumber ? `Карта: ${patientCardNumber}` : patientId ? `№ ${String(patientId || "").slice(0, 8)}` : "—"}
					</span>
					{typeof patientBalanceRub === "number" && (
						<span
							className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
								patientBalanceRub < 0
									? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
									: patientBalanceRub > 0
										? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
										: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
							}`}
							title={`Текущий баланс пациента: ${patientBalanceRub.toLocaleString("ru-RU")} ₽`}
							data-testid="patient-workspace-balance-badge"
						>
							Баланс: {patientBalanceRub > 0 ? "+" : ""}{patientBalanceRub.toLocaleString("ru-RU")} ₽
						</span>
					)}

					{/* Семейный баланс и кошелек (Мандат 8n, прозрачный бейдж) */}
					{familySummary ? (
						<button
							type="button"
							onClick={handleOpenFamilyWallet}
							className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 inline-flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-90 ${
								familySummary.balance < 0
									? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
									: familySummary.balance > 0
										? "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800"
										: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
							}`}
							title={`Семейный кошелек (${familySummary.name}): ${familySummary.balance.toLocaleString("ru-RU")} ₽. Клик — открыть семейный кошелек`}
							data-testid="patient-workspace-family-balance-badge"
						>
							<Users size={12} className="shrink-0" />
							<span>Семья: {familySummary.balance > 0 ? "+" : ""}{familySummary.balance.toLocaleString("ru-RU")} ₽</span>
						</button>
					) : (
						<button
							type="button"
							onClick={handleOpenFamilyWallet}
							className="text-xs font-medium px-2 py-0.5 rounded-md border border-dashed border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--teal)] hover:border-[var(--teal)] transition-colors inline-flex items-center gap-1 shrink-0 cursor-pointer"
							title="Создать или привязать семейный счет (общий кошелек)"
							data-testid="patient-workspace-open-family-btn"
						>
							<Users size={12} className="text-[var(--teal)] shrink-0" />
							<span>+ Семейный счет</span>
						</button>
					)}
				</div>
			</>
		);
	},
);
PatientWorkspaceHeader.displayName = "PatientWorkspaceHeader";
