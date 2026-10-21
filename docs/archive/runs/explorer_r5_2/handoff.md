# Handoff Report — Explorer 2 (Session R5)

**Task**: Deep code investigation of `MessageDeliveryConsole.tsx` and `dente-operations.css` (PC Light Form Squashing defect under "ПОСТАВИТЬ В ОЧЕРЕДЬ").

---

## 1. Observation

### Exact File Paths & Code Locations
- **`apps/web/src/components/communications/MessageDeliveryConsole.tsx`** (Lines 1008–1207)
  - Element: `<div className="ops-editor flex flex-col gap-4" data-testid="outbox-enqueue-form">`
  - Elements: `<div className="ops-toolbar flex flex-wrap items-start gap-4 mb-2">`
  - Fields: `<span className="ops-field flex-1 min-w-[140px] flex flex-col gap-1.5">`
  - Labels: `<label className="text-xs font-semibold text-[var(--muted)] mb-1 block leading-normal">`
  - Inputs / Selects: `<select className="h-10 px-3 py-2 rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink)] font-normal text-sm leading-normal focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] min-h-[40px] w-full">`

- **`apps/web/src/styles/dente-operations.css`** (Lines 82–136)
  - `.ops-toolbar`: `display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; margin: 0 0 16px;`
  - `.ops-field`: `display: flex; flex-direction: column; gap: 4px; min-width: 0;`
  - `.ops-field > label`: `font-size: 11.5px; font-weight: 600; letter-spacing: 0.01em; color: var(--muted);`
  - `.ops-field > input, .ops-field > select, .ops-field > textarea`: `padding: 8px 10px; border-radius: 10px; border: 1px solid var(--line-strong); background: var(--paper); color: var(--ink); font: inherit; font-size: 13.5px;`

- **`apps/web/src/styles/dente-redesign.css`** (Lines 1666–1677)
  - `select`: `appearance: none; background-image: url(...); background-position: right 12px center; padding-right: 36px; background-color: var(--paper-soft); border: 1px solid var(--line-strong); color: var(--ink); border-radius: 10px;`

---

## 2. Logic Chain

1. **Defect Description**: On `PC_Light_panel_communications.png`, under section "ПОСТАВИТЬ В OЧЕРЕДЬ", form inputs for channel ("SMS"), intent ("Произвольное"), and scope ("Сервисное") are vertically squashed and overlapping their labels.
2. **Standard Architecture**: `dente-operations.css` is the project authority for `.ops-panel`, `.ops-editor`, `.ops-toolbar`, and `.ops-field`.
3. **Identification of Root Cause**:
   - **Inline Tailwind Overrides Conflict**: In `MessageDeliveryConsole.tsx` lines 1008-1207, the form under "ПОСТАВИТЬ В ОЧЕРЕДЬ" was modified with conflicting inline Tailwind classes (`flex flex-col gap-4`, `flex-wrap items-start gap-4 mb-2`, `flex-1 min-w-[140px] flex flex-col gap-1.5`, `text-xs font-semibold text-[var(--muted)] mb-1 block leading-normal`, `h-10 px-3 py-2 ... min-h-[40px] w-full`).
   - **Vertical Alignment Collision**: `.ops-toolbar` in CSS uses `align-items: flex-end`. Adding `items-start` (`align-items: flex-start`) forces flex children (`span.ops-field`) to align at the top instead of baseline/flex-end, causing uneven vertical positioning.
   - **Double Gap / Margin**: `span.ops-field` has `gap-1.5` (6px) AND `<label>` has `mb-1` (4px `margin-bottom`), creating 10px vertical offset between label and input.
   - **Height Constraint & Padding Collision**: `<select>` was forced to `h-10` (40px border-box height). With `py-2` (8px top + 8px bottom padding) plus `padding-right: 36px` from `dente-redesign.css`, the remaining content height is only 22px. Combined with line-height of 21px and `items-start`, the text inside the selects ("SMS", "Произвольное", "Сервисное") is vertically squashed and collides with the label text above it.
4. **Proof by Contrast**: Other forms in the same file `MessageDeliveryConsole.tsx` (such as "Шаблоны сообщений" lines 1251–1306 and "Правила рассылки" lines 1407–1444) use clean standard `.ops-editor`, `.ops-toolbar`, `.ops-field`, `.ops-field--grow`, `<label>`, `<select>` WITHOUT inline Tailwind class bloat and render flawlessly in all 4 theme states.

---

## 3. Caveats

- `SettingsCommunicationsTab.tsx` does not exist as a separate file; `MessageDeliveryConsole.tsx` is the sole component rendering the communications outbox enqueue form.
- The project has a pre-existing typecheck issue in `src/hooks/domains/useImagingQueries.ts` (duplicate identifier `scanImagingFolder`), which is unrelated to communications console styling.

---

## 4. Conclusion & Proposed Code Fix

### Proposed File Edit 1: `apps/web/src/components/communications/MessageDeliveryConsole.tsx`
Replace lines 1008–1207 with standard, clean `.ops-editor` layout:

```tsx
<div className="ops-editor" data-testid="outbox-enqueue-form">
	<p className="ops-hint">
		Одно сообщение одному получателю — без рассылки. Уйдёт через
		«Отправить из очереди» или автоматический обработчик, если он включён.
	</p>

	<div className="ops-toolbar">
		<span className="ops-field">
			<label htmlFor="enqueue-channel">Канал</label>
			<select
				id="enqueue-channel"
				data-testid="outbox-enqueue-channel"
				value={enqueueChannel}
				onChange={(event) => {
					setEnqueueChannel(
						event.target.value as
							| "sms"
							| "email"
							| "whatsapp"
							| "telegram",
					);
					setEnqueueTemplateId("");
				}}
			>
				{(["sms", "email", "whatsapp", "telegram"] as const).map(
					(code) => (
						<option key={code} value={code}>
							{channelLabels[code]}
						</option>
					),
				)}
			</select>
		</span>

		<span className="ops-field ops-field--grow">
			<label htmlFor="enqueue-intent">Назначение</label>
			<select
				id="enqueue-intent"
				data-testid="outbox-enqueue-intent"
				value={enqueueIntent}
				onChange={(event) => setEnqueueIntent(event.target.value)}
			>
				{Object.entries(intentLabels).map(([code, label]) => (
					<option key={code} value={code}>
						{label}
					</option>
				))}
			</select>
		</span>

		<span className="ops-field">
			<label htmlFor="enqueue-scope">Тип</label>
			<select
				id="enqueue-scope"
				data-testid="outbox-enqueue-scope"
				value={enqueueScope}
				onChange={(event) =>
					setEnqueueScope(event.target.value as "service" | "marketing")
				}
			>
				<option value="service">Сервисное</option>
				<option value="marketing">Рекламное</option>
			</select>
		</span>
	</div>

	<div className="ops-toolbar">
		<span className="ops-field ops-field--grow">
			<label htmlFor="enqueue-recipient">
				{enqueueChannel === "email"
					? "Адрес почты"
					: "Телефон или идентификатор"}
			</label>
			<input
				id="enqueue-recipient"
				data-testid="outbox-enqueue-recipient"
				type={enqueueChannel === "email" ? "email" : "text"}
				value={enqueueRecipient}
				onChange={(event) => setEnqueueRecipient(event.target.value)}
				placeholder={
					enqueueChannel === "email"
						? "patient@example.com"
						: enqueueChannel === "telegram"
							? "chat_id или @username"
							: "+79001234567"
				}
				autoComplete="off"
			/>
		</span>

		{enqueueChannel === "email" ? (
			<span className="ops-field ops-field--grow">
				<label htmlFor="enqueue-subject">Тема письма</label>
				<input
					id="enqueue-subject"
					data-testid="outbox-enqueue-subject"
					type="text"
					value={enqueueSubject}
					onChange={(event) => setEnqueueSubject(event.target.value)}
					placeholder="Сообщение из клиники"
				/>
			</span>
		) : null}

		<span className="ops-field ops-field--grow">
			<label htmlFor="enqueue-template">Шаблон (необязательно)</label>
			<select
				id="enqueue-template"
				data-testid="outbox-enqueue-template"
				value={enqueueTemplateId}
				onChange={(event) => {
					const next = event.target.value;
					setEnqueueTemplateId(next);
					if (next) setEnqueueBody("");
				}}
			>
				<option value="">Без шаблона — свой текст</option>
				{(enqueueTemplates || []).map((t) => (
					<option key={t.id} value={t.id}>
						{t.title}
						{intentLabels[t.intent] ? ` · ${intentLabels[t.intent]}` : ""}
					</option>
				))}
			</select>
		</span>
	</div>

	{enqueueTemplateId ? (
		<p className="ops-hint">
			Текст возьмётся из шаблона. Переменные без значений сервер не
			подставит пустотой — для разовой отправки с подстановками удобнее
			готовый текст ниже.
		</p>
	) : (
		<span className="ops-field" style={{ marginBottom: "12px" }}>
			<label htmlFor="enqueue-body">Текст сообщения</label>
			<textarea
				id="enqueue-body"
				data-testid="outbox-enqueue-body"
				value={enqueueBody}
				onChange={(event) => setEnqueueBody(event.target.value)}
				placeholder="Текст сообщения..."
				rows={4}
				disabled={
					enqueueChannel === "sms" &&
					uisQuota !== null &&
					uisQuota.remaining <= 0
				}
			/>
		</span>
	)}

	<button
		className="primary-button"
		type="button"
		data-testid="outbox-enqueue-submit"
		disabled={!enqueueCanSubmit}
		onClick={() => void enqueueMessage()}
	>
		{enqueueBusy ? "Ставлю в очередь…" : "Поставить в очередь"}
	</button>
</div>
```

### Proposed File Edit 2: `apps/web/src/styles/dente-operations.css`
In `dente-operations.css`, strengthen `.ops-field` input sizing and spacing:

```css
.ops-field {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
	margin-bottom: 10px;
}

.ops-toolbar .ops-field {
	margin-bottom: 0;
}

.ops-field > input,
.ops-field > select,
.ops-field > textarea {
	padding: 8px 10px;
	border-radius: 10px;
	border: 1px solid var(--line-strong);
	background: var(--paper);
	color: var(--ink);
	font: inherit;
	font-size: 13.5px;
	box-sizing: border-box;
	min-height: 38px;
	transition:
		border-color var(--transition-fast),
		box-shadow var(--transition-fast);
}
```

---

## 5. Verification Method

1. Execute `node e2e_4state_audit.cjs` to render the 4-state screenshots (Mobile Light, Mobile Dark, PC Light, PC Dark).
2. Inspect `PC_Light_panel_communications.png` in the artifact directory (`<appDataDir>/brain/<conversation-id>/...`).
3. Verify that under "ПОСТАВИТЬ В ОЧЕРЕДЬ", the input selects for SMS (Канал), Произвольное (Назначение), and Сервисное (Тип) are properly spaced, aligned to bottom/baseline, have 38px min-height, and do not overlap their labels in PC Light mode.
