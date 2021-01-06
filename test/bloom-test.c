/* test/bloom-test.c
 *
 * Run a bunch of tests on the bloom filter implementation. Will print to
 * standard output if run in a terminal, will print to the browser console if
 * compiled using emscripten and loaded into the browser.
 *
 * Created by Jacob Strieb
 * January 2021
 */


#include <stdio.h>
#include <string.h>

#include "bloom.h"



/*******************************************************************************
 * Helper functions
 ******************************************************************************/

/***
 * Add several strings to the bloom filter, ensuring that they are stil in
 * there as the test proceeds.
 */
int test_in(byte *bloom, int bloom_size, char *strings[], int len) {
  int sizes[len];
  for (int i = 0; i < len; i++) {
    sizes[i] = strlen(strings[i]);
  }

  for (int i = 0; i < len; i++) {
    // Add the string
    add_bloom(bloom, bloom_size, (byte *)strings[i], sizes[i]);

    // Make sure the previous strings are still in the filter
    for (int j = 0; j < i; j++) {
      if (!in_bloom(bloom, bloom_size, (byte *)strings[j], sizes[j])) {
        printf("False negative:\n%s\n", strings[j]);
        return 0;
      }
    }
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



/*******************************************************************************
 * Main function
 ******************************************************************************/

int main(int argc, char *argv[]) {
  int success = 1;

  puts("Testing bloom filter library...\n");

  // Allocate a Bloom filter (1024 bits = 128 bytes)
  byte *bloom = new_bloom(10);

  // TODO: Should this still be here?
  success = success && test_in(bloom, 10, NULL, 0);

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

  // Ensure inputs that haven't been added yet aren't in the filter, add inputs
  // one-by-one, and check both that they are in there, and that they haven't
  // changed the membership status of other inputs that are(n't) supposed to be
  // in there
  success = success && test_out(bloom, 10, input1, 1);
  success = success && test_out(bloom, 10, input2, 5);
  success = success && test_out(bloom, 10, input3, 4);
  success = success && test_out(bloom, 10, input4, 17);
  success = success && test_out(bloom, 10, input5, 8);
  success = success && test_out(bloom, 10, input6, 4);
  success = success && test_out(bloom, 10, input7, 4);
  success = success && test_in(bloom, 10, input1, 1);

  success = success && test_out(bloom, 10, input2, 5);
  success = success && test_out(bloom, 10, input3, 4);
  success = success && test_out(bloom, 10, input4, 17);
  success = success && test_out(bloom, 10, input5, 8);
  success = success && test_out(bloom, 10, input6, 4);
  success = success && test_out(bloom, 10, input7, 4);
  success = success && test_in(bloom, 10, input2, 5);
  success = success && test_in(bloom, 10, input1, 1);

  success = success && test_out(bloom, 10, input3, 4);
  success = success && test_out(bloom, 10, input4, 17);
  success = success && test_out(bloom, 10, input5, 8);
  success = success && test_out(bloom, 10, input6, 4);
  success = success && test_out(bloom, 10, input7, 4);
  success = success && test_in(bloom, 10, input3, 4);
  success = success && test_in(bloom, 10, input2, 5);
  success = success && test_in(bloom, 10, input1, 1);

  success = success && test_out(bloom, 10, input4, 17);
  success = success && test_out(bloom, 10, input5, 8);
  success = success && test_out(bloom, 10, input6, 4);
  success = success && test_out(bloom, 10, input7, 4);
  success = success && test_in(bloom, 10, input4, 17);
  success = success && test_in(bloom, 10, input3, 4);
  success = success && test_in(bloom, 10, input2, 5);
  success = success && test_in(bloom, 10, input1, 1);

  success = success && test_out(bloom, 10, input5, 8);
  success = success && test_out(bloom, 10, input6, 4);
  success = success && test_out(bloom, 10, input7, 4);
  success = success && test_in(bloom, 10, input5, 8);
  success = success && test_in(bloom, 10, input4, 17);
  success = success && test_in(bloom, 10, input3, 4);
  success = success && test_in(bloom, 10, input2, 5);
  success = success && test_in(bloom, 10, input1, 1);

  success = success && test_out(bloom, 10, input6, 4);
  success = success && test_out(bloom, 10, input7, 4);
  success = success && test_in(bloom, 10, input6, 4);
  success = success && test_in(bloom, 10, input5, 8);
  success = success && test_in(bloom, 10, input4, 17);
  success = success && test_in(bloom, 10, input3, 4);
  success = success && test_in(bloom, 10, input2, 5);
  success = success && test_in(bloom, 10, input1, 1);

  success = success && test_out(bloom, 10, input7, 4);
  success = success && test_in(bloom, 10, input7, 4);
  success = success && test_in(bloom, 10, input6, 4);
  success = success && test_in(bloom, 10, input5, 8);
  success = success && test_in(bloom, 10, input4, 17);
  success = success && test_in(bloom, 10, input3, 4);
  success = success && test_in(bloom, 10, input2, 5);
  success = success && test_in(bloom, 10, input1, 1);

  free_bloom(bloom);

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
