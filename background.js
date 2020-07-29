var tabs = {};

console.log("Loaded Hacker News Discussion extension...");



function activateButton(tab) {
  console.log("Tab activated", tab);
}


function updateTab(tabId, changeInfo, tab) {
  if (!("status" in changeInfo && changeInfo.status == "complete")) {
    return;
  }
  var tab_url = new URL(tab.url);
  if (tab_url.protocol == "about:") {
    return;
  }

  fetch(`https://hn.algolia.com/api/v1/search?tags=story&query=${tab.url}`)
    .then(data => data.json().then(json => {
      var stories = Array.from(json.hits).filter(hit => {
        if (hit == null) return false;
        try {
          var hit_url = new URL(hit.url);
        } catch (err) {
          console.error("Failed on " + hit.url);
          return false;
        }
        return (tab_url.host == hit_url.host
          && tab_url.pathname == hit_url.pathname
          && tab_url.search == hit_url.search);
      });
      if (stories.length > 0) {
        tabs[tabId] = stories[0];
        return;
      }
      // TODO: Add fuzzy title matching for inexact URLs
    }));
}



// Main procedure called on initialization
browser.tabs.onRemoved.addListener(tabId => delete tabs[tabId]);
browser.tabs.onActivated.addListener(activateButton);
browser.tabs.onUpdated.addListener(updateTab);
