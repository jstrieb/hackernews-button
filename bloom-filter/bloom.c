/* bloom.c
 *
 * Implementation of Bloom filters with adding elements and checking
 * membership.
 *
 * Created by Jacob Strieb
 * January 2021
 */


#include <stdlib.h>
#include <string.h> // memcpy
#include <zlib.h>

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
  // Allocate 2^(num_bits - 3) bytes for the Bloom filter
  return (byte *)calloc(1 << num_bits, sizeof(byte));
}


/***
 * Freeing is straightforward since we don't (yet) use fancy structs to
 * represent data.
 */
void free_bloom(byte *bloom) {
  free(bloom);
}


/***
 * Write out a gzipped file using zlib. Exit the program with a failure code if
 * opening or writing the gzip fails.
 */
void write_compressed_bloom(char *filename, byte *bloom, uint8_t num_bits) {
  gzFile outfile;
  // Use compression level 9 (maximum)
  if ((outfile = gzopen(filename, "wb9")) == NULL) {
    exit(EXIT_FAILURE);
  }

  uint32_t num_bytes = 1 << (num_bits - 3);
  if (gzwrite(outfile, (voidpc)bloom, num_bytes) == 0) {
    gzclose_w(outfile);
    exit(EXIT_FAILURE);
  }

  gzclose_w(outfile);

  return;
}


/***
 * Decompress a gzipped bloom filter in memory. Takes in a compressed Bloom
 * filter, the size of the compressed filter (in bytes), as well as a pointer
 * that will be set to a pointer to the allocated, decompressed Bloom filter.
 * The size in bytes of the decompressed Bloom filter will be returned.
 *
 * TODO: See if there is a better way to manage memory with buffers during the
 * inflation – there might be a faster/more efficient way to do things if data
 * isn't copied into a buffer on the stack, but rather directly into the heap
 * buffer *bloom. When figuring this out, just be careful because naively
 * reallocating *bloom would mess up stream.avail_out if it points directly
 * into *bloom.
 */
size_t decompress_bloom(byte *compressed, size_t size, byte **bloom) {
  z_stream stream;
  stream.zalloc = Z_NULL;
  stream.zfree = Z_NULL;
  stream.opaque = Z_NULL;

  stream.next_in = (Bytef *)compressed;
  stream.avail_in = (uInt)size;

  // The magic 15 + 32 comes from zlib.h and is used to automatically detect
  // whether the stream is a zlib or gzip
  if (inflateInit2(&stream, 15 + 32) != Z_OK) {
    *bloom = NULL;
    return 0;
  }

  size_t buf_size = 16384u;
  byte buf[buf_size];
  size_t bloom_size = 1;
  *bloom = (byte *)malloc(bloom_size * sizeof(byte));

  size_t bytes_copied = 0u;
  int ret;
  do {
    do {
      // Decompress (inflate) as much as possible into the buffer
      stream.avail_out = (uInt)buf_size;
      stream.next_out = buf;

      ret = inflate(&stream, Z_NO_FLUSH);

      // Check for errors after decompressing, return 0 if so (don't recover)
      if (ret == Z_NEED_DICT || ret == Z_DATA_ERROR || ret == Z_MEM_ERROR) {
        return 0u;
      }

      // Reallocate a larger Bloom filter if necessary
      size_t to_copy = buf_size - stream.avail_out;
      while (bytes_copied + to_copy > bloom_size) {
        // We can always increase the Bloom filter by a factor of two because
        // it starts as a power of two, and we assume that the final value is
        // always a power of two
        bloom_size *= 2;

        if ((*bloom = (byte *)realloc((void *)*bloom, bloom_size)) == NULL) {
          return 0u;
        }
      }

      // Copy decompressed bytes from the buffer to the next spot in the filter
      (void)memcpy((void *)(*bloom + bytes_copied), (void *)buf, to_copy);
      bytes_copied += to_copy;

    // Run while inflate still fills the buffer and the stream has not ended
    } while (stream.avail_out == 0);
  } while (ret != Z_STREAM_END);

  (void)inflateEnd(&stream);

  return bloom_size;
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


/***
 * Combine two Bloom filters by ORing each byte in the "new" parameter with
 * each byte in bloom, and storing the result in bloom.
 */
void combine_bloom(byte *bloom, byte *new, uint8_t num_bits) {
  // Number of bytes is 2^num_bits / 8
  size_t num_bytes = 1 << (num_bits - 3);

  for (size_t i = 0; i < num_bytes; i++) {
    bloom[i] |= new[i];
  }
}
