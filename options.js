/* options.js
 *
 * Handlers for settings changes using the options menu created in options.html
 *
 * Created by Jacob Strieb
 * February 2021
 */


/*******************************************************************************
 * Options Event Handlers
 ******************************************************************************/

/***
 * Delete stored Bloom filters. Same as deleteStoredBloom in bloom-wrap.js, but
 * that is seemingly not in the namespace of the options page, so we copy the
 * function here instead of calling it directly.
 *
 * TODO: Delete in-memory Bloom filter
 */
async function handleResetBloom(event) {
  await browser.storage.local.remove("bloom_filter");
  await browser.storage.local.get();
}


/***
 * Store a value in the settings representing whether or not to do lots and
 * lots of debug logging. Then tell the main background script to reload the
 * settings via a message.
 */
async function handleDebug(event) {
  window.settings.debug_mode = document.querySelector("#debug-mode").checked;
  await browser.storage.local.set({"settings": window.settings});

  browser.runtime.sendMessage({type: "reload_settings"});
}



/*******************************************************************************
 * Main Function (called on options page load)
 ******************************************************************************/

async function loadSettings() {
  // Load settings
  window.settings = (await browser.storage.local.get("settings")).settings;

  // Set default settings values
  if (!window.settings) {
    window.settings = {
      debug_mode: false,
    };
  }

  // Set stateful UI widgets to current settings values
  document.querySelector("#debug-mode").checked = window.settings.debug_mode;
}

(() => {
  loadSettings();
  document.querySelector("#reset").addEventListener("click", handleResetBloom);
  document.querySelector("#debug-mode").addEventListener("click", handleDebug);
})();
