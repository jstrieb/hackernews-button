/* bloom-js-export.c
 *
 * Wrap bloom.h library functions for emcc JavaScript/wasm export. Main
 * function that does nothing. Function comments can be found in bloom.c and
 * bloom.h.
 *
 * Created by Jacob Strieb
 * January 2021
 */


#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else /* __EMSCRIPTEN__ */
#define EMSCRIPTEN_KEEPALIVE
#endif /* __EMSCRIPTEN__ */

#include "bloom.h"



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
