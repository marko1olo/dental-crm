/**
 * chairDoctorRosterTestHelpers.ts — Вспомогательные утилиты тестирования ростера кресел и смен врачей.
 * SSOT для декомпозированных сьютов (Мандаты 8b, 8zi).
 */

import React, { act } from "react";
import type { Dashboard } from "@dental/shared";
import {
	type MockDomNode,
	setupMockDom,
	findNodeByTestId,
	collectAllText,
	hasCartoonEmojis,
	CARTOON_EMOJI_REGEX,
} from "./scheduleMockDomHarness";

export {
	type MockDomNode,
	setupMockDom,
	findNodeByTestId,
	collectAllText,
	hasCartoonEmojis,
	CARTOON_EMOJI_REGEX,
};

export function findAllNodesByTestId(
	node: MockDomNode | null,
	testIdPrefix: string,
): MockDomNode[] {
	const res: MockDomNode[] = [];
	function traverse(n: MockDomNode | null) {
		if (!n) return;
		const tid = n.getAttribute?.("data-testid");
		if (tid && tid.startsWith(testIdPrefix)) {
			res.push(n);
		}
		if (n.children) {
			for (const c of n.children) traverse(c);
		}
	}
	traverse(node);
	return res;
}

export function findNodesByTag(node: MockDomNode | null, tag: string): MockDomNode[] {
	const res: MockDomNode[] = [];
	function traverse(n: MockDomNode | null) {
		if (!n) return;
		if (n.tagName === tag.toUpperCase()) {
			res.push(n);
		}
		if (n.children) {
			for (const c of n.children) traverse(c);
		}
	}
	traverse(node);
	return res;
}

export async function clickNode(node: MockDomNode | null) {
	if (!node) return;
	await act(async () => {
		let curr: MockDomNode | null = node;
		while (curr) {
			const reactPropKey = Object.keys(curr).find((k) =>
				k.startsWith("__reactProps$"),
			);
			if (reactPropKey) {
				const props = (curr as any)[reactPropKey];
				if (props && typeof props.onClick === "function") {
					await props.onClick({
						type: "click",
						preventDefault: () => {},
						stopPropagation: () => {},
						target: node,
						currentTarget: curr,
					});
					return;
				}
			}
			curr = curr.parentNode;
		}
		node.dispatchEvent({ type: "click" });
	});
}

export async function changeInputNode(node: MockDomNode | null, value: string) {
	if (!node) return;
	await act(async () => {
		node.value = value;
		let curr: MockDomNode | null = node;
		while (curr) {
			const reactPropKey = Object.keys(curr).find((k) =>
				k.startsWith("__reactProps$"),
			);
			if (reactPropKey) {
				const props = (curr as any)[reactPropKey];
				if (props && typeof props.onChange === "function") {
					await props.onChange({
						type: "change",
						target: { value },
						currentTarget: { value },
					});
					return;
				}
			}
			curr = curr.parentNode;
		}
		node.dispatchEvent({ type: "change", target: { value } });
	});
}

export function getMockDashboard(): Dashboard {
	return {
		clinicSettings: {
			chairs: [
				{
					id: "chair-1",
					name: "Кресло 1 (Терапия)",
					room: "1",
					roomNumber: "1",
					color: "#0d9488",
					specialization: "therapist",
					active: true,
				},
				{
					id: "chair-2",
					name: "Кресло 2 (Хирургия)",
					room: "2",
					roomNumber: "2",
					color: "#2563eb",
					specialization: "surgeon",
					active: true,
				},
			],
			staff: [
				{
					id: "doc-1",
					fullName: "Иванов Иван Иванович",
					role: "doctor",
					specialties: ["therapist"],
					active: true,
					preferredChairId: "chair-1",
				},
				{
					id: "doc-2",
					fullName: "Петрова Анна Сергеевна",
					role: "doctor",
					specialties: ["surgeon"],
					active: true,
					preferredChairId: "chair-2",
				},
			],
			profile: {
				organizationId: "org-1",
				timezone: "Europe/Moscow",
			},
		},
		appointments: [],
		patients: [],
	} as unknown as Dashboard;
}
