import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClipboardStorage } from '../src/storage/clipboard-storage.js';
import type { PortableBlockData } from '../src/types/messages.js';

// Mock chrome.storage.local
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
};

// @ts-expect-error - mocking chrome global
globalThis.chrome = mockChrome;

const testBlockData: PortableBlockData = {
	version: 1,
	sourceUrl: 'https://site-a.com',
	timestamp: 1700000000000,
	editorType: 'BlockList',
	blocks: {
		contentData: [
			{
				key: 'key-1',
				contentTypeKey: 'type-1',
				values: [
					{ culture: null, segment: null, alias: 'title', editorAlias: 'Umbraco.TextBox', value: 'Hello' },
				],
			},
			{
				key: 'key-2',
				contentTypeKey: 'type-2',
				values: [],
			},
		],
		settingsData: [],
		layout: [
			{ contentKey: 'key-1', settingsKey: null },
			{ contentKey: 'key-2', settingsKey: null },
		],
		expose: [],
	},
};

describe('ClipboardStorage', () => {
	beforeEach(() => {
		mockStorage.clear();
		vi.clearAllMocks();
	});

	describe('store', () => {
		it('stores data in chrome.storage.local', async () => {
			await ClipboardStorage.store(testBlockData);
			expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
				'blockcopy:data': testBlockData,
			});
		});
	});

	describe('getMetadata', () => {
		it('returns hasData: false when empty', async () => {
			const result = await ClipboardStorage.getMetadata();
			expect(result.hasData).toBe(false);
		});

		it('returns metadata when data exists', async () => {
			await ClipboardStorage.store(testBlockData);
			const result = await ClipboardStorage.getMetadata();
			expect(result.hasData).toBe(true);
			expect(result.sourceUrl).toBe('https://site-a.com');
			expect(result.editorType).toBe('BlockList');
			expect(result.blockCount).toBe(2);
			expect(result.timestamp).toBe(1700000000000);
		});
	});

	describe('getBlocks', () => {
		it('returns hasData: false when empty', async () => {
			const result = await ClipboardStorage.getBlocks();
			expect(result.hasData).toBe(false);
		});

		it('returns full data when exists', async () => {
			await ClipboardStorage.store(testBlockData);
			const result = await ClipboardStorage.getBlocks();
			expect(result.hasData).toBe(true);
			expect(result.data).toEqual(testBlockData);
		});
	});

	describe('clear', () => {
		it('removes data from storage', async () => {
			await ClipboardStorage.store(testBlockData);
			await ClipboardStorage.clear();
			const result = await ClipboardStorage.getMetadata();
			expect(result.hasData).toBe(false);
		});
	});
});
