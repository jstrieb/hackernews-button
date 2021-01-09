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

  if (!in_bloom(window.bloom, tab.url)) {
    return;
  }

  // TODO: Add bloom filter results to the tablist
  activateBadge({points: "1+"}, tabId);
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
  // Only get the discussion URL if the button is clicked by the user
  fetch(`https://hn.algolia.com/api/v1/search?tags=story&query=${tab.url}`)
    .then(data => data.json())
    .then(json => {
      var stories = Array.from(json.hits).filter(hit => {
        if (hit == null) return false;
        try {
          var hit_url = new URL(hit.url);
        } catch (err) {
          console.error("Failed on " + hit.url);
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
    });
}



/**
 * Main procedure function, called on extension initialization
 */
(() => {
  // Set up listeners
  browser.tabs.onRemoved.addListener(tabId => delete tabs[tabId]);
  browser.tabs.onUpdated.addListener(handleTabUpdated);
  browser.browserAction.onClicked.addListener(handleActionClicked);
  browser.commands.onCommand.addListener(command => {
    if (command === "open_in_new_tab") {
      browser.tabs.query({active: true, currentWindow: true})
        .then(tabs => handleActionClicked(tabs[0], {button: 1, modifiers: []}));
    }
  });

  // Style the browser action button
  browser.browserAction.disable();
  browser.browserAction.setBadgeText({text: ""});
  browser.browserAction.setBadgeBackgroundColor({color: "red"});
  browser.browserAction.setBadgeTextColor({color: "white"});
  // TODO: Set badge bg color to something less obnoxious - match YC logo
})();
