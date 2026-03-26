export const PORTABLE_BLOCK_DATA_VERSION = 1;

export interface PortableBlockDataValueModel {
	culture: string | null;
	segment: string | null;
	alias: string;
	editorAlias: string;
	value: unknown;
}

export interface PortableBlockDataModel {
	key: string;
	contentTypeKey: string;
	values: Array<PortableBlockDataValueModel>;
}

export interface PortableBlockExposeModel {
	contentKey: string;
	culture: string | null;
	segment: string | null;
}

export interface PortableBlockGridLayoutModel {
	contentKey: string;
	settingsKey?: string | null;
	columnSpan: number;
	rowSpan: number;
	areas?: Array<{
		key: string;
		items: Array<PortableBlockGridLayoutModel>;
	}>;
}

export interface PortableBlockListLayoutModel {
	contentKey: string;
	settingsKey?: string | null;
}

export interface PortableBlockData {
	version: typeof PORTABLE_BLOCK_DATA_VERSION;
	sourceUrl: string;
	timestamp: number;
	editorType: 'BlockList' | 'BlockGrid';
	blocks: {
		contentData: Array<PortableBlockDataModel>;
		settingsData: Array<PortableBlockDataModel>;
		layout: Array<PortableBlockListLayoutModel> | Array<PortableBlockGridLayoutModel>;
		expose: Array<PortableBlockExposeModel>;
	};
}
