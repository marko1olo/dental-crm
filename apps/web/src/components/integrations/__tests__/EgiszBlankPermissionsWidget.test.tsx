import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { EgiszBlankPermissionsWidget } from "../EgiszBlankPermissionsWidget";
import { EgiszAuditLogDrawer } from "../egiszModules/EgiszAuditLogDrawer";
import { EgiszRolePermissionsTable } from "../egiszModules/EgiszRolePermissionsTable";
import { EgiszSyncStatusBadge } from "../egiszModules/EgiszSyncStatusBadge";
import type { EgiszPermissionItem } from "../egiszModules/egiszWidgetTypes";

describe("EgiszBlankPermissionsWidget Component Rendering Tests", () => {
	it("renders EgiszSyncStatusBadge with clean tokens and text", () => {
		const html = renderToString(<EgiszSyncStatusBadge statusKind="ready" />);
		assert.ok(html.includes("Права проверены"));
		assert.ok(html.includes("data-testid=\"egisz-sync-status-badge\""));
	});

	it("renders EgiszRolePermissionsTable with permissions rows and toggles", () => {
		const sampleItems: EgiszPermissionItem[] = [
			{
				id: "perm-043",
				formCode: "043/у",
				fieldName: "Анамнез жизни и соматический статус",
				isExportAllowed: true,
				patientOptOutRespect: true,
				requiredStaffRole: "Врач-стоматолог",
			},
			{
				id: "perm-101",
				formCode: "101",
				fieldName: "Первичный осмотр",
				isExportAllowed: false,
				patientOptOutRespect: false,
				requiredStaffRole: "Главврач",
			},
		];

		const html = renderToString(
			<EgiszRolePermissionsTable
				items={sampleItems}
				updatingId={null}
				onTogglePermission={() => {}}
			/>,
		);

		assert.ok(html.includes("Медицинская карта стоматологического больного (043/у)"));
		assert.ok(html.includes("Выгрузка разрешена"));
		assert.ok(html.includes("Выгрузка отключена"));
		assert.ok(html.includes("Отказ пациента:"));
		assert.ok(html.includes("учитывается"));
		assert.ok(html.includes("не учитывается"));
	});

	it("renders EgiszAuditLogDrawer with statutory receipts and reg numbers", () => {
		const html = renderToString(
			<EgiszAuditLogDrawer isOpen={true} onClose={() => {}} />,
		);

		assert.ok(html.includes("Журнал выгрузки в РЭМД ЕГИСЗ"));
		assert.ok(html.includes("РЭМД-77-2026-"));
		assert.ok(html.includes("Зарегистрирован"));
		assert.ok(html.includes("Смирнов Алексей Петрович"));
	});

	it("renders EgiszBlankPermissionsWidget root container and header", () => {
		const html = renderToString(<EgiszBlankPermissionsWidget />);
		assert.ok(html.includes("data-testid=\"egisz-blank-permissions-widget\""));
		assert.ok(html.includes("Права доступа к бланкам РЭМД ЕГИСЗ"));
		assert.ok(html.includes("Журнал выгрузки"));
	});
});
