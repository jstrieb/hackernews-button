/* add-latest.js
 *
 * Content script run on news.ycombinator.com pages. Sends story links to be
 * added to the Bloom filter so that recently-viewed articles can be navigated
 * back to via the extension button.
 *
 * Created by Jacob Strieb
 * January 2021
 */


/***
 * Any story URLs from visited HN pages are added to the Bloom filter so that
 * the latest pages will work, even if they were uploaded after the last time
 * the Bloom filter was downloaded.
 */
function sendLatest() {
  let stories = Array.from(document.querySelectorAll(".storylink"));
  browser.runtime.sendMessage(stories.map(a => a.href));
}

sendLatest();
