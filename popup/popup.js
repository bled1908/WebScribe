// WebScribe Popup Script — v3
// Orchestrates: inject → extract → AI → export (Markdown download or PDF viewer tab)

(function () {
    'use strict';

    // ── DOM refs ──────────────────────────────────────────────────────────────
    const tabMarkdown = document.getElementById('tabMarkdown');
    const tabPDF = document.getElementById('tabPDF');
    const optTOC = document.getElementById('optTOC');
    const optImages = document.getElementById('optImages');
    const optAI = document.getElementById('optAI');
    const exportBtn = document.getElementById('exportBtn');
    const exportContent = document.getElementById('exportBtnContent');
    const exportLoading = document.getElementById('exportBtnLoading');
    const pageTitle = document.getElementById('pageTitle');
    const statusDot = document.getElementById('statusDot');
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMsg = document.getElementById('toastMsg');

    let selectedFormat = 'markdown';
    let toastTimer = null;

    // ── Init: show current page title ─────────────────────────────────────────
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs[0]) {
            pageTitle.textContent = tabs[0].title || tabs[0].url || 'Current page';
        }
    });

    // ── Format tab switching ──────────────────────────────────────────────────
    [tabMarkdown, tabPDF].forEach(function (tab) {
        tab.addEventListener('click', function () {
            tabMarkdown.classList.toggle('active', tab === tabMarkdown);
            tabPDF.classList.toggle('active', tab === tabPDF);
            tabMarkdown.setAttribute('aria-selected', tab === tabMarkdown);
            tabPDF.setAttribute('aria-selected', tab === tabPDF);
            selectedFormat = tab.dataset.format;
        });
    });

    // ── Export button ─────────────────────────────────────────────────────────
    exportBtn.addEventListener('click', async function () {
        setLoading(true);
        hideToast();

        try {
            // 1. Get active tab
            const tabs = await chromeTabs();
            const tab = tabs[0];
            if (!tab || !tab.id) throw new Error('Could not identify the active tab.');
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
                throw new Error('WebScribe cannot run on browser system pages. Navigate to a regular website.');
            }

            // 2. Inject scripts (with guard, safe to repeat)
            await injectScripts(tab.id);

            // 3. Extract content from page
            const response = await extractFromTab(tab.id);
            if (!response || !response.success) {
                throw new Error(response?.error || 'Extraction failed — please reload the page and try again.');
            }
            if (!response.nodes || response.nodes.length === 0) {
                throw new Error('No readable content found on this page.');
            }

            console.log('[WebScribe Popup] Got', response.nodes.length, 'nodes from', response.metadata.title);

            // 4. AI analysis (runs in popup JS context — no injection needed)
            let aiData = null;
            if (optAI.checked && response.nodes.length > 0) {
                try {
                    aiData = AIAssistant.analyze(response.nodes);
                } catch (e) {
                    console.warn('[WebScribe] AI failed:', e);
                }
            }

            const options = {
                includeAI: optAI.checked,
                aiData: aiData,
                includeTOC: optTOC.checked,
                includeImages: optImages.checked,
            };

            // 5. Export
            if (selectedFormat === 'markdown') {
                await doMarkdownExport(response, options);
                showToast('success', '✓', 'Markdown saved!');
            } else {
                await doPDFExport(response, options);
                showToast('success', '✓', 'Opening PDF preview… Press Ctrl+P to save.');
            }

        } catch (err) {
            console.error('[WebScribe Popup] Error:', err);
            showToast('error', '✕', err.message);
            statusDot.className = 'status-dot error';
        } finally {
            setLoading(false);
        }
    });

    // ── Markdown export ───────────────────────────────────────────────────────
    async function doMarkdownExport(data, options) {
        const md = MarkdownGenerator.generate(data, options);
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const filename = safeFilename(data.metadata.title) + '.md';

        await new Promise(function (resolve, reject) {
            chrome.downloads.download({ url: url, filename: filename, saveAs: false }, function (id) {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(id);
                }
            });
        });

        setTimeout(function () { URL.revokeObjectURL(url); }, 8000);
    }

    // ── PDF export ────────────────────────────────────────────────────────────
    // Stores data in chrome.storage.local, then opens the viewer extension page.
    // The viewer page reads from storage and renders a print-ready HTML document.
    async function doPDFExport(data, options) {
        const payload = {
            metadata: data.metadata,
            nodes: data.nodes,
            options: options,
        };

        // Write to storage
        await new Promise(function (resolve, reject) {
            chrome.storage.local.set({ webscribe_data: payload }, function () {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve();
                }
            });
        });

        // Open the dedicated viewer page
        const viewerUrl = chrome.runtime.getURL('viewer/viewer.html');
        await new Promise(function (resolve) {
            chrome.tabs.create({ url: viewerUrl }, function () { resolve(); });
        });
    }

    // ── Script injection ──────────────────────────────────────────────────────
    function injectScripts(tabId) {
        return new Promise(function (resolve) {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabId },
                    files: ['lib/Readability.js', 'content/content.js'],
                },
                function () {
                    if (chrome.runtime.lastError) {
                        console.warn('[WebScribe] Injection warning:', chrome.runtime.lastError.message);
                    }
                    // Wait for listener to register
                    setTimeout(resolve, 200);
                }
            );
        });
    }

    // ── Send extract message to content script ────────────────────────────────
    function extractFromTab(tabId) {
        return new Promise(function (resolve) {
            chrome.tabs.sendMessage(tabId, { type: 'DO_EXTRACT' }, function (response) {
                if (chrome.runtime.lastError) {
                    // Retry once after a longer wait
                    setTimeout(function () {
                        chrome.tabs.sendMessage(tabId, { type: 'DO_EXTRACT' }, function (resp2) {
                            if (chrome.runtime.lastError) {
                                resolve({ success: false, error: 'Could not connect to the page content script. Reload the page and try again.' });
                            } else {
                                resolve(resp2);
                            }
                        });
                    }, 400);
                } else {
                    resolve(response);
                }
            });
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function chromeTabs() {
        return new Promise(function (resolve) {
            chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });
    }

    function setLoading(loading) {
        exportBtn.disabled = loading;
        exportContent.classList.toggle('hidden', loading);
        exportLoading.classList.toggle('hidden', !loading);
        statusDot.className = 'status-dot' + (loading ? ' loading' : '');
    }

    function showToast(type, icon, msg) {
        clearTimeout(toastTimer);
        toast.className = 'toast' + (type === 'error' ? ' error-toast' : '');
        toastIcon.textContent = icon;
        toastMsg.textContent = msg;
        toast.classList.remove('hidden');
        toastTimer = setTimeout(hideToast, 5500);
    }

    function hideToast() {
        toast.classList.add('hidden');
    }

    function safeFilename(name) {
        return (name || 'webscribe-notes')
            .replace(/[<>:"\/\\|?*\x00-\x1f]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase()
            .slice(0, 80) || 'webscribe-notes';
    }
})();
