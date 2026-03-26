import type { PortableBlockData } from '../models/portable-block.model.js';
import {
	BRIDGE_EXPORT_EVENT,
	BRIDGE_IMPORT_EVENT,
	BRIDGE_AVAILABLE_EVENT,
	BRIDGE_REQUEST_IMPORT_EVENT,
	BRIDGE_EXTENSION_ATTRIBUTE,
	type BridgeExportDetail,
	type BridgeImportDetail,
	type BridgeAvailableDetail,
} from './types.js';

const IMPORT_TIMEOUT_MS = 5000;

/**
 * Bridge for communicating with the Chrome extension via DOM CustomEvents.
 * The Chrome extension's content script listens for these events and relays
 * data to/from chrome.storage.local.
 */
export class ExternalClipboardBridge {
	/**
	 * Export block data to the Chrome extension.
	 * Dispatches a CustomEvent that the content script will capture.
	 */
	static export(data: PortableBlockData): void {
		const detail: BridgeExportDetail = { data: structuredClone(data) };
		document.dispatchEvent(
			new CustomEvent(BRIDGE_EXPORT_EVENT, {
				detail,
				bubbles: false,
				composed: false,
			}),
		);
	}

	/**
	 * Request block data from the Chrome extension.
	 * Returns a Promise that resolves when the content script responds with data,
	 * or rejects after a timeout.
	 */
	static requestImport(): Promise<PortableBlockData> {
		return new Promise<PortableBlockData>((resolve, reject) => {
			const timeout = setTimeout(() => {
				document.removeEventListener(BRIDGE_IMPORT_EVENT, handler);
				reject(new Error('Import request timed out. Is the Block Copy Chrome extension installed?'));
			}, IMPORT_TIMEOUT_MS);

			const handler = (event: Event) => {
				clearTimeout(timeout);
				document.removeEventListener(BRIDGE_IMPORT_EVENT, handler);
				const detail = (event as CustomEvent<BridgeImportDetail>).detail;
				if (detail?.data) {
					resolve(structuredClone(detail.data));
				} else {
					reject(new Error('No block data available in the external clipboard.'));
				}
			};

			document.addEventListener(BRIDGE_IMPORT_EVENT, handler);

			// Signal the content script to send us the data
			document.dispatchEvent(
				new CustomEvent(BRIDGE_REQUEST_IMPORT_EVENT, {
					bubbles: false,
					composed: false,
				}),
			);
		});
	}

	/**
	 * Listen for availability signals from the Chrome extension.
	 * The content script dispatches this event when it detects stored block data.
	 */
	static onAvailable(callback: (detail: BridgeAvailableDetail) => void): () => void {
		const handler = (event: Event) => {
			const detail = (event as CustomEvent<BridgeAvailableDetail>).detail;
			if (detail) {
				callback(detail);
			}
		};

		document.addEventListener(BRIDGE_AVAILABLE_EVENT, handler);

		// Return cleanup function
		return () => {
			document.removeEventListener(BRIDGE_AVAILABLE_EVENT, handler);
		};
	}

	/**
	 * Check if the Chrome extension is installed and active on this page.
	 * The content script sets a sentinel attribute on the document element.
	 */
	static isExtensionPresent(): boolean {
		return document.documentElement.hasAttribute(BRIDGE_EXTENSION_ATTRIBUTE);
	}
}
