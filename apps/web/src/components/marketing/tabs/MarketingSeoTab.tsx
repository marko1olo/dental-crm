import { motion } from "framer-motion";
import { Search } from "lucide-react";
import type { useMarketingLogic } from "../../../hooks/useMarketingLogic";

type UseMarketingLogicReturn = ReturnType<typeof useMarketingLogic>;

export function MarketingSeoTab({
	state,
	actions,
}: {
	state: UseMarketingLogicReturn["state"];
	actions: UseMarketingLogicReturn["actions"];
}) {
	const { customSeoKeys, newKeyInput } = state;
	const { setNewKeyInput, handleAddSeoKey, handleRemoveSeoKey } = actions;

	return (
		<motion.div
			key="keys"
			className="marketing-panel"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			transition={{ duration: 0.2 }}
		>
			<div style={{ maxWidth: "600px" }}>
				<h3 style={{ marginTop: 0, marginBottom: "8px", fontSize: "18px" }}>
					Семантическое ядро клиники
				</h3>
				<p
					style={{
						color: "var(--muted)",
						marginBottom: "24px",
						lineHeight: 1.6,
						fontSize: "15px",
					}}
				>
					Эти поисковые ключи ИИ будет нативно интегрировать в ответы на позитивные отзывы. Это органически повышает рейтинг вашей карточки в поисковых системах.
				</p>

				<div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
					<input
						type="text"
						className="text-input"
						value={newKeyInput}
						onChange={(e) => setNewKeyInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleAddSeoKey(newKeyInput);
								setNewKeyInput("");
							}
						}}
						placeholder="Введите новый SEO-ключ..."
						style={{ flex: 1 }}
					/>
					<button
						type="button"
						className="primary-button"
						onClick={() => {
							handleAddSeoKey(newKeyInput);
							setNewKeyInput("");
						}}
						disabled={!newKeyInput.trim()}
					>
						Добавить ключ
					</button>
				</div>

				<div className="seo-keys-grid">
					{customSeoKeys.map((key: string) => (
						<div className="seo-key-chip" key={key}>
							<Search size={14} />
							<span>{key}</span>
							<button
								type="button"
								className="seo-key-chip-remove"
								onClick={() => handleRemoveSeoKey(key)}
								aria-label={`Удалить ключ ${key}`}
							>
								×
							</button>
						</div>
					))}
					{customSeoKeys.length === 0 && (
						<p style={{ color: "var(--muted)", fontStyle: "italic" }}>
							Нет добавленных ключей.
						</p>
					)}
				</div>
			</div>
		</motion.div>
	);
}
