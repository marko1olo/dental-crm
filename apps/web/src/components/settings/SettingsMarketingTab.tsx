import React, { useState } from "react";
import { MessageSquareShare, Save, Smartphone, Star, ThumbsDown, ThumbsUp, ShieldCheck } from "lucide-react";
import { showToast } from "../GlobalToast";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

export function SettingsMarketingTab() {
	const { denteClinicalReadHeaders, clinicSettings } = useAppLogicContext();
	const mSettings = clinicSettings?.marketingSettings || {};
	
	const [isNpsEnabled, setIsNpsEnabled] = useState(mSettings.npsEnabled || false);
	const [npsDelay, setNpsDelay] = useState(mSettings.npsDelayHours?.toString() || "24");
	
	// New strategy state
	const [npsStrategy, setNpsStrategy] = useState<"direct" | "two_step">(mSettings.npsStrategy || "two_step");
	
	const [npsMessage, setNpsMessage] = useState(
		mSettings.npsMessageTemplate || "Здравствуйте, {patientName}! Оцените ваш визит к врачу {doctorName} по шкале от 1 до 10. Отправьте цифру в ответном сообщении.",
	);
	
	// Two-step logic messages
	const [npsGoodMessage, setNpsGoodMessage] = useState(
		mSettings.npsGoodMessage || "Спасибо за высокую оценку! Будем очень признательны, если вы оставите отзыв о нашей клинике: {reviewLink}"
	);
	const [npsBadMessage, setNpsBadMessage] = useState(
		mSettings.npsBadMessage || "Нам жаль, что визит не оправдал ваших ожиданий. Подскажите, что именно пошло не так? Ваше мнение поможет нам стать лучше."
	);

	const [reviewLink, setReviewLink] = useState(mSettings.reviewPlatformUrl || "");
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
					npsStrategy,
					npsDelayHours: Number(npsDelay),
					npsMessageTemplate: npsMessage,
					npsGoodMessage,
					npsBadMessage,
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
						Умный сбор отзывов. Настройте сценарии общения с пациентами после визита, 
						чтобы повысить рейтинг клиники на картах и вовремя перехватить негатив.
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
							<Star size={24} />
						</div>
						<div className="profile-section-title">
							<h3>Сбор отзывов (NPS)</h3>
							<p>
								Автоматические сообщения через WhatsApp / Telegram для оценки качества приема.
							</p>
						</div>
					</div>

					<div className="profile-form-grid">
						<div className="profile-form-group full-width">
							<div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "var(--paper-2)", borderRadius: "8px", border: "1px solid var(--line)" }}>
								<label className="switch">
									<input
										type="checkbox"
										checked={isNpsEnabled}
										onChange={(e) => setIsNpsEnabled(e.target.checked)}
									/>
									<span className="slider round"></span>
								</label>
								<div style={{ display: "flex", flexDirection: "column" }}>
									<span style={{ fontWeight: 600, fontSize: "15px" }}>Включить автозапрос отзывов</span>
									<span style={{ fontSize: "13px", color: "var(--slate-500)" }}>Система будет готовить черновики сообщений для администратора</span>
								</div>
							</div>
						</div>

						{isNpsEnabled && (
							<>
								<div className="profile-form-group">
									<label htmlFor="nps-delay">Когда отправлять запрос?</label>
									<select
										id="nps-delay"
										value={npsDelay}
										onChange={(e) => setNpsDelay(e.target.value)}
									>
										<option value="1">Через 1 час после приема</option>
										<option value="2">Через 2 часа после приема</option>
										<option value="24">На следующий день (через 24 часа)</option>
										<option value="48">Через 2 дня (через 48 часов)</option>
									</select>
								</div>

								<div className="profile-form-group">
									<label htmlFor="review-link">Ссылка на карты (Яндекс / 2GIS / ПроДокторов)</label>
									<input
										id="review-link"
										type="url"
										value={reviewLink}
										onChange={(e) => setReviewLink(e.target.value)}
										placeholder="https://yandex.ru/maps/-/..."
									/>
								</div>

								<div className="profile-form-group full-width" style={{ marginTop: "12px" }}>
									<label>Стратегия сбора отзывов</label>
									<div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
										<label 
											className="nps-strategy-card" 
											style={{ 
												flex: 1, 
												padding: "16px", 
												border: npsStrategy === "two_step" ? "2px solid var(--emerald-500)" : "1px solid var(--line)", 
												borderRadius: "8px", 
												cursor: "pointer",
												background: npsStrategy === "two_step" ? "rgba(16, 185, 129, 0.05)" : "var(--paper)",
												display: "flex",
												flexDirection: "column",
												gap: "8px",
												transition: "all 0.2s ease"
											}}
										>
											<input 
												type="radio" 
												name="npsStrategy" 
												value="two_step" 
												checked={npsStrategy === "two_step"} 
												onChange={() => setNpsStrategy("two_step")} 
												style={{ display: "none" }} 
											/>
											<div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, color: "var(--ink)" }}>
												<ShieldCheck size={18} style={{ color: "var(--emerald-500)" }} />
												Умный сбор (Безопасный)
											</div>
											<span style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.4 }}>
												Сначала спрашиваем оценку (1-10). Ссылку на карты даем <b>только</b> при оценке 9-10. Негатив перехватывается.
											</span>
										</label>

										<label 
											className="nps-strategy-card" 
											style={{ 
												flex: 1, 
												padding: "16px", 
												border: npsStrategy === "direct" ? "2px solid var(--amber-500)" : "1px solid var(--line)", 
												borderRadius: "8px", 
												cursor: "pointer",
												background: npsStrategy === "direct" ? "rgba(245, 158, 11, 0.05)" : "var(--paper)",
												display: "flex",
												flexDirection: "column",
												gap: "8px",
												transition: "all 0.2s ease"
											}}
										>
											<input 
												type="radio" 
												name="npsStrategy" 
												value="direct" 
												checked={npsStrategy === "direct"} 
												onChange={() => setNpsStrategy("direct")} 
												style={{ display: "none" }} 
											/>
											<div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, color: "var(--ink)" }}>
												<MessageSquareShare size={18} style={{ color: "var(--amber-500)" }} />
												Прямая ссылка
											</div>
											<span style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.4 }}>
												Сразу отправляем ссылку на карты всем пациентам без предварительного фильтра оценки.
											</span>
										</label>
									</div>
								</div>

								<div className="profile-form-group full-width" style={{ marginTop: "16px" }}>
									<label htmlFor="nps-message">
										{npsStrategy === "two_step" ? "Шаг 1: Первое сообщение (Запрос оценки)" : "Текст сообщения с ссылкой"}
									</label>
									<textarea
										id="nps-message"
										rows={3}
										value={npsMessage}
										onChange={(e) => setNpsMessage(e.target.value)}
										style={{ resize: "vertical", fontFamily: "inherit" }}
									/>
								</div>

								{npsStrategy === "two_step" && (
									<div style={{ display: "flex", gap: "24px", width: "100%", marginTop: "8px", flexWrap: "wrap" }}>
										<div className="profile-form-group" style={{ flex: "1 1 300px" }}>
											<label style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--emerald-600)" }}>
												<ThumbsUp size={16} /> Шаг 2: При оценке 9-10
											</label>
											<textarea
												rows={4}
												value={npsGoodMessage}
												onChange={(e) => setNpsGoodMessage(e.target.value)}
												style={{ resize: "vertical", fontFamily: "inherit", borderColor: "rgba(16, 185, 129, 0.3)" }}
											/>
										</div>
										<div className="profile-form-group" style={{ flex: "1 1 300px" }}>
											<label style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--rose-600)" }}>
												<ThumbsDown size={16} /> Шаг 2: При оценке 1-8
											</label>
											<textarea
												rows={4}
												value={npsBadMessage}
												onChange={(e) => setNpsBadMessage(e.target.value)}
												style={{ resize: "vertical", fontFamily: "inherit", borderColor: "rgba(225, 29, 72, 0.3)" }}
											/>
										</div>
									</div>
								)}

								<div className="full-width" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--slate-50)", padding: "12px 16px", borderRadius: "8px", border: "1px dashed var(--slate-300)" }}>
									<div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--slate-600)", fontSize: "13px" }}>
										<Smartphone size={16} />
										<span>Поддерживаемые переменные: <b>{"{patientName}"}</b>, <b>{"{doctorName}"}</b>, <b>{"{reviewLink}"}</b></span>
									</div>
								</div>
							</>
						)}

						<div className="profile-form-group full-width" style={{ marginTop: "12px" }}>
							<button
								className="primary-button"
								type="submit"
								disabled={isSaving}
								style={{ alignSelf: "flex-start", padding: "10px 24px" }}
							>
								<Save size={18} style={{ marginRight: "8px" }} />
								{isSaving ? "Сохраняем..." : "Сохранить настройки"}
							</button>
						</div>
					</div>
				</section>
			</form>
		</div>
	);
}
