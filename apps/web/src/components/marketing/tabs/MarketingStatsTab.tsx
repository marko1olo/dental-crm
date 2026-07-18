import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export function MarketingStatsTab() {
	return (
		<motion.div
			key="stats"
			className="marketing-panel"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			transition={{ duration: 0.2 }}
		>
			<div style={{ maxWidth: "800px" }}>
				<h3 style={{ marginTop: 0, marginBottom: "24px", fontSize: "18px" }}>
					Регламент работы с репутацией
				</h3>

				<div className="marketing-warning">
					<h4
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							margin: "0 0 8px 0",
						}}
					>
						<AlertTriangle size={18} /> Критическое правило
					</h4>
					Никогда не используйте ботов для накрутки отзывов. Алгоритмы
					Яндекса и 2ГИС распознают паттерны машинной генерации и теневые
					блокировки приведут к падению трафика. Используйте ручной
					перенос отзывов.
				</div>

				<div style={{ marginTop: "32px" }}>
					<h4
						style={{
							margin: "0 0 16px 0",
							fontSize: "16px",
							color: "var(--ink)",
						}}
					>
						Архитектура ответа на негатив
					</h4>
					<div className="marketing-formula">
						<span className="formula-step">Извинение без оправданий</span>
						<span className="formula-arrow">→</span>
						<span className="formula-step">Признание важности проблемы</span>
						<span className="formula-arrow">→</span>
						<span className="formula-step">Перевод в оффлайн (контакт Главврача)</span>
					</div>
					<p
						style={{
							color: "var(--muted)",
							fontSize: "14px",
							marginTop: "16px",
							lineHeight: 1.6,
						}}
					>
						Цель ответа на негатив — не переубедить скандалиста, а показать
						другим потенциальным клиентам вашу адекватность и готовность
						решать проблемы.
					</p>
				</div>

				<div
					style={{
						marginTop: "32px",
						borderTop: "1px solid var(--line)",
						paddingTop: "24px",
					}}
				>
					<h4
						style={{
							margin: "0 0 16px 0",
							fontSize: "16px",
							color: "var(--ink)",
						}}
					>
						Внедрение SEO-ключей
					</h4>
					<ul
						style={{
							paddingLeft: "20px",
							color: "var(--ink)",
							lineHeight: 1.8,
							fontSize: "15px",
							margin: 0,
						}}
					>
						<li>
							<strong style={{ color: "var(--teal-dark)" }}>Позитив:</strong> 1-2
							ключа естественно вплетенных в текст.
						</li>
						<li>
							<strong style={{ color: "var(--teal-dark)" }}>Нейтраль:</strong>{" "}
							Фокус на благодарности, 1 ключ максимум.
						</li>
						<li>
							<strong style={{ color: "var(--red)" }}>Негатив:</strong> 0 ключей.
							Внедрение коммерческих ключей в разбор жалобы выглядит цинично.
						</li>
					</ul>
				</div>
			</div>
		</motion.div>
	);
}
