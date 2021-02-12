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

  // Drop the scheme and remove a trailing slash if it is still there
  let result = url.toString().replace(/^.*:\/\//, "//")
    .replace(/\/$/, "");

  return result;
}


/***
 * Delete the locally-stored Bloom filter. Useful for debugging from the
 * console.
 */
async function deleteStoredBloom() {
  await browser.storage.local.remove("bloom_filter");
  await browser.storage.local.get().then(console.log);
}


/***
 * Save the Bloom filter to local storage
 */
async function storeBloom(bloom) {
  // Skip if storing is already in progress
  if (!bloom || bloom.currently_storing) {
    return;
  }

  // Set the semaphore so it is not stored by another call to this function
  // while bloom.addr is set to null
  bloom.currently_storing = true;

  // Save the address and set the global one to null so that it is clear it has
  // not been allocated in WebAssembly when the Bloom filter is restored from
  // storage
  let addr = bloom.addr;
  bloom.addr = null;

  // Update the filter attribute from WebAssembly memory
  if (addr) {
    bloom.filter = new Uint8Array(Module.HEAPU8.buffer, addr,
        Math.pow(2, bloom.num_bits - 3));
  }

  // Store the Bloom filter and restore the address
  await browser.storage.local.set({"bloom_filter": bloom});
  bloom.addr = addr;

  // Unset the semaphore
  bloom.currently_storing = false;
}


/***
 * Fetch auto-generated Bloom filter metadata.
 */
async function fetchInfo() {
  // Get info.json to find out which Bloom filters to download
  let infoUrl = ("https://github.com/jstrieb/hackernews-button/releases/latest"
      + "/download/info.json");
  let info = await fetch(infoUrl, {
    cache: "no-cache",
  }).then(r => r.json());

  return info;
}


/***
 * Fetch the latest Bloom filter(s). Returns a Bloom filter object.
 */
async function fetchBloom(filename, decompress = true) {
  // TODO: Fetch info outside and pass the object in
  console.debug("Fetching Bloom filter info...");
  let info = await fetchInfo();

  console.debug("Fetching new Bloom filter...");
  let url = ("https://github.com/jstrieb/hackernews-button/releases/latest/"
            + `download/${filename}`);
  let b = await fetch(url, {
    cache: "no-cache",
  })
    .then(b => b.arrayBuffer())
    .then(a => new Uint8Array(a));

  let bloom = {
    // Filter as an ArrayBuffer
    filter: b,
    // Boolean representing compression status
    compressed: info.compressed,
    // Number of bits in the filter IDs -- number of bytes is 2^(num_bits - 3)
    num_bits: null,
    // WebAssembly heap-allocated Bloom filter address
    addr: null,
    // Date of most recent filter download
    last_downloaded: Math.floor(Date.now() / 1000),
    // Date of most recent filter generation
    last_generated: info.date_generated,
    // Date of anticipated filter regeneration
    next_generated: info.next_generated,
    // Filter filename
    filename: filename,
    // Semaphore for whether it is currently being stored
    currently_storing: false,
  };
  console.debug("Fetched: ", bloom);

  if (decompress) {
    // Set bloom.addr
    if (bloom.compressed) {
      decompressBloom(bloom);
      console.debug("Decompressed: ", bloom);
    } else {
      newBloom(bloom);
    }
  }

  return bloom;
}


/***
 * Update the Bloom filter(s) to the latest versions. Destructively modifies
 * the global object window.bloom
 */
async function updateBloom(force = false) {
  // If a Bloom filter has never been loaded, try to load it again
  // NOTE: Since updateBloom is called regularly, this could get expensive if
  // there is no Internet connection or something
  if (!window.bloom || !window.bloom.filter || !window.bloom.addr) {
    await loadBloom();
    return;
  }

  // If the anticipated next generated time hasn't happened yet, don't check
  // for anything
  let now = Math.floor(Date.now() / 1000);
  if (!force && window.bloom.next_generated > now) {
    return;
  }

  // Get info.json to find out which Bloom filters to download
  let info = await fetchInfo();

  // If the downloaded info.json is the same or older than the last generated
  // one, make sure the next_generated time is set properly. Theoretically,
  // this should be an unnecessary check if the next_generated prediction is
  // incorrect
  if (!force && info.date_generated <= window.bloom.last_generated) {
    window.bloom.next_generated = info.next_generated;
    return;
  }

  // Sort dates to the correct date range to download from. Sorted by lowest
  // number i.e., oldest timestamp first
  let sorted = Object.keys(info.dates).map(Number).sort((x, y) => x - y);

  // If older than the oldest by a large margin, download fresh
  if (sorted[0] - window.bloom.last_downloaded > 7 * 24 * 60 * 60) {
    freeBloom(window.bloom);
    window.bloom = await fetchBloom("hn-0.bloom");
    await storeBloom(window.bloom);
  }

  // Otherwise, pick the Bloom filter with the date closest to the
  // last_generated date to combine with
  else {
    // Re-sort based on which is closest to the last_generated date
    let l = window.bloom.last_generated;
    sorted = sorted.sort((x, y) => Math.abs(x - l) - Math.abs(y - l));

    // Download latest partial Bloom filter
    let dateString = info.dates[sorted[0]];
    let latestBloom = await fetchBloom(`hn-${dateString}-0.bloom`);

    // Combine the filters and update the datetimes
    combineBloom(window.bloom, latestBloom);
    window.bloom.last_downloaded = latestBloom.last_downloaded;
    window.bloom.last_generated = latestBloom.last_generated;
    window.bloom.next_generated = latestBloom.next_generated;

    // Free the allocated partial Bloom filter
    freeBloom(latestBloom);

    // Store the updated Bloom filter
    await storeBloom(window.bloom);
  }
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
  bloom.addr = null;
}


/***
 * Decompress the compressed Bloom filter, and extract the address and size
 * from the struct generated by the library functions.
 */
function decompressBloom(bloom) {
  // Put the compressed Bloom filter on the heap
  let compressed = bloom.filter;
  let compressed_addr = _malloc(compressed.length);
  Module.writeArrayToMemory(compressed, compressed_addr);

  let decompressed = Module.ccall(
    "js_decompress_bloom",
    "number",
    ["number", "number"],
    [compressed_addr, compressed.length]
  );
  let size_bytes = Module.ccall(
    "js_get_decompressed_size",
    "number",
    ["number"],
    [decompressed]
  );
  if (size_bytes == 0) {
    throw "Failed to decompress downloaded Bloom filter!";
  }
  bloom.addr = Module.ccall(
    "js_get_decompressed_bloom",
    "number",
    ["number"],
    [decompressed]
  );
  bloom.num_bits = Math.round(Math.log2(size_bytes)) + 3,
  bloom.compressed = false;

  _free(compressed_addr);

  // Free the structure, but not the heap-allocated Bloom filter itself
  _free(decompressed);
}


function addBloom(bloom, url) {
  if (!bloom || !bloom.addr) {
    return;
  }

  url = canonicalizeUrl(url);
  Module.ccall(
    "js_add_bloom",
    null,
    ["number", "number", "string", "number"],
    [bloom.addr, bloom.num_bits, url, url.length]
  );
}


function inBloom(bloom, url) {
  if (!bloom || bloom.currently_storing || !bloom.addr) {
    // This typically happens on news.ycombinator.com sites where new stories
    // have been added to the Bloom filter, and the membership check happens
    // while the filter is being saved to local storage
    return false;
  }

  url = canonicalizeUrl(url);
  return Module.ccall(
    "js_in_bloom",
    "boolean",
    ["number", "number", "string", "number"],
    [bloom.addr, bloom.num_bits, url, url.length]
  );
}


/***
 * Combine Bloom filters by destructively modifying the memory of the first one
 */
function combineBloom(bloom, new_bloom) {
  if (bloom.num_bits != new_bloom.num_bits) {
    throw "Trying to combine Bloom filters of different sizes!";
  }
  Module.ccall(
    "js_combine_bloom",
    null,
    ["number", "number", "number"],
    [bloom.addr, new_bloom.addr, bloom.num_bits]
  );
}



/*******************************************************************************
 * Main function
 ******************************************************************************/

/***
 * Load the Bloom filter as soon as there is a WebAssembly runtime to load it
 * with. This is typically right when the browser/extension starts up.
 */
async function loadBloom() {
  // If the Bloom filter is already allocated, free it
  if (window.bloom && window.bloom.addr) {
    freeBloom(window.bloom);
  }

  // Try to get the Bloom filter out of storage, otherwise download latest. To
  // clear the stored Bloom filter while testing, from the browser console do:
  // browser.storage.local.remove("bloom_filter")
  window.bloom = (await browser.storage.local.get("bloom_filter")).bloom_filter;
  if (!window.bloom || !window.bloom.filter) {
    // Fetch the Bloom filter without decompressing (in this case, that happens
    // outside the conditional in case a compressed Bloom filter was stored).
    window.bloom = await fetchBloom("hn-0.bloom", false);

    // Save the downloaded Bloom filter
    await storeBloom(window.bloom);
  }

  // Fail (semi) gracefully if both attempts above to load a Bloom filter fail
  if (!window.bloom || !window.bloom.filter) {
    throw "Couldn't load Bloom filter from local storage or the web!";
    return;
  }

  // Set bloom.addr
  if (window.bloom.compressed) {
    decompressBloom(window.bloom);
    await storeBloom(window.bloom);
    console.debug("Decompressed: ", window.bloom);
  } else {
    newBloom(window.bloom);
  }

  // TODO: Is this enough? Or is this leaking memory?
  window.addEventListener("beforeunload", e => freeBloom(window.bloom.addr));
}

// NOTE: This works because this file is run before the autogenerated bloom.js
var Module = {
  onRuntimeInitialized: loadBloom,
};
