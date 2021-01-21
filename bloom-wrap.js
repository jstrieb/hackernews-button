/* bloom-wrap.js
 *
 * Wrapper around Bloom filter WebAssembly functions. Includes a helper
 * function to take a normal URL and "canonicalize" it so that it matches the
 * format of the URLs inserted into the Bloom filter.
 *
 * Created by Jacob Strieb
 * January 2021
 */


/*******************************************************************************
 * Helper functions
 ******************************************************************************/

/***
 * Transform the current URL object to make it as "canonical" as possible. This
 * includes removing unnecessary URL parameters, removing "www." from the
 * beginning of URLs, stripping unnecessary parts of the path, and performing a
 * few domain-specific adjustments.
 *
 * NOTE: The order in which the transformations take place is subtly important.
 * Do not change the order around without good reason.
 *
 * NOTE: Any canonicalization changes made here *MUST* be reflected in the
 * `URL.canonicalize` function within the `canonicalize.py` file!
 */
function canonicalizeUrl(rawUrl) {
  let url = new URL(rawUrl);

  // Drop the fragment
  url.hash = "";

  // Remove unwanted URL parameters
  [
    "ref",
    "sms_ss",
    "gclid",
    "fbclid",
    "at_xt",
    "_r",
  ].forEach(p => url.searchParams.delete(p));
  Array.from(url.searchParams)
    .filter(p => p[0].startsWith("utm_"))
    .forEach(p => url.searchParams.delete(p[0]));

  // Truncate index.html, index.php, and trailing slashes
  if (url.pathname.endsWith("index.html")) {
    url.pathname = url.pathname.slice(0, -"index.html".length);
  }
  if (url.pathname.endsWith("index.php")) {
    url.pathname = url.pathname.slice(0, -"index.php".length);
  }
  if (url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -"/".length);
  }

  // Remove www.
  if (url.host.startsWith("www.")) {
    url.host = url.host.slice("www.".length,);
  }

  // Note: youtu.be URLs will auto-redirect to youtube.com, so we don't have to
  // check for the host being youtu.be
  if (url.host == "youtube.com") {
    if (url.searchParams.has("v")) {
      Array.from(url.searchParams)
        .filter(p => p[0] != "v")
        .forEach(p => url.searchParams.delete(p[0]));
    } else if (url.searchParams.has("list")) {
      Array.from(url.searchParams)
        .filter(p => p[0] != "list")
        .forEach(p => url.searchParams.delete(p[0]));
    }
  }

  // Drop all URL parameters on Amazon
  if (url.host == "amazon.com") {
    Array.from(url.searchParams)
      .forEach(p => url.searchParams.delete(p[0]));
  }

  // Change mobile Wikipedia links to regular ones
  if (url.host == "en.m.wikipedia.org") {
    url.host = "en.wikipedia.org";
  }

  // Drop the scheme
  let result = url.toString().replace(/^.*:\/\//, "//");

  return result;
}



/*******************************************************************************
 * Wrapper functions
 ******************************************************************************/

function newBloom(bloom) {
  // Need to heap-allocate the bloom filter because passing it directly will
  // cause a stack overflow
  bloom.addr = Module.ccall(
    "js_new_bloom",
    "number",
    ["number"],
    [bloom.num_bits]
  );
  Module.writeArrayToMemory(bloom.filter, bloom.addr);
}


function freeBloom(bloom) {
  Module.ccall(
    "js_free_bloom",
    null,
    ["number"],
    [bloom.addr]
  );
}


function addBloom(bloom, url) {
  url = canonicalizeUrl(url);
  return Module.ccall(
    "js_add_bloom",
    null,
    ["number", "number", "string", "number"],
    [bloom.addr, bloom.num_bits, url, url.length]
  );
}


function inBloom(bloom, url) {
  url = canonicalizeUrl(url);
  return Module.ccall(
    "js_in_bloom",
    "boolean",
    ["number", "number", "string", "number"],
    [bloom.addr, bloom.num_bits, url, url.length]
  );
}



/*******************************************************************************
 * Main function
 ******************************************************************************/

/***
 * Load the Bloom filter as soon as there is a WebAssembly runtime to load it
 * with. This is typically right when the browser/extension starts up.
 */
async function load_bloom() {
  // Try to get the Bloom filter out of storage, otherwise download latest. To
  // clear the stored Bloom filter while testing, from the browser console do:
  // browser.storage.local.remove("bloom_filter")
  window.bloom = (await browser.storage.local.get("bloom_filter")).bloom_filter;
  if (!window.bloom || !window.bloom.filter) {
    let b = await fetch("https://github.com/jstrieb/hackernews-button/releases"
          + "/latest/download/hn-0.bloom")
      .then(r => r.blob())
      .then(b => b.arrayBuffer())
      .then(a => new Uint8Array(a));
    window.bloom = {
      filter: b,
      num_bits: Math.round(Math.log2(b.length)) + 3,
      addr: null,
    };

    // Save the downloaded Bloom filter
    browser.storage.local.set({"bloom_filter": window.bloom})
  }

  // TODO: Fail gracefully if both attempts above to load a Bloom filter fail
  // console.error("Couldn't load Bloom filter from local storage or the web!");

  newBloom(window.bloom);

  // TODO: Is this enough? Or is this leaking memory?
  window.addEventListener("beforeunload", e => freeBloom(window.bloom.addr));
}

// NOTE: This works because this file is run before the autogenerated bloom.js
var Module = {
  onRuntimeInitialized: load_bloom,
};
