export function DentalLabWarrantyReworkFields({
	reason,
	setReason,
}: {
	readonly reason: string;
	readonly setReason: (r: string) => void;
}) {
	return (
		<div className="ztl-form-group">
			<label htmlFor="ztl-warranty-reason-select" className="ztl-form-label">
				Причина рекламации / замечания врача *
			</label>
			<select
				id="ztl-warranty-reason-select"
				className="ztl-select"
				style={{ width: "100%", marginBottom: "8px" }}
				value={reason}
				onChange={(e) => setReason(e.target.value)}
			>
				<option value="Скол керамической облицовки">
					Скол керамической облицовки
				</option>
				<option value="Завышение прикуса / окклюзионный блок">
					Завышение прикуса / окклюзионный блок
				</option>
				<option value="Несоответствие цвета / оттенка VITA">
					Несоответствие цвета / оттенка VITA
				</option>
				<option value="Нарушение краевого прилегания (уступ)">
					Нарушение краевого прилегания (уступ)
				</option>
				<option value="Балансирование каркаса на культе">
					Балансирование каркаса на культе
				</option>
				<option value="Другая причина (указать вручную)">
					Другая причина (указать вручную)
				</option>
			</select>

			<textarea
				className="ztl-form-input"
				style={{ height: "70px", padding: "6px 10px", resize: "none" }}
				placeholder="Уточнение дефекта для зубного техника..."
				value={reason}
				onChange={(e) => setReason(e.target.value)}
			/>
		</div>
	);
}
