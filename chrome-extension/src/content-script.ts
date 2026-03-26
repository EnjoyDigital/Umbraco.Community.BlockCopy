// Content script for Umbraco Block Copy Chrome Extension
// Injected into all pages, detects Umbraco backoffice, and relays block data

const BRIDGE_EXPORT_EVENT = 'blockcopy:export';
const BRIDGE_IMPORT_EVENT = 'blockcopy:import';
const BRIDGE_AVAILABLE_EVENT = 'blockcopy:available';
const BRIDGE_REQUEST_IMPORT_EVENT = 'blockcopy:request-import';
const BRIDGE_EXTENSION_ATTRIBUTE = 'data-blockcopy-extension';

const UMBRACO_DETECTION_TIMEOUT_MS = 15000;
const UMBRACO_DETECTION_INTERVAL_MS = 2000;

/**
 * Detect if the current page is an Umbraco backoffice by looking for
 * the <umb-backoffice-main> custom element.
 */
function detectUmbracoBackoffice(): Promise<boolean> {
	return new Promise((resolve) => {
		// Immediate check
		if (document.querySelector('umb-backoffice-main') || document.querySelector('umb-app')) {
			resolve(true);
			return;
		}

		// Set up MutationObserver for SPA detection
		const observer = new MutationObserver(() => {
			if (document.querySelector('umb-backoffice-main') || document.querySelector('umb-app')) {
				observer.disconnect();
				clearTimeout(timeout);
				clearInterval(interval);
				resolve(true);
			}
		});

		observer.observe(document.body || document.documentElement, {
			childList: true,
			subtree: true,
		});

		// Periodic check as fallback
		const interval = setInterval(() => {
			if (document.querySelector('umb-backoffice-main') || document.querySelector('umb-app')) {
				observer.disconnect();
				clearTimeout(timeout);
				clearInterval(interval);
				resolve(true);
			}
		}, UMBRACO_DETECTION_INTERVAL_MS);

		// Timeout - give up detection
		const timeout = setTimeout(() => {
			observer.disconnect();
			clearInterval(interval);
			resolve(false);
		}, UMBRACO_DETECTION_TIMEOUT_MS);
	});
}

/**
 * Set up event listeners for communication with the Umbraco package.
 */
function setupBridge(): void {
	// Set sentinel attribute so the Umbraco package knows we're here
	document.documentElement.setAttribute(BRIDGE_EXTENSION_ATTRIBUTE, 'true');

	// Listen for export events from the Umbraco package
	document.addEventListener(BRIDGE_EXPORT_EVENT, async (event: Event) => {
		const detail = (event as CustomEvent).detail;
		if (detail?.data) {
			// Basic structural validation before forwarding to storage
			const data = detail.data;
			if (
				typeof data !== 'object' ||
				typeof data.version !== 'number' ||
				typeof data.sourceUrl !== 'string' ||
				!data.blocks ||
				!Array.isArray(data.blocks.contentData) ||
				!Array.isArray(data.blocks.settingsData) ||
				!Array.isArray(data.blocks.layout)
			) {
				console.warn('[BlockCopy] Rejected export: data failed structural validation');
				return;
			}
			try {
				await chrome.runtime.sendMessage({
					type: 'STORE_BLOCKS',
					data: detail.data,
				});
			} catch (error) {
				console.error('[BlockCopy] Failed to store blocks:', error);
			}
		}
	});

	// Listen for import requests from the Umbraco package
	document.addEventListener(BRIDGE_REQUEST_IMPORT_EVENT, async () => {
		try {
			const response = await chrome.runtime.sendMessage({ type: 'GET_BLOCKS' });
			document.dispatchEvent(
				new CustomEvent(BRIDGE_IMPORT_EVENT, {
					detail: { data: response?.data ?? null },
					bubbles: false,
					composed: false,
				}),
			);
		} catch (error) {
			console.error('[BlockCopy] Failed to retrieve blocks:', error);
			document.dispatchEvent(
				new CustomEvent(BRIDGE_IMPORT_EVENT, {
					detail: { data: null },
					bubbles: false,
					composed: false,
				}),
			);
		}
	});

	// Check for available data and signal the Umbraco package
	signalAvailability();
}

/**
 * Check if there's stored block data and signal availability to the Umbraco package.
 */
async function signalAvailability(): Promise<void> {
	try {
		const response = await chrome.runtime.sendMessage({ type: 'GET_METADATA' });
		if (response?.hasData) {
			document.dispatchEvent(
				new CustomEvent(BRIDGE_AVAILABLE_EVENT, {
					detail: {
						hasData: true,
						editorType: response.editorType,
						sourceUrl: response.sourceUrl,
						timestamp: response.timestamp,
						blockCount: response.blockCount,
					},
					bubbles: false,
					composed: false,
				}),
			);
		}
	} catch (error) {
		console.error('[BlockCopy] Failed to check availability:', error);
	}
}

// Main entry point
async function init(): Promise<void> {
	const isUmbraco = await detectUmbracoBackoffice();
	if (isUmbraco) {
		setupBridge();
	}
}

init();
