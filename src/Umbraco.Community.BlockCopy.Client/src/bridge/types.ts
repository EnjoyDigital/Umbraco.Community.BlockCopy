import type { PortableBlockData } from '../models/portable-block.model.js';

export const BRIDGE_EXPORT_EVENT = 'blockcopy:export';
export const BRIDGE_IMPORT_EVENT = 'blockcopy:import';
export const BRIDGE_AVAILABLE_EVENT = 'blockcopy:available';
export const BRIDGE_REQUEST_IMPORT_EVENT = 'blockcopy:request-import';
export const BRIDGE_EXTENSION_ATTRIBUTE = 'data-blockcopy-extension';

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
