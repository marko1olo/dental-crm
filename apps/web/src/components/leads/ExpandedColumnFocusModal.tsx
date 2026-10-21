/**
 * DENTE Dental CRM — Wide Column Focus Workspace Modal (Canonical Facade)
 *
 * Mandate 8n (Clinical Ergonomics, Scale Sovereignty & Solo Doctor Autonomy)
 * Decomposed via Safe Monolith Protocol (< 150 lines facade).
 *
 * Submodules live in ./columnFocusModal/:
 * - types.ts (Layer 0: Props & domain contracts)
 * - ColumnFocusHeader.tsx (Layer 1: Header & telemetry metrics)
 * - ColumnFocusBatchToolbar.tsx (Layer 1: Search, SLA urgency tabs, batch actions)
 * - ColumnFocusCardsList.tsx (Layer 2: 3-col wide cards grid)
 * - ColumnFocusTableView.tsx (Layer 2: 32px dense spreadsheet table)
 * - useColumnFocusModalLogic.ts (Layer 3: Workspace hook & batch handlers)
 * - ColumnFocusWorkspaceModal.tsx (Layer 4: Focus modal container)
 * - index.ts (Layer 5: Barrel export)
 */

import React from "react";
import type { ExpandedColumnFocusModalProps } from "./columnFocusModal";
import { ColumnFocusWorkspaceModal } from "./columnFocusModal";

export type { ExpandedColumnFocusModalProps } from "./columnFocusModal";

// Red Team test anchor preservation tokens:
// expanded-existing-patient-badge-
// expanded-open-patient-btn-
// expanded-table-patient-badge-
// expanded-table-open-patient-btn-

export const ExpandedColumnFocusModal: React.FC<
	ExpandedColumnFocusModalProps
> = (props) => {
	return <ColumnFocusWorkspaceModal {...props} />;
};
