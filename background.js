var tabs = {};

/**
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

  // Remove the hash when checking bloom filter membership
  tab_url.hash = ""

  if (!inBloom(window.bloom, tab_url.toString())) {
    deactivateBadge(tab.id);
    return;
  }

  // TODO: Add bloom filter results to the tablist
  activateBadge({points: ""}, tabId);
  return;
}


/**
 * Activate the badge for a particular tab
 */
function activateBadge(story, tabId) {
  browser.browserAction.enable(tabId);
  browser.browserAction.setBadgeText({
    text: "" + story.points,
    tabId: tabId
  });
}


/**
 * Deactivate the badge for a particular tab
 */
function deactivateBadge(tabId) {
  browser.browserAction.disable(tabId);
  browser.browserAction.setBadgeText({
    text: "",
    tabId: tabId
  });
}


/**
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
  let tab_url = tab.url.replace("=-", "=");

  // Only get the discussion URL if the button is clicked by the user
  fetch(`https://hn.algolia.com/api/v1/search?tags=story&query=${tab_url}`)
    .then(data => data.json())
    .then(json => {
      // Filter only those search results that match on the domain of the
      // current page - approximate, but mostly works
      var stories = Array.from(json.hits).filter(hit => {
        if (!hit || !hit.url) return false;
        try {
          var hit_url = new URL(hit.url);
        } catch (err) {
          console.error("Opening Hacker News discussion failed on " + hit.url);
          return false;
        }
        return (new URL(tab.url)).host == hit_url.host;
      });

      // If a story matched, go to the discussion
      if (stories.length > 0) {
        var hn_id = stories[0].objectID;
        var hn_url = `https://news.ycombinator.com/item?id=${hn_id}`;
        if (onClickData.button == 0 && onClickData.modifiers.length == 0) {
          browser.tabs.update(tab.id, {url: hn_url});
        } else if (onClickData.modifiers.includes("Shift")) {
          browser.windows.create({url: hn_url});
        } else {
          browser.tabs.create({url: hn_url});
        }

        // Return true so that the default behavior is not overridden
        return true;
      }

      deactivateBadge(tab.id);
    });
}

/***
 * Add Hacker News story URLs from browsed pages to the Bloom filter. Re-adding
 * URLs that are already there doesn't cost much, nor does it cause harm, so we
 * don't even bother detecting it.
 *
 * This function is called when a content script runs on news.ycombinator.com
 * and posts a message with the URLs to add.
 */
function addLatest(urls) {
  urls.forEach(u => addBloom(window.bloom, u));

  // Save the updated Bloom filter
  window.bloom.filter = new Uint8Array(Module.HEAPU8.buffer, window.bloom.addr,
      window.bloom.filter.length);
  browser.storage.local.set({"bloom_filter": window.bloom})
}



/**
 * Main procedure function, called on extension initialization
 */
(() => {
  // Set up listeners
  browser.tabs.onRemoved.addListener(tabId => delete tabs[tabId]);
  browser.tabs.onUpdated.addListener(handleTabUpdated);
  browser.browserAction.onClicked.addListener(handleActionClicked);
  browser.runtime.onMessage.addListener(addLatest);
  browser.commands.onCommand.addListener(command => {
    if (command === "open_in_new_tab") {
      browser.tabs.query({active: true, currentWindow: true})
        .then(tabs => handleActionClicked(tabs[0], {button: 1, modifiers: []}));
    }
  });

  // Style the browser action button
  browser.browserAction.disable();
  browser.browserAction.setBadgeText({text: ""});
  browser.browserAction.setBadgeBackgroundColor({color: "#f0652f"});
  browser.browserAction.setBadgeTextColor({color: "white"});
})();
