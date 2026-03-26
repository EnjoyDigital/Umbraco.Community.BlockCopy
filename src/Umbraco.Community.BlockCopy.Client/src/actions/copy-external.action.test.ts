import { expect } from '@open-wc/testing';
import { BlockSerializer } from '../models/block-serializer.js';
import { ExternalClipboardBridge } from '../bridge/bridge.js';
import { BRIDGE_EXPORT_EVENT, BRIDGE_EXTENSION_ATTRIBUTE } from '../bridge/types.js';

describe('Copy External Action - Integration', () => {
	const blockListValue = {
		contentData: [
			{
				key: 'content-1',
				contentTypeKey: 'type-1',
				values: [
					{
						culture: null,
						segment: null,
						alias: 'title',
						editorAlias: 'Umbraco.TextBox',
						value: 'Test Title',
						entityType: '',
					},
				],
			},
		],
		settingsData: [],
		layout: {
			'Umbraco.BlockList': [
				{ contentKey: 'content-1', settingsKey: null },
			],
		},
		expose: [],
	};

	const blockGridValue = {
		contentData: [
			{
				key: 'grid-1',
				contentTypeKey: 'grid-type-1',
				values: [
					{
						culture: null,
						segment: null,
						alias: 'heading',
						editorAlias: 'Umbraco.TextBox',
						value: 'Grid Heading',
						entityType: '',
					},
				],
			},
		],
		settingsData: [],
		layout: {
			'Umbraco.BlockGrid': [
				{
					contentKey: 'grid-1',
					settingsKey: null,
					columnSpan: 12,
					rowSpan: 1,
				},
			],
		},
		expose: [],
	};

	afterEach(() => {
		document.documentElement.removeAttribute(BRIDGE_EXTENSION_ATTRIBUTE);
	});

	describe('serialize + export flow', () => {
		it('serializes BlockList value and dispatches export event', (done) => {
			document.addEventListener(
				BRIDGE_EXPORT_EVENT,
				(event: Event) => {
					const detail = (event as CustomEvent).detail;
					expect(detail.data.version).to.equal(1);
					expect(detail.data.editorType).to.equal('BlockList');
					expect(detail.data.blocks.contentData).to.have.length(1);
					expect(detail.data.blocks.contentData[0].values[0].value).to.equal('Test Title');
					done();
				},
				{ once: true },
			);

			const portableData = BlockSerializer.serialize(blockListValue, 'BlockList', 'https://test.com');
			ExternalClipboardBridge.export(portableData);
		});

		it('serializes BlockGrid value and dispatches export event', (done) => {
			document.addEventListener(
				BRIDGE_EXPORT_EVENT,
				(event: Event) => {
					const detail = (event as CustomEvent).detail;
					expect(detail.data.editorType).to.equal('BlockGrid');
					expect(detail.data.blocks.layout[0].columnSpan).to.equal(12);
					done();
				},
				{ once: true },
			);

			const portableData = BlockSerializer.serialize(blockGridValue, 'BlockGrid', 'https://test.com');
			ExternalClipboardBridge.export(portableData);
		});

		it('includes source URL in exported data', (done) => {
			document.addEventListener(
				BRIDGE_EXPORT_EVENT,
				(event: Event) => {
					const detail = (event as CustomEvent).detail;
					expect(detail.data.sourceUrl).to.equal('https://my-site.com');
					done();
				},
				{ once: true },
			);

			const portableData = BlockSerializer.serialize(blockListValue, 'BlockList', 'https://my-site.com');
			ExternalClipboardBridge.export(portableData);
		});

		it('includes timestamp in exported data', (done) => {
			const before = Date.now();
			document.addEventListener(
				BRIDGE_EXPORT_EVENT,
				(event: Event) => {
					const detail = (event as CustomEvent).detail;
					expect(detail.data.timestamp).to.be.at.least(before);
					expect(detail.data.timestamp).to.be.at.most(Date.now());
					done();
				},
				{ once: true },
			);

			const portableData = BlockSerializer.serialize(blockListValue, 'BlockList', 'https://test.com');
			ExternalClipboardBridge.export(portableData);
		});
	});

	describe('extension detection', () => {
		it('detects when extension is not present', () => {
			expect(ExternalClipboardBridge.isExtensionPresent()).to.be.false;
		});

		it('detects when extension is present', () => {
			document.documentElement.setAttribute(BRIDGE_EXTENSION_ATTRIBUTE, 'true');
			expect(ExternalClipboardBridge.isExtensionPresent()).to.be.true;
		});
	});

	describe('error handling', () => {
		it('throws when serializing with wrong schema alias', () => {
			const badValue = {
				contentData: [],
				settingsData: [],
				layout: { 'Wrong.Alias': [] },
				expose: [],
			};

			expect(() => BlockSerializer.serialize(badValue, 'BlockList', 'https://test.com')).to.throw(
				'No layout found',
			);
		});
	});
});
