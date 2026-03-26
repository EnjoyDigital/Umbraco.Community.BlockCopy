import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// Mock chrome before importing background
const mockStorage = new Map<string, unknown>();
const mockChrome = {
	storage: {
		local: {
			get: vi.fn(async (key: string) => {
				const value = mockStorage.get(key);
				return value !== undefined ? { [key]: value } : {};
			}),
			set: vi.fn(async (items: Record<string, unknown>) => {
				for (const [key, value] of Object.entries(items)) {
					mockStorage.set(key, value);
				}
			}),
			remove: vi.fn(async (key: string) => {
				mockStorage.delete(key);
			}),
		},
	},
	runtime: {
		onMessage: {
			addListener: vi.fn(),
		},
	},
};

// @ts-expect-error - mocking chrome global
globalThis.chrome = mockChrome;

// Import after mocking
import type { PortableBlockData } from '../src/types/messages.js';

const testData: PortableBlockData = {
	version: 1,
	sourceUrl: 'https://test.com',
	timestamp: Date.now(),
	editorType: 'BlockList',
	blocks: {
		contentData: [{ key: 'k1', contentTypeKey: 't1', values: [] }],
		settingsData: [],
		layout: [{ contentKey: 'k1', settingsKey: null }],
		expose: [],
	},
};

describe('Background Service Worker', () => {
	let messageHandler: (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean;

	beforeAll(async () => {
		// Import the background module once to register the listener
		await import('../src/background.js');

		// Capture the registered listener
		messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0]?.[0];
	});

	beforeEach(() => {
		// Only clear storage between tests, not mock call records
		mockStorage.clear();
	});

	it('registers a message listener', () => {
		expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();
		expect(messageHandler).toBeDefined();
	});

	it('handles STORE_BLOCKS message', async () => {
		const response = await new Promise((resolve) => {
			messageHandler({ type: 'STORE_BLOCKS', data: testData }, {}, resolve);
		});
		expect(response).toEqual({ success: true });
	});

	it('handles GET_METADATA with no data', async () => {
		const response = await new Promise((resolve) => {
			messageHandler({ type: 'GET_METADATA' }, {}, resolve);
		});
		expect(response).toEqual({ hasData: false });
	});

	it('handles GET_METADATA with data', async () => {
		await new Promise((resolve) => {
			messageHandler({ type: 'STORE_BLOCKS', data: testData }, {}, resolve);
		});
		const response = await new Promise((resolve) => {
			messageHandler({ type: 'GET_METADATA' }, {}, resolve);
		});
		expect((response as any).hasData).toBe(true);
		expect((response as any).blockCount).toBe(1);
	});

	it('handles GET_BLOCKS', async () => {
		await new Promise((resolve) => {
			messageHandler({ type: 'STORE_BLOCKS', data: testData }, {}, resolve);
		});
		const response = await new Promise((resolve) => {
			messageHandler({ type: 'GET_BLOCKS' }, {}, resolve);
		});
		expect((response as any).hasData).toBe(true);
		expect((response as any).data).toEqual(testData);
	});

	it('handles CLEAR_BLOCKS', async () => {
		await new Promise((resolve) => {
			messageHandler({ type: 'STORE_BLOCKS', data: testData }, {}, resolve);
		});
		await new Promise((resolve) => {
			messageHandler({ type: 'CLEAR_BLOCKS' }, {}, resolve);
		});
		const response = await new Promise((resolve) => {
			messageHandler({ type: 'GET_METADATA' }, {}, resolve);
		});
		expect((response as any).hasData).toBe(false);
	});
});
