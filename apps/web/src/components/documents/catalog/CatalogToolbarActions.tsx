import type React from "react";
import { Award, FileCheck, Printer } from "lucide-react";

export interface CatalogToolbarActionsProps {
	onOpenAutoclaveLog?: (() => void) | undefined;
	handleOpenIntake: () => void;
	setIsDiplomaModalOpen: (open: boolean) => void;
}

export function CatalogToolbarActions({
	onOpenAutoclaveLog,
	handleOpenIntake,
	setIsDiplomaModalOpen,
}: CatalogToolbarActionsProps): React.JSX.Element {
	return (
		<div className="flex items-center gap-1.5 shrink-0">
			{onOpenAutoclaveLog && (
				<button
					type="button"
					onClick={onOpenAutoclaveLog}
					className="secondary-button documents-open-autoclave-log-btn documents-open-autoclave-log-257-btn h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition shrink-0"
					data-testid="documents-open-autoclave-log-btn"
					data-legacy-testid="documents-open-autoclave-log-257-btn"
					title="Журнал автоклавирования"
				>
					<FileCheck className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
					<span className="whitespace-nowrap">Журнал автоклавирования</span>
				</button>
			)}
			<button
				type="button"
				onClick={handleOpenIntake}
				className="secondary-button h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition shrink-0"
				data-testid="btn-catalog-primary-intake"
				title="Открыть пакет приёма (Договор + Анкета здоровья + Согласие на лечение + Персданные)"
			>
				<Printer className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
				<span className="whitespace-nowrap">Пакет приёма</span>
			</button>
			<button
				type="button"
				onClick={() => setIsDiplomaModalOpen(true)}
				className="secondary-button h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition shrink-0"
				data-testid="btn-catalog-print-diploma"
				title="Печать памятного диплома маленькому пациенту за смелость"
			>
				<Award className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
				<span className="hidden xl:inline whitespace-nowrap">Грамота</span>
			</button>
		</div>
	);
}
