/* bloom.h
 *
 * Interface for a simple, bare-bones Bloom filter library built on top of the
 * Murmur3 hash function.
 *
 * Created by Jacob Strieb
 * January 2021
 */


#ifndef BLOOM_H
#define BLOOM_H


#include <stdint.h>



/*******************************************************************************
 * Constants and types
 ******************************************************************************/

// NUM_HASHES calculated using https://hur.st/bloomfilter
// In particular: at the time this file was created, there are approximately 4
// million stories on HN (not necessarily with unique URLs), and the bloom
// filter is sized to approximately 16MB with this in-mind. This calculator
// suggests using this number of hashes for a bloom filter of this size, with
// fairly low probability of collisions for between 3 million and up to 10
// million elements.
#ifndef NUM_HASHES
#define NUM_HASHES 23
#endif /* NUM_HASHES */

typedef uint8_t byte;



/*******************************************************************************
 * Interface functions
 ******************************************************************************/

/***
 * Allocate a new Bloom filter.
 *
 * NOTE: input num_bits represents a power of 2. Any x not satisfying 0 < x <
 * 32 will return NULL.
 */
byte *new_bloom(uint8_t num_bits);


/***
 * Free an allocated Bloom filter.
 */
void free_bloom(byte *bloom);


/***
 * Write a Bloom filter out to a gzip compressed file.
 */
void write_compressed_bloom(char *filename, byte *bloom, uint8_t num_bits);


/***
 * Decompress a Bloom filter in memory. Takes the compressed filter, the
 * size of the compressed filter in bytes, and a pointer to the place the
 * pointer to the decompressed Bloom filter will be stored. Return the size of
 * the decompressed Bloom filter in bytes. Store a pointer to the decompressed
 * bloom filter in the bloom argument
 *
 * Note that the newly allocated Bloom filter stored in *bloom must be manually
 * freed.
 */
size_t decompress_bloom(byte *compressed, size_t size, byte **bloom);


/***
 * Add data to the Bloom filter.
 */
void add_bloom(byte *bloom, uint8_t num_bits, byte *data, uint32_t length);


/***
 * Returns an int representing whether data is (probably) in the Bloom filter.
 */
int in_bloom(byte *bloom, uint8_t num_bits, byte *data, uint32_t length);


/***
 * Combine two bloom filters. Destructively modifies the bloom parameter to
 * become the combined filter.
 *
 * Both bloom and new *MUST* be the exact same size. Hence, num_bits describes
 * the size of bloom and new.
 */
void combine_bloom(byte *bloom, byte *new, uint8_t num_bits);


#endif /* BLOOM_H */
