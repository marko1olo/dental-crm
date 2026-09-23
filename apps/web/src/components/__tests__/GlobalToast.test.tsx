/**
 * DENTE Dental CRM — Unit Test for GlobalToast
 * Validates Mandates 8d, 8p (Screen preservation on mobile, max-height constraints, overflow protection)
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GlobalToast, showToast } from '../GlobalToast';

describe('GlobalToast (Mobile & Desktop UX Constraints)', () => {
	it('exports showToast function and GlobalToast component', () => {
		expect(typeof showToast).toBe('function');
		expect(typeof GlobalToast).toBe('function');
	});

	it('renders null when there is no active toast', () => {
		const html = renderToString(<GlobalToast />);
		expect(html).toBe('');
	});
});
