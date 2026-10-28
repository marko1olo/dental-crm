import React from "react";
import { RefreshCw, Search } from "lucide-react";
import type { PatientSearchCandidate } from "./StudyPatientBindStudyPreview";

export const DEMO_FALLBACK_PATIENTS: PatientSearchCandidate[] = [
	{
		id: "01a00000-0000-0000-0000-000000000001",
		fullName: "Захаров Иван Дмитриевич",
		birthDate: "1985-04-12",
		phone: "+7 (916) 123-45-67",
		cardNumber: "МК-043/у-01",
	},
	{
		id: "01a00000-0000-0000-0000-000000000002",
		fullName: "Иванов Алексей Сергеевич",
		birthDate: "1992-08-24",
		phone: "+7 (926) 987-65-43",
		cardNumber: "МК-043/у-02",
	},
	{
		id: "01a00000-0000-0000-0000-000000000003",
		fullName: "Смирнова Елена Александровна",
		birthDate: "1988-11-03",
		phone: "+7 (903) 555-12-34",
		cardNumber: "МК-043/у-03",
	},
	{
		id: "01a00000-0000-0000-0000-000000000004",
		fullName: "Кузнецов Дмитрий Павлович",
		birthDate: "1979-02-17",
		phone: "+7 (915) 333-88-99",
		cardNumber: "МК-043/у-04",
	},
];

export interface StudyPatientBindSearchSectionProps {
	readonly showSearchBox: boolean;
	readonly setShowSearchBox: (show: boolean) => void;
	readonly searchQuery: string;
	readonly isSearching: boolean;
	readonly searchResults: PatientSearchCandidate[];
	readonly handleSearchPatients: (query: string) => void;
	readonly onSelectPatient: (patient: PatientSearchCandidate) => void;
}

export const StudyPatientBindSearchSection: React.FC<StudyPatientBindSearchSectionProps> = ({
	showSearchBox,
	setShowSearchBox,
	searchQuery,
	isSearching,
	searchResults,
	handleSearchPatients,
	onSelectPatient,
}) => {
	if (!showSearchBox) {
		return (
			<button
				type="button"
				onClick={() => setShowSearchBox(true)}
				className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-teal-500 transition-colors text-[13px] font-medium cursor-pointer shadow-2xs"
				data-testid="btn-open-patient-search"
			>
				<Search className="w-3.5 h-3.5" />
				<span>Сменить пациента (поиск по картотеке)</span>
			</button>
		);
	}

	return (
		<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2">
			<div className="flex items-center justify-between gap-2">
				<span className="font-bold text-[var(--ink)]">Поиск пациента по базе:</span>
				<button
					type="button"
					onClick={() => setShowSearchBox(false)}
					className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
				>
					Отмена
				</button>
			</div>

			<div className="dente-search-wrap w-full">
				<Search className="dente-search-icon" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => handleSearchPatients(e.target.value)}
					placeholder="Введите ФИО, телефон или номер карты..."
					className="dente-search-input"
					autoFocus
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => handleSearchPatients("")}
						className="dente-search-clear"
						aria-label="Очистить поиск"
					>
						✕
					</button>
				)}
			</div>

			{isSearching && (
				<div className="text-xs text-[var(--muted)] flex items-center gap-1.5 py-1">
					<RefreshCw className="w-3.5 h-3.5 animate-spin" />
					<span>Поиск в реестре пациентов...</span>
				</div>
			)}

			{searchResults.length > 0 && (
				<div className="flex flex-col gap-1 max-h-36 overflow-y-auto mt-1">
					{searchResults.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => onSelectPatient(p)}
							className="w-full text-left p-2 rounded-lg hover:bg-[var(--paper-soft)] flex items-center justify-between text-xs transition-colors cursor-pointer border border-transparent hover:border-[var(--line)]"
						>
							<div className="min-w-0">
								<div className="font-bold text-[var(--ink)] truncate">{p.fullName}</div>
								<div className="text-xs text-[var(--muted)]">
									{p.birthDate ? `${p.birthDate} • ` : ""}
									{p.phone || p.cardNumber || "Без контактов"}
								</div>
							</div>
							<span className="text-xs font-semibold text-teal-600 dark:text-teal-400 shrink-0">
								Выбрать
							</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
};
