/* bloom.c
 *
 * Implementation of Bloom filters with adding elements and checking
 * membership.
 *
 * Created by Jacob Strieb
 * January 2021
 */


#include <stdlib.h>

#include "bloom.h"
#include "murmur.h"



/*******************************************************************************
 * Library functions
 ******************************************************************************/

/***
 * Allocate an empty, zeroed bloom filter of 2^num_bits bits.
 */
byte *new_bloom(uint8_t num_bits) {
  if (num_bits > 31) {
    return NULL;
  }

  // Subtracting 3 effectively divides by 8 to account for allocating bytes
  num_bits -= 3;
  return (byte *)calloc((1 << num_bits), sizeof(byte));
}


/***
 * Freeing is straightforward since we don't (yet) use fancy structs to
 * represent data.
 */
void free_bloom(byte *bloom) {
  free(bloom);
}


/***
 * Add a bit at an index derived from murmur3 hashes seeded by the current
 * iteration -- justification for number of iterations can be found in bloom.h.
 */
void add_bloom(byte *bloom, uint8_t num_bits, byte *data, uint32_t length) {
  for (int i = 0; i < NUM_HASHES; i++) {
    // Calculate the hash value and only take the minimum number of
    // higher-order bits required to index fully into the filter.  Recall that
    // num_bits represents a power of 2
    uint32_t hash = murmur3(data, length, i);
    hash >>= 32 - num_bits;

    // Divide by 8 to index into the correct byte, set the correct bit to 1
    bloom[hash >> 3] |= 1 << (7 - (hash & 0x7));
  }
}


/***
 * Check each bit at indices derived from murmur3 hashes seeded by the current
 * iteration -- justification for number of iterations can be found in bloom.h.
 */
int in_bloom(byte *bloom, uint8_t num_bits, byte *data, uint32_t length) {
  for (int i = 0; i < NUM_HASHES; i++) {
    // Calculate the hash value and only take the minimum number of
    // higher-order bits required to index fully into the filter.  Recall that
    // num_bits represents a power of 2
    uint32_t hash = murmur3(data, length, i);
    hash >>= 32 - num_bits;

    // Divide by 8 to index into the correct byte, get the correct bit
    int set = bloom[hash >> 3] & (1 << (7 - (hash & 0x7)));

    // Return early if any of the expected bits are not set, meaning the
    // element is not in the filter
    if (!set) {
      return 0;
    }
  }

  return 1;
}
