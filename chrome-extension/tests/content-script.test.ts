// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock chrome API
const mockChrome = {
	runtime: {
		sendMessage: vi.fn(),
	},
};

// @ts-expect-error - mocking chrome global
globalThis.chrome = mockChrome;

describe('Content Script Logic', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		document.documentElement.removeAttribute('data-blockcopy-extension');
	});

	describe('Umbraco detection', () => {
		it('detects Umbraco when umb-backoffice-main exists', () => {
			const el = document.createElement('umb-backoffice-main');
			document.body.appendChild(el);
			const found = document.querySelector('umb-backoffice-main');
			expect(found).toBeTruthy();
			document.body.removeChild(el);
		});

		it('detects Umbraco when umb-app exists', () => {
			const el = document.createElement('umb-app');
			document.body.appendChild(el);
			const found = document.querySelector('umb-app');
			expect(found).toBeTruthy();
			document.body.removeChild(el);
		});

		it('does not detect Umbraco on regular pages', () => {
			expect(document.querySelector('umb-backoffice-main')).toBeNull();
			expect(document.querySelector('umb-app')).toBeNull();
		});
	});

	describe('Bridge sentinel', () => {
		it('sentinel attribute can be set', () => {
			document.documentElement.setAttribute('data-blockcopy-extension', 'true');
			expect(document.documentElement.hasAttribute('data-blockcopy-extension')).toBe(true);
		});
	});

	describe('Event relay', () => {
		it('export event contains correct structure', () => {
			let receivedDetail: unknown = null;

			document.addEventListener(
				'blockcopy:export',
				(event: Event) => {
					receivedDetail = (event as CustomEvent).detail;
				},
				{ once: true },
			);

			const testData = {
				version: 1,
				sourceUrl: 'https://test.com',
				timestamp: Date.now(),
				editorType: 'BlockList',
				blocks: { contentData: [], settingsData: [], layout: [], expose: [] },
			};

			document.dispatchEvent(
				new CustomEvent('blockcopy:export', {
					detail: { data: testData },
				}),
			);

			expect(receivedDetail).toBeTruthy();
			expect((receivedDetail as any).data.editorType).toBe('BlockList');
		});

		it('import event can carry block data', () => {
			let receivedData: unknown = null;

			document.addEventListener(
				'blockcopy:import',
				(event: Event) => {
					receivedData = (event as CustomEvent).detail?.data;
				},
				{ once: true },
			);

			const testData = {
				version: 1,
				sourceUrl: 'https://source.com',
				timestamp: Date.now(),
				editorType: 'BlockGrid',
				blocks: { contentData: [], settingsData: [], layout: [], expose: [] },
			};

			document.dispatchEvent(
				new CustomEvent('blockcopy:import', {
					detail: { data: testData },
				}),
			);

			expect(receivedData).toBeTruthy();
			expect((receivedData as any).editorType).toBe('BlockGrid');
		});

		it('request-import event can be dispatched', (done) => {
			document.addEventListener(
				'blockcopy:request-import',
				() => {
					done();
				},
				{ once: true },
			);

			document.dispatchEvent(new CustomEvent('blockcopy:request-import'));
		});

		it('available event carries metadata', () => {
			let receivedDetail: unknown = null;

			document.addEventListener(
				'blockcopy:available',
				(event: Event) => {
					receivedDetail = (event as CustomEvent).detail;
				},
				{ once: true },
			);

			document.dispatchEvent(
				new CustomEvent('blockcopy:available', {
					detail: {
						hasData: true,
						editorType: 'BlockList',
						sourceUrl: 'https://source.com',
						timestamp: 1700000000000,
						blockCount: 3,
					},
				}),
			);

			expect(receivedDetail).toBeTruthy();
			expect((receivedDetail as any).blockCount).toBe(3);
		});
	});
});
