/* test/bloom-test.c
 *
 * Run a bunch of tests on the Bloom filter implementation. Will print to
 * standard output if run in a terminal, will print to the browser console if
 * compiled using emscripten and loaded into the browser.
 *
 * Created by Jacob Strieb
 * January 2021
 */


#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "bloom.h"


/*******************************************************************************
 * Constants (strings for testing)
 ******************************************************************************/

// Statically allocate some strings to add to the filter. The songs from
// which these lyrics were taken are some of my favorites. I've done my best
// to include variety, and I highly recommend you giving a listen to any you
// are unfamiliar with.
char *input1[] = { "This is the very first test!" };
// Layla (Acoustic Version) - Eric Clapton
char *input2[] = {
  "See if you can spot this one?",
  "What will you do when you get lonely",
  "No one waiting by your side?",
  "You've been running, hiding much too long",
  "You know it's just your foolish pride"
};
// Blinding Lights - The Weeknd
char *input3[] = {
  "I look around and",
  "Sin City's cold and empty",
  "No one's around to judge me ",
  "I can't see clearly when you're gone"
};
// Gorgeous - Kanye West
char *input4[] = {
  "Penitentiary chances, the devil dances",
  "And eventually answers to the call of autumn",
  "All them fallin' for the love of ballin'",
  "Got caught with thirty rocks, the cop look like Alec Baldwin",
  "Inter-century anthems based off inner-city tantrums",
  "Based off the way we was branded",
  "Face it, Jerome get more time than Brandon",
  "And at the airport, they check all through my bag",
  "And tell me that it's random",
  "But we stay winning",
  "This week has been a bad massage, I need a happy ending",
  "And a new beginning and a new fitted",
  "And some job opportunities that's lucrative",
  "This the real world, homie, school finished",
  "They done stole your dreams, you don't know who did it",
  "I treat the cash the way the government treats AIDS",
  "I won't be satisfied 'til all my n****s get it, get it?"
};
// Doses and Mimosas - Cherub
char *input5[] = {
  "Ten in the morning",
  "And I'm skipping breakfast",
  "And drinking a beverage",
  "To ignore it all",
  "Guess ignorance is bliss and",
  "I've come to embrace it",
  "It's all overrated",
  "Except drugs and alcohol"
};
// Vivir mi Vida - Marc Anthony
char *input6[] = {
  "Voy a vivir el momento",
  "Para entender el destino",
  "Voy a escuchar en silencio",
  "Para encontrar el camino"
};
// Oh Devil - Electric Guest
char *input7[] = {
  "Oh, devil, I know you're afraid",
  "Sometimes it's hard to learn from all your mistakes",
  "Oh, devil, I'm glad that you came",
  "Guess I should learn how to live because it won't go away"
};



/*******************************************************************************
 * Helper functions
 ******************************************************************************/

/***
 * Add several strings to the Bloom filter, ensuring that they are stil in
 * there as the test proceeds.
 */
int test_in(byte *bloom, int bloom_size, char *strings[], int len) {
  int sizes[len];
  for (int i = 0; i < len; i++) {
    sizes[i] = strlen(strings[i]);
  }

  for (int i = 0; i < len; i++) {
    // Make sure the previous strings are still in the filter
    for (int j = 0; j < i; j++) {
      if (!in_bloom(bloom, bloom_size, (byte *)strings[j], sizes[j])) {
        printf("False negative:\n%s\n", strings[j]);
        return 0;
      }
    }

    // Add the string
    add_bloom(bloom, bloom_size, (byte *)strings[i], sizes[i]);
  }

  return 1;
}


/***
 * Ensure strings that shouldn't be in the Bloom filter aren't, assuming no
 * false positives, which are theoretically possible, but have a diminishingly
 * low chance of happening for appropriately sized Bloom filters.
 */
int test_out(byte *bloom, int bloom_size, char *strings[], int len) {
  int sizes[len];
  for (int i = 0; i < len; i++) {
    sizes[i] = strlen(strings[i]);
  }

  for (int i = 0; i < len; i++) {
    if (in_bloom(bloom, bloom_size, (byte *)strings[i], sizes[i])) {
      printf("False positive:\n%s\n", strings[i]);
      return 0;
    }
  }

  return 1;
}


/***
 * Test a Bloom filter with stuff already added (in test_new_bloom)
 */
int test_old_bloom(byte *bloom, uint8_t size) {
  int success = 1;

  success = success && test_in(bloom, size, input7, 4);
  success = success && test_in(bloom, size, input6, 4);
  success = success && test_in(bloom, size, input5, 8);
  success = success && test_in(bloom, size, input4, 17);
  success = success && test_in(bloom, size, input3, 4);
  success = success && test_in(bloom, size, input2, 5);
  success = success && test_in(bloom, size, input1, 1);

  return success;
}


/***
 * Test the same entries for a bunch of different sized Bloom filters.
 */
int test_new_bloom(byte *bloom, uint8_t size) {
  int success = 1;

  // TODO: Should this still be here?
  success = success && test_in(bloom, size, NULL, 0);

  // Ensure inputs that haven't been added yet aren't in the filter, add inputs
  // one-by-one, and check both that they are in there, and that they haven't
  // changed the membership status of other inputs that are(n't) supposed to be
  // in there
  success = success && test_out(bloom, size, input1, 1);
  success = success && test_out(bloom, size, input2, 5);
  success = success && test_out(bloom, size, input3, 4);
  success = success && test_out(bloom, size, input4, 17);
  success = success && test_out(bloom, size, input5, 8);
  success = success && test_out(bloom, size, input6, 4);
  success = success && test_out(bloom, size, input7, 4);
  success = success && test_in(bloom, size, input1, 1);

  success = success && test_out(bloom, size, input2, 5);
  success = success && test_out(bloom, size, input3, 4);
  success = success && test_out(bloom, size, input4, 17);
  success = success && test_out(bloom, size, input5, 8);
  success = success && test_out(bloom, size, input6, 4);
  success = success && test_out(bloom, size, input7, 4);
  success = success && test_in(bloom, size, input2, 5);
  success = success && test_in(bloom, size, input1, 1);

  success = success && test_out(bloom, size, input3, 4);
  success = success && test_out(bloom, size, input4, 17);
  success = success && test_out(bloom, size, input5, 8);
  success = success && test_out(bloom, size, input6, 4);
  success = success && test_out(bloom, size, input7, 4);
  success = success && test_in(bloom, size, input3, 4);
  success = success && test_in(bloom, size, input2, 5);
  success = success && test_in(bloom, size, input1, 1);

  success = success && test_out(bloom, size, input4, 17);
  success = success && test_out(bloom, size, input5, 8);
  success = success && test_out(bloom, size, input6, 4);
  success = success && test_out(bloom, size, input7, 4);
  success = success && test_in(bloom, size, input4, 17);
  success = success && test_in(bloom, size, input3, 4);
  success = success && test_in(bloom, size, input2, 5);
  success = success && test_in(bloom, size, input1, 1);

  success = success && test_out(bloom, size, input5, 8);
  success = success && test_out(bloom, size, input6, 4);
  success = success && test_out(bloom, size, input7, 4);
  success = success && test_in(bloom, size, input5, 8);
  success = success && test_in(bloom, size, input4, 17);
  success = success && test_in(bloom, size, input3, 4);
  success = success && test_in(bloom, size, input2, 5);
  success = success && test_in(bloom, size, input1, 1);

  success = success && test_out(bloom, size, input6, 4);
  success = success && test_out(bloom, size, input7, 4);
  success = success && test_in(bloom, size, input6, 4);
  success = success && test_in(bloom, size, input5, 8);
  success = success && test_in(bloom, size, input4, 17);
  success = success && test_in(bloom, size, input3, 4);
  success = success && test_in(bloom, size, input2, 5);
  success = success && test_in(bloom, size, input1, 1);

  success = success && test_out(bloom, size, input7, 4);
  success = success && test_in(bloom, size, input7, 4);
  success = success && test_in(bloom, size, input6, 4);
  success = success && test_in(bloom, size, input5, 8);
  success = success && test_in(bloom, size, input4, 17);
  success = success && test_in(bloom, size, input3, 4);
  success = success && test_in(bloom, size, input2, 5);
  success = success && test_in(bloom, size, input1, 1);

  if (!success) {
    printf("Bloom filter test failed for size %d!\n", (int)size);
  }

  return success;
}


/***
 * Test writing compressed files and decompressing them in-memory
 */
int test_compression(byte **bloom, uint8_t size, size_t *new_size) {
  int success = 1;

  // Write the compressed Bloom filter out so we can load it back in and test
  char *tempfilename = "/tmp/delete.bloom";
  write_compressed_bloom(tempfilename, *bloom, size);
  free_bloom(*bloom);

  // Open the gzipped temporary file and read the entire thing into a buffer
  FILE *tempfile;
  if ((tempfile = fopen(tempfilename, "rb")) == NULL) {
    puts("Failed to open compressed file!");
    return 0;
  }
  // Seek to the end to get file length
  if (fseek(tempfile, 0l, SEEK_END)) {
    puts("Failed seek to the end of the compressed file!");
    return 0;
  }
  long tempfile_length;
  if ((tempfile_length = ftell(tempfile)) == -1) {
    puts("Failed to get compressed file position!");
    return 0;
  }
  rewind(tempfile);
  // Read the temporary file
  byte *compressed = (byte *)malloc(tempfile_length * sizeof(char));
  if (fread(compressed, 1, tempfile_length, tempfile) == 0) {
    puts("Could not read from compressed file!");
    return 0;
  }
  if (fclose(tempfile) != 0) {
    puts("Could not close compressed file!");
    return 0;
  }

  byte *decompressed = NULL;
  *new_size = decompress_bloom(compressed, tempfile_length, &decompressed);
  if (new_size == 0) {
    puts("Could not successfully decompress the Bloom filter!");
    return 0;
  }
  *bloom = decompressed;

  free(compressed);

  return success;
}


/***
 * Test combining Bloom filters
 *
 * TODO: Improve – test_in might not actually be confirming that it works...
 */
int test_combine() {
  int success = 1;

  uint8_t size = 15;
  byte *bloom1 = new_bloom(size);
  byte *bloom2 = new_bloom(size);

  success = success && test_in(bloom1, size, input2, 5);
  success = success && test_in(bloom2, size, input4, 17);
  success = success && test_out(bloom1, size, input4, 17);

  combine_bloom(bloom1, bloom2, size);
  success = success && test_in(bloom1, size, input4, 17);

  free(bloom1);
  free(bloom2);

  return success;
}



/*******************************************************************************
 * Main function
 ******************************************************************************/

int main(int argc, char *argv[]) {
  int success = 1;

  puts("Testing Bloom filter library...\n");

  // Test the same input on Bloom filters for each number of bits in the range
  // 9 to 31
  for (uint8_t i = 9; i < 32; i++) {
    printf("Testing a Bloom filter of size %d...\n", (int)i);
    // Make a new Bloom filter of the current size
    byte *bloom = new_bloom(i);

    // Test the Bloom filter
    success = success && test_new_bloom(bloom, i);

    // Write a compressed version, then read it back and decompress it
    size_t new_size;
    success = success && test_compression(&bloom, i, &new_size);
    if (new_size != (size_t)(1 << (i - 3))) {
      printf("New Bloom filter has size %d when size %d was expected!\n",
             (int)new_size, (int)(1 << (i - 3)));
      success = 0;
      break;
    }

    // Ensure that the right values are still in the decompressed version
    success = success && test_old_bloom(bloom, i);

    // Clean up
    free_bloom(bloom);

    if (!success) {
      break;
    }
  }

  // Test combining Bloom filters
  success = success && test_combine();

  // TODO: Add tests that create new bloom filters and generate many strings
  // over and over, confirming that over time the average converges to the
  // expected theoretical number of collisions

  puts(success ? "Success!" : "Failure!");
  puts("");

  return 0;

  // TODO: Remove
  (void)argc;
  (void)argv;
}
