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
		<div className="mw-panel mw-source-panel">
			<div className="mw-source-grid">
				{/* Левая колонка: Зона перетаскивания и ИИ-переключатель */}
				<div className="mw-source-col-left">
					<section
						aria-label="Зона загрузки файла"
						className={`mw-drop ${dragging ? "is-dragging" : ""}`}
						style={{ flex: 1, justifyContent: "center", padding: "10px 14px", gap: "4px" }}
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
							<UploadCloud size={22} />
						</div>
						<p className="mw-drop-title" style={{ margin: 0, fontSize: "14px" }}>
							Перетащите файл выгрузки сюда
						</p>
						<p className="mw-drop-hint" style={{ margin: "0 0 2px", fontSize: "11.5px" }}>
							Поддерживаются DBF (FoxPro, dBASE), SQLite, XLSX, XLS, CSV и TSV в
							любой кодировке (UTF-8, Windows-1251, CP866), JSON, XML
						</p>
						<button
							type="button"
							className="mw-btn mw-btn-primary"
							style={{ minHeight: "34px", padding: "5px 14px", fontSize: "12.5px" }}
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

					<label className="mw-toggle" style={{ padding: "6px 10px", margin: 0, fontSize: "12px" }}>
						<input
							type="checkbox"
							checked={props.allowLlm}
							onChange={(event) => props.onAllowLlmChange(event.target.checked)}
						/>
						<span>
							Привлекать нейросеть к неопознанным колонкам
							<em className="mw-toggle-note">
								Передаются только маски вида «99.99.9999» — ФИО и телефоны не
								передаются.
							</em>
						</span>
					</label>
				</div>

				{/* Правая колонка: Инструкции по экспорту из популярных МИС */}
				<section className="mw-source-guides" aria-label="Пресеты переноса из популярных систем">
					<div>
						<div className="mw-source-guides-title">
							<Database size={15} style={{ color: "var(--teal)", flexShrink: 0 }} />
							<span>Как быстро выгрузить базу из вашей старой программы:</span>
						</div>

						<div
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "4px",
								marginBottom: "8px",
							}}
						>
							{VENDOR_GUIDES.map((vendor) => {
								const isSelected = selectedVendor === vendor.id;
								return (
									<button
										key={vendor.id}
										type="button"
										style={{
											padding: "2px 7px",
											minHeight: "26px",
											borderRadius: "6px",
											border: isSelected
												? "1px solid var(--teal)"
												: "1px solid var(--line)",
											background: isSelected
												? "var(--teal-surface)"
												: "var(--paper)",
											color: isSelected ? "var(--ink)" : "var(--muted)",
											fontWeight: isSelected ? 600 : 500,
											fontSize: "11px",
											cursor: "pointer",
											transition: "all 0.15s ease",
										}}
										onClick={() => setSelectedVendor(vendor.id)}
									>
										{vendor.title}
									</button>
								);
							})}
						</div>

						<div
							style={{
								padding: "10px 12px",
								borderRadius: "10px",
								background: "var(--paper)",
								border: "1px solid var(--line)",
								display: "flex",
								flexDirection: "column",
								gap: "6px",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: "8px",
									flexWrap: "wrap",
								}}
							>
								<span style={{ fontWeight: 600, color: "var(--ink)" }}>
									{activeGuide.title}
								</span>
								<span
									style={{
										fontSize: "11px",
										color: "var(--teal)",
										fontFamily: "var(--font-mono, monospace)",
										fontWeight: 600,
									}}
								>
									Формат: {activeGuide.recommendedFormat}
								</span>
							</div>
							<p
								style={{
									margin: 0,
									color: "var(--ink-2)",
									lineHeight: 1.45,
								}}
							>
								{activeGuide.steps}
							</p>
							<p
								style={{
									margin: 0,
									paddingTop: "6px",
									borderTop: "1px solid var(--line)",
									fontSize: "11px",
									color: "var(--muted)",
								}}
							>
								Переносимые данные: {activeGuide.fields}
							</p>
						</div>
					</div>

					<div
						style={{
							display: "flex",
							alignItems: "flex-start",
							gap: "8px",
							color: "var(--muted)",
							fontSize: "11px",
							lineHeight: 1.4,
						}}
					>
						<Info
							size={14}
							style={{ color: "var(--teal)", flexShrink: 0, marginTop: "2px" }}
						/>
						<span>
							<strong>Автонормализация и закрытые СУБД:</strong> телефоны
							приводятся к +7XXXXXXXXXX, дубликаты склеиваются. Для серверных баз
							Firebird / MS SQL нажмите «Найти базы на сервере» вверху справа.
						</span>
					</div>
				</section>
			</div>
		</div>
	);
}
