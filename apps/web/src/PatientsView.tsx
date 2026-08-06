import type {
	Dashboard,
	Patient,
	PatientAdministrativeProfile,
} from "@dental/shared";
import { ArrowRight, Plus, Search, ShieldCheck, UserCheck } from "lucide-react";
import type {
	ChangeEvent,
	CSSProperties,
	KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useEffect, useMemo, useState } from "react";
import { PatientArchiveReasonsAndBlacklistsWidget } from "./components/crm/PatientArchiveReasonsAndBlacklistsWidget";
import { PatientCommunicationTimelinesWidget } from "./components/crm/PatientCommunicationTimelinesWidget";
import { PatientDuplicateMergeQueuesWidget } from "./components/crm/PatientDuplicateMergeQueuesWidget";
import { EmptyState } from "./components/EmptyState";
import { VisiographAnalyzer } from "./components/imaging/VisiographAnalyzer";
import { OdontogramModule } from "./components/odontogram/OdontogramModule";
import { PatientAvatar } from "./components/PatientAvatar";
import { PatientAdministrativeForm } from "./components/patient/PatientAdministrativeForm";
import { PatientAttachmentsPanel } from "./components/patients/PatientAttachmentsPanel";
import { PatientCommunicationConsentsPanel } from "./components/patients/PatientCommunicationConsentsPanel";
import { PatientOverviewTab } from "./components/patients/PatientOverviewTab";
import { PatientWhatsappSendPanel } from "./components/patients/PatientWhatsappSendPanel";
import { PatientCardSavePill } from "./components/patients/patientCardSavePill";
import {
	featureDistinguishes,
	patientListFeatureSalience,
} from "./components/patients/patientListFeatureSalience";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { DictationHints } from "./DictationHints";
import { parsePatientDictationLocal } from "./lib/smartPatientParser";
import { SmartParsePreview } from "./SmartParsePreview";
import { usePatientStore } from "./store/patientStore";
import { formatPhoneNumber } from "./utils/inputSanitation";

type PatientInsight = Dashboard["patientInsights"][number];
type PatientCoreSaveState = "idle" | "saving" | "saved" | "error";
type PatientAdministrativeProfileSaveState =
	| "idle"
	| "saving"
	| "saved"
	| "error";

export type PatientCoreDraft = {
	fullName: string;
	birthDate: string;
	phone: string;
	email: string;
	notes: string;
};

export type PatientAdministrativeProfileDraft = {
	[K in Exclude<
		keyof PatientAdministrativeProfile,
		"preferredAppointmentWeekdays"
	>]: string;
} & {
	preferredAppointmentWeekdays: number[];
};

export type WeekdayOption = {
	label: string;
	value: number;
};

export type PatientsViewProps = {
	createPatient: () => void | Promise<void>;
	filteredPatients: Patient[];
	money: (amountRub: number) => string;
	normalizeOptionalWorkingDaysDraft: (days: number[]) => number[];
	patientAdministrativeProfileValidationMessage: string | null;
	patientInsightById: Map<string, PatientInsight>;
	patientInsightRiskLabels: Record<PatientInsight["riskLevel"], string>;
	query: string;
	savePatientAdministrativeProfile: () => void | Promise<void | boolean>;
	savePatientCore: () => void | Promise<void | boolean>;
	selectedPatient: Patient | null | undefined;
	setQuery: (value: string) => void;
	updatePatientAdministrativeProfileDraft: (
		field: keyof PatientAdministrativeProfileDraft,
		value: string | number[],
	) => void;
	updatePatientCoreDraft: (
		field: keyof PatientCoreDraft,
		value: string,
	) => void;
	weekdayOptions: WeekdayOption[];
};

export type TextFieldChangeEvent = ChangeEvent<
	HTMLInputElement | HTMLTextAreaElement
>;

/*
 * ОФОРМЛЕНИЕ ВИДИМЫХ ПОЛЕЙ БЫСТРОГО СОЗДАНИЯ.
 *
 * Только токены темы, ни одного зашитого цвета: ночная тема в DENTE тёплая,
 * тёмная — тёмная, и любой литерал вида #fff в одной из них становится светлым
 * пятном. Размеры в rem, чтобы зона переживала зум браузера, высокое DPI и
 * удлинение подписей при переводе.
 *
 * Почему инлайном, а не отдельными классами: раскладку шапки картотеки держит
 * apps/web/src/styles/patients-redesign.css, он прямо сейчас в работе у другого
 * инженера, и второй набор правил на те же узлы из другого файла разошёлся бы с
 * его набором. Его же комментарий в этом файле оставляет разметку подписей мне.
 */
const quickCreateFieldStyle: CSSProperties = {
	color: "var(--muted)",
	display: "flex",
	flexDirection: "column",
	fontSize: "0.75rem",
	fontWeight: 700,
	gap: "0.25rem",
	minWidth: 0,
};

const quickCreateInputStyle: CSSProperties = {
	background: "var(--paper-soft)",
	border: "1px solid var(--line-strong)",
	borderRadius: "9px",
	color: "var(--ink)",
	fontSize: "0.95rem",
	minHeight: "2.5rem",
	padding: "10px 12px",
	width: "100%",
};

export function PatientsView(rawProps?: Partial<PatientsViewProps>) {
	const logicContext = useAppLogicContext();
	const props = { ...logicContext, ...rawProps } as PatientsViewProps;
	const {
		selectedPatientId,
		patientCoreDraft,
		patientCoreSaveState,
		patientCoreDirty,
		patientAdministrativeProfileDraft,
		patientAdministrativeProfileSaveState,
		patientAdministrativeProfileDirty,
		newPatientName,
		newPatientPhone,
		newPatientBirthDate,
		isPatientCreating,
		setSelectedPatientId,
		setNewPatientName,
		setNewPatientPhone,
		setNewPatientBirthDate,
	} = usePatientStore();

	/*
	 * ЛОКАЛЬНОЙ КОПИИ ТЕКСТА ЗДЕСЬ БОЛЬШЕ НЕТ.
	 *
	 * БЫЛО: `smartInputText` жил рядом с `newPatientName` из хранилища, и половина
	 * экрана читала одно, половина другое. `value` поля брался из хранилища,
	 * условие Enter — из локальной копии, а `createPatient` чистил только
	 * хранилище. После успешного создания поле выглядело пустым, но Enter в нём
	 * открывал разбор с ФИО только что созданного пациента — прямой второй заход
	 * на ту же карту. Диктовка писала тоже только в локальную копию: закрыл окно
	 * разбора крестиком — «Создать» заводил пациента со старым, набранным раньше
	 * именем, а надиктованное исчезало из вида.
	 *
	 * Источник истины один — `newPatientName` из хранилища: что видно в поле, то и
	 * уйдёт в создание.
	 */
	const [showSmartPreview, setShowSmartPreview] = useState(false);
	const [smartParsedData, setSmartParsedData] = useState<ReturnType<
		typeof parsePatientDictationLocal
	> | null>(null);
	const [showHints, setShowHints] = useState(false);

	const {
		createPatient,
		filteredPatients,
		money,
		normalizeOptionalWorkingDaysDraft,
		patientAdministrativeProfileValidationMessage,
		patientInsightById,
		patientInsightRiskLabels,
		query,
		savePatientAdministrativeProfile,
		savePatientCore,
		selectedPatient,
		setQuery,
		updatePatientCoreDraft,
		updatePatientAdministrativeProfileDraft,
		weekdayOptions,
	} = props;

	useEffect(() => {
		if (
			!selectedPatientId &&
			filteredPatients.length > 0 &&
			filteredPatients[0]?.id
		) {
			setSelectedPatientId(filteredPatients[0].id);
		}
	}, [selectedPatientId, filteredPatients, setSelectedPatientId]);

	/*
	 * Преобладающее по клинике считается по ВСЕЙ клинике, а не по отфильтрованному
	 * списку: от того, что регистратор набрал в поиске, «обычное для клиники»
	 * меняться не должно. patientInsightById собран из dashboard.patientInsights —
	 * это все пациенты клиники, поэтому дополнительных данных не требуется.
	 * Само правило и тексты — в components/patients/patientListFeatureSalience.ts,
	 * рядом с прогоном.
	 */
	const featureSalience = useMemo(
		() =>
			patientListFeatureSalience({
				insights: Array.from(patientInsightById.values()),
				riskLabels: patientInsightRiskLabels,
			}),
		[patientInsightById, patientInsightRiskLabels],
	);

	const [showLostPatientsOnly, setShowLostPatientsOnly] = useState(false);
	const [lostPatientIds, setLostPatientIds] = useState<Set<string> | null>(
		null,
	);
	const [isLoadingLost, setIsLoadingLost] = useState(false);

	const toggleLostPatients = () => {
		if (showLostPatientsOnly) {
			setShowLostPatientsOnly(false);
			return;
		}
		setIsLoadingLost(true);
		fetch("/api/analytics/lost-patients-filters")
			.then((res) => (res.ok ? res.json() : []))
			.then((data: Array<{ id: string }>) => {
				const ids = new Set((data || []).map((item) => item.id));
				setLostPatientIds(ids);
				setShowLostPatientsOnly(true);
			})
			.catch(() => {
				setLostPatientIds(new Set());
				setShowLostPatientsOnly(true);
			})
			.finally(() => {
				setIsLoadingLost(false);
			});
	};

	const displayPatients = useMemo(() => {
		if (!showLostPatientsOnly || !lostPatientIds) return filteredPatients;
		return filteredPatients.filter((p) => lostPatientIds.has(p.id));
	}, [filteredPatients, showLostPatientsOnly, lostPatientIds]);

	const patientNameReady = newPatientName.trim().length > 0;
	const patientCreatePhoneIssue =
		newPatientPhone.trim().length > 0 &&
		newPatientPhone.replace(/\D/g, "").length < 5;
	const patientCreateReady =
		patientNameReady && !patientCreatePhoneIssue && !isPatientCreating;
	const patientCreateGuidance = !patientNameReady
		? "Укажите ФИО пациента. Телефон и дату рождения можно добавить позже."
		: patientCreatePhoneIssue
			? "Телефон пациента слишком короткий. Исправьте номер или очистите поле."
			: null;
	/*
	 * ENTER ТЕПЕРЬ ДЕЛАЕТ ТО, ЧТО ОБЕЩАЕТ.
	 *
	 * Подсказка поля обещала «(Enter)», а Enter создание не выполнял — открывал
	 * окно разбора, после которого требовались ещё «Применить» и «Создать». Здесь
	 * Enter в любом из трёх полей зоны создания заводит карту, ровно как нажатие
	 * «Создать», и подчиняется тем же условиям готовности: пустое ФИО и слишком
	 * короткий телефон не проходят, а причина отказа уже написана под шапкой
	 * (patientCreateGuidance). Повторное нажатие во время создания не отправляет
	 * второй запрос — это же проверяет createPatient.
	 */
	function handleQuickCreateKeyDown(
		event: ReactKeyboardEvent<HTMLInputElement>,
	) {
		if (event.key !== "Enter") return;
		event.preventDefault();
		if (!patientCreateReady) return;
		void createPatient();
	}

	const patientCoreNameMissing = patientCoreDraft.fullName.trim().length === 0;
	const patientCoreReadyToSave =
		Boolean(selectedPatient) &&
		patientCoreDirty &&
		patientCoreSaveState !== "saving" &&
		!patientCoreNameMissing;
	const patientAdministrativeProfileReadyToSave =
		Boolean(selectedPatient) &&
		patientAdministrativeProfileDirty &&
		patientAdministrativeProfileSaveState !== "saving" &&
		!patientAdministrativeProfileValidationMessage;
	const patientCoreSaveGuidanceId = "patient-core-save-guidance";
	const patientAdministrativeSaveGuidanceId = "patient-admin-save-guidance";
	const patientCoreSaveGuidance = !selectedPatient
		? "Выберите пациента перед сохранением карточки."
		: patientCoreNameMissing
			? "ФИО пациента обязательно для расписания, документов и связи."
			: patientCoreSaveState === "saving"
				? "Карточка пациента уже сохраняется."
				: !patientCoreDirty
					? "В карточке пациента нет новых изменений."
					: null;
	const patientAdministrativeSaveGuidance = !selectedPatient
		? "Выберите пациента перед сохранением реквизитов."
		: patientAdministrativeProfileValidationMessage
			? patientAdministrativeProfileValidationMessage
			: patientAdministrativeProfileSaveState === "saving"
				? "Реквизиты пациента уже сохраняются."
				: !patientAdministrativeProfileDirty
					? "В реквизитах пациента нет новых изменений."
					: null;

	return (
		<div className="patients-panel" id="patients">
			<header className="patients-header">
				<div className="patients-search-box">
					<Search aria-hidden="true" />
					<input
						aria-label="Поиск пациента"
						type="search"
						autoComplete="off"
						value={query}
						onChange={(event: TextFieldChangeEvent) =>
							setQuery(event.target.value)
						}
						placeholder="Поиск пациента: ФИО или телефон"
					/>
				</div>
				<div
					className="patients-filters"
					style={{ display: "flex", gap: "8px", alignItems: "center" }}
				>
					<button
						type="button"
						className={`secondary-button ${showLostPatientsOnly ? "active" : ""}`}
						onClick={toggleLostPatients}
						disabled={isLoadingLost}
						title="Показать пациентов без будущих приемов, открытых задач и записей в листе ожидания"
						style={{
							backgroundColor: showLostPatientsOnly ? "var(--teal)" : undefined,
							color: showLostPatientsOnly ? "white" : undefined,
							borderColor: showLostPatientsOnly ? "var(--teal)" : undefined,
						}}
					>
						{isLoadingLost
							? "Загрузка..."
							: showLostPatientsOnly
								? "Показаны потерянные"
								: "Потерянные"}
					</button>
				</div>
				<div className="smart-create-group">
					{/*
            ТЕЛЕФОН И ДАТА РОЖДЕНИЯ СТОЯЛИ ЗДЕСЬ ЖЕ, НО ПОД `display: none`, И
            ИЗ-ЗА ЭТОГО НАСТОЯЩЕГО ТЁЗКУ НЕЛЬЗЯ БЫЛО ЗАВЕСТИ С ЭТОГО ЭКРАНА.

            Сервер запрещает вторую карту с тем же ФИО, когда отличить человека
            нечем, и в отказе прямо называет выход: «Если это другой человек,
            добавьте телефон или дату рождения — с ними карта создастся»
            (patientNameOnlyDuplicateMessage, apps/api/src/routes/patients.ts).
            Оба поля заполнялись только из окна разбора диктовки, то есть текст
            отказа называл действие, которого на экране не было. Полные тёзки в
            картотеке — обычное дело: регистратор либо не заводил второго
            человека вовсе, либо дописывал к фамилии «2» и получал дубль под
            другим именем — ровно то, от чего запрет и защищает.

            Подписи видимые, а не placeholder: placeholder исчезает с первым
            символом, и после первого нажатия клавиши поля становятся
            неразличимы. Подписи связаны через htmlFor/id, а не обёрткой:
            внутри поля ФИО стоят кнопка микрофона, подсказки диктовки и окно
            разбора — обёртка <label> вокруг интерактивного содержимого даёт
            неочевидное поведение при нажатии.
          */}
					<div
						className="smart-create-fields"
						style={{
							alignItems: "flex-end",
							display: "flex",
							flex: "1 1 18rem",
							flexWrap: "wrap",
							gap: "0.5rem",
							minWidth: 0,
						}}
					>
						<div style={{ ...quickCreateFieldStyle, flex: "2 1 11rem" }}>
							<label htmlFor="patient-create-full-name">
								ФИО нового пациента
							</label>
							<div className="smart-input-wrapper">
								<input
									id="patient-create-full-name"
									autoComplete="name"
									value={newPatientName}
									onChange={(event: TextFieldChangeEvent) =>
										setNewPatientName(event.target.value)
									}
									onFocus={() => setShowHints(true)}
									onBlur={() => setTimeout(() => setShowHints(false), 200)}
									onKeyDown={handleQuickCreateKeyDown}
									placeholder="Фамилия Имя Отчество"
								/>
								<SmartMicrophoneButton
									context="patient"
									onResult={(text) => {
										/* Надиктованное попадает в ВИДИМОЕ поле сразу. Раньше оно
                       уходило в локальную копию, и пока окно разбора не
                       подтвердили «Применить», на экране оставалось прежнее
                       имя — а «Создать» брал именно его. */
										setNewPatientName(text);
										const parsed = parsePatientDictationLocal(text);
										setSmartParsedData(parsed);
										setShowSmartPreview(true);
										setShowHints(false);
									}}
									style={{
										position: "absolute",
										right: "4px",
										top: "50%",
										transform: "translateY(-50%)",
									}}
								/>
								<DictationHints isVisible={showHints} type="patient" />
								<SmartParsePreview
									isVisible={showSmartPreview}
									parsedData={smartParsedData}
									rawText={newPatientName}
									type="patient"
									onApply={(data: Record<string, string | undefined>) => {
										if (data) {
											setNewPatientName(data.fullName || newPatientName);
											if (data.phone) setNewPatientPhone(data.phone);
											if (data.birthDate)
												setNewPatientBirthDate(data.birthDate);
											if (data.notes)
												updatePatientCoreDraft("notes", data.notes);
										}
										setShowSmartPreview(false);
									}}
									onManual={() => setShowSmartPreview(false)}
									onClose={() => setShowSmartPreview(false)}
								/>
							</div>
						</div>
						<div style={{ ...quickCreateFieldStyle, flex: "1 1 9rem" }}>
							<label htmlFor="patient-create-phone">Телефон</label>
							<input
								id="patient-create-phone"
								type="tel"
								inputMode="tel"
								autoComplete="tel"
								title="Телефон нового пациента"
								placeholder="+7..."
								value={newPatientPhone}
								/* Приведение к единому виду — как в карточке пациента ниже:
                   иначе один и тот же номер лежит в базе в двух написаниях и
                   поиск по цифрам находит не всех. */
								onChange={(event: TextFieldChangeEvent) =>
									setNewPatientPhone(formatPhoneNumber(event.target.value))
								}
								onKeyDown={handleQuickCreateKeyDown}
								style={quickCreateInputStyle}
							/>
						</div>
						<div style={{ ...quickCreateFieldStyle, flex: "1 1 9rem" }}>
							<label htmlFor="patient-create-birth-date">Дата рождения</label>
							<input
								id="patient-create-birth-date"
								type="date"
								autoComplete="bday"
								title="Дата рождения нового пациента"
								value={newPatientBirthDate}
								onChange={(event: TextFieldChangeEvent) =>
									setNewPatientBirthDate(event.target.value)
								}
								onKeyDown={handleQuickCreateKeyDown}
								style={quickCreateInputStyle}
							/>
						</div>
					</div>
					{/*
            РАЗБОР НАБРАННОЙ СТРОКИ СТАЛ ВИДИМЫМ ДЕЙСТВИЕМ.

            БЫЛО: разбор висел на Enter, а подсказка поля обещала «(Enter)» так,
            что читалось это как «нажми Enter — пациент создан». Enter создание
            не выполнял: он открывал окно разбора, дальше требовались «Применить»
            и «Создать» — три шага вместо обещанного одного. Ни одна надпись на
            экране про разбор не говорила вовсе.

            ТЕПЕРЬ Enter в любом из трёх полей делает то, что обещано, —
            создаёт карту; а разбор строки вида «Иванов Иван Иванович,
            +7 916 200-10-20, 10.01.1970» на три поля стал отдельной кнопкой с
            подписью. Возможность разобрать вставленную строку не потеряна: она
            перестала быть скрытой.
          */}
					<button
						className="secondary-button"
						type="button"
						title="Разобрать набранную строку на ФИО, телефон и дату рождения"
						onClick={() => {
							setSmartParsedData(parsePatientDictationLocal(newPatientName));
							setShowSmartPreview(true);
							setShowHints(false);
						}}
						disabled={!patientNameReady}
					>
						Разобрать
					</button>
					<button
						className="primary-button quick-create-action"
						type="button"
						title="Создать пациента"
						onClick={createPatient}
						aria-describedby={
							patientCreateGuidance ? "patient-create-guidance" : undefined
						}
						disabled={!patientCreateReady}
						aria-busy={isPatientCreating || undefined}
					>
						<Plus aria-hidden="true" size={18} /> Создать
					</button>
				</div>
			</header>

			{patientCreateGuidance ? (
				<p
					className="quick-create-guidance"
					id="patient-create-guidance"
					role="status"
					aria-live="polite"
				>
					{patientCreateGuidance}
				</p>
			) : null}

			{/*
        ОБЩЕЕ ДЛЯ КЛИНИКИ — ОДНОЙ СТРОКОЙ НАД СПИСКОМ, А НЕ СЕМНАДЦАТЬ РАЗ В
        СТРОКАХ. Иначе состояние клиники читается как примета каждого пациента, и
        различающие признаки — остаток по деньгам, снимок на проверку — тонут
        среди повторов. Текст называет число: «у 14 из 17», а не «у большинства».
      */}
			{featureSalience.notices.map((notice) => (
				<p
					className="patients-clinic-wide-notice"
					key={notice}
					role="status"
					aria-live="polite"
				>
					{notice}
				</p>
			))}

			<div
				className="patients-main-grid"
				style={{
					display: "grid",
					gridTemplateColumns: "minmax(260px, 320px) 1fr",
					gap: "16px",
					marginTop: "16px",
				}}
			>
				{/* Left Column: Patient List */}
				<div className="patient-list">
					{displayPatients.map((patient) => {
						const insight = patientInsightById.get(patient.id);
						const patientIsSelected = selectedPatient?.id === patient.id;
						/*
              Метка риска, цветная полоса слева и надпись о действии рисуются
              ТОЛЬКО когда отличаются от преобладающего по клинике. Полоса шла
              от класса risk-* и стояла у всех 17 строк без исключения: жёлтая у
              14, красная у 3, ни одной строки без цвета. Теперь цвет означает
              «этот пациент не как остальные», а не «в клинике нет документов».
            */
						const riskDistinguishes = insight
							? featureDistinguishes(
									insight.riskLevel,
									featureSalience.prevailingRiskLevel,
								)
							: false;
						const nextActionDistinguishes = insight
							? featureDistinguishes(
									insight.nextBestAction,
									featureSalience.prevailingNextAction,
								)
							: false;
						return (
							/*
                РАМКА ФОКУСА СНЯТА С РАЗМЕТКИ, А НЕ ПОТЕРЯНА.

                БЫЛО: `focus:ring-2 focus:ring-teal-600 focus:outline-none`.
                Палитра Tailwind в проекте не переопределена — файла
                tailwind.config.* в дереве нет вовсе, `@theme` в листах стилей
                тоже нет, — поэтому `teal-600` это стоковый холодный
                oklch(60% 0.118 184.704) во всех трёх темах. Токен --teal при
                этом #0d9488 в светлой, #2dd4bf в тёмной и ТЁПЛЫЙ #e0a458 в
                ночной: её включают в вечернюю смену, чтобы экран не бил синим.

                И это была вторая рамка. Свой focus-visible на токене у строки
                уже есть — dente-redesign.css, «Глобальные focus-visible для всех
                интерактивных элементов»: `outline: 2px solid var(--teal)
                !important`. `!important` авторского листа бьёт `outline-style:
                none` из Tailwind независимо от порядка подключения, поэтому
                `focus:outline-none` ничего не гасил, а `ring` рисовался тенью
                ПОВЕРХ правильной рамки: с клавиатуры — двойной контур, мышью —
                только холодный стоковый (вариант `focus:` это `:focus`, а
                `:focus-visible` на нажатие мышью не срабатывает).
              */
							<article
								className={`patient-row ${insight && riskDistinguishes ? `risk-${insight.riskLevel}` : ""} ${patientIsSelected ? "selected" : ""}`}
								key={patient.id}
								role="button"
								tabIndex={0}
								aria-label={`Карточка пациента: ${patient.fullName}`}
								onClick={() => setSelectedPatientId(patient.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										setSelectedPatientId(patient.id);
									}
								}}
							>
								<div>
									<h3>{patient.fullName}</h3>
									<p>{patient.phone ?? "Телефон не указан"}</p>
									{insight &&
									(riskDistinguishes ||
										nextActionDistinguishes ||
										insight.balanceDueRub ||
										patient.status === "archived") ? (
										/*
                      Классы у плашек явные, а не «первый ребёнок / не первый».
                      Позиционные селекторы в main.css при скрытии метки риска
                      отдавали её оформление плашке остатка по деньгам — то есть
                      сумма долга начинала выглядеть меткой риска. Класс от
                      порядка отрисовки не зависит.
                    */
										<div className="patient-row-meta">
											{patient.status === "archived" ? (
												<span className="patient-risk-label" style={{ backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' }}>
													Черный список / Архив
												</span>
											) : null}
											{riskDistinguishes ? (
												<span className="patient-risk-label">
													{patientInsightRiskLabels[insight.riskLevel]}
												</span>
											) : null}
											{nextActionDistinguishes ? (
												<strong className="patient-next-action">
													{insight.nextBestAction}
												</strong>
											) : null}
											{insight.balanceDueRub ? (
												<span className="patient-row-chip">
													{money(insight.balanceDueRub)}
												</span>
											) : null}
										</div>
									) : (
										patient.status === "archived" ? (
											<div className="patient-row-meta">
												<span className="patient-risk-label" style={{ backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' }}>
													Черный список / Архив
												</span>
											</div>
										) : null
									)}
								</div>
								<button
									aria-label={`Открыть карточку пациента: ${patient.fullName}`}
									aria-pressed={patientIsSelected}
									/* Рамку фокуса даёт .round-link:focus-visible на токене темы —
                     см. пояснение у строки выше. Заодно возвращается проверка
                     scripts/smoke-daily-surfaces-keyboard-accessibility.mjs: она
                     ищет ровно className="round-link", и приписанные к классу
                     стоковые классы Tailwind её гасили. */
									className="round-link"
									type="button"
									title={`Открыть карточку пациента: ${patient.fullName}`}
									onClick={(e) => {
										e.stopPropagation();
										setSelectedPatientId(patient.id);
									}}
								>
									<ArrowRight aria-hidden="true" />
								</button>
							</article>
						);
					})}
					{displayPatients.length === 0 ? (
						/* Класс patient-empty-state вернулся на общий компонент намеренно:
               в мобильной вёрстке (styles/dente-redesign.css) на него навешаны
               правила с !important на токенах темы, а гейт
               scripts/smoke-patients-usability-source.mjs требует явного пустого
               состояния именно по этому имени. После перехода на общий
               компонент класс потеряли: на телефоне пустое состояние осталось
               без темы, а гейт краснел на живом, работающем экране. */
						<EmptyState
							className="patient-empty-state"
							icon={<Search size={28} />}
							title="Пациент не найден"
							/* БЫЛО «введите ФИО выше»: выше стояли два поля, и оба принимают
                 ФИО, — указание было неоднозначным ровно там, где регистратор
                 уже ошибся полем. Теперь названо конкретное поле по его
                 видимой подписи, а не место на экране: подпись не переезжает
                 при переносе шапки в колонку на узком экране. */
							description="Проверьте ФИО или телефон. Чтобы добавить нового пациента, заполните поле «ФИО нового пациента» и нажмите «Создать»."
							glass={false}
							style={{ padding: "24px 16px" }}
						/>
					) : null}
				</div>

				{/* Right Column: Selected Patient Details & Widgets */}
				<section
					className="patient-admin-panel"
					aria-label="Карточка активного пациента"
				>
					<div
						className="panel-heading compact-heading"
						style={{
							borderBottom: "none",
							paddingBottom: "0",
							marginBottom: "8px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
							{selectedPatient && (
								<PatientAvatar fullName={selectedPatient.fullName} size={36} />
							)}
							<span
								style={{
									fontSize: "16px",
									fontWeight: 700,
									color: "var(--ink)",
								}}
							>
								{selectedPatient
									? selectedPatient.fullName
									: "Карточка пациента"}
							</span>
						</div>
						{/*
              БЫЛО: цепочка условий прямо здесь, у которой последняя ветка
              безусловная — «Сохранено» по умолчанию. Плашка стояла зелёной на
              пустой карточке без выбранного пациента и утверждала запись,
              которой не было. Правило и словарь классов — в
              components/patients/patientCardSavePill.tsx, там же разобрано,
              почему это не правится подменой слова и почему класс статуса приёма
              здесь был чужим.
            */}
						{/*
              Сообщение валидации реквизитов сюда НЕ передаётся намеренно.
              patientAdministrativeProfileDraftIssue (AppHelpers.tsx) выдаёт его и
              по одним загруженным данным: полупару «удобно приходить с/до»
              создаёт нормализация на сервере, и она есть у пациентов, которых
              регистратор в этот раз даже не открывал. «Ошибка» у заголовка
              карточки в таком случае была бы ложным утверждением
              противоположного знака. Оно остаётся у плашки самого блока
              реквизитов — там рядом стоит текст, который объясняет причину.
            */}
						<PatientCardSavePill
							hasSelectedPatient={Boolean(selectedPatient)}
							sections={[
								{ dirty: patientCoreDirty, saveState: patientCoreSaveState },
								{
									dirty: patientAdministrativeProfileDirty,
									saveState: patientAdministrativeProfileSaveState,
								},
							]}
						/>
					</div>

					{/* Core Info Form */}
					<div
						className="clinic-profile-form-grid patient-core-form-grid"
						style={{
							gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
						}}
					>
						<label className="form-span-2">
							ФИО пациента
							<input
								autoComplete="name"
								value={patientCoreDraft.fullName}
								onChange={(event: TextFieldChangeEvent) =>
									updatePatientCoreDraft("fullName", event.target.value)
								}
								placeholder="Фамилия Имя Отчество"
							/>
						</label>
						<label>
							Дата рождения
							<input
								type="date"
								autoComplete="bday"
								value={patientCoreDraft.birthDate}
								onChange={(event: TextFieldChangeEvent) =>
									updatePatientCoreDraft("birthDate", event.target.value)
								}
							/>
						</label>
						<label>
							Телефон
							<input
								type="tel"
								inputMode="tel"
								autoComplete="tel"
								value={patientCoreDraft.phone}
								/* Приведение к единому виду перенесено из удалённой второй копии
                   этой же формы: там телефон нормализовался, здесь — нет. */
								onChange={(event: TextFieldChangeEvent) =>
									updatePatientCoreDraft(
										"phone",
										formatPhoneNumber(event.target.value),
									)
								}
								placeholder="+7..."
							/>
						</label>
						<label>
							Email
							<input
								type="email"
								autoComplete="email"
								value={patientCoreDraft.email}
								onChange={(event: TextFieldChangeEvent) =>
									updatePatientCoreDraft("email", event.target.value)
								}
								placeholder="patient@example.ru"
							/>
						</label>
						<div
							className="form-span-2"
							style={{ display: "flex", flexDirection: "column", gap: "4px" }}
						>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
								}}
							>
								<span
									style={{
										fontSize: "13px",
										fontWeight: 600,
										color: "var(--ink)",
									}}
								>
									Заметки и особенности
								</span>
								<SmartMicrophoneButton
									context="general"
									onResult={(t) => {
										const prev = patientCoreDraft.notes || "";
										updatePatientCoreDraft("notes", prev ? `${prev}, ${t}` : t);
									}}
								/>
							</div>
							<textarea
								value={patientCoreDraft.notes}
								onChange={(event: TextFieldChangeEvent) =>
									updatePatientCoreDraft("notes", event.target.value)
								}
								placeholder="Особые пожелания, аллергии, примечания"
								rows={3}
								style={{
									width: "100%",
									padding: "8px 12px",
									borderRadius: "8px",
									border: "1px solid var(--line)",
									fontSize: "14px",
									resize: "vertical",
									background: "var(--paper)",
									color: "var(--ink)",
								}}
							/>
							{/*
                Список сведён из двух: раньше на экране стояли две копии этой
                формы со своими наборами пометок, дописывающими в одно и то же
                поле. Повторное нажатие теперь ничего не дублирует — эта защита
                была только во второй копии.
              */}
							<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									gap: "6px",
									marginTop: "2px",
								}}
							>
								{[
									"Аллергия на анестезию",
									"Плохо переносит анестезию",
									"Боится уколов",
									"Очень тревожный",
									"Рвотный рефлекс",
									"VIP",
									"Денег не считает",
									"Должник",
									"Часто отменяет",
									"Просит звонить заранее",
									"Ортодонтический пациент",
									"Семья",
									"Согласовать скидку",
								].map((chip) => (
									<button
										key={chip}
										type="button"
										className="quick-chip"
										onClick={() => {
											const currentVal = patientCoreDraft.notes.trim();
											const chipLower = chip.toLowerCase();
											if (currentVal.toLowerCase().includes(chipLower)) return;
											const newVal = currentVal
												? `${currentVal}, ${chipLower}`
												: chipLower;
											updatePatientCoreDraft("notes", newVal);
										}}
									>
										+ {chip}
									</button>
								))}
							</div>
						</div>
					</div>

					<div
						className="patient-admin-actions"
						style={{
							marginTop: "16px",
							display: "flex",
							justifyContent: "flex-start",
						}}
					>
						<button
							className="primary-button"
							type="button"
							onClick={savePatientCore}
							aria-busy={patientCoreSaveState === "saving" || undefined}
							aria-describedby={
								patientCoreSaveGuidance ? patientCoreSaveGuidanceId : undefined
							}
							disabled={!patientCoreReadyToSave}
						>
							<UserCheck aria-hidden="true" /> Сохранить данные
						</button>
					</div>
					{patientCoreSaveGuidance ? (
						<p
							className="patient-save-guidance"
							id={patientCoreSaveGuidanceId}
							role="status"
							aria-live="polite"
						>
							{patientCoreSaveGuidance}
						</p>
					) : null}

					{/* PROMINENT OVERVIEW TAB: FAMILY, LOYALTY, RECLAMATIONS, ORTHODONTIC, TIMELINE, ARCHIVE */}
					{selectedPatient ? (
						<div
							style={{ marginTop: "24px" }}
							data-testid="patient-overview-tab"
						>
							<PatientOverviewTab />
						</div>
					) : null}

					{/*
            Clinical Tools: Odontogram & 2D X-Ray Analyzer

            Здесь стоял components/Odontogram.tsx, и у него было три проблемы,
            каждая клинически значимая:
              • состояния зубов жили в локальном сторе (patientStore.odontogramState)
                и НЕ сохранялись на сервер — отмеченный кариес исчезал при
                перезагрузке страницы;
              • стор один на всё приложение, без привязки к пациенту, поэтому
                формула одного пациента показывалась у всех остальных;
              • компонент рендерился и без выбранного пациента.
            Всё это при том, что бэкенд давно умеет
            GET/POST /api/patients/:id/tooth-states и историю зуба, а
            odontogram/OdontogramModule.tsx их вызывает и умеет поверхности,
            детскую формулу, мультивыбор и историю — просто нигде не был
            подключён. Формула привязана к пациенту, поэтому и рендерится только
            когда пациент выбран.
          */}
					{selectedPatient ? (
						<div style={{ marginTop: "24px", marginBottom: "16px" }}>
							<OdontogramModule patientId={selectedPatient.id} />
						</div>
					) : null}

					<VisiographAnalyzer />

					{/* Administrative / Passport Documents Collapsible */}
					<details
						className="settings-advanced-block patient-docs-collapsible"
						style={{ marginTop: "24px" }}
					>
						<summary className="settings-advanced-toggle">
							<span className="settings-advanced-label">
								<span className="settings-advanced-icon">📄</span>
								Паспортные данные и реквизиты документов
							</span>
							<span className="settings-advanced-hint">
								Паспорт, ИНН, СНИЛС, представитель, договор
							</span>
							<span className="settings-advanced-chevron"> </span>
						</summary>
						<div className="settings-advanced-form">
							<div
								className="panel-heading compact-heading patient-doc-heading"
								style={{
									borderBottom: "none",
									paddingBottom: "0",
									marginBottom: "8px",
								}}
							>
								<div>
									<span
										style={{
											fontSize: "14px",
											fontWeight: 600,
											color: "var(--ink)",
										}}
									>
										Документы и СНИЛС
									</span>
								</div>
								{/*
                  БЫЛО: та же цепочка со своей безусловной последней ветвью —
                  «Заполнено». Она утверждала, что паспорт, ИНН и СНИЛС внесены, у
                  пациента, у которого не заполнено ни одно из шестнадцати полей;
                  ветка «Сохранено» здесь была честной, но словарь классов —
                  такой же чужой, статуса приёма. Общий компонент с плашкой
                  заголовка карточки взят намеренно: две копии одного выражения
                  рядом уже разошлись — у одной ветка "saved" проверялась, у
                  другой нет.
                */}
								<PatientCardSavePill
									hasSelectedPatient={Boolean(selectedPatient)}
									sections={[
										{
											dirty: patientAdministrativeProfileDirty,
											saveState: patientAdministrativeProfileSaveState,
											validationMessage:
												patientAdministrativeProfileValidationMessage,
										},
									]}
								/>
							</div>
							{patientAdministrativeProfileValidationMessage ? (
								<p className="save-error patient-admin-validation">
									{patientAdministrativeProfileValidationMessage}
								</p>
							) : null}

							{/*
                Реквизиты рисует components/patient/PatientAdministrativeForm.tsx.

                ЗДЕСЬ СТОЯЛА КОПИЯ ЭТОГО БЛОКА НА 11 ПОЛЕЙ ИЗ 16, и обе версии
                лежали в дереве одновременно. Пяти полей — «Кому выдавать
                документы», «Основание обработки персональных данных», «Удобно
                приходить с/до» и «Комментарий к записи» — не было ни на одном
                смонтированном экране, хотя сервер их использует: первые два
                печатаются в юридические документы
                (apps/api/src/documents/renderDocument.ts), окно приема читает
                движок предупреждений расписания (apps/api/src/sampleData.ts).
                Ввести их было нечем, поэтому в документ всегда уходила
                заглушка, а предупреждение «прием вне удобного окна пациента» не
                срабатывало никогда.

                Хуже: валидатор реквизитов
                (AppHelpers.patientAdministrativeProfileDraftIssue) требует
                указывать окно приема парой и при полупаре «начало есть, конца
                нет» отключает кнопку «Сохранить реквизиты» и отложенное
                сохранение — по полям, которых на экране не было. Полупару
                создаёт сама нормализация на сервере и прогоняет по всем
                пациентам при загрузке состояния, а значит паспорт, ИНН, СНИЛС и
                представителя такого пациента нельзя было сохранить через
                интерфейс вообще.

                Валидация, флаг изменений, отложенное сохранение, кнопка, плашка
                состояния и сообщение об отказе сервера остались здесь и в
                hooks/domains/usePatientLogic.ts — форма их не трогает и не
                может с ними разойтись.
              */}
							<PatientAdministrativeForm
								patientAdministrativeProfileDraft={
									patientAdministrativeProfileDraft
								}
								updatePatientAdministrativeProfileDraft={
									updatePatientAdministrativeProfileDraft
								}
								weekdayOptions={weekdayOptions}
								normalizeOptionalWorkingDaysDraft={
									normalizeOptionalWorkingDaysDraft
								}
							/>

							<div
								className="patient-admin-actions"
								style={{
									marginTop: "16px",
									display: "flex",
									justifyContent: "flex-start",
								}}
							>
								<button
									className="primary-button"
									type="button"
									onClick={savePatientAdministrativeProfile}
									aria-busy={
										patientAdministrativeProfileSaveState === "saving" ||
										undefined
									}
									aria-describedby={
										patientAdministrativeSaveGuidance
											? patientAdministrativeSaveGuidanceId
											: undefined
									}
									disabled={!patientAdministrativeProfileReadyToSave}
								>
									<ShieldCheck aria-hidden="true" /> Сохранить реквизиты
								</button>
							</div>
							{patientAdministrativeSaveGuidance ? (
								<p
									className="patient-save-guidance"
									id={patientAdministrativeSaveGuidanceId}
									role="status"
									aria-live="polite"
								>
									{patientAdministrativeSaveGuidance}
								</p>
							) : null}
						</div>
					</details>
				</section>
				{/* Раскладка группы — в patients-redesign.css (.patients-widgets-grid).
            Инлайном стоял минимум дорожки 280px: на окне 720 группа получала две
            колонки по ~311px, ряд растягивался до высоты самой высокой карточки,
            и рядом с разбором дублей стояла пустая панель на 44 % ширины окна. */}
				<div className="patients-widgets-grid">
					{/* Оба виджета читают данные конкретного пациента, поэтому
              получают выбранного — иначе запрос уходит без пациента и
              карточка показывает чужие звонки и чужие блокировки. */}
					<PatientArchiveReasonsAndBlacklistsWidget
						patientId={selectedPatientId}
					/>
					<PatientCommunicationTimelinesWidget patientId={selectedPatientId} />
					{selectedPatientId ? (
						<div className="mt-4" data-testid="patient-comm-consents-mount">
							<PatientCommunicationConsentsPanel
								patientId={selectedPatientId}
							/>
						</div>
					) : null}
					{selectedPatientId ? (
						<div className="mt-4" data-testid="patient-whatsapp-send-mount">
							<PatientWhatsappSendPanel
								patientId={selectedPatientId}
								patientPhone={
									selectedPatient?.phone ?? patientCoreDraft.phone ?? null
								}
								patientName={
									selectedPatient?.fullName ?? patientCoreDraft.fullName ?? null
								}
							/>
						</div>
					) : null}
					{selectedPatientId ? (
						<div className="mt-4" data-testid="patient-attachments-mount">
							<PatientAttachmentsPanel
								patientId={selectedPatientId}
								patientName={
									selectedPatient?.fullName ?? patientCoreDraft.fullName ?? null
								}
							/>
						</div>
					) : null}

					{/*
            Отсюда убраны <BulkImageOperationLogsWidget /> и
            <PatientServiceLineagesWidget />. Журнал массовых операций со
            снимками звал /api/crm/bulk-image-operation-logs, которого на
            сервере вообще нет — ответ 404, а обёртка превращала его в пустой
            список. Преемственность услуг читала patient_service_lineages: ни
            одного писателя во всём проекте, ноль строк в живой базе. Обе
            панели занимали место в сетке и не могли показать ничего.
          */}
					{/*
            Отсюда убран <CustomCrmTaskTypesWidget /> — «Кастомные типы задач CRM».
            Он читал GET /api/crm/custom-crm-task-types: маршрут есть и отвечает
            200, но в таблицу custom_crm_task_types не пишет НИКТО. Во всём
            репозитории на неё есть ровно две ссылки: миграция
            drizzle/0077_add_custom_crm_task_types.sql, которая её создаёт, и один
            SELECT в apps/api/src/db/customCrmTaskTypesQuery.ts. Ни одного INSERT
            — ни в маршрутах, ни в сидах, ни в скриптах. Поэтому панель показывала
            «Типы задач отсутствуют» в любой клинике, сколько бы та ни работала, и
            занимала в стопке место рядом с настоящими цифрами. Та же пустая
            панель дублировалась ещё на двух экранах — «Маркетинг» и настройки
            CRM, — то есть одна и та же пустота повторялась трижды.
            Не возвращайте её, пока не появится писатель: экрана создания типа
            задачи в продукте нет, заполниться ей нечем. Сам файл виджета не
            удалён здесь намеренно — остальные его монтирования и серверную часть
            снимает ведущий одним согласованным коммитом.
          */}
					<PatientDuplicateMergeQueuesWidget />
				</div>
			</div>
		</div>
	);
}
