/**
 * Any story URLs from visited HN pages are added to the Bloom filter so that
 * the latest pages will work, even if they were uploaded after the last time
 * the Bloom filter was downloaded.
 */
function sendLatest() {
  let stories = Array.from(document.querySelectorAll(".storylink"));
  browser.runtime.sendMessage(stories.map(a => a.href));
}

sendLatest();
