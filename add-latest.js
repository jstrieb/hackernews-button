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
 * Any story URLs from visited HN pages are sent to the Bloom filters so that
 * the latest pages will work, even if they were uploaded after the last time
 * the Bloom filter was downloaded.
 */
function sendLatest() {
  let stories = Array.from(document.querySelectorAll(".storylink"));
  let scores = Array.from(document.querySelectorAll(".score"));
  if (stories.length != scores.length) {
    throw "Different number of story links and scores!";
  }

  let message = {
    type: "add_stories",
    stories: [],
  };

  for (let i = 0; i < stories.length; i++) {
    let storyNode = stories[i];
    let scoreNode = scores[i];
    let score = Number(scoreNode.innerText.replace(/\s+points?/, ""));

    message.stories.push({
      "url": storyNode.href,
      "score": score,
    });
  }

  browser.runtime.sendMessage(message);
}


sendLatest();
