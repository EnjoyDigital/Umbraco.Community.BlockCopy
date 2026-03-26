// Popup script for Umbraco Block Copy Chrome Extension

async function init(): Promise<void> {
  const statusText = document.getElementById('status-text')!;
  const details = document.getElementById('details')!;
  const clearBtn = document.getElementById('clear-btn')!;
  const sourceUrl = document.getElementById('source-url')!;
  const editorType = document.getElementById('editor-type')!;
  const blockCount = document.getElementById('block-count')!;
  const timestamp = document.getElementById('timestamp')!;

  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_METADATA' });

    if (response && response.hasData) {
      statusText.textContent = `${response.blockCount} block(s) copied`;
      statusText.classList.add('has-data');

      sourceUrl.textContent = response.sourceUrl;
      editorType.textContent = response.editorType;
      blockCount.textContent = String(response.blockCount);
      timestamp.textContent = new Date(response.timestamp).toLocaleString();

      details.style.display = 'block';
      clearBtn.style.display = 'block';
    } else {
      statusText.textContent = 'Clipboard is empty';
      statusText.classList.add('empty');
    }
  } catch {
    statusText.textContent = 'Clipboard is empty';
    statusText.classList.add('empty');
  }

  clearBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'CLEAR_BLOCKS' });
    statusText.textContent = 'Clipboard is empty';
    statusText.classList.remove('has-data');
    statusText.classList.add('empty');
    details.style.display = 'none';
    clearBtn.style.display = 'none';
  });
}

init();
