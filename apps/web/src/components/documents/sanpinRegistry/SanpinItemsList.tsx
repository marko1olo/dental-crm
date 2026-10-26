import React from "react";
import { FileText, FlaskConical, Radiation, Sparkles, Layers } from "lucide-react";
import type { DocumentKind, GeneratedDocument } from "@dental/shared";

export interface SanpinItemsListProps {
	radiationDocs: GeneratedDocument[];
	onOpenSickLeaveEln: () => void;
	/** Семантический обработчик открытия журнала автоклавирования (Мандат 8ap) */
	onOpenAutoclaveLog?: () => void;
	/** @deprecated Обратная совместимость с устаревшими вызовами */
	onOpenAutoclaveLog257?: () => void;
	onOpenEgiszRemd: () => void;
	onOpenPsoJournal366?: (() => void) | undefined;
	onSelectDocumentKind: (kind: DocumentKind) => void;
	onCreateDocument: (kind: DocumentKind) => void;
	onClose: () => void;
}

export const SanpinItemsList: React.FC<SanpinItemsListProps> = ({
	radiationDocs,
	onOpenSickLeaveEln,
	onOpenAutoclaveLog,
	onOpenAutoclaveLog257,
	onOpenEgiszRemd,
	onOpenPsoJournal366,
	onSelectDocumentKind,
	onCreateDocument,
	onClose,
}) => {
	const handleOpenAutoclave = onOpenAutoclaveLog || onOpenAutoclaveLog257 || (() => {});
	const hasRadiationDoc = radiationDocs.length > 0;

	return (
		<div className="document-package-items-list">
			<div className="document-package-item-card">
				<div className="document-package-item-info">
					<div className="flex items-center gap-2">
						<FileText size={18} color="var(--brand-700, #0d9488)" aria-hidden="true" />
						<span className="document-package-item-title">Электронный больничный лист (ЭЛН)</span>
					</div>
					<span className="document-package-item-sub">Оформление временной нетрудоспособности при острых одонтогенных воспалениях, операциях и травмах ЧЛО.</span>
				</div>
				<div className="document-package-item-actions">
					<button type="button" className="primary-button" onClick={() => { onClose(); onOpenSickLeaveEln(); }}>Открыть студию ЭЛН</button>
				</div>
			</div>

			<div className="document-package-item-card">
				<div className="document-package-item-info">
					<div className="flex items-center gap-2">
						<FlaskConical size={18} color="var(--brand-700, #0d9488)" aria-hidden="true" />
						<span className="document-package-item-title">Журнал предстерилизационной очистки</span>
					</div>
					<span className="document-package-item-sub">Контроль качества очистки от крови и остатков моющих средств (азопирамовая и фенолфталеиновая пробы).</span>
				</div>
				<div className="document-package-item-actions">
					<button type="button" className="primary-button" onClick={() => {
						onClose();
						if (onOpenPsoJournal366) onOpenPsoJournal366(); else handleOpenAutoclave();
					}}>Открыть журнал очистки</button>
				</div>
			</div>

			<div className="document-package-item-card">
				<div className="document-package-item-info">
					<div className="flex items-center gap-2">
						<Radiation size={18} color="var(--warn-fg, #f59e0b)" aria-hidden="true" />
						<span className="document-package-item-title">История снимков и лучевой нагрузки</span>
					</div>
					<span className="document-package-item-sub">Учёт суммарной лучевой нагрузки пациента (мЗв) для медицинской карты и проверок.</span>
				</div>
				<div className="document-package-item-actions">
					{hasRadiationDoc ? (
						<button type="button" className="secondary-button" onClick={() => { onSelectDocumentKind("radiation_dose_sheet"); onClose(); }}>
							Просмотреть ({radiationDocs.length})
						</button>
					) : (
						<button type="button" className="primary-button" onClick={() => { onSelectDocumentKind("radiation_dose_sheet"); onCreateDocument("radiation_dose_sheet"); onClose(); }}>
							Сформировать
						</button>
					)}
				</div>
			</div>

			<div className="document-package-item-card">
				<div className="document-package-item-info">
					<div className="flex items-center gap-2">
						<Sparkles size={18} color="var(--brand-700, #0d9488)" aria-hidden="true" />
						<span className="document-package-item-title">Журнал автоклавирования и стерилизации</span>
					</div>
					<span className="document-package-item-sub">Реестр циклов автоклавирования, термохимических индикаторов (1-5 класс), вакуум-тестов и биотестов.</span>
				</div>
				<div className="document-package-item-actions">
					<button type="button" className="primary-button" onClick={() => { onClose(); handleOpenAutoclave(); }}>Открыть журнал стерилизации</button>
				</div>
			</div>

			<div className="document-package-item-card">
				<div className="document-package-item-info">
					<div className="flex items-center gap-2">
						<Layers size={18} color="var(--brand-700, #0d9488)" aria-hidden="true" />
						<span className="document-package-item-title">Выгрузка документов в ЕГИСЗ (РЭМД)</span>
					</div>
					<span className="document-package-item-sub">Государственный реестр электронных медицинских документов для Госуслуг.</span>
				</div>
				<div className="document-package-item-actions">
					<button type="button" className="secondary-button" onClick={() => { onClose(); onOpenEgiszRemd(); }}>РЭМД Студия</button>
				</div>
			</div>
		</div>
	);
};
