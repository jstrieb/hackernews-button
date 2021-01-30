/* bloom-js-export.c
 *
 * Wrap bloom.h library functions for emcc JavaScript/wasm export. Main
 * function that does nothing. Function comments can be found in bloom.c and
 * bloom.h.
 *
 * This file is useful to have around if it becomes desirable to change the
 * JavaScript interface without changing the underlying library interface.
 *
 * Created by Jacob Strieb
 * January 2021
 */

#include <stdio.h>
#include <stdlib.h>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else /* __EMSCRIPTEN__ */
#define EMSCRIPTEN_KEEPALIVE
#endif /* __EMSCRIPTEN__ */

#include "bloom.h"



/*******************************************************************************
 * Types and Structures
 ******************************************************************************/

struct decompressed_s {
  byte *bloom;
  size_t size;
};



/*******************************************************************************
 * Wrappers around library functions
 ******************************************************************************/

EMSCRIPTEN_KEEPALIVE
byte *js_new_bloom(uint8_t num_bits) {
  return new_bloom(num_bits);
}


EMSCRIPTEN_KEEPALIVE
void js_free_bloom(byte *bloom) {
  free_bloom(bloom);
}


/***
 * Return a pointer to a heap-allocated structure containing a pointer to the
 * heap-allocated decompressed Bloom filter and its size. Use the helpful
 * wrappers below to return the address and size individually from the structure.
 *
 * Implemented this way to facilitate returning a size and address with only
 * one call to the underlying decompression function – decompressing twice is
 * wasteful.
 *
 * NOTE: Both the structure and returned Bloom filter must be individually and
 * manually freed.
 */
EMSCRIPTEN_KEEPALIVE
struct decompressed_s *js_decompress_bloom(byte *compressed, size_t size) {
  struct decompressed_s *decompressed = malloc(sizeof(struct decompressed_s));
  byte *bloom;
  decompressed->size = decompress_bloom(compressed, size, &bloom);
  decompressed->bloom = bloom;
  return decompressed;
}

EMSCRIPTEN_KEEPALIVE
size_t js_get_decompressed_size(struct decompressed_s *decompressed) {
  return decompressed->size;
}

EMSCRIPTEN_KEEPALIVE
byte *js_get_decompressed_bloom(struct decompressed_s *decompressed) {
  return decompressed->bloom;
}


EMSCRIPTEN_KEEPALIVE
void js_add_bloom(byte *bloom, uint8_t num_bits, byte *data, uint32_t length) {
  add_bloom(bloom, num_bits, data, length);
}


EMSCRIPTEN_KEEPALIVE
int js_in_bloom(byte *bloom, uint8_t num_bits, byte *data, uint32_t length) {
  return in_bloom(bloom, num_bits, data, length);
}



/*******************************************************************************
 * (Empty) main function
 ******************************************************************************/

int main() {
  return 0;
}
