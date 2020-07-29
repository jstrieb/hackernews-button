var tabs = {};

console.log("Loaded Hacker News Discussion extension...");



function activateButton(tab) {
  console.log("Tab activated", tab);
}


async function updateTab(tabId, changeInfo, tab) {
  if (!("status" in changeInfo && changeInfo.status == "complete")) {
    return;
  }
  fetch(`https://hn.algolia.com/api/v1/search?tags=story&query=${tab.url}`)
    .then(data => data.json().then(json => {
      var tab_url = new URL(tab.url);
      var filtered = Array.from(json.hits).filter(hit => {
        var hit_url = new URL(hit.url);
        return (tab_url.host == hit_url.host
          && tab_url.pathname == hit_url.pathname
          && tab_url.search == hit_url.search);
      });
      if (filtered.length > 0) {
        tabs[tabId] = filtered[0];
        console.log(filtered[0]);
      }
    }));
}



// Main procedure called on initialization

browser.tabs.query({})
  .then(tabList => Array.from(tabList).map(tab => tabs[tab.id] = null));
browser.tabs.onRemoved.addListener(tabId => delete tabs[tabId]);
browser.tabs.onCreated.addListener(tab => tabs[tab.id] = null);
browser.tabs.onActivated.addListener(activateButton);
browser.tabs.onUpdated.addListener(updateTab);
