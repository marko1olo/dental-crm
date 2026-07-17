import React, { useState } from "react";
import { MessageSquareShare, Save } from "lucide-react";
import { showToast } from "../GlobalToast";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

export function SettingsMarketingTab() {
	const { denteClinicalReadHeaders } = useAppLogicContext();
	const [isNpsEnabled, setIsNpsEnabled] = useState(false);
	const [npsDelay, setNpsDelay] = useState("24");
	const [npsMessage, setNpsMessage] = useState(
		"Здравствуйте, {patientName}! Оцените ваш визит в клинику по шкале от 1 до 10. Если вам всё понравилось, будем рады отзыву: {reviewLink}",
	);
	const [reviewLink, setReviewLink] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);
		try {
			const res = await fetch("/api/clinic/marketing-settings", {
				method: "POST",
				headers: { ...denteClinicalReadHeaders(), "Content-Type": "application/json" },
				body: JSON.stringify({
					npsEnabled: isNpsEnabled,
					npsDelayHours: Number(npsDelay),
					npsMessageTemplate: npsMessage,
					reviewPlatformUrl: reviewLink,
				}),
			});
			if (!res.ok) throw new Error("save failed");
			showToast("Настройки маркетинга сохранены", "success");
		} catch {
			showToast("Ошибка сохранения настроек", "error");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="profile-studio-container animate-fade-in">
			<div className="import-copy" style={{ marginBottom: "0" }}>
				<MessageSquareShare aria-hidden="true" />
				<div>
					<p className="eyebrow">Маркетинг и Автоматизация</p>
					<h2>NPS Автоматизация</h2>
					<p>
						Настройки автоматической рассылки сообщений с просьбой оценить прием и оставить отзыв.
						Сообщения отправляются через подключённый мессенджер (Telegram/WhatsApp).
					</p>
				</div>
			</div>

			<form
				onSubmit={handleSave}
				className="profile-form-grid"
				style={{ display: "flex", flexDirection: "column", gap: "24px" }}
			>
				<section className="profile-section-card">
					<div className="profile-section-header">
						<div
							className="profile-section-icon"
							style={{ background: "rgba(16, 185, 129, 0.1)", color: "rgb(16, 185, 129)" }}
						>
							<MessageSquareShare size={24} />
						</div>
						<div className="profile-section-title">
							<h3>Автосбор отзывов (NPS)</h3>
							<p>
								Система отправит сообщение пациенту автоматически через выбранное время после визита.
								Администратор получит черновик — отправка только вручную.
							</p>
						</div>
					</div>

					<div className="profile-form-grid">
						<div className="profile-form-group full-width">
							<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
								<label className="switch">
									<input
										type="checkbox"
										checked={isNpsEnabled}
										onChange={(e) => setIsNpsEnabled(e.target.checked)}
									/>
									<span className="slider round"></span>
								</label>
								<span style={{ fontWeight: 600 }}>Включить автоматическую подготовку NPS-черновиков</span>
							</div>
						</div>

						{isNpsEnabled && (
							<>
								<div className="profile-form-group">
									<label htmlFor="nps-delay">Задержка подготовки черновика</label>
									<select
										id="nps-delay"
										value={npsDelay}
										onChange={(e) => setNpsDelay(e.target.value)}
									>
										<option value="1">Через 1 час после приема</option>
										<option value="2">Через 2 часа после приема</option>
										<option value="24">На следующий день (24 ч)</option>
										<option value="48">Через 48 часов</option>
									</select>
								</div>

								<div className="profile-form-group">
									<label htmlFor="review-link">Ссылка на отзывы (Яндекс / 2GIS / ПроДокторов)</label>
									<input
										id="review-link"
										type="url"
										value={reviewLink}
										onChange={(e) => setReviewLink(e.target.value)}
										placeholder="https://yandex.ru/maps/-/..."
									/>
								</div>

								<div className="profile-form-group full-width">
									<label htmlFor="nps-message">Шаблон сообщения</label>
									<textarea
										id="nps-message"
										rows={4}
										value={npsMessage}
										onChange={(e) => setNpsMessage(e.target.value)}
										placeholder="Текст сообщения..."
									/>
									<span
										className="profile-error-hint"
										style={{ color: "var(--slate-500)", marginTop: "4px" }}
									>
										Переменные: {"{patientName}"}, {"{doctorName}"}, {"{reviewLink}"}
									</span>
								</div>
							</>
						)}

						<div className="profile-form-group full-width" style={{ marginTop: "12px" }}>
							<button
								className="primary-button"
								type="submit"
								disabled={isSaving}
								style={{ alignSelf: "flex-start" }}
							>
								<Save size={16} style={{ marginRight: "8px" }} />
								{isSaving ? "Сохранение..." : "Сохранить настройки"}
							</button>
						</div>
					</div>
				</section>
			</form>
		</div>
	);
}
