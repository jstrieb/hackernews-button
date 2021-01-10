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
  return Module.ccall(
    "js_add_bloom",
    null,
    ["number", "number", "string", "number"],
    [bloom.addr, bloom.num_bits, url, url.length]
  );
}

function inBloom(bloom, url) {
  return Module.ccall(
    "js_in_bloom",
    "boolean",
    ["number", "number", "string", "number"],
    [bloom.addr, bloom.num_bits, url, url.length]
  );
}

async function load_bloom() {
  // Try to get the Bloom filter out of storage, otherwise download latest
  window.bloom = (await browser.storage.local.get("bloom_filter")).bloom_filter;
  if (!window.bloom.filter) {
    let b = await fetch("out.bloom")
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
  newBloom(window.bloom);

  // TODO: Is this enough? Or is this leaking memory?
  window.addEventListener("beforeunload", e => freeBloom(window.bloom.addr));
}

var Module = {
  onRuntimeInitialized: load_bloom,
};
