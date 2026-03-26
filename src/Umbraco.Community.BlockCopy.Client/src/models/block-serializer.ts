import {
	PORTABLE_BLOCK_DATA_VERSION,
	type PortableBlockData,
	type PortableBlockDataModel,
	type PortableBlockDataValueModel,
	type PortableBlockExposeModel,
	type PortableBlockGridLayoutModel,
	type PortableBlockListLayoutModel,
} from './portable-block.model.js';

const BLOCK_LIST_SCHEMA_ALIAS = 'Umbraco.BlockList';
const BLOCK_GRID_SCHEMA_ALIAS = 'Umbraco.BlockGrid';

export interface BlockValueModel {
	contentData: Array<{ key: string; contentTypeKey: string; values: Array<Record<string, unknown>> }>;
	settingsData: Array<{ key: string; contentTypeKey: string; values: Array<Record<string, unknown>> }>;
	layout: Record<string, Array<unknown> | undefined>;
	expose: Array<{ contentKey: string; culture: string | null; segment: string | null }>;
}

export interface DeserializedBlockValue {
	contentData: Array<PortableBlockDataModel>;
	settingsData: Array<PortableBlockDataModel>;
	layout: Record<string, Array<unknown> | undefined>;
	expose: Array<PortableBlockExposeModel>;
}

export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

const MAX_BLOCK_COUNT = 500;
const MAX_VALUE_COUNT_PER_BLOCK = 200;

/**
 * Generate a UUID v4, with a fallback for non-secure contexts (HTTP)
 * where crypto.randomUUID() is not available.
 */
function generateUUID(): string {
	// Prefer crypto.randomUUID() when available (secure contexts / HTTPS)
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	// Fallback: use crypto.getRandomValues which is available in more contexts
	if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
		const bytes = new Uint8Array(16);
		crypto.getRandomValues(bytes);
		// Set version (4) and variant (RFC 4122)
		bytes[6] = (bytes[6] & 0x0f) | 0x40;
		bytes[8] = (bytes[8] & 0x3f) | 0x80;
		const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
		return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
	}
	throw new Error(
		'Block Copy requires a browser with crypto.randomUUID() or crypto.getRandomValues() support. ' +
		'Ensure the page is served over HTTPS or use a modern browser.',
	);
}

export class BlockSerializer {

	static serialize(
		propertyValue: BlockValueModel,
		editorType: 'BlockList' | 'BlockGrid',
		sourceUrl: string,
	): PortableBlockData {
		const schemaAlias = editorType === 'BlockList' ? BLOCK_LIST_SCHEMA_ALIAS : BLOCK_GRID_SCHEMA_ALIAS;
		const layout = propertyValue.layout[schemaAlias];

		if (!layout) {
			throw new Error(`No layout found for schema alias "${schemaAlias}"`);
		}

		// Deep clone to avoid mutating the original
		const clonedContentData: Array<PortableBlockDataModel> = structuredClone(propertyValue.contentData).map(
			(block) => ({
				key: block.key,
				contentTypeKey: block.contentTypeKey,
				values: block.values.map((v: Record<string, unknown>) => ({
					culture: (v.culture as string | null) ?? null,
					segment: (v.segment as string | null) ?? null,
					alias: v.alias as string,
					editorAlias: v.editorAlias as string,
					value: v.value,
				})),
			}),
		);

		const clonedSettingsData: Array<PortableBlockDataModel> = structuredClone(propertyValue.settingsData).map(
			(block) => ({
				key: block.key,
				contentTypeKey: block.contentTypeKey,
				values: block.values.map((v: Record<string, unknown>) => ({
					culture: (v.culture as string | null) ?? null,
					segment: (v.segment as string | null) ?? null,
					alias: v.alias as string,
					editorAlias: v.editorAlias as string,
					value: v.value,
				})),
			}),
		);

		const clonedLayout = structuredClone(layout);
		const clonedExpose: Array<PortableBlockExposeModel> = structuredClone(propertyValue.expose ?? []);

		return {
			version: PORTABLE_BLOCK_DATA_VERSION,
			sourceUrl,
			timestamp: Date.now(),
			editorType,
			blocks: {
				contentData: clonedContentData,
				settingsData: clonedSettingsData,
				layout: clonedLayout as Array<PortableBlockListLayoutModel> | Array<PortableBlockGridLayoutModel>,
				expose: clonedExpose,
			},
		};
	}

	static deserialize(portableData: PortableBlockData): DeserializedBlockValue {
		const validation = BlockSerializer.validate(portableData);
		if (!validation.valid) {
			throw new Error(`Invalid portable block data: ${validation.errors.join(', ')}`);
		}

		const keyMap = new Map<string, string>();

		// Deep clone all data
		const contentData: Array<PortableBlockDataModel> = structuredClone(portableData.blocks.contentData);
		const settingsData: Array<PortableBlockDataModel> = structuredClone(portableData.blocks.settingsData);
		const layout = structuredClone(portableData.blocks.layout);
		const expose: Array<PortableBlockExposeModel> = structuredClone(portableData.blocks.expose);

		// Generate new keys for content data
		for (const block of contentData) {
			const newKey = generateUUID();
			keyMap.set(block.key, newKey);
			block.key = newKey;
		}

		// Generate new keys for settings data
		for (const block of settingsData) {
			const newKey = generateUUID();
			keyMap.set(block.key, newKey);
			block.key = newKey;
		}

		// Remap layout keys
		if (portableData.editorType === 'BlockGrid') {
			BlockSerializer.#remapGridLayoutKeys(
				layout as Array<PortableBlockGridLayoutModel>,
				keyMap,
			);
		} else {
			BlockSerializer.#remapListLayoutKeys(
				layout as Array<PortableBlockListLayoutModel>,
				keyMap,
			);
		}

		// Remap expose keys
		for (const entry of expose) {
			const newKey = keyMap.get(entry.contentKey);
			if (newKey) {
				entry.contentKey = newKey;
			}
		}

		// Wrap layout back into schema alias format
		const schemaAlias =
			portableData.editorType === 'BlockList' ? BLOCK_LIST_SCHEMA_ALIAS : BLOCK_GRID_SCHEMA_ALIAS;

		return {
			contentData,
			settingsData,
			layout: { [schemaAlias]: layout },
			expose,
		};
	}

	static validate(portableData: unknown): ValidationResult {
		const errors: string[] = [];

		if (!portableData || typeof portableData !== 'object') {
			return { valid: false, errors: ['Data must be an object'] };
		}

		const data = portableData as Record<string, unknown>;

		if (data.version !== PORTABLE_BLOCK_DATA_VERSION) {
			errors.push(`Unsupported version: ${data.version}, expected ${PORTABLE_BLOCK_DATA_VERSION}`);
		}

		if (!data.editorType || (data.editorType !== 'BlockList' && data.editorType !== 'BlockGrid')) {
			errors.push('editorType must be "BlockList" or "BlockGrid"');
		}

		if (typeof data.sourceUrl !== 'undefined' && typeof data.sourceUrl !== 'string') {
			errors.push('sourceUrl must be a string');
		}

		if (!data.blocks || typeof data.blocks !== 'object') {
			errors.push('blocks is required and must be an object');
		} else {
			const blocks = data.blocks as Record<string, unknown>;
			if (!Array.isArray(blocks.contentData)) {
				errors.push('blocks.contentData must be an array');
			} else {
				if (blocks.contentData.length > MAX_BLOCK_COUNT) {
					errors.push(`blocks.contentData exceeds maximum of ${MAX_BLOCK_COUNT} blocks (got ${blocks.contentData.length})`);
				}
				BlockSerializer.#validateBlockDataArray(blocks.contentData, 'contentData', errors);
			}
			if (!Array.isArray(blocks.settingsData)) {
				errors.push('blocks.settingsData must be an array');
			} else {
				if (blocks.settingsData.length > MAX_BLOCK_COUNT) {
					errors.push(`blocks.settingsData exceeds maximum of ${MAX_BLOCK_COUNT} blocks (got ${blocks.settingsData.length})`);
				}
				BlockSerializer.#validateBlockDataArray(blocks.settingsData, 'settingsData', errors);
			}
			if (!Array.isArray(blocks.layout)) {
				errors.push('blocks.layout must be an array');
			}
		}

		return { valid: errors.length === 0, errors };
	}

	static #validateBlockDataArray(
		blocks: Array<unknown>,
		label: string,
		errors: string[],
	): void {
		for (let i = 0; i < blocks.length; i++) {
			const block = blocks[i];
			if (!block || typeof block !== 'object') {
				errors.push(`blocks.${label}[${i}] must be an object`);
				continue;
			}
			const b = block as Record<string, unknown>;
			if (typeof b.key !== 'string' || b.key.length === 0) {
				errors.push(`blocks.${label}[${i}].key must be a non-empty string`);
			}
			if (typeof b.contentTypeKey !== 'string' || b.contentTypeKey.length === 0) {
				errors.push(`blocks.${label}[${i}].contentTypeKey must be a non-empty string`);
			}
			if (!Array.isArray(b.values)) {
				errors.push(`blocks.${label}[${i}].values must be an array`);
			} else if (b.values.length > MAX_VALUE_COUNT_PER_BLOCK) {
				errors.push(`blocks.${label}[${i}].values exceeds maximum of ${MAX_VALUE_COUNT_PER_BLOCK}`);
			}
		}
	}

	static #remapListLayoutKeys(
		layout: Array<PortableBlockListLayoutModel>,
		keyMap: Map<string, string>,
	): void {
		for (const entry of layout) {
			const newContentKey = keyMap.get(entry.contentKey);
			if (newContentKey) {
				entry.contentKey = newContentKey;
			}
			if (entry.settingsKey) {
				const newSettingsKey = keyMap.get(entry.settingsKey);
				if (newSettingsKey) {
					entry.settingsKey = newSettingsKey;
				}
			}
		}
	}

	static #remapGridLayoutKeys(
		layout: Array<PortableBlockGridLayoutModel>,
		keyMap: Map<string, string>,
	): void {
		for (const entry of layout) {
			const newContentKey = keyMap.get(entry.contentKey);
			if (newContentKey) {
				entry.contentKey = newContentKey;
			}
			if (entry.settingsKey) {
				const newSettingsKey = keyMap.get(entry.settingsKey);
				if (newSettingsKey) {
					entry.settingsKey = newSettingsKey;
				}
			}
			// Recursively process nested areas
			if (entry.areas) {
				for (const area of entry.areas) {
					BlockSerializer.#remapGridLayoutKeys(area.items, keyMap);
				}
			}
		}
	}
}
