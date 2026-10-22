import React from "react";
import { MINOR_RELATION_CHIPS } from "./types";

interface MinorConsentRepresentativeFieldsProps {
	minorRepresentativeName: string;
	setMinorRepresentativeName: (v: string) => void;
	namePlaceholder: string;
	minorRepresentativeRelation: string;
	setMinorRepresentativeRelation: (v: string) => void;
	minorRepresentativeDocument: string;
	setMinorRepresentativeDocument: (v: string) => void;
	minorRepresentativeAuthority: string;
	setMinorRepresentativeAuthority: (v: string) => void;
	minorRepresentativePhone: string;
	setMinorRepresentativePhone: (v: string) => void;
	phonePlaceholder: string;
}

export const MinorConsentRepresentativeFields: React.FC<MinorConsentRepresentativeFieldsProps> = ({
	minorRepresentativeName, setMinorRepresentativeName, namePlaceholder,
	minorRepresentativeRelation, setMinorRepresentativeRelation,
	minorRepresentativeDocument, setMinorRepresentativeDocument,
	minorRepresentativeAuthority, setMinorRepresentativeAuthority,
	minorRepresentativePhone, setMinorRepresentativePhone, phonePlaceholder,
}) => (
	<>
		<div className="document-payload-row">
			<label>
				Законный представитель
				<input
					value={minorRepresentativeName}
					onChange={(e) => setMinorRepresentativeName(e.target.value)}
					placeholder={namePlaceholder}
				/>
			</label>
			<label>
				<span className="flex items-center justify-between gap-1 flex-wrap">
					<span>Статус / родство</span>
				</span>
				<div className="flex items-center gap-1.5 flex-wrap my-1" role="group" aria-label="Быстрый выбор статуса представителя">
					{MINOR_RELATION_CHIPS.map((chip) => {
						const isSelected =
							minorRepresentativeRelation === chip.value ||
							minorRepresentativeRelation?.toLowerCase() === chip.value.toLowerCase();
						return (
							<button
								key={chip.value}
								type="button"
								onClick={(e) => {
									e.preventDefault();
									setMinorRepresentativeRelation(chip.value);
								}}
								className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer inline-flex items-center justify-center ${
									isSelected
										? "bg-teal-500/15 text-[var(--teal)] border-[var(--teal)] shadow-xs font-bold"
										: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--paper-hover)]"
								}`}
								data-testid={`minor-rel-chip-${chip.value.toLowerCase()}`}
							>
								{chip.label}
							</button>
						);
					})}
				</div>
				<input
					value={minorRepresentativeRelation}
					onChange={(e) => setMinorRepresentativeRelation(e.target.value)}
					placeholder="мать / отец / опекун / доверенное лицо"
				/>
			</label>
		</div>
		<div className="document-payload-row">
			<label>
				Паспорт представителя
				<input
					value={minorRepresentativeDocument}
					onChange={(e) => setMinorRepresentativeDocument(e.target.value)}
					placeholder="паспорт серия ______ № ________ выдан кем и когда"
				/>
			</label>
			<label>
				Основание полномочий (ст. 64 СК РФ / ст. 185 ГК РФ)
				<input
					value={minorRepresentativeAuthority}
					onChange={(e) => setMinorRepresentativeAuthority(e.target.value)}
					placeholder="свидетельство о рождении, ст. 64 СК РФ, акт опеки, доверенность"
				/>
			</label>
		</div>
		<label>
			Контактный телефон представителя
			<input
				value={minorRepresentativePhone}
				onChange={(e) => setMinorRepresentativePhone(e.target.value)}
				placeholder={phonePlaceholder}
			/>
		</label>
	</>
);
