import { MapPin } from "lucide-react";
import type { MarketingStats, MarketingPlatform } from "../../hooks/useMarketingLogic";

export function MarketingMapPreviews({
	activePlatform,
	stats,
	phone,
}: {
	activePlatform: MarketingPlatform;
	stats: MarketingStats;
	phone: string;
}) {
	return (
		<div className="marketing-preview-column">
			<div className="map-preview-container">
				{/* Header */}
				<div className="map-preview-header">
					<div className="map-preview-title">
						<MapPin size={18} />
						Предпросмотр профилей
					</div>
					<div className="map-preview-subtitle">
						Так вашу клинику видят пациенты на картах
					</div>
				</div>

				{/* Yandex Mockup */}
				{activePlatform === "yandex" && (
					<div className="mockup-yandex">
						<div className="mockup-yandex-header">
							<div>
								<h2 style={{ margin: 0, fontSize: 18 }}>Стоматология DENTE</h2>
								<div className="mockup-yandex-stars">
									<span>★ ★ ★ ★ ★</span>
									<span className="mockup-yandex-rating-text">
										{stats.yandex.rating}
									</span>
									<span style={{ color: "#777", marginLeft: 4 }}>
										({stats.yandex.reviews} оценок)
									</span>
								</div>
								<span className="mockup-yandex-badge">🥇 Хорошее место</span>
							</div>
						</div>
						<div className="mockup-yandex-details">
							<div>📍 г. Москва, ул. Ленина, д. 42</div>
							<div>📞 {phone}</div>
							<div>🕒 Открыто • 09:00 - 21:00</div>
						</div>

						<div style={{ marginTop: 12 }}>
							<div className="mockup-yandex-reply">
								<div
									style={{
										display: "flex",
										gap: 8,
										alignItems: "center",
										marginBottom: 6,
									}}
								>
									<div className="mockup-avatar">🏥</div>
									<div>
										<h4 style={{ margin: 0, fontSize: 13, color: "#333" }}>
											Официальный ответ
										</h4>
									</div>
								</div>
								<p
									style={{
										margin: 0,
										fontSize: 13,
										fontStyle: "italic",
										color: "#333",
									}}
									className="dark:text-gray-200"
								>
									Здесь появится ваш ответ на отзывы пациентов...
								</p>
							</div>
						</div>
					</div>
				)}

				{/* 2GIS Mockup */}
				{activePlatform === "gis2" && (
					<div className="mockup-gis2">
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
							}}
						>
							<div>
								<h2 style={{ margin: 0, fontSize: 18, color: "#000" }}>
									DENTE, стоматология
								</h2>
							</div>
							<div className="mockup-gis2-rating-badge">
								{stats.gis2.rating}
							</div>
						</div>

						<div className="mockup-gis2-details">
							<div>📍 Москва • Ленина, 42 • 1 этаж</div>
							<div>📞 {phone}</div>
							<div>👥 {stats.gis2.reviews} отзывов горожан</div>
						</div>

						<div style={{ marginTop: 16 }}>
							<div className="mockup-gis2-reply">
								<div
									style={{
										display: "flex",
										gap: 8,
										alignItems: "center",
										marginBottom: 6,
									}}
								>
									<div className="mockup-avatar">🩺</div>
									<div>
										<h4 style={{ margin: 0, fontSize: 13, color: "#000" }}>
											Комментарий компании
										</h4>
									</div>
								</div>
								<p
									style={{ margin: 0, fontSize: 13, color: "#2d3748" }}
									className="dark:text-gray-200"
								>
									Ваши ответы в 2ГИС формируют доверие горожан...
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Google Mockup */}
				{activePlatform === "google" && (
					<div className="mockup-google">
						<h2 style={{ margin: 0, fontSize: 18, color: "#202124" }}>
							DENTE Dental Clinic
						</h2>
						<div className="mockup-google-rating" style={{ marginTop: 4 }}>
							<span style={{ fontWeight: 500, color: "#3c4043" }}>
								{stats.google.rating}
							</span>
							<div
								style={{
									display: "inline-flex",
									gap: 2,
									color: "#f8b739",
									margin: "0 4px",
								}}
							>
								★★★★★
							</div>
							<span style={{ color: "#70757a" }}>
								({stats.google.reviews})
							</span>
						</div>
						<div
							style={{
								marginTop: 12,
								fontSize: 13,
								color: "#5f6368",
								display: "flex",
								flexDirection: "column",
								gap: 6,
							}}
							className="dark:text-gray-300"
						>
							<div>📍 Address: 42 Lenina St, Moscow</div>
							<div>📞 Phone: {phone}</div>
							<div>🕒 Hours: Open ⋅ Closes 9 PM</div>
						</div>

						<div style={{ marginTop: 16 }}>
							<div className="mockup-google-reply">
								<div
									style={{
										display: "flex",
										gap: 8,
										alignItems: "center",
										marginBottom: 6,
									}}
								>
									<div className="mockup-avatar">⭐</div>
									<div>
										<h4 style={{ margin: 0, fontSize: 13, color: "#202124" }}>
											Response from the owner
										</h4>
									</div>
								</div>
								<p
									style={{ margin: 0, fontSize: 13, color: "#202124" }}
									className="dark:text-gray-200"
								>
									Engage with international and local patients on Google...
								</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
