/* background.js
 *
 * Handle user interaction and other relevant web extension events. Expects
 * that bloom-wrap.js and bloom.js will be included in the background.html page
 * before this runs.
 *
 * Created by Jacob Strieb
 * July 2020 & January 2021
 */


/*******************************************************************************
 * Global variables
 ******************************************************************************/

var tabs = {};



/*******************************************************************************
 * Helper functions
 ******************************************************************************/

/***
 * Activate the badge for a particular tab
 */
function activateBadge(story, tabId) {
  browser.browserAction.enable(tabId);
  browser.browserAction.setBadgeText({
    text: "" + story.points,
    tabId: tabId
  });
}


/***
 * Deactivate the badge for a particular tab
 */
function deactivateBadge(tabId) {
  browser.browserAction.disable(tabId);
  browser.browserAction.setBadgeText({
    text: "",
    tabId: tabId
  });
}


/***
 * Load settings
 */
async function loadSettings() {
  // Load settings
  window.settings = (await browser.storage.local.get("settings")).settings;

  // Set default settings values if necessary
  if (!window.settings) {
    window.settings = {
      debug_mode: false,
      multiple_filters: true,
    };
  }
}



/*******************************************************************************
 * Event handlers and Message Listeners
 ******************************************************************************/

/***
 * Called when a tab gets "updated." Most importantly, this includes when a
 * user clicks a link.
 */
function handleTabUpdated(tabId, changeInfo, tab) {
  // Only submit URLs of pages that have completed loading
  if (!("status" in changeInfo && changeInfo.status === "complete")) {
    return;
  }

  // Ignore built-in Firefox "about:" pages and local files
  var tab_url = new URL(tab.url);
  if (tab_url.protocol === "about:" || tab_url.protocol === "file:") {
    deactivateBadge(tabId);
    return;
  }

  let scoreLabels = window.filters
    .filter(f => inBloom(f, tab_url.toString()))
    .map(f => f.threshold);

  if (scoreLabels.length == 0) {
    deactivateBadge(tab.id);
    return;
  }

  let score = scoreLabels.reduce((a, b) => Math.max(a, b));

  // TODO: Add bloom filter results to the tablist
  activateBadge({points: (score ? `${score}+` : "")}, tabId);
  return;
}


/***
 * Open the Hacker News Discussion when the action is clicked. Do it in a new
 * Window if the Shift key is pressed when the click happens. If any other
 * modifier keys or the middle mouse button are clicked, open in a new tab.
 * Otherwise, open in the current tab.
 */
function handleActionClicked(tab, onClickData) {
  // Algolia doesn't work well with URLs like:
  // https://www.youtube.com/watch?v=-pdSjBPH3zM
  // I suspect the "=-" leads to treating "-" as an exclusion operator somehow
  // https://www.algolia.com/doc/api-reference/api-parameters/advancedSyntax
  let tab_url = encodeURIComponent(canonicalizeUrl(tab.url).replace("=-", "="));

  // Only get the discussion URL if the button is clicked by the user
  fetch(`https://hn.algolia.com/api/v1/search?tags=story&query=${tab_url}`)
    .then(data => data.json())
    .then(json => {
      // Filter only those search results that match on the domain of the
      // current page - approximate, but mostly works
      let stories = Array.from(json.hits).filter(hit => {
        if (!hit || !hit.url) return false;
        try {
          var hit_url = new URL(hit.url);
        } catch (err) {
          console.error("Opening Hacker News discussion failed on " + hit.url);
          return false;
        }
        let url = new URL(tab.url);

        // Return true if the hosts match and neither path is /, or if the hosts
        // match and both paths are /.
        //
        // Fixes problems where Algolia doesn't return a result for the exact
        // page if a top-level URL is used to search. For example, without
        // this, using the extension on https://github.com/ returns a result
        // for a GitHub blog post, not the post using the GitHub homepage as
        // the story URL
        //
        // TODO: Match exact path?
        return (url.host === hit_url.host
                && ((url.pathname === "/" && hit_url.pathname === "/")
                 || (url.pathname !== "/" && hit_url.pathname !== "/")));
      });

      // If a story matched, go to the discussion for the one Algolia picked as
      // the "top" result
      if (stories.length > 0) {
        let hn_id = stories[0].objectID;
        let hn_url = `https://news.ycombinator.com/item?id=${hn_id}`;
        if (onClickData.button == 0 && onClickData.modifiers.length == 0) {
          browser.tabs.update(tab.id, {url: hn_url});
        } else if (onClickData.modifiers.includes("Shift")) {
          browser.windows.create({url: hn_url});
        } else {
          browser.tabs.create({url: hn_url});
        }
        return;
      }

      deactivateBadge(tab.id);
    })
    .catch(console.error);
}


/***
 * Add Hacker News story URLs from browsed pages to the Bloom filter. Re-adding
 * URLs that are already there doesn't cost much, nor does it cause harm, so we
 * don't even bother detecting it.
 *
 * This function is called when a content script runs on news.ycombinator.com
 * and posts a message with the URLs to add.
 */
function addLatest(message) {
  if (message.type != "add_stories") {
    return;
  }

  for (let i = 0; i < window.filters.length; i++) {
    f = window.filters[i];
    message.stories
      .filter(u => u.score >= f.threshold)
      .forEach(u => addBloom(f, u.url));
  }

  // Save the updated Bloom filter
  // TODO: Does it even make sense to store this stuff this often?
  storeBloom(window.filters)
    .catch(e => console.error(e));
}


/***
 * Reload the settings from storage.
 *
 * Triggered by a message sent from options.html.
 */
async function reloadSettings(message) {
  if (message.type != "reload_settings") {
    return;
  }

  await loadSettings();
}


/***
 * Delete the stored Bloom filter and delete the in-memory Bloom filter. Then
 * reload them all.
 */
async function resetBloom(message) {
  if (message.type != "reset_bloom") {
    return;
  }

  await deleteStoredBloom();
  window.filters.forEach(f => freeBloom(f));
  await loadBloom();
}



/*******************************************************************************
 * Main function called on browser startup or extension load
 ******************************************************************************/

/***
 * Main procedure function, called on extension initialization
 */
(async () => {
  // TODO: Remove, or uncomment if the tablist is used again
  // browser.tabs.onRemoved.addListener(tabId => delete tabs[tabId]);

  await loadSettings();

  // Set up event listeners
  browser.tabs.onUpdated.addListener(handleTabUpdated);
  browser.browserAction.onClicked.addListener(handleActionClicked);
  browser.commands.onCommand.addListener(command => {
    if (command === "open_in_new_tab") {
      browser.tabs.query({active: true, currentWindow: true})
        .then(tabs => handleActionClicked(tabs[0], {button: 1, modifiers: []}));
    }
  });

  // Set up message listeners
  browser.runtime.onMessage.addListener(addLatest);
  browser.runtime.onMessage.addListener(reloadSettings);
  browser.runtime.onMessage.addListener(resetBloom);

  // Every 10 minutes, check if the Bloom filter is outdated, and update if so
  setInterval(updateBloom, 10 * 60 * 1000);

  // Style the browser action button
  browser.browserAction.disable();
  browser.browserAction.setBadgeText({text: ""});
  browser.browserAction.setBadgeBackgroundColor({color: "#f0652f"});
  // Will not run in Chrome
  if (browser.browserAction.setBadgeTextColor) {
    browser.browserAction.setBadgeTextColor({color: "white"});
  }
})();
