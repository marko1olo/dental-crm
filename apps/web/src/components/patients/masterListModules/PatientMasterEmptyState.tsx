import React from "react";
import { Plus, Search, Upload, Users } from "lucide-react";
import { EmptyState } from "../../EmptyState";
import { showToast } from "../../GlobalToast";

interface PatientMasterEmptyStateProps {
	readonly query: string;
	readonly onOpenCreatePatient: () => void;
	readonly onClearSearch: () => void;
}

export const PatientMasterEmptyState: React.FC<PatientMasterEmptyStateProps> = ({
	query,
	onOpenCreatePatient,
	onClearSearch,
}) => {
	const isSearching = Boolean(query.trim());
	return (
		<EmptyState
			className="patient-empty-state"
			icon={!isSearching ? <Users size={32} /> : <Search size={28} />}
			title={!isSearching ? "В картотеке пока нет пациентов" : "Пациент не найден"}
			description={
				!isSearching
					? "Создайте медицинскую карту первого пациента или выполните пакетный импорт существующей базы из Excel, 1С или внешних файлов."
					: `По запросу «${query.trim()}» ничего не найдено. Проверьте правильность написания ФИО или номера телефона.`
			}
			action={
				!isSearching ? (
					<div className="patient-empty-actions flex flex-col sm:flex-row flex-wrap gap-2 justify-center mt-2 w-full">
						<button
							type="button"
							className="primary-button min-h-[44px] sm:min-h-[36px] h-9 px-4 flex items-center justify-center gap-1.5 font-bold rounded-xl shadow-sm"
							onClick={onOpenCreatePatient}
							data-testid="empty-state-create-patient-btn"
						>
							<Plus size={16} aria-hidden="true" />
							<span>Создать карту</span>
						</button>
						<button
							type="button"
							className="secondary-button min-h-[44px] sm:min-h-[36px] h-9 px-4 flex items-center justify-center gap-1.5 font-semibold rounded-xl"
							onClick={() => {
								window.location.hash = "#settings";
								showToast("Переход в настройки клиники: раздел «Импорт баз данных из Excel / 1C»", "info", 4000);
							}}
							data-testid="empty-state-import-patients-btn"
						>
							<Upload size={16} aria-hidden="true" />
							<span>Импорт базы из Excel / 1С</span>
						</button>
					</div>
				) : (
					<div className="patient-empty-actions flex flex-wrap gap-2 justify-center mt-2">
						<button
							type="button"
							className="primary-button min-h-[44px] px-4 flex items-center justify-center gap-1.5 font-bold"
							onClick={onOpenCreatePatient}
							data-testid="empty-state-create-patient-btn"
						>
							<Plus size={16} aria-hidden="true" />
							<span>Создать карту</span>
						</button>
						<button type="button" className="secondary-button min-h-[44px] px-3.5 font-semibold" onClick={onClearSearch}>
							Сбросить поиск
						</button>
					</div>
				)
			}
			glass={false}
			style={{ padding: "24px 16px" }}
		/>
	);
};
