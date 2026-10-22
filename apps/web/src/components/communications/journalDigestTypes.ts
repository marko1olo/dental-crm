export type JournalEntryLike = {
	readonly direction?: unknown;
	readonly status?: unknown;
};

export type JournalPhase = "failed" | "empty" | "ready";

export type JournalDigest<TEntry extends JournalEntryLike = JournalEntryLike> = {
	readonly phase: JournalPhase;
	readonly entries: readonly TEntry[];
	readonly total: number;
	readonly undelivered: number;
	readonly pending: number;
	readonly totalLabel: string;
	readonly totalPillClass: string;
	readonly undeliveredLabel: string | null;
	readonly pendingLabel: string | null;
	readonly title: string;
	readonly hint: string;
};
