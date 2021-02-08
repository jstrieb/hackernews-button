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
 */
async function handleReset(event) {
  await browser.storage.local.remove("bloom_filter");
  await browser.storage.local.get().then(console.log);
}



/*******************************************************************************
 * Main Function (called on options page load)
 ******************************************************************************/

(() => {
  document.querySelector("#reset").addEventListener("click", handleReset);
})();
