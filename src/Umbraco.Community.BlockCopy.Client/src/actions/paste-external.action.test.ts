import { expect } from '@open-wc/testing';
import { BlockSerializer } from '../models/block-serializer.js';
import { ExternalClipboardBridge } from '../bridge/bridge.js';
import {
	BRIDGE_IMPORT_EVENT,
	BRIDGE_REQUEST_IMPORT_EVENT,
	BRIDGE_EXTENSION_ATTRIBUTE,
} from '../bridge/types.js';
import type { PortableBlockData } from '../models/portable-block.model.js';

describe('Paste External Action - Integration', () => {
	const testPortableData: PortableBlockData = {
		version: 1,
		sourceUrl: 'https://source-site.com',
		timestamp: 1700000000000,
		editorType: 'BlockList',
		blocks: {
			contentData: [
				{
					key: 'original-content-key-1',
					contentTypeKey: 'element-type-1',
					values: [
						{
							culture: null,
							segment: null,
							alias: 'title',
							editorAlias: 'Umbraco.TextBox',
							value: 'Imported Title',
						},
					],
				},
				{
					key: 'original-content-key-2',
					contentTypeKey: 'element-type-2',
					values: [
						{
							culture: null,
							segment: null,
							alias: 'image',
							editorAlias: 'Umbraco.MediaPicker3',
							value: [{ mediaKey: 'media-guid' }],
						},
					],
				},
			],
			settingsData: [
				{
					key: 'original-settings-key-1',
					contentTypeKey: 'settings-type-1',
					values: [
						{
							culture: null,
							segment: null,
							alias: 'cssClass',
							editorAlias: 'Umbraco.TextBox',
							value: 'hero',
						},
					],
				},
			],
			layout: [
				{ contentKey: 'original-content-key-1', settingsKey: 'original-settings-key-1' },
				{ contentKey: 'original-content-key-2', settingsKey: null },
			],
			expose: [
				{ contentKey: 'original-content-key-1', culture: null, segment: null },
			],
		},
	};

	afterEach(() => {
		document.documentElement.removeAttribute(BRIDGE_EXTENSION_ATTRIBUTE);
	});

	describe('import + deserialize flow', () => {
		it('requestImport receives data and deserializes with new keys', async () => {
			// Simulate Chrome extension responding
			document.addEventListener(
				BRIDGE_REQUEST_IMPORT_EVENT,
				() => {
					setTimeout(() => {
						document.dispatchEvent(
							new CustomEvent(BRIDGE_IMPORT_EVENT, {
								detail: { data: testPortableData },
							}),
						);
					}, 10);
				},
				{ once: true },
			);

			const imported = await ExternalClipboardBridge.requestImport();
			const deserialized = BlockSerializer.deserialize(imported);

			// All keys should be regenerated
			expect(deserialized.contentData[0].key).to.not.equal('original-content-key-1');
			expect(deserialized.contentData[1].key).to.not.equal('original-content-key-2');
			expect(deserialized.settingsData[0].key).to.not.equal('original-settings-key-1');

			// Layout should reference new keys
			const layout = deserialized.layout['Umbraco.BlockList'] as Array<{ contentKey: string; settingsKey: string | null }>;
			expect(layout[0].contentKey).to.equal(deserialized.contentData[0].key);
			expect(layout[0].settingsKey).to.equal(deserialized.settingsData[0].key);
			expect(layout[1].contentKey).to.equal(deserialized.contentData[1].key);

			// Expose should reference new key
			expect(deserialized.expose[0].contentKey).to.equal(deserialized.contentData[0].key);

			// Values should be preserved
			expect(deserialized.contentData[0].values[0].value).to.equal('Imported Title');
			expect(deserialized.settingsData[0].values[0].value).to.equal('hero');
		});

		it('preserves content type keys after import + deserialize', async () => {
			document.addEventListener(
				BRIDGE_REQUEST_IMPORT_EVENT,
				() => {
					setTimeout(() => {
						document.dispatchEvent(
							new CustomEvent(BRIDGE_IMPORT_EVENT, {
								detail: { data: testPortableData },
							}),
						);
					}, 10);
				},
				{ once: true },
			);

			const imported = await ExternalClipboardBridge.requestImport();
			const deserialized = BlockSerializer.deserialize(imported);

			expect(deserialized.contentData[0].contentTypeKey).to.equal('element-type-1');
			expect(deserialized.contentData[1].contentTypeKey).to.equal('element-type-2');
			expect(deserialized.settingsData[0].contentTypeKey).to.equal('settings-type-1');
		});

		it('handles media picker values without corruption', async () => {
			document.addEventListener(
				BRIDGE_REQUEST_IMPORT_EVENT,
				() => {
					setTimeout(() => {
						document.dispatchEvent(
							new CustomEvent(BRIDGE_IMPORT_EVENT, {
								detail: { data: testPortableData },
							}),
						);
					}, 10);
				},
				{ once: true },
			);

			const imported = await ExternalClipboardBridge.requestImport();
			const deserialized = BlockSerializer.deserialize(imported);

			const mediaValue = deserialized.contentData[1].values[0].value as Array<{ mediaKey: string }>;
			expect(mediaValue[0].mediaKey).to.equal('media-guid');
		});
	});

	describe('full round-trip (serialize -> export -> import -> deserialize)', () => {
		it('completes a full cycle with valid data', async () => {
			const originalValue = {
				contentData: [
					{
						key: 'src-content-1',
						contentTypeKey: 'type-abc',
						values: [
							{ culture: null, segment: null, alias: 'name', editorAlias: 'Umbraco.TextBox', value: 'Round Trip', entityType: '' },
						],
					},
				],
				settingsData: [],
				layout: {
					'Umbraco.BlockList': [
						{ contentKey: 'src-content-1', settingsKey: null },
					],
				},
				expose: [],
			};

			// Step 1: Serialize
			const portable = BlockSerializer.serialize(originalValue, 'BlockList', 'https://site-a.com');

			// Step 2: Export (dispatch event)
			let exportedData: PortableBlockData | null = null;
			document.addEventListener(
				'blockcopy:export',
				(event: Event) => {
					exportedData = (event as CustomEvent).detail.data;
				},
				{ once: true },
			);
			ExternalClipboardBridge.export(portable);
			expect(exportedData).to.not.be.null;

			// Step 3: Simulate Chrome extension storing and returning data
			document.addEventListener(
				BRIDGE_REQUEST_IMPORT_EVENT,
				() => {
					setTimeout(() => {
						document.dispatchEvent(
							new CustomEvent(BRIDGE_IMPORT_EVENT, {
								detail: { data: exportedData },
							}),
						);
					}, 10);
				},
				{ once: true },
			);

			// Step 4: Import
			const imported = await ExternalClipboardBridge.requestImport();

			// Step 5: Deserialize
			const result = BlockSerializer.deserialize(imported);

			// Verify structure
			expect(result.contentData).to.have.length(1);
			expect(result.contentData[0].contentTypeKey).to.equal('type-abc');
			expect(result.contentData[0].values[0].value).to.equal('Round Trip');
			expect(result.contentData[0].key).to.not.equal('src-content-1');

			const layout = result.layout['Umbraco.BlockList'] as Array<{ contentKey: string }>;
			expect(layout[0].contentKey).to.equal(result.contentData[0].key);
		});
	});

	describe('error cases', () => {
		it('rejects import when no extension response', async () => {
			// Don't set up any response listener - let it timeout
			try {
				await ExternalClipboardBridge.requestImport();
				expect.fail('Should have rejected');
			} catch (error) {
				expect((error as Error).message).to.include('timed out');
			}
		});

		it('rejects invalid portable data during deserialization', () => {
			const invalidData = {
				version: 999,
				sourceUrl: 'https://test.com',
				timestamp: Date.now(),
				editorType: 'BlockList',
				blocks: { contentData: [], settingsData: [], layout: [], expose: [] },
			} as unknown as PortableBlockData;

			expect(() => BlockSerializer.deserialize(invalidData)).to.throw('Invalid portable block data');
		});
	});
});
