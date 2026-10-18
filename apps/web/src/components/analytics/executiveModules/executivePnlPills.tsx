import React from "react";
import type { DepartmentPerformanceStatus } from "@dental/shared";
import { AlertCircle, ArrowDownRight, ArrowUpRight, CheckCircle } from "lucide-react";

export function getStatusPill(status: DepartmentPerformanceStatus, label: string) {
	if (label === "План не задан") {
		return <span className="executive-pill executive-pill-neutral">{label}</span>;
	}
	switch (status) {
		case "ahead":
			return (
				<span className="executive-pill executive-pill-success">
					<ArrowUpRight size={12} aria-hidden="true" />
					{label}
				</span>
			);
		case "on_track":
			return (
				<span className="executive-pill executive-pill-success">
					<CheckCircle size={12} aria-hidden="true" />
					{label}
				</span>
			);
		case "behind":
			return (
				<span className="executive-pill executive-pill-warning">
					<ArrowDownRight size={12} aria-hidden="true" />
					{label}
				</span>
			);
		case "critical":
			return (
				<span className="executive-pill executive-pill-danger">
					<AlertCircle size={12} aria-hidden="true" />
					{label}
				</span>
			);
	}
}

export function getProgressFillColor(status: DepartmentPerformanceStatus, accent: string) {
	switch (status) {
		case "ahead":
			return "var(--ok-fg, #10b981)";
		case "on_track":
			return accent || "var(--teal, #0d9488)";
		case "behind":
			return "var(--warn-fg, #f59e0b)";
		case "critical":
			return "var(--err-fg, #ef4444)";
	}
}
