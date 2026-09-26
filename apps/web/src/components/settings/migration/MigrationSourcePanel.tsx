/**
 * apps/web/src/components/settings/migration/MigrationSourcePanel.tsx
 *
 * Панель выбора источника и загрузки файлов для переноса базы.
 * Включает пошаговые инструкции экспорта для IDENT, DentalPRO, Инфодент, StomX и Excel.
 *
 * Mandate 8b: Строго <= 800 строк.
 * Mandate 8d: Ноль мультяшных эмодзи — строго векторные иконки Lucide.
 */

import {
	Database,
	FileSpreadsheet,
	HelpCircle,
	Info,
	Sparkles,
	UploadCloud,
} from "lucide-react";
import { useState } from "react";

interface VendorGuide {
	id: string;
	title: string;
	recommendedFormat: string;
	steps: string;
	fields: string;
}

const VENDOR_GUIDES: VendorGuide[] = [
	{
		id: "ident",
		title: "IDENT",
		recommendedFormat: "XLSX или DBF (PATIENT.DBF)",
		steps:
			"В программе IDENT откройте: «Отчеты» → «Пациенты» → «Экспорт в Excel (XLSX)». Либо скопируйте файлы таблиц DBF из рабочей папки IDENT.",
		fields: "ФИО, телефоны, даты рождения, баланс, примечания и история приёмов.",
	},
	{
		id: "dentalpro",
		title: "DentalPRO",
		recommendedFormat: "XLSX или CSV",
		steps:
			"В DentalPRO откройте раздел «Пациенты» → нажмите «Экспорт списка» в правом верхнем углу → выберите формат XLSX или CSV.",
		fields: "Полный профиль пациента, контактные телефоны, соматический статус, примечания.",
	},
	{
		id: "infodent",
		title: "Инфодент",
		recommendedFormat: "DBF или Excel (Windows-1251 / UTF-8)",
		steps:
			"В Инфодент выполните экспорт реестра пациентов в файл Excel/CSV или передайте таблицы DBF. Кодировка (CP1251 или UTF-8) определится автоматически.",
		fields: "Картотека пациентов, номера медицинских карт, телефоны, дни рождения.",
	},
	{
		id: "stomx",
		title: "StomX",
		recommendedFormat: "XLSX или CSV",
		steps:
			"В веб-панели StomX перейдите в «Настройки» → «Экспорт данных» → выберите «База пациентов». Сохранённый файл готов к переносу.",
		fields: "ФИО, контакты, адреса, прикреплённые комментарии и балансы.",
	},
	{
		id: "1c",
		title: "1С:Стоматология",
		recommendedFormat: "XLSX или XML",
		steps:
			"В 1С откройте «Пациенты» (или «Картотека») → кнопка «Еще» → «Вывести список» → сохраните как Excel (XLSX). Все колонки сопоставятся автоматически.",
		fields: "ФИО, контактные телефоны, даты рождения, балансы и заметки.",
	},
	{
		id: "excel",
		title: "Excel / Таблицы",
		recommendedFormat: "XLSX, XLS или CSV",
		steps:
			"Подойдёт любая таблица с колонками ФИО, Телефон, Дата рождения. Порядок колонок произвольный — движок сопоставит поля автоматически.",
		fields: "Любые произвольные колонки с автоматическим распознаванием контактов и дат.",
	},
];

export function MigrationSourcePanel(props: {
	busy: boolean;
	allowLlm: boolean;
	onAllowLlmChange: (value: boolean) => void;
	fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
	onFile: (file: File) => void;
}) {
	const [dragging, setDragging] = useState(false);
	const [selectedVendor, setSelectedVendor] = useState<string>("ident");

	const activeGuide =
		VENDOR_GUIDES.find((g) => g.id === selectedVendor) ??
		(VENDOR_GUIDES[0] as (typeof VENDOR_GUIDES)[number]);

	return (
		<div className="mw-panel">
			{/* Зона перетаскивания и выбора файла */}
			<section
				aria-label="Зона загрузки файла"
				className={`mw-drop ${dragging ? "is-dragging" : ""}`}
				onDragOver={(event) => {
					event.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={(event) => {
					event.preventDefault();
					setDragging(false);
					const file = event.dataTransfer.files.item(0);
					if (file) props.onFile(file);
				}}
			>
				<div className="mw-drop-icon" aria-hidden="true">
					<UploadCloud size={32} />
				</div>
				<p className="mw-drop-title">Перетащите файл выгрузки сюда</p>
				<p className="mw-drop-hint">
					Поддерживаются DBF (FoxPro, dBASE), SQLite, XLSX, XLS, CSV и TSV в
					любой кодировке (UTF-8, Windows-1251, CP866), JSON, XML
				</p>
				<button
					type="button"
					className="mw-btn mw-btn-primary"
					disabled={props.busy}
					onClick={() => props.fileInputRef.current?.click()}
				>
					{props.busy ? "Загрузка…" : "Выбрать файл на компьютере"}
				</button>
				<input
					ref={props.fileInputRef}
					type="file"
					className="mw-file-input"
					onChange={(event) => {
						const file = event.target.files?.item(0);
						if (file) props.onFile(file);
						event.target.value = "";
					}}
				/>
			</section>

			{/* Инструкции по экспорту из популярных стоматологических программ */}
			<section
				className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-xs"
				aria-label="Пресеты переноса из популярных систем"
			>
				<div className="flex items-center gap-2 mb-2 font-semibold text-slate-900 dark:text-slate-100">
					<Database size={16} className="text-teal-500 shrink-0" />
					<span>Как быстро выгрузить базу из вашей старой программы:</span>
				</div>

				<div className="flex flex-wrap gap-1.5 mb-3">
					{VENDOR_GUIDES.map((vendor) => (
						<button
							key={vendor.id}
							type="button"
							className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
								selectedVendor === vendor.id
									? "bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-300 font-semibold"
									: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
							}`}
							onClick={() => setSelectedVendor(vendor.id)}
						>
							{vendor.title}
						</button>
					))}
				</div>

				<div className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
					<div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
						<span className="font-semibold text-slate-900 dark:text-slate-100">
							{activeGuide.title}
						</span>
						<span className="text-[11px] text-teal-600 dark:text-teal-400 font-mono">
							Рекомендуемый формат: {activeGuide.recommendedFormat}
						</span>
					</div>
					<p className="text-slate-600 dark:text-slate-400 leading-relaxed m-0">
						{activeGuide.steps}
					</p>
					<p className="text-[11px] text-slate-500 dark:text-slate-500 m-0 pt-1 border-t border-slate-100 dark:border-slate-700/60">
						Переносимые данные: {activeGuide.fields}
					</p>
				</div>

				<div className="mt-3 flex items-start gap-2 text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
					<Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
					<span>
						<strong>Автоматическая нормализация:</strong> номера телефонов
						приводятся к стандарту РФ (+7XXXXXXXXXX), даты рождения
						распознаются во всех форматах (ДД.ММ.ГГГГ, ГГГГ-ММ-ДД, ДД/ММ/ГГГГ).
						Повторная загрузка обновляет существующие карточки без создания дубликатов.
					</span>
				</div>
			</section>

			{/* Переключатель помощи нейросети */}
			<label className="mw-toggle mt-4">
				<input
					type="checkbox"
					checked={props.allowLlm}
					onChange={(event) => props.onAllowLlmChange(event.target.checked)}
				/>
				<span>
					Привлекать нейросеть к неопознанным колонкам
					<em className="mw-toggle-note">
						Модель получает только статистику колонок и маски вида «99.99.9999» —
						персональные данные пациентов (ФИО, телефоны) третьим лицам не
						передаются.
					</em>
				</span>
			</label>

			{/* Справка о закрытых форматах */}
			<div className="mw-note">
				<strong>Закрытые форматы.</strong> Firebird (IDENT), MS SQL (DentalPRO),
				Access и 1С читать напрямую нельзя — это страничные форматы, привязанные
				к своему серверу. Нажмите «Найти базы на сервере»: движок опознает их и
				подскажет, чем открыть и что выгрузить.
			</div>
		</div>
	);
}
