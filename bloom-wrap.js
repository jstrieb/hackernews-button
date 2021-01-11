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

  // Remove www. since it is rarely used these days
  if (url.host.startsWith("www.")) {
    url.host = url.host.slice("www.".length,);
  }

  // Note: youtu.be URLs will auto-redirect to youtube.com
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

function newBloom(bloom) {
  let addr = Module.ccall(
    "js_new_bloom",
    "number",
    ["number"],
    [bloom.num_bits]
  );
  bloom.addr = addr;
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

async function load_bloom() {
  // Try to get the Bloom filter out of storage, otherwise download latest. To
  // clear the stored Bloom filter while testing, from the browser console do:
  // browser.storage.local.remove("bloom_filter")
  window.bloom = (await browser.storage.local.get("bloom_filter")).bloom_filter;
  if (!window.bloom || !window.bloom.filter) {
    let b = await fetch("https://github.com/jstrieb/hackernews-button/releases"
          + "/latest/download/hackernews.bloom")
      .then(r => r.blob())
      .then(b => b.arrayBuffer())
      .then(a => new Uint8Array(a));
    window.bloom = {
      filter: b,
      num_bits: Math.round(Math.log2(b.length)) + 3,
      addr: null,
    };

    // TODO: Fail gracefully if both attempts above to load a Bloom filter fail

    // Save the downloaded Bloom filter
    browser.storage.local.set({"bloom_filter": window.bloom})
  }
  newBloom(window.bloom);

  // TODO: Is this enough? Or is this leaking memory?
  window.addEventListener("beforeunload", e => freeBloom(window.bloom.addr));
}

var Module = {
  onRuntimeInitialized: load_bloom,
};
