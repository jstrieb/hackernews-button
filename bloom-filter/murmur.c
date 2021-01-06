/* murmur.c
 *
 * Very simple, un-optimized MurmurHash v3 implementation.
 *
 * Adapted (copied) from the OG:
 * https://github.com/aappleby/smhasher/blob/master/src/MurmurHash3.cpp
 *
 * Created by Jacob Strieb
 * January 2021
 */


#include "murmur.h"



/*******************************************************************************
 * Helper functions
 ******************************************************************************/

uint32_t rotl32(uint32_t x, int8_t r) {
  return (x << r) | (x >> (32 - r));
}



/*******************************************************************************
 * Library functions
 ******************************************************************************/

/***
 * I wish I could say why any of this worked, but honestly, I have no idea. I
 * copied this from the original version in C++, to which it is nearly
 * identical. I applied common sense where necessary, and am relying on the
 * tests to validate that this is a correct implementation.
 */
uint32_t murmur3(uint8_t *data, uint32_t length, uint32_t seed) {
  int nblocks = length / 4;
  uint32_t h1 = seed;
  uint32_t c1 = 0xcc9e2d51, c2 = 0x1b873593;
  uint32_t *blocks = (uint32_t *)(data + nblocks * 4);

  for (int i = -nblocks; i < 0; i++) {
    uint32_t k1 = blocks[i];

    k1 *= c1;
    k1 = rotl32(k1, 15);
    k1 *= c2;

    h1 ^= k1;
    h1 = rotl32(h1, 13);
    h1 = h1 * 5 + 0xe6546b64;
  }

  uint32_t k1 = 0;
  uint8_t *tail = (uint8_t *)(data + nblocks * 4);
  // This switch is implemented with fallthrough in the original version, but I
  // copied some code around to placate the compiler, which was giving me
  // obnoxious warnings
  switch (length & 3) {
    case 3:
      k1 ^= tail[2] << 16;
      k1 ^= tail[1] << 8;
      k1 ^= tail[0];
      k1 *= c1;
      k1 = rotl32(k1, 15);
      k1 *= c2;
      h1 ^= k1;
      break;
    case 2:
      k1 ^= tail[1] << 8;
      k1 ^= tail[0];
      k1 *= c1;
      k1 = rotl32(k1, 15);
      k1 *= c2;
      h1 ^= k1;
      break;
    case 1:
      k1 ^= tail[0];
      k1 *= c1;
      k1 = rotl32(k1, 15);
      k1 *= c2;
      h1 ^= k1;
      break;
  };

  h1 ^= length;
  h1 ^= h1 >> 16;
  h1 *= 0x85ebca6b;
  h1 ^= h1 >> 13;
  h1 *= 0xc2b2ae35;
  h1 ^= h1 >> 16;

  return h1;
}
