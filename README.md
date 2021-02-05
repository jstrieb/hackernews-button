# Hacker News Discussion Button

Firefox extension that links to the Hacker News discussion for the current
page and preserves privacy with Bloom filters.



# Quick start

<!-- TODO: add link to Mozilla web store and screenshots -->
Install the browser extension and restart Firefox.

The extension will light up bright orange when the current page has been
previously posted to Hacker News.
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
Bloom filters can be thought of as a super condensed way to represent the
fingerprints of a long list of strings. In this way, you can download the Bloom
filter once (with periodic updates), and check if it contains the current
website's fingerprint without making requests over the Internet.

If the current page has been on Hacker News, the extension lights up and
becomes clickable. Clicking it retrieves a link to the best discussion for the
page and navigates the browser there.

**Note:** you still send data to Algolia when you click the extension to visit
the discussion. The improvement offered by using Bloom filters is to not send
*all* of the sites you visit to the API, but *some* data still need to be sent
to retrieve the link to the discussion. Moreover, by default an updated Bloom
filter is downloaded once every 24 hours from GitHub. It is possible they may
maintain logs of who downloads these releases.



# How to Read This Code

Browser extensions have a lot of power to harm users, so it is important to
understand what you are running. To that end, I provide a description of how to
read this code to promote auditing it before running it.

This repository has three parts: code to pull Hacker News data and generate
Bloom filters from it, code for the browser extension, and a single
implementation of a Bloom filter library that is used by both the Bloom filter
generator, and the browser extension. Each of the three individual parts of the
code are described in greater depth below. Click "Details" below to expand and
read more.

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

The code for Bloom filters is implemented once in C. This code is used in a
command-line C program to generate Bloom filters, which is compiled using
`gcc`. It is also used in a wrapper library by the browser extension to decode
and use Bloom filters, which is compiled to WebAssembly using `emscripten`
(`emcc` in the `Makefile`).

The [`test`](https://github.com/jstrieb/hackernews-button/tree/master/test)
folder includes tests for various parts of the Bloom filter library to ensure
it is working as expected.

## Generating Bloom Filters

Files to read:

- [`.github/workflows/generate-bloomfilter.yml`](https://github.com/jstrieb/hackernews-button/blob/master/.github/workflows/generate-bloomfilter.yml)
- [`canonicalize.py`](https://github.com/jstrieb/hackernews-button/blob/master/canonicalize.py)
- [`bloom-filter/bloom-create.c`](https://github.com/jstrieb/hackernews-button/blob/master/bloom-filter/bloom-create.c)

Bloom filters are generated on a schedule using GitHub Actions. This process is
controlled by a GitHub Actions workflow. At a high level, this process pulls
down relevant data from the [Hacker News BigQuery
dataset](https://console.cloud.google.com/marketplace/details/y-combinator/hacker-news), does some
preprocessing, normalizes ("canonicalizes") URLs, and feeds them to a
command-line Bloom filter generator. Generated Bloom filters are uploaded as
[GitHub Releases](https://github.com/jstrieb/hackernews-button/releases) so
users running the extension can download the latest ones.

Since Bloom filters can only match exact strings, it is helpful to
"canonicalize" URLs so that there are fewer false negative results. In other
words, because multiple URLs often point to the same page,
[`canonicalize.py`](https://github.com/jstrieb/hackernews-button/blob/master/canonicalize.py)
is useful for ensuring that slightly different URLs submitted to Hacker News
for the current page still match in the Bloom filter. Unfortunately, this
process is inherently imperfect.

For actually reading strings, adding them to Bloom filters, and writing
(compressed) Bloom filters, we compile and use
[`bloom-create.c`](https://github.com/jstrieb/hackernews-button/blob/master/bloom-filter/bloom-create.c).
This takes some command-line arguments, and then reads from standard input or a
file, parses the input, and outputs a Bloom filter.

## Browser Extension

Files to read:

- [`manifest.json`](https://github.com/jstrieb/hackernews-button/blob/master/manifest.json)
- [`background.js`](https://github.com/jstrieb/hackernews-button/blob/master/background.js)
- [`bloom-wrap.js`](https://github.com/jstrieb/hackernews-button/blob/master/bloom-wrap.js)
- [`add-latest.js`](https://github.com/jstrieb/hackernews-button/blob/master/add-latest.js)

The
[manifest](https://github.com/jstrieb/hackernews-button/blob/master/manifest.json)
sets up the whole extension. It attaches keyboard commands to events and runs a
page with background scripts, which do most of the heavy lifting. It also runs
a small content script on `news.ycombinator.com` pages.

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
URLs from the pages and sends them to be added to the Bloom filter. This is
useful because the Bloom filters only update every 24 hours at most, so adding
stories to the Bloom filter this way makes it possible to use the extension to
navigate back to the comments after reading recent posts. This would otherwise
not be possible until the Bloom filter is updated many hours later.

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
support, just ask first!



# How to Modify This Code

<details>

<summary>Details</summary>

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

</details>



# Known Issues

There is currently no version of this extension for Google Chrome. To read more
and discuss, check out the relevant issue
[(#1)](https://github.com/jstrieb/hackernews-button/issues/1).



# Support the Project

There are a few ways to support this project.

Most importantly: show your support by starring it and following me on GitHub.
These things motivate me both to focus on this project instead of other work,
and to keep sharing what I make with other people. In the same vein, please
consider sharing the project with others.

Stars on GitHub also help me gauge who is making use of the project – since I
do not include tracking or analytics in this or any project, I have no idea how
many people use what I build unless they deliberately take action to notify me.
If GitHub is not your style, reach out to me on my [contact
page](https://jstrieb.github.io/about/#contact) and say "hello" instead!

If you are insistent on spending money to show your support, I encourage you to
make a generous donation to the [Electronic Frontier
Foundation](https://supporters.eff.org/donate/) and tell me about it on my
[contact page](https://jstrieb.github.io/about/#contact). By advocating for
Internet freedoms, organizations like theirs help me to feel comfortable
releasing work publicly on the Web.



# Acknowledgments

*This project is not affiliated with Hacker News, Y Combinator, or any Y
Combinator-backed company.*

This project would not exist in its current form without:

- Daniel Gackle ([dang](https://news.ycombinator.com/user?id=dang))
- Logan Snow ([@lsnow99](https://github.com/lsnow99))
- [Amy Liu](https://www.linkedin.com/in/amyjl/)
- [Hacker News](https://news.ycombinator.com)
- [zlib](https://zlib.net)
- [MurmurHash](https://github.com/aappleby/smhasher) and Austin Appleby
- [GitHub Actions](https://github.com/features/actions)
- [BigQuery](https://console.cloud.google.com/marketplace/details/y-combinator/hacker-news)
- [Algolia Hacker News Search](https://hn.algolia.com/)
- Anyone who has asked or answered a helpful question on StackOverflow
- [Mozilla Developer Network](https://developer.mozilla.org/en-US/)
  documentation – my _sine qua non_ for writing anything for the Web, including
  browser extensions
