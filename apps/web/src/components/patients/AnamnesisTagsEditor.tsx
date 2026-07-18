import { Plus, X } from "lucide-react";
import React, { useState } from "react";

export interface AnamnesisTagsEditorProps {
	title: string;
	icon: React.ReactNode;
	quickTags: string[];
	tags: string[];
	colorTheme: "rose" | "blue" | "indigo";
	onAddTag: (val: string) => void;
	onRemoveTag: (val: string) => void;
	placeholder?: string;
}

export const AnamnesisTagsEditor: React.FC<AnamnesisTagsEditorProps> = ({
	title,
	icon,
	quickTags,
	tags,
	colorTheme,
	onAddTag,
	onRemoveTag,
	placeholder = "Добавить вручную...",
}) => {
	const [newVal, setNewVal] = useState("");

	const handleAdd = () => {
		onAddTag(newVal);
		setNewVal("");
	};

	return (
		<div>
			<label
				style={{
					display: "flex",
					alignItems: "center",
					gap: "6px",
					fontWeight: 600,
					marginBottom: "8px",
				}}
			>
				{icon} {title}
			</label>
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: "6px",
					marginBottom: "12px",
				}}
			>
				{quickTags.map((q) => (
					<button
						key={q}
						type="button"
						className="text-button"
						style={{
							padding: "4px 10px",
							fontSize: "0.8rem",
							borderRadius: "100px",
							background: `var(--${colorTheme}-50)`,
							color: `var(--${colorTheme}-700)`,
							border: `1px solid var(--${colorTheme}-200)`,
						}}
						onClick={() => onAddTag(q)}
					>
						+ {q}
					</button>
				))}
			</div>
			<div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
				<input
					className="text-input"
					style={{ flex: 1 }}
					value={newVal}
					onChange={(e) => setNewVal(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							handleAdd();
							e.preventDefault();
						}
					}}
					placeholder={placeholder}
				/>
				<button
					type="button"
					className="primary-button"
					onClick={handleAdd}
				>
					<Plus size={16} />
				</button>
			</div>
			<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
				{tags.map((a) => (
					<span
						key={a}
						style={{
							background: `var(--${colorTheme}-100)`,
							color: `var(--${colorTheme}-900)`,
							padding: "4px 12px",
							borderRadius: "6px",
							fontSize: "0.9rem",
							display: "flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						{a}{" "}
						<X
							size={14}
							style={{ cursor: "pointer" }}
							onClick={() => onRemoveTag(a)}
						/>
					</span>
				))}
			</div>
		</div>
	);
};
