import { expect } from '@open-wc/testing';
import { ExternalClipboardBridge } from './bridge.js';
import {
	BRIDGE_EXPORT_EVENT,
	BRIDGE_IMPORT_EVENT,
	BRIDGE_AVAILABLE_EVENT,
	BRIDGE_REQUEST_IMPORT_EVENT,
	BRIDGE_EXTENSION_ATTRIBUTE,
} from './types.js';
import type { PortableBlockData } from '../models/portable-block.model.js';

const testPortableData: PortableBlockData = {
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
		],
		settingsData: [],
		layout: [{ contentKey: 'key-1', settingsKey: null }],
		expose: [{ contentKey: 'key-1', culture: null, segment: null }],
	},
};

describe('ExternalClipboardBridge', () => {
	afterEach(() => {
		// Clean up sentinel attribute
		document.documentElement.removeAttribute(BRIDGE_EXTENSION_ATTRIBUTE);
	});

	describe('export', () => {
		it('dispatches a CustomEvent with block data', (done) => {
			document.addEventListener(
				BRIDGE_EXPORT_EVENT,
				(event: Event) => {
					const detail = (event as CustomEvent).detail;
					expect(detail).to.exist;
					expect(detail.data).to.deep.equal(testPortableData);
					done();
				},
				{ once: true },
			);

			ExternalClipboardBridge.export(testPortableData);
		});

		it('deep clones data to prevent mutation', (done) => {
			const mutableData = structuredClone(testPortableData);

			document.addEventListener(
				BRIDGE_EXPORT_EVENT,
				(event: Event) => {
					const detail = (event as CustomEvent).detail;
					// Mutate the dispatched data
					detail.data.sourceUrl = 'mutated';
					// Original should be unchanged
					expect(mutableData.sourceUrl).to.equal('https://site-a.com');
					done();
				},
				{ once: true },
			);

			ExternalClipboardBridge.export(mutableData);
		});
	});

	describe('requestImport', () => {
		it('resolves with data when import event fires', async () => {
			// Simulate content script responding to the request
			document.addEventListener(
				BRIDGE_REQUEST_IMPORT_EVENT,
				() => {
					// Respond after a short delay (simulating content script)
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

			const result = await ExternalClipboardBridge.requestImport();
			expect(result).to.deep.equal(testPortableData);
		});

		it('rejects when no data in import event', async () => {
			document.addEventListener(
				BRIDGE_REQUEST_IMPORT_EVENT,
				() => {
					setTimeout(() => {
						document.dispatchEvent(
							new CustomEvent(BRIDGE_IMPORT_EVENT, {
								detail: { data: null },
							}),
						);
					}, 10);
				},
				{ once: true },
			);

			try {
				await ExternalClipboardBridge.requestImport();
				expect.fail('Should have rejected');
			} catch (error) {
				expect((error as Error).message).to.include('No block data available');
			}
		});

		it('dispatches request-import event', (done) => {
			document.addEventListener(
				BRIDGE_REQUEST_IMPORT_EVENT,
				() => {
					done();
					// Send response to avoid timeout
					document.dispatchEvent(
						new CustomEvent(BRIDGE_IMPORT_EVENT, {
							detail: { data: testPortableData },
						}),
					);
				},
				{ once: true },
			);

			ExternalClipboardBridge.requestImport();
		});
	});

	describe('onAvailable', () => {
		it('calls callback when available event fires', (done) => {
			const availableDetail = {
				hasData: true,
				editorType: 'BlockList',
				sourceUrl: 'https://site-a.com',
				timestamp: 1700000000000,
				blockCount: 1,
			};

			const cleanup = ExternalClipboardBridge.onAvailable((detail) => {
				expect(detail).to.deep.equal(availableDetail);
				cleanup();
				done();
			});

			document.dispatchEvent(
				new CustomEvent(BRIDGE_AVAILABLE_EVENT, { detail: availableDetail }),
			);
		});

		it('returns a cleanup function that removes the listener', () => {
			let callCount = 0;
			const cleanup = ExternalClipboardBridge.onAvailable(() => {
				callCount++;
			});

			document.dispatchEvent(
				new CustomEvent(BRIDGE_AVAILABLE_EVENT, {
					detail: { hasData: true, editorType: 'BlockList', sourceUrl: '', timestamp: 0, blockCount: 0 },
				}),
			);
			expect(callCount).to.equal(1);

			cleanup();

			document.dispatchEvent(
				new CustomEvent(BRIDGE_AVAILABLE_EVENT, {
					detail: { hasData: true, editorType: 'BlockList', sourceUrl: '', timestamp: 0, blockCount: 0 },
				}),
			);
			expect(callCount).to.equal(1); // Should not increment
		});
	});

	describe('isExtensionPresent', () => {
		it('returns false when sentinel attribute is missing', () => {
			expect(ExternalClipboardBridge.isExtensionPresent()).to.be.false;
		});

		it('returns true when sentinel attribute is present', () => {
			document.documentElement.setAttribute(BRIDGE_EXTENSION_ATTRIBUTE, 'true');
			expect(ExternalClipboardBridge.isExtensionPresent()).to.be.true;
		});
	});
});
