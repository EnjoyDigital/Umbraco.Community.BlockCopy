import { expect } from '@open-wc/testing';
import { BlockSerializer } from './block-serializer.js';
import { PORTABLE_BLOCK_DATA_VERSION } from './portable-block.model.js';
import type { PortableBlockData, PortableBlockGridLayoutModel, PortableBlockListLayoutModel } from './portable-block.model.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('BlockSerializer', () => {

	// -- Test data --

	const blockListValue = {
		contentData: [
			{
				key: 'content-key-1',
				contentTypeKey: 'element-type-1',
				values: [
					{ culture: null, segment: null, alias: 'headline', editorAlias: 'Umbraco.TextBox', value: 'Hello World', entityType: '' },
					{ culture: null, segment: null, alias: 'body', editorAlias: 'Umbraco.RichText', value: '<p>Content</p>', entityType: '' },
				],
			},
			{
				key: 'content-key-2',
				contentTypeKey: 'element-type-2',
				values: [
					{ culture: null, segment: null, alias: 'image', editorAlias: 'Umbraco.MediaPicker3', value: [{ mediaKey: 'media-1' }], entityType: '' },
				],
			},
		],
		settingsData: [
			{
				key: 'settings-key-1',
				contentTypeKey: 'settings-type-1',
				values: [
					{ culture: null, segment: null, alias: 'cssClass', editorAlias: 'Umbraco.TextBox', value: 'featured', entityType: '' },
				],
			},
		],
		layout: {
			'Umbraco.BlockList': [
				{ contentKey: 'content-key-1', settingsKey: 'settings-key-1' },
				{ contentKey: 'content-key-2', settingsKey: null },
			],
		},
		expose: [
			{ contentKey: 'content-key-1', culture: null, segment: null },
			{ contentKey: 'content-key-2', culture: 'en-US', segment: null },
		],
	};

	const blockGridValue = {
		contentData: [
			{ key: 'grid-content-1', contentTypeKey: 'grid-element-1', values: [{ culture: null, segment: null, alias: 'title', editorAlias: 'Umbraco.TextBox', value: 'Grid Title', entityType: '' }] },
			{ key: 'grid-content-2', contentTypeKey: 'grid-element-2', values: [{ culture: null, segment: null, alias: 'text', editorAlias: 'Umbraco.TextBox', value: 'Nested', entityType: '' }] },
			{ key: 'grid-content-3', contentTypeKey: 'grid-element-1', values: [{ culture: null, segment: null, alias: 'title', editorAlias: 'Umbraco.TextBox', value: 'Deep Nested', entityType: '' }] },
		],
		settingsData: [],
		layout: {
			'Umbraco.BlockGrid': [
				{
					contentKey: 'grid-content-1',
					settingsKey: null,
					columnSpan: 12,
					rowSpan: 1,
					areas: [
						{
							key: 'area-1',
							items: [
								{
									contentKey: 'grid-content-2',
									settingsKey: null,
									columnSpan: 6,
									rowSpan: 1,
									areas: [
										{
											key: 'area-1-1',
											items: [
												{
													contentKey: 'grid-content-3',
													settingsKey: null,
													columnSpan: 12,
													rowSpan: 1,
												},
											],
										},
									],
								},
							],
						},
					],
				},
			],
		},
		expose: [
			{ contentKey: 'grid-content-1', culture: null, segment: null },
		],
	};

	const sourceUrl = 'https://source-site.example.com';

	// -- Helper --

	function collectAllKeys(portableData: PortableBlockData): string[] {
		const keys: string[] = [];
		for (const block of portableData.blocks.contentData) {
			keys.push(block.key);
		}
		for (const block of portableData.blocks.settingsData) {
			keys.push(block.key);
		}
		return keys;
	}

	function collectGridLayoutContentKeys(items: Array<PortableBlockGridLayoutModel>): string[] {
		const keys: string[] = [];
		for (const item of items) {
			keys.push(item.contentKey);
			if (item.settingsKey) {
				keys.push(item.settingsKey);
			}
			if (item.areas) {
				for (const area of item.areas) {
					keys.push(...collectGridLayoutContentKeys(area.items));
				}
			}
		}
		return keys;
	}

	// -- serialize tests --

	describe('serialize', () => {

		it('should serialize a BlockList value into a valid PortableBlockData structure', () => {
			const result = BlockSerializer.serialize(blockListValue, 'BlockList', sourceUrl);

			expect(result.version).to.equal(PORTABLE_BLOCK_DATA_VERSION);
			expect(result.sourceUrl).to.equal(sourceUrl);
			expect(result.editorType).to.equal('BlockList');
			expect(result.timestamp).to.be.a('number');
			expect(result.timestamp).to.be.greaterThan(0);
			expect(result.blocks.contentData).to.have.length(2);
			expect(result.blocks.settingsData).to.have.length(1);
			expect(result.blocks.layout).to.have.length(2);
			expect(result.blocks.expose).to.have.length(2);
		});

		it('should serialize a BlockGrid value with areas and preserve layout structure', () => {
			const result = BlockSerializer.serialize(blockGridValue, 'BlockGrid', sourceUrl);

			expect(result.version).to.equal(PORTABLE_BLOCK_DATA_VERSION);
			expect(result.editorType).to.equal('BlockGrid');
			expect(result.blocks.contentData).to.have.length(3);
			expect(result.blocks.layout).to.have.length(1);

			const gridLayout = result.blocks.layout as Array<PortableBlockGridLayoutModel>;
			expect(gridLayout[0].columnSpan).to.equal(12);
			expect(gridLayout[0].rowSpan).to.equal(1);
			expect(gridLayout[0].areas).to.have.length(1);
			expect(gridLayout[0].areas![0].key).to.equal('area-1');
			expect(gridLayout[0].areas![0].items).to.have.length(1);
			expect(gridLayout[0].areas![0].items[0].areas).to.have.length(1);
			expect(gridLayout[0].areas![0].items[0].areas![0].key).to.equal('area-1-1');
			expect(gridLayout[0].areas![0].items[0].areas![0].items).to.have.length(1);
		});

		it('should preserve all property values during serialization', () => {
			const result = BlockSerializer.serialize(blockListValue, 'BlockList', sourceUrl);

			const headlineValue = result.blocks.contentData[0].values.find((v) => v.alias === 'headline');
			expect(headlineValue).to.exist;
			expect(headlineValue!.value).to.equal('Hello World');
			expect(headlineValue!.editorAlias).to.equal('Umbraco.TextBox');
			expect(headlineValue!.culture).to.be.null;
			expect(headlineValue!.segment).to.be.null;

			const bodyValue = result.blocks.contentData[0].values.find((v) => v.alias === 'body');
			expect(bodyValue).to.exist;
			expect(bodyValue!.value).to.equal('<p>Content</p>');

			const imageValue = result.blocks.contentData[1].values.find((v) => v.alias === 'image');
			expect(imageValue).to.exist;
			expect(imageValue!.value).to.deep.equal([{ mediaKey: 'media-1' }]);

			const cssValue = result.blocks.settingsData[0].values.find((v) => v.alias === 'cssClass');
			expect(cssValue).to.exist;
			expect(cssValue!.value).to.equal('featured');
		});

		it('should not mutate the original property value object', () => {
			const originalContentKey = blockListValue.contentData[0].key;
			const originalLayout = blockListValue.layout['Umbraco.BlockList'];
			const originalLayoutFirstEntry = { ...originalLayout[0] };

			BlockSerializer.serialize(blockListValue, 'BlockList', sourceUrl);

			expect(blockListValue.contentData[0].key).to.equal(originalContentKey);
			expect(blockListValue.layout['Umbraco.BlockList'][0].contentKey).to.equal(originalLayoutFirstEntry.contentKey);
			expect(blockListValue.layout['Umbraco.BlockList'][0].settingsKey).to.equal(originalLayoutFirstEntry.settingsKey);
		});

		it('should throw when the layout schema alias is not found', () => {
			const badValue = {
				contentData: [],
				settingsData: [],
				layout: { 'Wrong.Alias': [] },
				expose: [],
			};

			expect(() => BlockSerializer.serialize(badValue, 'BlockList', sourceUrl)).to.throw(
				'No layout found for schema alias "Umbraco.BlockList"',
			);
		});

		it('should strip entityType from serialized values', () => {
			const result = BlockSerializer.serialize(blockListValue, 'BlockList', sourceUrl);

			for (const block of result.blocks.contentData) {
				for (const v of block.values) {
					expect(v).to.not.have.property('entityType');
				}
			}
			for (const block of result.blocks.settingsData) {
				for (const v of block.values) {
					expect(v).to.not.have.property('entityType');
				}
			}
		});
	});

	// -- deserialize tests --

	describe('deserialize', () => {

		it('should regenerate all content keys as valid UUIDs', () => {
			const serialized = BlockSerializer.serialize(blockListValue, 'BlockList', sourceUrl);
			const result = BlockSerializer.deserialize(serialized);

			const originalKeys = ['content-key-1', 'content-key-2'];

			for (const block of result.contentData) {
				expect(block.key).to.match(UUID_REGEX);
				expect(originalKeys).to.not.include(block.key);
			}
		});

		it('should regenerate all settings keys as valid UUIDs', () => {
			const serialized = BlockSerializer.serialize(blockListValue, 'BlockList', sourceUrl);
			const result = BlockSerializer.deserialize(serialized);

			const originalKeys = ['settings-key-1'];

			for (const block of result.settingsData) {
				expect(block.key).to.match(UUID_REGEX);
				expect(originalKeys).to.not.include(block.key);
			}
		});

		it('should maintain key consistency between contentData and layout', () => {
			const serialized = BlockSerializer.serialize(blockListValue, 'BlockList', sourceUrl);
			const result = BlockSerializer.deserialize(serialized);

			const contentKeys = result.contentData.map((b) => b.key);
			const layoutEntries = result.layout['Umbraco.BlockList'] as Array<PortableBlockListLayoutModel>;

			for (const entry of layoutEntries) {
				expect(contentKeys).to.include(entry.contentKey);
			}
		});

		it('should maintain key consistency between settingsData and layout', () => {
			const serialized = BlockSerializer.serialize(blockListValue, 'BlockList', sourceUrl);
			const result = BlockSerializer.deserialize(serialized);

			const settingsKeys = result.settingsData.map((b) => b.key);
			const layoutEntries = result.layout['Umbraco.BlockList'] as Array<PortableBlockListLayoutModel>;

			for (const entry of layoutEntries) {
				if (entry.settingsKey) {
					expect(settingsKeys).to.include(entry.settingsKey);
				}
			}
		});

		it('should handle BlockGrid nested areas with keys remapped at all levels', () => {
			const serialized = BlockSerializer.serialize(blockGridValue, 'BlockGrid', sourceUrl);
			const result = BlockSerializer.deserialize(serialized);

			const originalContentKeys = ['grid-content-1', 'grid-content-2', 'grid-content-3'];
			const newContentKeys = result.contentData.map((b) => b.key);

			// All new keys must be valid UUIDs
			for (const key of newContentKeys) {
				expect(key).to.match(UUID_REGEX);
			}

			// No original keys should remain
			for (const key of newContentKeys) {
				expect(originalContentKeys).to.not.include(key);
			}

			// Check layout keys are remapped at all levels
			const gridLayout = result.layout['Umbraco.BlockGrid'] as Array<PortableBlockGridLayoutModel>;
			const allLayoutKeys = collectGridLayoutContentKeys(gridLayout);

			// All layout content keys should be new UUIDs
			for (const key of allLayoutKeys) {
				expect(key).to.match(UUID_REGEX);
				expect(originalContentKeys).to.not.include(key);
			}

			// Layout keys should reference the new content data keys
			expect(newContentKeys).to.include(gridLayout[0].contentKey);
			expect(newContentKeys).to.include(gridLayout[0].areas![0].items[0].contentKey);
			expect(newContentKeys).to.include(gridLayout[0].areas![0].items[0].areas![0].items[0].contentKey);
		});

		it('should remap expose entry contentKeys to the new keys', () => {
			const serialized = BlockSerializer.serialize(blockListValue, 'BlockList', sourceUrl);
			const result = BlockSerializer.deserialize(serialized);

			const contentKeys = result.contentData.map((b) => b.key);
			const originalKeys = ['content-key-1', 'content-key-2'];

			for (const entry of result.expose) {
				expect(entry.contentKey).to.match(UUID_REGEX);
				expect(originalKeys).to.not.include(entry.contentKey);
				expect(contentKeys).to.include(entry.contentKey);
			}
		});

		it('should wrap the layout in the correct schema alias for BlockList', () => {
			const serialized = BlockSerializer.serialize(blockListValue, 'BlockList', sourceUrl);
			const result = BlockSerializer.deserialize(serialized);

			expect(result.layout).to.have.property('Umbraco.BlockList');
			expect(result.layout['Umbraco.BlockList']).to.be.an('array');
		});

		it('should wrap the layout in the correct schema alias for BlockGrid', () => {
			const serialized = BlockSerializer.serialize(blockGridValue, 'BlockGrid', sourceUrl);
			const result = BlockSerializer.deserialize(serialized);

			expect(result.layout).to.have.property('Umbraco.BlockGrid');
			expect(result.layout['Umbraco.BlockGrid']).to.be.an('array');
		});

		it('should preserve contentTypeKey values unchanged', () => {
			const serialized = BlockSerializer.serialize(blockListValue, 'BlockList', sourceUrl);
			const result = BlockSerializer.deserialize(serialized);

			expect(result.contentData[0].contentTypeKey).to.equal('element-type-1');
			expect(result.contentData[1].contentTypeKey).to.equal('element-type-2');
			expect(result.settingsData[0].contentTypeKey).to.equal('settings-type-1');
		});

		it('should preserve all value data unchanged', () => {
			const serialized = BlockSerializer.serialize(blockListValue, 'BlockList', sourceUrl);
			const result = BlockSerializer.deserialize(serialized);

			const headline = result.contentData[0].values.find((v) => v.alias === 'headline');
			expect(headline).to.exist;
			expect(headline!.value).to.equal('Hello World');
			expect(headline!.editorAlias).to.equal('Umbraco.TextBox');

			const body = result.contentData[0].values.find((v) => v.alias === 'body');
			expect(body).to.exist;
			expect(body!.value).to.equal('<p>Content</p>');

			const image = result.contentData[1].values.find((v) => v.alias === 'image');
			expect(image).to.exist;
			expect(image!.value).to.deep.equal([{ mediaKey: 'media-1' }]);

			const cssClass = result.settingsData[0].values.find((v) => v.alias === 'cssClass');
			expect(cssClass).to.exist;
			expect(cssClass!.value).to.equal('featured');
		});

		it('should handle empty contentData, settingsData, and expose', () => {
			const emptyPortable: PortableBlockData = {
				version: PORTABLE_BLOCK_DATA_VERSION,
				sourceUrl,
				timestamp: Date.now(),
				editorType: 'BlockList',
				blocks: {
					contentData: [],
					settingsData: [],
					layout: [],
					expose: [],
				},
			};

			const result = BlockSerializer.deserialize(emptyPortable);

			expect(result.contentData).to.have.length(0);
			expect(result.settingsData).to.have.length(0);
			expect(result.expose).to.have.length(0);
			expect(result.layout['Umbraco.BlockList']).to.deep.equal([]);
		});

		it('should generate unique keys with no duplicates', () => {
			const serialized = BlockSerializer.serialize(blockListValue, 'BlockList', sourceUrl);
			const result = BlockSerializer.deserialize(serialized);

			const allKeys: string[] = [];
			for (const block of result.contentData) {
				allKeys.push(block.key);
			}
			for (const block of result.settingsData) {
				allKeys.push(block.key);
			}

			const uniqueKeys = new Set(allKeys);
			expect(uniqueKeys.size).to.equal(allKeys.length);
		});

		it('should preserve expose culture and segment values', () => {
			const serialized = BlockSerializer.serialize(blockListValue, 'BlockList', sourceUrl);
			const result = BlockSerializer.deserialize(serialized);

			// The first expose entry has culture=null, the second has culture='en-US'
			const exposeWithCulture = result.expose.find((e) => e.culture === 'en-US');
			expect(exposeWithCulture).to.exist;
			expect(exposeWithCulture!.segment).to.be.null;

			const exposeNullCulture = result.expose.find((e) => e.culture === null);
			expect(exposeNullCulture).to.exist;
		});
	});

	// -- validate tests --

	describe('validate', () => {

		it('should reject data with wrong version', () => {
			const badData = {
				version: 2,
				sourceUrl,
				timestamp: Date.now(),
				editorType: 'BlockList',
				blocks: {
					contentData: [],
					settingsData: [],
					layout: [],
					expose: [],
				},
			};

			const result = BlockSerializer.validate(badData);
			expect(result.valid).to.be.false;
			expect(result.errors).to.include('Unsupported version: 2, expected 1');
		});

		it('should reject data with missing blocks', () => {
			const badData = {
				version: PORTABLE_BLOCK_DATA_VERSION,
				sourceUrl,
				timestamp: Date.now(),
				editorType: 'BlockList',
			};

			const result = BlockSerializer.validate(badData);
			expect(result.valid).to.be.false;
			expect(result.errors).to.include('blocks is required and must be an object');
		});

		it('should reject data with invalid editorType', () => {
			const badData = {
				version: PORTABLE_BLOCK_DATA_VERSION,
				sourceUrl,
				timestamp: Date.now(),
				editorType: 'InvalidType',
				blocks: {
					contentData: [],
					settingsData: [],
					layout: [],
					expose: [],
				},
			};

			const result = BlockSerializer.validate(badData);
			expect(result.valid).to.be.false;
			expect(result.errors).to.include('editorType must be "BlockList" or "BlockGrid"');
		});

		it('should reject null or non-object data', () => {
			const resultNull = BlockSerializer.validate(null);
			expect(resultNull.valid).to.be.false;
			expect(resultNull.errors).to.include('Data must be an object');

			const resultString = BlockSerializer.validate('bad');
			expect(resultString.valid).to.be.false;
			expect(resultString.errors).to.include('Data must be an object');
		});

		it('should reject data with non-array contentData', () => {
			const badData = {
				version: PORTABLE_BLOCK_DATA_VERSION,
				editorType: 'BlockList',
				blocks: {
					contentData: 'not-an-array',
					settingsData: [],
					layout: [],
				},
			};

			const result = BlockSerializer.validate(badData);
			expect(result.valid).to.be.false;
			expect(result.errors).to.include('blocks.contentData must be an array');
		});

		it('should reject data with non-array settingsData', () => {
			const badData = {
				version: PORTABLE_BLOCK_DATA_VERSION,
				editorType: 'BlockList',
				blocks: {
					contentData: [],
					settingsData: null,
					layout: [],
				},
			};

			const result = BlockSerializer.validate(badData);
			expect(result.valid).to.be.false;
			expect(result.errors).to.include('blocks.settingsData must be an array');
		});

		it('should reject data with non-array layout', () => {
			const badData = {
				version: PORTABLE_BLOCK_DATA_VERSION,
				editorType: 'BlockList',
				blocks: {
					contentData: [],
					settingsData: [],
					layout: {},
				},
			};

			const result = BlockSerializer.validate(badData);
			expect(result.valid).to.be.false;
			expect(result.errors).to.include('blocks.layout must be an array');
		});

		it('should accept valid BlockList data', () => {
			const serialized = BlockSerializer.serialize(blockListValue, 'BlockList', sourceUrl);
			const result = BlockSerializer.validate(serialized);
			expect(result.valid).to.be.true;
			expect(result.errors).to.have.length(0);
		});

		it('should accept valid BlockGrid data', () => {
			const serialized = BlockSerializer.serialize(blockGridValue, 'BlockGrid', sourceUrl);
			const result = BlockSerializer.validate(serialized);
			expect(result.valid).to.be.true;
			expect(result.errors).to.have.length(0);
		});
	});

	// -- full round-trip tests --

	describe('full round-trip', () => {

		it('should serialize then deserialize a BlockList with structure intact and new keys', () => {
			const serialized = BlockSerializer.serialize(blockListValue, 'BlockList', sourceUrl);
			const deserialized = BlockSerializer.deserialize(serialized);

			// Structure matches
			expect(deserialized.contentData).to.have.length(2);
			expect(deserialized.settingsData).to.have.length(1);
			expect(deserialized.expose).to.have.length(2);

			const layout = deserialized.layout['Umbraco.BlockList'] as Array<PortableBlockListLayoutModel>;
			expect(layout).to.have.length(2);

			// All keys are new UUIDs
			const originalContentKeys = blockListValue.contentData.map((b) => b.key);
			const originalSettingsKeys = blockListValue.settingsData.map((b) => b.key);

			for (const block of deserialized.contentData) {
				expect(block.key).to.match(UUID_REGEX);
				expect(originalContentKeys).to.not.include(block.key);
			}

			for (const block of deserialized.settingsData) {
				expect(block.key).to.match(UUID_REGEX);
				expect(originalSettingsKeys).to.not.include(block.key);
			}

			// Layout references match content/settings keys
			expect(layout[0].contentKey).to.equal(deserialized.contentData[0].key);
			expect(layout[0].settingsKey).to.equal(deserialized.settingsData[0].key);
			expect(layout[1].contentKey).to.equal(deserialized.contentData[1].key);
			expect(layout[1].settingsKey).to.be.null;

			// Expose references match content keys
			expect(deserialized.expose[0].contentKey).to.equal(deserialized.contentData[0].key);
			expect(deserialized.expose[1].contentKey).to.equal(deserialized.contentData[1].key);

			// Values preserved
			expect(deserialized.contentData[0].values[0].value).to.equal('Hello World');
			expect(deserialized.contentData[0].contentTypeKey).to.equal('element-type-1');
			expect(deserialized.settingsData[0].values[0].value).to.equal('featured');
		});

		it('should serialize then deserialize a BlockGrid with 2 levels of nested areas', () => {
			const serialized = BlockSerializer.serialize(blockGridValue, 'BlockGrid', sourceUrl);
			const deserialized = BlockSerializer.deserialize(serialized);

			// Structure matches
			expect(deserialized.contentData).to.have.length(3);
			expect(deserialized.settingsData).to.have.length(0);

			const gridLayout = deserialized.layout['Umbraco.BlockGrid'] as Array<PortableBlockGridLayoutModel>;
			expect(gridLayout).to.have.length(1);

			const originalContentKeys = blockGridValue.contentData.map((b) => b.key);

			// All content keys are new UUIDs
			for (const block of deserialized.contentData) {
				expect(block.key).to.match(UUID_REGEX);
				expect(originalContentKeys).to.not.include(block.key);
			}

			// Root layout item
			const root = gridLayout[0];
			expect(root.contentKey).to.equal(deserialized.contentData[0].key);
			expect(root.columnSpan).to.equal(12);
			expect(root.rowSpan).to.equal(1);
			expect(root.areas).to.have.length(1);

			// Level 1 nested item
			const level1 = root.areas![0].items[0];
			expect(level1.contentKey).to.equal(deserialized.contentData[1].key);
			expect(level1.columnSpan).to.equal(6);
			expect(level1.areas).to.have.length(1);

			// Level 2 nested item
			const level2 = level1.areas![0].items[0];
			expect(level2.contentKey).to.equal(deserialized.contentData[2].key);
			expect(level2.columnSpan).to.equal(12);

			// Expose key remapped
			expect(deserialized.expose[0].contentKey).to.equal(deserialized.contentData[0].key);

			// Values preserved at all levels
			expect(deserialized.contentData[0].values[0].value).to.equal('Grid Title');
			expect(deserialized.contentData[1].values[0].value).to.equal('Nested');
			expect(deserialized.contentData[2].values[0].value).to.equal('Deep Nested');

			// ContentTypeKeys preserved
			expect(deserialized.contentData[0].contentTypeKey).to.equal('grid-element-1');
			expect(deserialized.contentData[1].contentTypeKey).to.equal('grid-element-2');
			expect(deserialized.contentData[2].contentTypeKey).to.equal('grid-element-1');

			// Area keys are preserved (they are structural, not block keys)
			expect(root.areas![0].key).to.equal('area-1');
			expect(level1.areas![0].key).to.equal('area-1-1');
		});
	});
});
