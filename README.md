# Hacker News Discussion Button

Firefox extension that links to the [Hacker News](https://news.ycombinator.com)
discussion for the current page and preserves privacy with Bloom filters.

<div align="center">
<a href="https://github.com/jstrieb/hackernews-button/releases/latest/download/hackernews-button.xpi">
<img alt="Screenshot" width="400" src="https://github.com/jstrieb/hackernews-button/blob/master/doc/screenshot.png" />
</a>
</div>



# Quick start

Install the browser extension from one of the following sources:
- [Download from the Mozilla Add-on website](https://addons.mozilla.org/en-US/firefox/addon/hacker-news-discussion-button/)
- [Download from GitHub](https://github.com/jstrieb/hackernews-button/releases/latest/download/hackernews-button.xpi)

---

The extension will light up bright orange when the current page has previously
been posted to Hacker News.
- Clicking the extension will open the Hacker News discussion.
- Clicking the extension with the scroll wheel will open the discussion in a
  new tab.
- Clicking while holding <kbd>Ctrl</kbd> or <kbd>Shift</kbd> will open the
  discussion in a new tab or window, respectively.

There are also keyboard shortcuts.
- <kbd>Alt</kbd> + <kbd>Y</kbd> opens the Hacker News discussion in the current
  page
- <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Y</kbd> opens the discussion in a
  new tab.

Star this project if you like it!

Read the [Hacker News Discussion](https://news.ycombinator.com/item?id=26301600)
for this project.



# How It Works

When you visit a website, this browser extension determines whether the website
has been submitted to Hacker News. A naive (but effective) way to do this is to
query the very helpful [Algolia Search API for Hacker
News](https://hn.algolia.com/api) with every page visited. In fact, that's what
the original version of this extension did when I wrote it over the summer of
2020! Unfortunately, there are two problems with this naive approach: you
reveal every website you visit to Algolia, and you waste bandwidth and energy
sending and receiving extraneous API requests.

To solve this problem, this extension uses a data structure called a [Bloom
filter](https://en.wikipedia.org/wiki/Bloom_filter) to protect your privacy.
Bloom filters can be thought of as a super condensed representation of the
fingerprints of a long list of URLs. In this way, you can download the Bloom
filter once (with periodic updates), and check if it contains the current
website's URL fingerprint without making any requests over the Internet.

<details>

<summary>Click to read Bloom filter parameter details</summary>

Bloom filters are probabilistic data structures, which means that when you
query whether a string is in the set represented by the Bloom filter, the
response from the data structure is either "no," or "probably yes." Bloom
filters have two parameters that can be tuned to minimize the likelihood of
false positive results: the size of the filter (the number of bits), and the
number of hashes used to obtain a fingerprint of each item.

Based on calculations performed using this [Bloom filter
calculator](https://hur.st/bloomfilter/?n=4M&p=&m=16MiB&k=23), the Bloom
filters used by this Firefox extension occupy 16MB of space and use 23 hash
functions. Since (at the time of this release) there are approximately 4
million submitted Hacker News stories, this gives a 1 in 10 million chance of a
false positive match on the Bloom filter. This probability gradually increases
to 1 in 26,000 as the number of submissions approaches 6 million, and becomes 1
in 850 by the time there have been 8 million Hacker News story submissions. At
that point, it will likely be worthwhile to consider increasing the size of the
Bloom filter.

16MB was chosen as the Bloom filter size, and the number of hashes was adjusted
around it. This size is convenient because it is not too large for an initial
download of multiple Bloom filters. Additionally, 16MB Bloom filters
representing smaller time windows (e.g. submissions from the last 24 hours) are
very sparse, and thus compress extremely well. For example, the Bloom filter
representing submissions from the last 24 hours compresses from 16MB to about
50KB. Though the false positive rate could be further reduced and
future-proofed, doubling the Bloom filter size to 32MB is a significant
increase, even with compression.

---

</details>

If the current page has been on Hacker News, the extension lights up and
becomes clickable. Clicking it retrieves a link to the best discussion for the
page and navigates the browser there.

By default, the extension uses several Bloom filters to show a lower-bound on
the score for each page. This can be easily disabled from the "Options" page
for the extension, accessible by going to `about:addons`. It might be desirable
to disable this if using multiple filters is too resource-intensive.

<details>

<summary>Click to read more about score thresholds</summary>

It seemed reasonable to use at most five distinct Bloom filters. Because they
become increasingly sparse as the number of stories in the Bloom filter
decreases, they compress well, so adding additional Bloom filters doesn't have
a massive impact on the total amount of data downloaded.

On the other hand, uncompressed, they total `5 * 16MB = 80MB` in memory – more
than this seemed unreasonable. 

The five thresholds for the Bloom filters were chosen mostly by eye, but
validated and tuned using analysis of the dataset. 

| Range | Count |
| --- | --- |
| 0-10	| 3381917 |
| 10-75 | 300300 |
| 75-250 | 121291 |
| 250-500 | 25739 |
| 500+ | 7948 |

<img alt="Bloom filter score range visualization" src="https://github.com/jstrieb/hackernews-button/blob/master/doc/range-chart.svg" />

As of February 28, 2021, the ranges have an approximately logarithmically
decreasing number of entries. This is desirable because this mirrors the true
distribution of the data, which is also approximately logarithmic. It also
allows for acceptably sensible, informative score ranges.

<img alt="Aggregate Hacker News story scores" src="https://github.com/jstrieb/hackernews-button/blob/master/doc/scores-chart.svg" />

The data used for this analysis can be viewed
[here](https://docs.google.com/spreadsheets/d/1s41DRN3MrifjcqeYql88WAQH6nySIUYWs4NLUzDg7wM/edit?usp=sharing).
It was generated with the following BigQuery SQL query, and the thresholds were
tuned in the spreadsheet.

``` sql
SELECT
  score,
  COUNT(score) AS count
FROM
  `bigquery-public-data.hacker_news.full`
WHERE
  score IS NOT NULL
  AND score != 0
GROUP BY
  score
ORDER BY
  score
```

</details>

## Disclaimer

You still send data to Algolia when you click the extension to visit the
discussion. The improvement offered by using Bloom filters is to not send *all*
of the sites you visit to the API, but *some* data still need to be sent to
retrieve the link to the discussion. Moreover, by default an updated Bloom
filter is downloaded once every 24 hours from GitHub. It is possible that
GitHub maintains logs of who downloads these releases.



# How to Read This Code

Browser extensions have a lot of power to harm users, so it is important to
understand what you are running. To that end, I provide a description of how to
read this code. Please audit the code before running it.

This repository has three parts: 
1. Code to pull Hacker News data and generate Bloom filters from it
2. Code for the browser extension
3. A Bloom filter library used by the Bloom filter generator and the browser
   extension – just one implementation used by both parts of the project

Each of the three individual parts of the code are described in greater depth
below. Click "Details" to read more.

The
[`Makefile`](https://github.com/jstrieb/hackernews-button/blob/master/Makefile)
is used for almost all parts of the code, and is a good place to start reading
to understand how everything fits together.

<details>

<summary>Details</summary>

## Bloom Filter Library

Files to read:

- [`bloom-filter/bloom.c`](https://github.com/jstrieb/hackernews-button/blob/master/bloom-filter/bloom.c)
- [`test/bloom-test.c`](https://github.com/jstrieb/hackernews-button/blob/master/test/bloom-test.c)

The code for Bloom filters is implemented in C. This code is used in a
command-line C program to generate Bloom filters, which is compiled using
`gcc`. It is also used by the browser extension in a wrapper library, which is
compiled to WebAssembly using Emscripten (`emcc` in the `Makefile`).

The [`test`](https://github.com/jstrieb/hackernews-button/tree/master/test)
folder includes tests for various parts of the Bloom filter library to ensure
it is working as expected.

## Generating Bloom Filters

Files to read:

- [`.github/workflows/generate-bloomfilter.yml`](https://github.com/jstrieb/hackernews-button/blob/master/.github/workflows/generate-bloomfilter.yml)
- [`canonicalize.py`](https://github.com/jstrieb/hackernews-button/blob/master/canonicalize.py)
- [`bloom-filter/bloom-create.c`](https://github.com/jstrieb/hackernews-button/blob/master/bloom-filter/bloom-create.c)

Bloom filters are regularly regenerated on a schedule, mediated by a GitHub
Actions workflow. At a high level, this process pulls down relevant data from
the [Hacker News BigQuery
dataset](https://console.cloud.google.com/marketplace/details/y-combinator/hacker-news),
does some preprocessing, normalizes ("canonicalizes") URLs, and feeds them to
the command-line Bloom filter generator. Generated Bloom filters are uploaded
as [GitHub Releases](https://github.com/jstrieb/hackernews-button/releases) so
users running the extension can download the latest ones.

Since Bloom filters can only match exact strings, it is helpful to
"canonicalize" URLs so that there are fewer false negative results. In other
words, because multiple URLs often point to the same page,
[`canonicalize.py`](https://github.com/jstrieb/hackernews-button/blob/master/canonicalize.py)
is useful for ensuring that slightly different URLs submitted to Hacker News
for the current page still match in the Bloom filter. Unfortunately, this
process is inherently imperfect. Opening issues with suggested improvements to
the URL canonicalization process are appreciated!

For actually reading strings, adding them to Bloom filters, and writing
(compressed) Bloom filters, we compile and use
[`bloom-create.c`](https://github.com/jstrieb/hackernews-button/blob/master/bloom-filter/bloom-create.c).
This takes some command-line arguments, and then reads from standard input,
parses the line-delimited strings, and outputs a Bloom filter.

## Browser Extension

Files to read:

- [`manifest.json`](https://github.com/jstrieb/hackernews-button/blob/master/manifest.json)
- [`background.js`](https://github.com/jstrieb/hackernews-button/blob/master/background.js)
- [`bloom-wrap.js`](https://github.com/jstrieb/hackernews-button/blob/master/bloom-wrap.js)
- [`add-latest.js`](https://github.com/jstrieb/hackernews-button/blob/master/add-latest.js)

The
[manifest](https://github.com/jstrieb/hackernews-button/blob/master/manifest.json)
connects all parts of the extension together. It attaches keyboard commands to
events and runs a page with background scripts, which do most of the heavy
lifting. It also runs a small content script on `news.ycombinator.com` pages.

There are two important background scripts.
[`background.js`](https://github.com/jstrieb/hackernews-button/blob/master/background.js)
is responsible for displaying the browser extension and handling user
interaction.
[`bloom-wrap.js`](https://github.com/jstrieb/hackernews-button/blob/master/bloom-wrap.js)
makes the Bloom filter library (implemented in C) easily accessible from
JavaScript via low-level wrappers and high-level helper functions. It also
includes code that, when the browser starts and WebAssembly is ready, attempts
to either load a Bloom filter from local storage, or download the latest one
from GitHub. 

The content script that runs on `news.ycombinator.com` pages extracts "story"
URLs from the pages and adds them to the Bloom filter. This is useful because
the Bloom filters only update every 24 hours at most (as limited by the
frequency of BigQuery dataset updates), so adding stories to the Bloom filter
this way makes it possible to use the extension to view the discussion for
recently-submitted posts. This would otherwise not be possible until the Bloom
filter is updated many hours later.

Note that the `background.html` page also loads a script `bloom.js` that is not
in the repo. As per the
[`Makefile`](https://github.com/jstrieb/hackernews-button/blob/d365b2a1619cd139186d3a162b9dd6de0bc13b0a/Makefile#L98-L111),
this script is compiled from the Bloom filter C library using Emscripten.

</details>



# Project Status

This project is actively developed and maintained. If there have not been
commits long after the initial release, everything is probably running
smoothly!

The project is designed so that even if something were to happen to me, as long
as my GitHub account is open, the Actions workflow should continue to release
updated Bloom filters.

I will do my best to address issues in a timely fashion, but I'm busy and this
is a side-project. Unsolicited pull requests are likely to be ignored. This is
because releasing a browser extension means I have a (*moral*, not *legal*
– see the
[LICENSE](https://github.com/jstrieb/hackernews-button/blob/master/LICENSE))
responsibility for the security of everyone who installs it. As a result,
vetting random pull requests is typically not worth the effort unless they
address an issue that has been discussed beforehand. I'm happy to have others'
support, just ask first – open an issue to do so.



# How to Modify This Code

1. Fork your own copy of the repository
2. [Create a new project](https://console.cloud.google.com/projectcreate) in
   BigQuery
3. Create a service account with the `BigQuery User` permission
4. Generate a JSON key
5. Enable Actions for the repository
6. Copy the JSON key into an Actions secret called `BQ_JSON` (under Settings >
   Secrets > Actions).
7. Make your fork public if you want to be able to access it unauthenticated
8. Change the repo to your liking, maintaining attribution and the LICENSE file!



# Known Issues

- There is currently no version of this extension for Google Chrome. To read
  more and discuss, check out the relevant issue
  ([#1](https://github.com/jstrieb/hackernews-button/issues/1)).
- The [URL
  canonicalization](https://github.com/jstrieb/hackernews-button/blob/master/canonicalize.py)
  is highly imperfect. There will inevitably be false negatives in Bloom filter
  results. Suggestions for improving canonicalization in general, or for
  specific sites, are welcome!
- If the button is clicked, Algolia search tries to return the "best"
  submission for a given URL. Often this is not the latest submission, but the
  one with the most points.

  This also means that if the button is clicked for very recently submitted
  stories (when browsing [new](https://news.ycombinator.com/newest), for
  example), Algolia may not have indexed the story yet, causing the redirect to
  fail.
- On my computer, the plus signs in the badge text gets cut off for three-digit
  scores ([#2](https://github.com/jstrieb/hackernews-button/issues/2)).



# Support the Project

There are a few things you can do to support the project:

- Star the repository (and follow me on GitHub for more)
- Share and upvote on sites like Twitter, Reddit, and Hacker News
- Report any bugs, glitches, or errors that you find

These things motivate me to to keep sharing what I build, and they provide
validation that my work is appreciated! They also help me improve the project.
Thanks in advance!

If you are insistent on spending money to show your support, I encourage you to
instead make a generous donation to one of the following organizations. By
advocating for Internet freedoms, organizations like these help me to feel
comfortable releasing work publicly on the Web.

- [Electronic Frontier Foundation](https://supporters.eff.org/donate/)
- [Signal Foundation](https://signal.org/donate/)
- [Mozilla](https://donate.mozilla.org/en-US/)
- [The Internet Archive](https://archive.org/donate/index.php)



# Acknowledgments

*This project is not affiliated with Hacker News, Y Combinator, or any Y
Combinator-backed company.*

This project would not exist in its current form without:

- Daniel Gackle ([dang](https://news.ycombinator.com/user?id=dang))
- Logan Snow ([@lsnow99](https://github.com/lsnow99))
- [Amy Liu](https://www.linkedin.com/in/amyjl/)
- [Hacker News](https://news.ycombinator.com)
- Thomas Hurst's [Bloom filter calculator](https://hur.st/bloomfilter/)
- [zlib](https://zlib.net)
- [MurmurHash](https://github.com/aappleby/smhasher) and Austin Appleby
- [GitHub Actions](https://github.com/features/actions)
- [BigQuery](https://console.cloud.google.com/marketplace/details/y-combinator/hacker-news)
- [Algolia Hacker News Search](https://hn.algolia.com/)
- Anyone who has asked or answered a helpful question on StackOverflow
- [Mozilla Developer Network](https://developer.mozilla.org/en-US/)
  documentation – my _sine qua non_ for writing anything for the Web, including
  browser extensions
