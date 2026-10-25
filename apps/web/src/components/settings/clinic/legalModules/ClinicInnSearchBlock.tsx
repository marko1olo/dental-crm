import React from "react";
import { Search, X } from "lucide-react";
import type { ClinicProfileDraft } from "./clinicLegalTypes";

interface ClinicInnSearchBlockProps {
	clinicProfileDraft: ClinicProfileDraft;
	updateClinicProfileDraft: (field: string, val: any) => void;
	lookupClinicPublicProfile: () => Promise<void> | void;
	isClinicPublicLookupLoading?: boolean;
}

export const ClinicInnSearchBlock: React.FC<ClinicInnSearchBlockProps> = ({
	clinicProfileDraft,
	updateClinicProfileDraft,
	lookupClinicPublicProfile,
	isClinicPublicLookupLoading,
}) => {
	return (
		<div className="space-y-4">
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
				<div className="dente-search-wrap flex-1">
					<Search className="dente-search-icon" size={14} aria-hidden="true" />
					<input
						type="search"
						value={clinicProfileDraft.inn || ""}
						onChange={(e) =>
							updateClinicProfileDraft("inn", e.target.value.replace(/[^\d]/g, "").slice(0, 12))
						}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								void lookupClinicPublicProfile();
							}
						}}
						placeholder="Быстрый поиск реквизитов по ИНН клиники (10 или 12 цифр)..."
						className="dente-search-input"
						data-testid="input-quick-search-inn"
					/>
					{clinicProfileDraft.inn && (
						<button
							type="button"
							onClick={() => updateClinicProfileDraft("inn", "")}
							className="dente-search-clear"
							aria-label="Очистить ИНН"
						>
							<X size={13} />
						</button>
					)}
				</div>
				<div className="dente-segmented-bar shrink-0">
					<button
						className="dente-segmented-item active"
						type="button"
						onClick={() => void lookupClinicPublicProfile()}
						disabled={isClinicPublicLookupLoading || !clinicProfileDraft.inn}
						data-testid="btn-lookup-clinic-profile"
					>
						<Search aria-hidden="true" size={14} />
						<span>{isClinicPublicLookupLoading ? "Ищу в ЕГРЮЛ..." : "Найти в ЕГРЮЛ / DaData"}</span>
					</button>
				</div>
			</div>

			<div className="clinic-profile-form-grid settings-essential-block">
				<label>
					Название клиники (для пациентов)
					<input
						data-testid="input-clinic-name"
						value={clinicProfileDraft.clinicName || ""}
						onChange={(e) => updateClinicProfileDraft("clinicName", e.target.value)}
					/>
				</label>
				<label>
					Контактный телефон регистратуры
					<input
						data-testid="input-clinic-phone"
						value={clinicProfileDraft.phone || ""}
						onChange={(e) => updateClinicProfileDraft("phone", e.target.value)}
					/>
				</label>
				<label className="form-span-2">
					Фактический адрес клиники
					<input
						data-testid="input-clinic-address"
						value={clinicProfileDraft.address || ""}
						onChange={(e) => updateClinicProfileDraft("address", e.target.value)}
					/>
				</label>
			</div>
		</div>
	);
};
