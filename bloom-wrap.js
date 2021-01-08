function new_bloom(bloom) {
  let addr = Module.ccall(
    "js_new_bloom",
    "number",
    ["number"],
    [bloom.num_bits]
  );
  bloom.addr = addr;
  Module.writeArrayToMemory(bloom.filter, bloom.addr);
}

function free_bloom(bloom) {
  Module.ccall(
    "js_free_bloom",
    null,
    ["number"],
    [bloom.addr]
  );
}

function add_bloom(bloom, url) {
  return Module.ccall(
    "js_add_bloom",
    null,
    ["number", "number", "string", "number"],
    [bloom.addr, bloom.num_bits, url, url.length]
  );
}

function in_bloom(bloom, url) {
  return Module.ccall(
    "js_in_bloom",
    "boolean",
    ["number", "number", "string", "number"],
    [bloom.addr, bloom.num_bits, url, url.length]
  );
}

async function main() {
  let b = await fetch("out.bloom")
    .then(r => r.blob())
    .then(b => b.arrayBuffer())
    .then(a => new Uint8Array(a));
  let bloom = {
    filter: b,
    num_bits: Math.log2(b.length) + 3,
    addr: null,
  };
  new_bloom(bloom);

  console.log(in_bloom(bloom, "test"));
  console.log(in_bloom(bloom, "nottest"));

  add_bloom(bloom, "test");

  console.log(in_bloom(bloom, "test"));
  console.log(in_bloom(bloom, "nottest"));

  free_bloom(bloom.addr);
}

var Module = {
  onRuntimeInitialized: main,
};
