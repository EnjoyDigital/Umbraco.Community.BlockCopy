import { ClipboardStorage } from './storage/clipboard-storage.js';
import type { ServiceWorkerMessage } from './types/messages.js';

chrome.runtime.onMessage.addListener(
	(message: ServiceWorkerMessage, _sender, sendResponse) => {
		handleMessage(message)
			.then(sendResponse)
			.catch((error) => {
				sendResponse({ error: (error as Error).message ?? 'Unknown error' });
			});
		return true; // Keep the message channel open for async response
	},
);

async function handleMessage(message: ServiceWorkerMessage): Promise<unknown> {
	switch (message.type) {
		case 'STORE_BLOCKS': {
			await ClipboardStorage.store(message.data);
			return { success: true };
		}
		case 'GET_METADATA': {
			return await ClipboardStorage.getMetadata();
		}
		case 'GET_BLOCKS': {
			return await ClipboardStorage.getBlocks();
		}
		case 'CLEAR_BLOCKS': {
			await ClipboardStorage.clear();
			return { success: true };
		}
		default: {
			return { error: 'Unknown message type' };
		}
	}
}
