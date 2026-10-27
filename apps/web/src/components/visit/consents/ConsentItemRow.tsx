/**
 * ConsentItemRow.tsx - Canonical Facade
 * Mandate 8b: Facade strictly <= 15 lines.
 */
import React from "react";
import { ConsentItemRowPresenter } from "./row/ConsentItemRowPresenter";
import type { ConsentItemRowProps } from "./row/types";

export type { ConsentItemRowProps };
export function ConsentItemRow(props: ConsentItemRowProps) {
	return <ConsentItemRowPresenter {...props} />;
}
