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
 * Pass a message to background.js instructing it to delete the stored Bloom
 * filter, and to clear the one currently in memory. Afterwards it reloads them
 * from scratch.
 */
async function handleResetBloom(event) {
  browser.runtime.sendMessage({type: "reset_bloom"});
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
