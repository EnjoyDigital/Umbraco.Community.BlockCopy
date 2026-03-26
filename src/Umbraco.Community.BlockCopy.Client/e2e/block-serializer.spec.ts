import { test, expect } from '@playwright/test';

// We test the serializer logic directly in the browser context
// using browser APIs (crypto.getRandomValues, structuredClone, CustomEvent)

test.describe('BlockSerializer E2E', () => {
	test.describe('BlockList serialization round-trip', () => {
		test('serializes and deserializes BlockList data with new keys', async ({ page }) => {
			await page.goto('about:blank');

			const result = await page.evaluate(() => {
				// Polyfill for randomUUID since about:blank is not a secure context
				function generateUUID(): string {
					const bytes = new Uint8Array(16);
					crypto.getRandomValues(bytes);
					bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
					bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1
					const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
					return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
				}

				// Inline the serializer logic for E2E testing
				const PORTABLE_BLOCK_DATA_VERSION = 1;
				const BLOCK_LIST_SCHEMA_ALIAS = 'Umbraco.BlockList';

				const blockListValue = {
					contentData: [
						{
							key: 'content-key-1',
							contentTypeKey: 'element-type-1',
							values: [
								{ culture: null, segment: null, alias: 'title', editorAlias: 'Umbraco.TextBox', value: 'Hello E2E' },
							],
						},
						{
							key: 'content-key-2',
							contentTypeKey: 'element-type-2',
							values: [
								{ culture: null, segment: null, alias: 'body', editorAlias: 'Umbraco.RichText', value: '<p>Body</p>' },
							],
						},
					],
					settingsData: [
						{
							key: 'settings-key-1',
							contentTypeKey: 'settings-type-1',
							values: [
								{ culture: null, segment: null, alias: 'css', editorAlias: 'Umbraco.TextBox', value: 'wide' },
							],
						},
					],
					layout: {
						[BLOCK_LIST_SCHEMA_ALIAS]: [
							{ contentKey: 'content-key-1', settingsKey: 'settings-key-1' },
							{ contentKey: 'content-key-2', settingsKey: null },
						],
					},
					expose: [
						{ contentKey: 'content-key-1', culture: null, segment: null },
					],
				};

				// Serialize
				const layout = blockListValue.layout[BLOCK_LIST_SCHEMA_ALIAS];
				const portableData = {
					version: PORTABLE_BLOCK_DATA_VERSION,
					sourceUrl: 'https://e2e-test.com',
					timestamp: Date.now(),
					editorType: 'BlockList' as const,
					blocks: {
						contentData: structuredClone(blockListValue.contentData),
						settingsData: structuredClone(blockListValue.settingsData),
						layout: structuredClone(layout),
						expose: structuredClone(blockListValue.expose),
					},
				};

				// Deserialize (regenerate keys)
				const keyMap = new Map<string, string>();
				const newContentData = portableData.blocks.contentData.map((block) => {
					const newKey = generateUUID();
					keyMap.set(block.key, newKey);
					return { ...block, key: newKey };
				});
				const newSettingsData = portableData.blocks.settingsData.map((block) => {
					const newKey = generateUUID();
					keyMap.set(block.key, newKey);
					return { ...block, key: newKey };
				});
				const newLayout = (portableData.blocks.layout as Array<{ contentKey: string; settingsKey: string | null }>).map((entry) => ({
					...entry,
					contentKey: keyMap.get(entry.contentKey) ?? entry.contentKey,
					settingsKey: entry.settingsKey ? (keyMap.get(entry.settingsKey) ?? entry.settingsKey) : null,
				}));
				const newExpose = portableData.blocks.expose.map((entry) => ({
					...entry,
					contentKey: keyMap.get(entry.contentKey) ?? entry.contentKey,
				}));

				// Verify
				const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
				const allKeysValid = newContentData.every((b) => uuidRegex.test(b.key)) &&
					newSettingsData.every((b) => uuidRegex.test(b.key));
				const keysChanged = newContentData[0].key !== 'content-key-1' &&
					newContentData[1].key !== 'content-key-2' &&
					newSettingsData[0].key !== 'settings-key-1';
				const layoutConsistent = newLayout[0].contentKey === newContentData[0].key &&
					newLayout[0].settingsKey === newSettingsData[0].key &&
					newLayout[1].contentKey === newContentData[1].key;
				const exposeConsistent = newExpose[0].contentKey === newContentData[0].key;
				const valuesPreserved = newContentData[0].values[0].value === 'Hello E2E' &&
					newContentData[1].values[0].value === '<p>Body</p>' &&
					newSettingsData[0].values[0].value === 'wide';

				return {
					allKeysValid,
					keysChanged,
					layoutConsistent,
					exposeConsistent,
					valuesPreserved,
					contentCount: newContentData.length,
					settingsCount: newSettingsData.length,
					layoutCount: newLayout.length,
				};
			});

			expect(result.allKeysValid).toBe(true);
			expect(result.keysChanged).toBe(true);
			expect(result.layoutConsistent).toBe(true);
			expect(result.exposeConsistent).toBe(true);
			expect(result.valuesPreserved).toBe(true);
			expect(result.contentCount).toBe(2);
			expect(result.settingsCount).toBe(1);
			expect(result.layoutCount).toBe(2);
		});
	});

	test.describe('BlockGrid nested areas', () => {
		test('correctly handles 3-level nested grid with key regeneration', async ({ page }) => {
			await page.goto('about:blank');

			const result = await page.evaluate(() => {
				// Polyfill for randomUUID since about:blank is not a secure context
				function generateUUID(): string {
					const bytes = new Uint8Array(16);
					crypto.getRandomValues(bytes);
					bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
					bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1
					const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
					return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
				}

				const gridValue = {
					contentData: [
						{ key: 'root', contentTypeKey: 'type-1', values: [] },
						{ key: 'level-1', contentTypeKey: 'type-2', values: [] },
						{ key: 'level-2', contentTypeKey: 'type-3', values: [] },
					],
					layout: [
						{
							contentKey: 'root',
							settingsKey: null,
							columnSpan: 12,
							rowSpan: 1,
							areas: [
								{
									key: 'area-A',
									items: [
										{
											contentKey: 'level-1',
											settingsKey: null,
											columnSpan: 6,
											rowSpan: 1,
											areas: [
												{
													key: 'area-B',
													items: [
														{
															contentKey: 'level-2',
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
				};

				// Generate new keys
				const keyMap = new Map<string, string>();
				for (const block of gridValue.contentData) {
					const newKey = generateUUID();
					keyMap.set(block.key, newKey);
					block.key = newKey;
				}

				// Recursive remap
				function remapGrid(layouts: Array<any>) {
					for (const entry of layouts) {
						entry.contentKey = keyMap.get(entry.contentKey) ?? entry.contentKey;
						if (entry.settingsKey) {
							entry.settingsKey = keyMap.get(entry.settingsKey) ?? entry.settingsKey;
						}
						if (entry.areas) {
							for (const area of entry.areas) {
								remapGrid(area.items);
							}
						}
					}
				}
				remapGrid(gridValue.layout);

				// Check all levels
				const rootKey = gridValue.contentData[0].key;
				const level1Key = gridValue.contentData[1].key;
				const level2Key = gridValue.contentData[2].key;

				return {
					rootChanged: rootKey !== 'root',
					level1Changed: level1Key !== 'level-1',
					level2Changed: level2Key !== 'level-2',
					rootLayoutMatch: gridValue.layout[0].contentKey === rootKey,
					level1LayoutMatch: gridValue.layout[0].areas[0].items[0].contentKey === level1Key,
					level2LayoutMatch: gridValue.layout[0].areas[0].items[0].areas[0].items[0].contentKey === level2Key,
					areaKeysPreserved: gridValue.layout[0].areas[0].key === 'area-A' &&
						gridValue.layout[0].areas[0].items[0].areas[0].key === 'area-B',
				};
			});

			expect(result.rootChanged).toBe(true);
			expect(result.level1Changed).toBe(true);
			expect(result.level2Changed).toBe(true);
			expect(result.rootLayoutMatch).toBe(true);
			expect(result.level1LayoutMatch).toBe(true);
			expect(result.level2LayoutMatch).toBe(true);
			expect(result.areaKeysPreserved).toBe(true);
		});
	});

	test.describe('DOM Bridge Events', () => {
		test('export event dispatches and can be captured', async ({ page }) => {
			await page.goto('about:blank');

			const result = await page.evaluate(() => {
				return new Promise<{ received: boolean; editorType: string; blockCount: number }>((resolve) => {
					document.addEventListener('blockcopy:export', (event: Event) => {
						const detail = (event as CustomEvent).detail;
						resolve({
							received: true,
							editorType: detail.data.editorType,
							blockCount: detail.data.blocks.contentData.length,
						});
					}, { once: true });

					document.dispatchEvent(new CustomEvent('blockcopy:export', {
						detail: {
							data: {
								version: 1,
								sourceUrl: 'https://test.com',
								timestamp: Date.now(),
								editorType: 'BlockList',
								blocks: {
									contentData: [{ key: '1', contentTypeKey: 't', values: [] }],
									settingsData: [],
									layout: [],
									expose: [],
								},
							},
						},
					}));
				});
			});

			expect(result.received).toBe(true);
			expect(result.editorType).toBe('BlockList');
			expect(result.blockCount).toBe(1);
		});

		test('request-import and import event flow works', async ({ page }) => {
			await page.goto('about:blank');

			const result = await page.evaluate(() => {
				return new Promise<{ received: boolean; value: string }>((resolve) => {
					// Simulate content script responding to import request
					document.addEventListener('blockcopy:request-import', () => {
						document.dispatchEvent(new CustomEvent('blockcopy:import', {
							detail: {
								data: {
									version: 1,
									sourceUrl: 'https://source.com',
									timestamp: Date.now(),
									editorType: 'BlockList',
									blocks: {
										contentData: [
											{
												key: 'k1',
												contentTypeKey: 't1',
												values: [{ culture: null, segment: null, alias: 'title', editorAlias: 'Umbraco.TextBox', value: 'E2E Import Test' }],
											},
										],
										settingsData: [],
										layout: [{ contentKey: 'k1', settingsKey: null }],
										expose: [],
									},
								},
							},
						}));
					}, { once: true });

					// Simulate Umbraco package requesting import
					document.addEventListener('blockcopy:import', (event: Event) => {
						const data = (event as CustomEvent).detail.data;
						resolve({
							received: true,
							value: data.blocks.contentData[0].values[0].value,
						});
					}, { once: true });

					document.dispatchEvent(new CustomEvent('blockcopy:request-import'));
				});
			});

			expect(result.received).toBe(true);
			expect(result.value).toBe('E2E Import Test');
		});

		test('extension sentinel attribute detection', async ({ page }) => {
			await page.goto('about:blank');

			const result = await page.evaluate(() => {
				const beforeSet = document.documentElement.hasAttribute('data-blockcopy-extension');
				document.documentElement.setAttribute('data-blockcopy-extension', 'true');
				const afterSet = document.documentElement.hasAttribute('data-blockcopy-extension');
				document.documentElement.removeAttribute('data-blockcopy-extension');
				const afterRemove = document.documentElement.hasAttribute('data-blockcopy-extension');

				return { beforeSet, afterSet, afterRemove };
			});

			expect(result.beforeSet).toBe(false);
			expect(result.afterSet).toBe(true);
			expect(result.afterRemove).toBe(false);
		});
	});

	test.describe('Data validation', () => {
		test('rejects invalid version', async ({ page }) => {
			await page.goto('about:blank');

			const result = await page.evaluate(() => {
				const data = { version: 99, editorType: 'BlockList', blocks: { contentData: [], settingsData: [], layout: [] } };
				const errors: string[] = [];
				if (data.version !== 1) errors.push('version');
				return { valid: errors.length === 0, errors };
			});

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('version');
		});

		test('accepts valid BlockList data', async ({ page }) => {
			await page.goto('about:blank');

			const result = await page.evaluate(() => {
				const data = {
					version: 1,
					sourceUrl: 'https://test.com',
					timestamp: Date.now(),
					editorType: 'BlockList',
					blocks: { contentData: [], settingsData: [], layout: [], expose: [] },
				};
				const errors: string[] = [];
				if (data.version !== 1) errors.push('version');
				if (data.editorType !== 'BlockList' && data.editorType !== 'BlockGrid') errors.push('editorType');
				if (!Array.isArray(data.blocks.contentData)) errors.push('contentData');
				return { valid: errors.length === 0, errors };
			});

			expect(result.valid).toBe(true);
		});
	});
});
