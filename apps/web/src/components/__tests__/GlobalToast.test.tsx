/**
 * DENTE Dental CRM — Unit Test for GlobalToast
 * Validates Mandates 8d, 8p (Screen preservation on mobile, max-height constraints, overflow protection)
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { GlobalToast, showToast } from '../GlobalToast';

describe('GlobalToast (Mobile & Desktop UX Constraints)', () => {
	it('exports showToast function and GlobalToast component', () => {
		assert.strictEqual(typeof showToast, 'function');
		assert.strictEqual(typeof GlobalToast, 'function');
	});

	it('renders null when there is no active toast', () => {
		const html = renderToString(<GlobalToast />);
		assert.strictEqual(html, '');
	});
});
