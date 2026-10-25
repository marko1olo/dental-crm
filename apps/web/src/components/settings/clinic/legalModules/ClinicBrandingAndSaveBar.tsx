import React from "react";
import { ChevronDown, ExternalLink, ShieldCheck } from "lucide-react";
import type { ClinicProfileDraft } from "./clinicLegalTypes";

interface ClinicBrandingAndSaveBarProps {
	clinicProfileDraft: ClinicProfileDraft;
	updateClinicProfileDraft: (field: string, val: any) => void;
	saveClinicProfileFromDraft: () => Promise<void> | void;
	clinicProfileSaveState?: string;
}

export const ClinicBrandingAndSaveBar: React.FC<ClinicBrandingAndSaveBarProps> = ({
	clinicProfileDraft,
	updateClinicProfileDraft,
	saveClinicProfileFromDraft,
	clinicProfileSaveState,
}) => {
	return (
		<>
			<details className="settings-advanced-block" data-testid="clinic-branding-section">
				<summary className="settings-advanced-toggle">
					<span className="settings-advanced-label">
						Фирменный стиль, логотип, печать и табло ожидания
					</span>
					<ChevronDown size={14} className="settings-advanced-chevron shrink-0" />
				</summary>
				<div className="clinic-profile-form-grid settings-advanced-form">
					<label>
						URL логотипа клиники
						<input
							type="text"
							placeholder="https://... или data:image/png;base64,..."
							value={clinicProfileDraft.logoUrl || ""}
							data-testid="input-clinic-logo-url"
							onChange={(e) => updateClinicProfileDraft("logoUrl", e.target.value)}
						/>
					</label>
					<label>
						URL печати / факсимиле
						<input
							type="text"
							placeholder="https://... или data:image/png;base64,..."
							value={clinicProfileDraft.stampUrl || ""}
							data-testid="input-clinic-stamp-url"
							onChange={(e) => updateClinicProfileDraft("stampUrl", e.target.value)}
						/>
					</label>
					<div className="form-span-2 flex items-center justify-between pt-2">
						<a
							href="/#lounge-display"
							target="_blank"
							rel="noreferrer"
							className="secondary-btn inline-flex items-center gap-2 text-xs"
						>
							<ExternalLink size={13} aria-hidden="true" />
							<span>Открыть ТВ-табло зоны ожидания (/lounge-display)</span>
						</a>
					</div>
				</div>
			</details>

			<div className="clinic-profile-actions flex items-center justify-between gap-4 pt-2">
				<span className="text-xs text-[var(--ink-muted)]">
					{clinicProfileSaveState === "saved"
						? "✓ Реквизиты сохранены"
						: clinicProfileSaveState === "error"
							? "Проверьте корректность реквизитов"
							: "Изменения вступают в силу в договорах и чеках после сохранения"}
				</span>
				<button
					className="h-9 min-h-[36px] px-3.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white shadow-xs inline-flex items-center gap-2 text-[13px] font-semibold cursor-pointer transition-all"
					type="button"
					data-testid="btn-save-clinic-profile"
					onClick={() => void saveClinicProfileFromDraft()}
					disabled={clinicProfileSaveState === "saving"}
				>
					<ShieldCheck aria-hidden="true" size={16} className="w-4 h-4 shrink-0" />
					<span>{clinicProfileSaveState === "saving" ? "Сохраняю…" : "Сохранить реквизиты"}</span>
				</button>
			</div>
		</>
	);
};
