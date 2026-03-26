import type { PortableBlockData, MetadataResponse } from '../types/messages.js';

const STORAGE_KEY = 'blockcopy:data';
const MAX_STORAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export class ClipboardStorage {
	static async store(data: PortableBlockData): Promise<void> {
		// Guard against excessively large payloads
		const serialized = JSON.stringify(data);
		if (serialized.length > MAX_STORAGE_SIZE_BYTES) {
			throw new Error(
				`Block data exceeds the maximum storage size of ${MAX_STORAGE_SIZE_BYTES / 1024 / 1024} MB. ` +
				`Try copying fewer blocks.`
			);
		}
		await chrome.storage.local.set({ [STORAGE_KEY]: data });
	}

	static async getMetadata(): Promise<MetadataResponse> {
		const result = await chrome.storage.local.get(STORAGE_KEY);
		const data = result[STORAGE_KEY] as PortableBlockData | undefined;

		if (!data) {
			return { hasData: false };
		}

		const blockCount = data.blocks?.contentData?.length ?? 0;

		return {
			hasData: true,
			sourceUrl: data.sourceUrl,
			editorType: data.editorType,
			timestamp: data.timestamp,
			blockCount,
		};
	}

	static async getBlocks(): Promise<{ hasData: boolean; data?: PortableBlockData }> {
		const result = await chrome.storage.local.get(STORAGE_KEY);
		const data = result[STORAGE_KEY] as PortableBlockData | undefined;

		if (!data) {
			return { hasData: false };
		}

		return { hasData: true, data };
	}

	static async clear(): Promise<void> {
		await chrome.storage.local.remove(STORAGE_KEY);
	}
}
