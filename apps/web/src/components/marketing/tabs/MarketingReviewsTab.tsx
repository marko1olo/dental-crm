import { motion } from "framer-motion";
import {
	CheckCircle2,
	Copy,
	MinusCircle,
	Sparkles,
	ThumbsDown,
	ThumbsUp,
} from "lucide-react";
import type { useMarketingLogic } from "../../../hooks/useMarketingLogic";

type UseMarketingLogicReturn = ReturnType<typeof useMarketingLogic>;

export function MarketingReviewsTab({
	state,
	actions,
}: {
	state: UseMarketingLogicReturn["state"];
	actions: UseMarketingLogicReturn["actions"];
}) {
	const { phone, tone, reviewText, isAiLoading, generatedReply, copied } = state;
	const {
		handlePhoneChange,
		handlePhoneBlur,
		setTone,
		setReviewText,
		handleGenerate,
		clearAll,
		handleCopy,
	} = actions;

	return (
		<motion.div
			key="reviews"
			className="marketing-panel"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			transition={{ duration: 0.2 }}
		>
			<div className="marketing-form-grid">
				<div>
					<label htmlFor="mkt-phone">
						Телефон главного врача (для решения конфликтов)
					</label>
					<input
						className="text-input"
						id="mkt-phone"
						type="tel"
						value={phone}
						onChange={handlePhoneChange}
						onBlur={handlePhoneBlur}
						placeholder="+7 (000) 000-00-00"
					/>
				</div>

				<div>
					<label>Тональность отзыва клиента</label>
					<div className="marketing-tone-group" role="group">
						<button
							type="button"
							className={`tone-btn positive ${tone === "positive" ? "active" : ""}`}
							onClick={() => setTone("positive")}
						>
							<ThumbsUp size={18} /> Отличный
						</button>
						<button
							type="button"
							className={`tone-btn neutral ${tone === "neutral" ? "active" : ""}`}
							onClick={() => setTone("neutral")}
						>
							<MinusCircle size={18} /> Нейтральный
						</button>
						<button
							type="button"
							className={`tone-btn negative ${tone === "negative" ? "active" : ""}`}
							onClick={() => setTone("negative")}
						>
							<ThumbsDown size={18} /> Проблема
						</button>
					</div>
				</div>
			</div>

			<div style={{ marginTop: "24px" }}>
				<label
					htmlFor="mkt-review"
					style={{ display: "flex", alignItems: "center", gap: "8px" }}
				>
					<Copy size={16} /> Вставьте текст отзыва с платформы
				</label>
				<textarea
					className="marketing-textarea"
					id="mkt-review"
					value={reviewText}
					onChange={(e) => setReviewText(e.target.value)}
					placeholder="Вчера удаляла зуб мудрости. Врач просто супер, всё прошло без боли! Рекомендую всем."
				/>
				<div className="quick-chips-row">
					<span
						style={{
							fontSize: 13,
							color: "var(--muted)",
							fontWeight: 600,
							padding: "6px 4px",
						}}
					>
						Шаблоны:
					</span>
					<button
						type="button"
						className="quick-chip"
						onClick={() => {
							setReviewText(
								"Вчера удаляла зуб мудрости. Врач просто супер, всё прошло без боли!",
							);
							setTone("positive");
						}}
					>
						Позитивный
					</button>
					<button
						type="button"
						className="quick-chip"
						onClick={() => {
							setReviewText(
								"Долго ждал приема, администратор даже не поздоровалась.",
							);
							setTone("negative");
						}}
					>
						Жалоба
					</button>
				</div>
			</div>

			<div className="marketing-actions">
				<button
					className="marketing-btn-generate"
					type="button"
					onClick={handleGenerate}
					disabled={!reviewText.trim() || isAiLoading}
				>
					<Sparkles size={20} />
					{isAiLoading ? "Генерация ответа..." : "Сгенерировать AI-ответ"}
				</button>
				{(generatedReply || reviewText) && (
					<button
						className="marketing-btn-clear"
						type="button"
						onClick={clearAll}
						disabled={isAiLoading}
					>
						Сбросить
					</button>
				)}
			</div>

			{isAiLoading && (
				<div className="ai-skeleton-loader">
					<div className="ai-skeleton-line" />
					<div className="ai-skeleton-line medium" />
					<div className="ai-skeleton-line short" />
				</div>
			)}

			{generatedReply && !isAiLoading && (
				<motion.div
					className="marketing-result"
					initial={{ opacity: 0, scale: 0.98 }}
					animate={{ opacity: 1, scale: 1 }}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "flex-start",
							marginBottom: "12px",
						}}
					>
						<div>
							<h4
								style={{
									margin: 0,
									fontSize: 14,
									fontWeight: 700,
									color: "var(--teal-dark)",
									textTransform: "uppercase",
									letterSpacing: "0.05em",
								}}
							>
								Оптимизированный ответ
							</h4>
							<p
								style={{
									margin: "4px 0 0 0",
									fontSize: 13,
									color: "var(--muted)",
								}}
							>
								Готов для публикации на Яндекс, Google или 2ГИС
							</p>
						</div>
						<button
							type="button"
							className="secondary-button"
							onClick={handleCopy}
							style={{
								padding: "8px 16px",
								background: copied ? "var(--green-soft)" : undefined,
								color: copied ? "var(--green)" : undefined,
								borderColor: copied ? "var(--green)" : undefined,
							}}
						>
							{copied ? (
								<>
									<CheckCircle2 size={18} /> Скопировано
								</>
							) : (
								<>
									<Copy size={18} /> Скопировать
								</>
							)}
						</button>
					</div>
					<p className="marketing-reply-text">{generatedReply}</p>
				</motion.div>
			)}
		</motion.div>
	);
}
