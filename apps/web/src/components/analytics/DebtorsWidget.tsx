import React from "react";

export function DebtorsWidget({ data }: { data: any[] }) {
	return (
		<div className="analytics-card" style={{ display: 'flex', flexDirection: 'column' }}>
			<h3>Должники</h3>
			<div style={{ flex: 1, overflowY: 'auto', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
				{data.length === 0 ? (
					<div style={{ color: 'var(--fg-secondary)', fontSize: '14px' }}>Долгов нет.</div>
				) : (
					data.map((d, i) => (
						<div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
							<span style={{ color: 'var(--fg-primary)', fontSize: '14px', fontWeight: 500 }}>{d.name}</span>
							<span style={{ color: 'var(--red, #ef4444)', fontSize: '14px', fontWeight: 600 }}>{d.debt.toLocaleString()} ₽</span>
						</div>
					))
				)}
			</div>
		</div>
	);
}
