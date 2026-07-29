import type { ProtocolTemplate } from "@dental/shared";
import { ClipboardCheck, Edit2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast, NO_RESPONSE_CAUSE } from "../../lib/panelStateText";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { EmptyState } from "../EmptyState";
import { showToast } from "../GlobalToast";
import "./SettingsProtocolsTab.css";

/**
 * Отказ сервера человеческими словами.
 *
 * БЫЛО: `data.message || "Ошибка сохранения шаблона"` и `"Ошибка удаления"` —
 * ни причины, ни того, что делать. Хуже, что формулировка сервера бралась без
 * разбора: у API нет обработчика ненайденного адреса (apps/api/src/server.ts,
 * setNotFoundHandler отсутствует), поэтому Fastify сам отвечает английским
 * «Route POST:/api/settings/protocols not found» — и администратор клиники
 * читал бы именно это.
 *
 * Поэтому формулировку сервера берём только если она действительно по-русски:
 * ровно такую же проверку делает сам сервер в publicApiErrorMessage
 * (apps/api/src/server.ts:226-233), прежде чем показать текст исключения
 * человеку. Иначе причину называем по коду ответа общими для всех панелей
 * словами из lib/panelStateText.ts.
 */
async function refusalMessage(response: Response, action: string): Promise<string> {
	let serverMessage = "";
	try {
		const payload = (await response.json()) as { message?: unknown };
		if (typeof payload.message === "string") serverMessage = payload.message.trim();
	} catch {
		// Тело не разобралось (HTML прокси, пустой ответ) — причина будет по коду.
	}
	if (serverMessage && /[А-Яа-яЁё]/.test(serverMessage)) {
		return `${action}: ${serverMessage}`;
	}
	// Код ответа и техническая строка нужны поддержке, а не человеку у стойки.
	console.error(
		`[SettingsProtocolsTab] ${response.url} ответил ${response.status}: ${serverMessage || "без сообщения"}`,
	);
	return actionFailureToast(action, response.status);
}

export function SettingsProtocolsTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const {
		dashboard,
		specialtyLabels,
		documentLabels,
		imagingKindLabels,
		applyProtocolTemplate,
		auth,
	} = mergedProps;

	const typedProtocolTemplates = (dashboard?.protocolTemplates ||
		[]) as ProtocolTemplate[];

	const [isEditing, setIsEditing] = useState<boolean>(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<Partial<ProtocolTemplate>>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleCreateNew = () => {
		setEditingId(null);
		setEditForm({
			specialty: "universal",
			title: "Новый шаблон",
			visitReason: "Первичный прием",
			defaultDurationMinutes: 30,
			complaintPrompt: "",
			objectiveTemplate: "",
			treatmentPlanTemplate: "",
			diagnosisHints: [],
			requiredDocuments: [],
			suggestedImaging: [],
			safetyWarnings: [],
		});
		setIsEditing(true);
	};

	const handleEdit = (template: ProtocolTemplate) => {
		setEditingId(template.id);
		setEditForm({ ...template });
		setIsEditing(true);
	};

	const handleCancel = () => {
		setIsEditing(false);
		setEditingId(null);
		setEditForm({});
		setError(null);
	};

	const handleSave = async () => {
		setError(null);
		setLoading(true);
		try {
			const method = editingId ? "PUT" : "POST";
			const url = editingId
				? `/api/settings/protocols/${editingId}`
				: "/api/settings/protocols";

			/*
			 * ЗАГОЛОВКИ БЕРУТСЯ У ОБЩЕГО ПОМОЩНИКА НАСТРОЕК, А НЕ СОБИРАЮТСЯ ЗДЕСЬ.
			 *
			 * БЫЛО: `"x-dente-admin-secret": clinicToken` с пометкой «for fallback
			 * compatibility» — то есть токен клиники отправлялся ПОД ВИДОМ секрета
			 * администратора настроек. Это работает ровно до тех пор, пока секрет на
			 * сервере не задан: тогда охрана настроек пропускает запрос без него
			 * вовсе. Как только установка получает DENTE_SETTINGS_ADMIN_SECRET —
			 * а это и есть боевая установка, — сервер сравнивает присланное значение
			 * с настоящим секретом, не находит совпадения и отвечает 403. Клиника
			 * теряет возможность завести или исправить шаблон приёма, и причина
			 * выглядит как «нет прав», хотя права есть.
			 *
			 * settingsAccessHeaders отправляет СЕССИОННЫЙ секрет домена настроек —
			 * тот, который администратор ввёл в разблокировке, — и вместе с ним
			 * токены клиники и сотрудника, каждый в своём заголовке. Секрета нет —
			 * заголовка нет вовсе, и сервер отвечает своим человеческим отказом, а
			 * не сравнивает мусор.
			 */
			const res = await fetch(url, {
				method,
				headers: auth.settingsAccessHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(editForm),
			});

			if (!res.ok) {
				setError(await refusalMessage(res, "Шаблон не сохранён"));
				return;
			}

			// Reload page to refresh dashboard state
			window.location.reload();
		} catch (err: any) {
			/*
			 * Сюда попадает только обрыв до ответа. БЫЛО: `err.message ||
			 * "Неизвестная ошибка"`, то есть в красной плашке появлялся английский
			 * текст исключения браузера («Failed to fetch»).
			 */
			console.error(err);
			setError(`Шаблон не сохранён: ${NO_RESPONSE_CAUSE}.`);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Вы уверены, что хотите удалить этот шаблон?")) return;
		setLoading(true);
		try {
			// Тот же помощник, что при сохранении: удаление шло тем же путём и тем
			// же образом упиралось бы в 403 в боевой установке.
			const res = await fetch(`/api/settings/protocols/${id}`, {
				method: "DELETE",
				headers: auth.settingsAccessHeaders(),
			});

			if (!res.ok) {
				// БЫЛО: «Ошибка удаления» на любой отказ — от нехватки прав до
				// недоступного сервера. Шаблон при этом остаётся на месте.
				showToast(await refusalMessage(res, "Шаблон не удалён"), "error");
				setLoading(false);
				return;
			}
			window.location.reload();
		} catch (err: any) {
			// БЫЛО: `err.message` — английский текст исключения браузера.
			console.error(err);
			showToast(`Шаблон не удалён: ${NO_RESPONSE_CAUSE}.`, "error");
			setLoading(false);
		}
	};

	if (isEditing) {
		return (
			<section className="protocol-settings animate-fade-in">
				<div className="import-copy">
					<ClipboardCheck aria-hidden="true" />
					<div>
						<h2>{editingId ? "Редактирование шаблона" : "Новый шаблон"}</h2>
						<p>Настройте параметры клинического протокола.</p>
					</div>
				</div>

				{error && (
					<div className="dente-alert dente-alert-danger" role="alert">
						{error}
					</div>
				)}

				<div className="settings-form-grid" style={{ marginTop: "1.5rem" }}>
					<label className="dente-label">
						<span>Название</span>
						<input
							type="text"
							className="dente-input"
							value={editForm.title || ""}
							onChange={(e) =>
								setEditForm((prev) => ({ ...prev, title: e.target.value }))
							}
						/>
					</label>
					<label className="dente-label">
						<span>Специальность</span>
						<select
							className="dente-input"
							value={editForm.specialty || "universal"}
							onChange={(e) =>
								setEditForm((prev) => ({
									...prev,
									specialty: e.target.value as any,
								}))
							}
						>
							{Object.entries(specialtyLabels as Record<string, string>).map(
								([key, label]) => (
									<option key={key} value={key}>
										{label}
									</option>
								),
							)}
						</select>
					</label>
					<label className="dente-label">
						<span>Причина визита (по-умолчанию)</span>
						<input
							type="text"
							className="dente-input"
							value={editForm.visitReason || ""}
							onChange={(e) =>
								setEditForm((prev) => ({
									...prev,
									visitReason: e.target.value,
								}))
							}
						/>
					</label>
					<label className="dente-label">
						<span>Длительность (мин)</span>
						<input
							type="number"
							className="dente-input"
							value={editForm.defaultDurationMinutes || 30}
							onChange={(e) =>
								setEditForm((prev) => ({
									...prev,
									defaultDurationMinutes: parseInt(e.target.value, 10) || 30,
								}))
							}
						/>
					</label>
				</div>

				<div style={{ marginTop: "1rem" }}>
					<label className="dente-label">
						<span>Шаблон жалоб (подсказка)</span>
						<textarea
							className="dente-input"
							rows={3}
							value={editForm.complaintPrompt || ""}
							onChange={(e) =>
								setEditForm((prev) => ({
									...prev,
									complaintPrompt: e.target.value,
								}))
							}
						/>
					</label>
					<label className="dente-label" style={{ marginTop: "1rem" }}>
						<span>Шаблон объективного статуса</span>
						<textarea
							className="dente-input"
							rows={3}
							value={editForm.objectiveTemplate || ""}
							onChange={(e) =>
								setEditForm((prev) => ({
									...prev,
									objectiveTemplate: e.target.value,
								}))
							}
						/>
					</label>
					<label className="dente-label" style={{ marginTop: "1rem" }}>
						<span>Шаблон плана лечения</span>
						<textarea
							className="dente-input"
							rows={3}
							value={editForm.treatmentPlanTemplate || ""}
							onChange={(e) =>
								setEditForm((prev) => ({
									...prev,
									treatmentPlanTemplate: e.target.value,
								}))
							}
						/>
					</label>
				</div>

				<div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
					<button
						className="primary-button"
						onClick={handleSave}
						disabled={loading}
					>
						{loading ? "Сохранение..." : "Сохранить"}
					</button>
					<button
						className="secondary-button"
						onClick={handleCancel}
						disabled={loading}
					>
						Отмена
					</button>
				</div>
			</section>
		);
	}

	return (
		<section
			className="protocol-settings animate-fade-in"
			aria-label="Библиотека клинических протоколов"
		>
			<div
				className="import-copy"
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
				}}
			>
				<div style={{ display: "flex", gap: "1rem" }}>
					<ClipboardCheck aria-hidden="true" />
					<div>
						<p className="eyebrow">Протоколы</p>
						<h2>Шаблоны приема по специальностям</h2>
						<p>
							Настройте протоколы для ваших врачей, чтобы ускорить заполнение
							карты.
						</p>
					</div>
				</div>
				<button className="primary-button" onClick={handleCreateNew}>
					<Plus size={16} /> Добавить шаблон
				</button>
			</div>

			{/*
				ТРИ СОСТОЯНИЯ ВМЕСТО ОДНОГО.

				БЫЛО: сразу `typedProtocolTemplates.map(...)`. У клиники без шаблонов
				под заголовком не было НИЧЕГО — ни «шаблонов нет», ни подсказки, зачем
				они нужны и с чего начать. Пустая вкладка выглядела как незагруженная.

				Ветка «загружаем» — защита, а не наблюдаемое состояние: сегодня
				App.tsx:2333 не пускает в рабочую оболочку без загруженного dashboard,
				но тип у него нullable, и вкладка не должна утверждать «шаблонов нет»,
				если данных клиники у неё вообще нет.
			*/}
			{!dashboard ? (
				<EmptyState
					icon={<ClipboardCheck aria-hidden="true" />}
					title="Загружаем шаблоны протоколов..."
					description="Это займёт пару секунд."
				/>
			) : typedProtocolTemplates.length === 0 ? (
				<EmptyState
					icon={<ClipboardCheck aria-hidden="true" />}
					title="Шаблонов приёма пока нет"
					description="Шаблон подставляет врачу причину визита, длительность, нужные документы и снимки. Создайте первый — по одному на частый приём, например «Лечение кариеса» и «Осмотр»."
					action={
						<button className="primary-button" type="button" onClick={handleCreateNew}>
							<Plus size={16} /> Добавить шаблон
						</button>
					}
				/>
			) : (
			<div className="protocol-settings-grid">
				{typedProtocolTemplates.map((template) => (
					<article className="protocol-settings-card" key={template.id}>
						<div className="protocol-settings-head">
							<span>{specialtyLabels[template.specialty]}</span>
							<strong>{template.title}</strong>
							<p>
								{template.visitReason} · {template.defaultDurationMinutes} мин
							</p>
						</div>
						<div
							className="protocol-token-row"
							aria-label="Документы протокола"
						>
							{template.requiredDocuments.map((kind) => (
								<span key={kind}>{documentLabels[kind]}</span>
							))}
						</div>
						<div
							className="protocol-token-row protocol-token-row-soft"
							aria-label="Снимки протокола"
						>
							{template.suggestedImaging.map((kind) => (
								<span key={kind}>{imagingKindLabels[kind]}</span>
							))}
						</div>
						<ul>
							{template.safetyWarnings.slice(0, 2).map((warning) => (
								<li key={warning}>{warning}</li>
							))}
						</ul>
						<div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
							<button
								className="secondary-button"
								type="button"
								onClick={() => handleEdit(template)}
								title="Редактировать"
								aria-label={`Редактировать шаблон «${template.title}»`}
							>
								<Edit2 size={16} />
							</button>
							{/*
								КНОПКА УДАЛЕНИЯ СНОВА КРАСНАЯ.

								БЫЛО: className="danger-button" и цвета
								var(--dente-red-10) / var(--dente-red-60). Правила
								.danger-button нет ни в одном файле стилей, а имён
								--dente-red-* не существует нигде в проекте: неизвестное
								имя делает объявление недействительным, поэтому фон
								становился прозрачным (background не наследуется), а
								значок Trash2 — обычным цветом текста. Кнопка удаления
								выглядела ровно как нейтральная иконка, ни одним пикселем
								не предупреждая, что она сносит шаблон.

								СТАЛО: форма и размер от .secondary-button — те же, что у
								«Редактировать», без своей рамки и padding поверх, — а
								цвета из объявленных семантических токенов --bad-bg и
								--bad-fg (styles/dente-redesign.css:30, есть во всех трёх
								темах).
							*/}
							<button
								className="secondary-button"
								type="button"
								style={{
									backgroundColor: "var(--bad-bg)",
									color: "var(--bad-fg)",
								}}
								onClick={() => handleDelete(template.id)}
								title="Удалить"
								aria-label={`Удалить шаблон «${template.title}»`}
								disabled={loading}
							>
								<Trash2 size={16} />
							</button>
						</div>
					</article>
				))}
			</div>
			)}
		</section>
	);
}
