import { Plus, Trash2 } from "lucide-react";

interface RoutingRule {
	intent: string;
	assignToUserId: string | null;
}

interface StaffRouting {
	defaultUserId: string | null;
	rules: RoutingRule[];
}

interface StaffOption {
	id: string;
	fullName: string;
}

interface Props {
	routing: StaffRouting;
	onChange: (routing: StaffRouting) => void;
	staffOptions: StaffOption[];
}

const INTENT_LABELS: Record<string, string> = {
	appointment_booking: "Запись на приём",
	appointment_status: "Статус записи",
	document_request: "Запрос документов",
	payment_question: "Вопрос об оплате",
	recall_request: "Заявка на консультацию",
	general_question: "Общий вопрос",
};

const INTENTS = Object.keys(INTENT_LABELS);

/**
 * Роутинг изменён по сравнению с тем, что сохранено в клинике.
 *
 * ЧТО БЫЛО СЛОМАНО. Обе панели мессенджеров (MaxSettingsPanel,
 * WhatsappSettingsPanel) считали признак изменений только по своим полям ввода —
 * Bot ID, токен, «Активен» — и не смотрели на роутинг. Владелец указывал, кому
 * направлять входящие сообщения пациентов, а кнопка «Сохранить» оставалась
 * выключенной: заполнил, а сохранить нечем. Правило уходило вместе с закрытой
 * вкладкой, и входящие продолжали идти в никуда.
 *
 * Сравнение живёт здесь, рядом с формой роутинга: это она знает свою форму
 * данных, а не панели. Сравниваем по полям, а не через JSON.stringify: порядок
 * ключей в правиле зависит от того, кто его собрал (нормализатор ответа сервера
 * или spread при правке), и на разном порядке одинаковый роутинг считался бы
 * изменённым — кнопка «Сохранить» горела бы всегда.
 */
export function messengerRoutingChanged(
	draft: StaffRouting,
	saved: StaffRouting | null | undefined,
): boolean {
	const savedRouting: StaffRouting = saved ?? {
		defaultUserId: null,
		rules: [],
	};
	if ((draft.defaultUserId ?? null) !== (savedRouting.defaultUserId ?? null))
		return true;
	if (draft.rules.length !== savedRouting.rules.length) return true;
	return draft.rules.some((rule, index) => {
		const savedRule = savedRouting.rules[index];
		return (
			!savedRule ||
			rule.intent !== savedRule.intent ||
			(rule.assignToUserId ?? null) !== (savedRule.assignToUserId ?? null)
		);
	});
}

export function MessengerRoutingRules({
	routing,
	onChange,
	staffOptions,
}: Props) {
	const setDefaultUser = (userId: string | null) => {
		onChange({ ...routing, defaultUserId: userId || null });
	};

	const addRule = () => {
		const usedIntents = routing.rules.map((r) => r.intent);
		const nextIntent = INTENTS.find((i) => !usedIntents.includes(i));
		if (!nextIntent) return;
		onChange({
			...routing,
			rules: [...routing.rules, { intent: nextIntent, assignToUserId: null }],
		});
	};

	const updateRule = (index: number, patch: Partial<RoutingRule>) => {
		const rules = routing.rules.map((r, i) =>
			i === index ? { ...r, ...patch } : r,
		);
		onChange({ ...routing, rules });
	};

	const removeRule = (index: number) => {
		onChange({
			...routing,
			rules: routing.rules.filter((_, i) => i !== index),
		});
	};

	return (
		<div className="messenger-routing-rules">
			<div className="routing-default-row">
				<label htmlFor="routing-default-user">По умолчанию</label>
				<select
					id="routing-default-user"
					value={routing.defaultUserId ?? ""}
					onChange={(e) => setDefaultUser(e.target.value || null)}
				>
					<option value="">— Не назначен —</option>
					{staffOptions.map((s) => (
						<option key={s.id} value={s.id}>
							{s.fullName}
						</option>
					))}
				</select>
			</div>

			{routing.rules
				.map((rule, i) => ({
					rule,
					i,
					ruleId: `rule-${rule.intent}-${rule.assignToUserId ?? "none"}-${i}`,
				}))
				.map(({ rule, i, ruleId }) => (
					<div key={ruleId} className="routing-rule-row">
						<select
							value={rule.intent}
							onChange={(e) => updateRule(i, { intent: e.target.value })}
							aria-label={`Тип запроса ${i + 1}`}
						>
							{INTENTS.map((intent) => (
								<option key={intent} value={intent}>
									{INTENT_LABELS[intent]}
								</option>
							))}
						</select>
						<span className="routing-arrow">→</span>
						<select
							value={rule.assignToUserId ?? ""}
							onChange={(e) =>
								updateRule(i, { assignToUserId: e.target.value || null })
							}
							aria-label={`Назначить сотруднику ${i + 1}`}
						>
							<option value="">— Не назначен —</option>
							{staffOptions.map((s) => (
								<option key={s.id} value={s.id}>
									{s.fullName}
								</option>
							))}
						</select>
						<button
							type="button"
							onClick={() => removeRule(i)}
							className="routing-rule-remove"
							aria-label="Удалить правило"
						>
							<Trash2 size={14} />
						</button>
					</div>
				))}

			{INTENTS.length > routing.rules.length && (
				<button type="button" onClick={addRule} className="routing-add-rule">
					<Plus size={14} />
					Добавить правило
				</button>
			)}
		</div>
	);
}
