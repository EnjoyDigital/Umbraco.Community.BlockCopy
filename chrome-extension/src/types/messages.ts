// Portable block data structure (shared with Umbraco package)
export interface PortableBlockData {
	version: number;
	sourceUrl: string;
	timestamp: number;
	editorType: 'BlockList' | 'BlockGrid';
	blocks: {
		contentData: Array<unknown>;
		settingsData: Array<unknown>;
		layout: Array<unknown>;
		expose: Array<unknown>;
	};
}

// Messages from content script / popup -> service worker
export type ServiceWorkerMessage =
	| { type: 'STORE_BLOCKS'; data: PortableBlockData }
	| { type: 'GET_METADATA' }
	| { type: 'GET_BLOCKS' }
	| { type: 'CLEAR_BLOCKS' };

// Responses from service worker
export interface MetadataResponse {
	hasData: boolean;
	sourceUrl?: string;
	editorType?: string;
	timestamp?: number;
	blockCount?: number;
}

export interface BlocksResponse {
	hasData: boolean;
	data?: PortableBlockData;
}

export type ServiceWorkerResponse = MetadataResponse | BlocksResponse | { success: boolean };

// DOM CustomEvent types (for content script <-> Umbraco package communication)
export const BRIDGE_EXPORT_EVENT = 'blockcopy:export';
export const BRIDGE_IMPORT_EVENT = 'blockcopy:import';
export const BRIDGE_AVAILABLE_EVENT = 'blockcopy:available';
export const BRIDGE_REQUEST_IMPORT_EVENT = 'blockcopy:request-import';

export interface BridgeExportDetail {
	data: PortableBlockData;
}

export interface BridgeImportDetail {
	data: PortableBlockData;
}

export interface BridgeAvailableDetail {
	hasData: boolean;
	editorType: string;
	sourceUrl: string;
	timestamp: number;
	blockCount: number;
}
