import React from "react";
import {
	calculateSmsCostKopecks,
	formatSmsCostRu,
} from "../deliveryReportNotice.js";
import { channelLabels, intentLabels } from "./constants";
import type {
	ChannelCode,
	PreviewResult,
	TemplateItem,
	TemplateVariable,
} from "./types";

export interface DeliveryTemplatesSectionProps {
	templates: TemplateItem[];
	draftTitle: string;
	setDraftTitle: (title: string) => void;
	draftChannel: ChannelCode;
	setDraftChannel: (channel: ChannelCode) => void;
	draftIntent: string;
	setDraftIntent: (intent: string) => void;
	draftBody: string;
	setDraftBody: (body: string) => void;
	editingId: string | null;
	setEditingId: (id: string | null) => void;
	preview: PreviewResult | null;
	previewError: string | null;
	variableCatalog: TemplateVariable[];
	busy: boolean;
	saveTemplate: () => Promise<void>;
	resetDraft: () => void;
	insertTemplateVariable: (key: string) => void;
}

export function DeliveryTemplatesSection({
	templates,
	draftTitle,
	setDraftTitle,
	draftChannel,
	setDraftChannel,
	draftIntent,
	setDraftIntent,
	draftBody,
	setDraftBody,
	editingId,
	setEditingId,
	preview,
	previewError,
	variableCatalog,
	busy,
	saveTemplate,
	resetDraft,
	insertTemplateVariable,
}: DeliveryTemplatesSectionProps) {
	return (
		<>
			{/* ── Шаблоны ───────────────────────────────────────────────────── */}
			<h3 className="ops-section-title">Шаблоны сообщений</h3>
			{(templates ?? []).length === 0 ? (
				<div className="ops-empty">
					<p>
						Шаблонов пока нет. Без шаблона «Подтверждение приёма» автоматические
						напоминания не включаются.
					</p>
					<button
						type="button"
						className="secondary-button"
						data-testid="btn-fill-default-confirmation-template"
						onClick={() => {
							setDraftTitle("Подтверждение приёма (SMS)");
							setDraftChannel("sms");
							setDraftIntent("appointment_confirmation");
							setDraftBody("Здравствуйте, {patient}! Напоминаем о приёме {date} в {time}. Клиника ДЕНТЕ.");
						}}
					>
						Заполнить шаблон подтверждения по умолчанию
					</button>
				</div>
			) : (
				<ul className="ops-template-list">
					{(templates || []).map((template) => (
						<li className="ops-template" key={template.id}>
							<span className="ops-template__head">
								<strong>{template.title}</strong>
								<span className="ops-state ops-state--info">
									{channelLabels[template.channel] ?? template.channel}
								</span>
								<span className="ops-state">
									{intentLabels[template.intent] ?? template.intent}
								</span>
								{template.isActive ? null : (
									<span className="ops-state ops-state--warn">выключен</span>
								)}
							</span>
							<span className="ops-note">{template.body}</span>
							<button
								className="secondary-button"
								type="button"
								onClick={() => {
									setEditingId(template.id);
									setDraftTitle(template.title);
									setDraftChannel(template.channel as ChannelCode);
									setDraftIntent(template.intent);
									setDraftBody(template.body);
								}}
							>
								Изменить
							</button>
						</li>
					))}
				</ul>
			)}

			<div className="ops-editor">
				<div className="ops-toolbar">
					<span className="ops-field ops-field--grow">
						<label htmlFor="template-title">Название</label>
						<input
							id="template-title"
							type="text"
							value={draftTitle}
							onChange={(event) => setDraftTitle(event.target.value)}
							placeholder="Напоминание о приёме"
						/>
					</span>

					<span className="ops-field">
						<label htmlFor="template-channel">Канал</label>
						<select
							id="template-channel"
							value={draftChannel}
							onChange={(event) =>
								setDraftChannel(event.target.value as ChannelCode)
							}
						>
							{["sms", "email", "whatsapp", "telegram"].map((code) => (
								<option key={code} value={code}>
									{channelLabels[code]}
								</option>
							))}
						</select>
					</span>

					<span className="ops-field">
						<label htmlFor="template-intent">Назначение</label>
						<select
							id="template-intent"
							value={draftIntent}
							onChange={(event) => setDraftIntent(event.target.value)}
						>
							{Object.entries(intentLabels).map(([code, label]) => (
								<option key={code} value={code}>
									{label}
								</option>
							))}
						</select>
					</span>
				</div>

				<span className="ops-field">
					<label htmlFor="template-body">Текст</label>
					<textarea
						id="template-body"
						rows={4}
						value={draftBody}
						onChange={(event) => setDraftBody(event.target.value)}
						placeholder="{patient}, напоминаем: приём {date} в {time}."
					/>
				</span>

				{/*
				  Справочник подстановок GET /api/communications/variables.
				  БЫЛО: маршрут отдавал полный каталог (key/label/example/phi), но web
				  его не вызывал — администратор набирал {patient} по памяти и не видел
				  мед. переменные (phi) до отказа предпросмотра/отправки.
				  ТЕПЕРЬ: чипы вставляют {key} в текст; phi помечены «мед.» — для каналов
				  без согласия на медданные сервер всё равно отклонит при allowPhi=false.
				*/}
				{variableCatalog.length > 0 ? (
					<div
						role="toolbar"
						className="ops-variable-catalog"
						data-testid="comm-template-variables"
						aria-label="Подстановки для шаблона"
					>
						<span className="ops-note ops-variable-catalog__title">
							Подстановки — нажмите, чтобы вставить в текст:
						</span>
						{variableCatalog.map((v) => (
							<button
								key={v.key}
								type="button"
								data-testid={`comm-template-var-${v.key}`}
								title={
									v.phi
										? `${v.label} · пример: ${v.example} · медицинские данные`
										: `${v.label} · пример: ${v.example}`
								}
								onClick={() => insertTemplateVariable(v.key)}
								className={v.phi ? "quick-chip quick-chip--phi" : "quick-chip"}
							>
								{`{${v.key}}`}
								<span className="quick-chip__label">
									{v.label}
									{v.phi ? " · мед." : ""}
								</span>
							</button>
						))}
					</div>
				) : null}

				{previewError ? (
					<p className="ops-notice ops-notice--error" role="alert">
						{previewError}
					</p>
				) : null}
				{preview ? (
					<div className="ops-preview">
						<span className="ops-preview__title">Как увидит пациент</span>
						<p className="ops-preview__text">{preview.text}</p>
						<span className="ops-note">
							{preview.length} симв. из {preview.limit}
							{preview.sms
								? ` · ${preview.sms.encoding === "ucs2" ? "кириллица" : "латиница"}, сегментов ${preview.sms.segments}, ` +
									`свободно ${preview.sms.charactersLeftInSegment} · расчёт: ${formatSmsCostRu(calculateSmsCostKopecks(preview.sms.segments, 1))}`
								: ""}
						</span>
						{(preview?.problems ?? []).length > 0 ? (
							<p className="ops-notice ops-notice--error" role="alert">
								{(preview?.problems ?? []).join(" ")}
							</p>
						) : null}
					</div>
				) : null}

				<button
					className="primary-button"
					type="button"
					disabled={busy}
					onClick={() => void saveTemplate()}
				>
					{editingId ? "Сохранить изменения" : "Создать шаблон"}
				</button>
				{editingId ? (
					<button
						className="secondary-button"
						type="button"
						onClick={resetDraft}
					>
						Отменить правку
					</button>
				) : null}
			</div>
		</>
	);
}
