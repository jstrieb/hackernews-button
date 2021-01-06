/* test/murmur-test.c
 *
 * Run a bunch of tests on the murmur3 implementation. Will print to standard
 * output if run in a terminal, will print to the browser console if compiled
 * using emscripten and loaded into the browser.
 *
 * Many tests generously provided by:
 * https://stackoverflow.com/a/31929528/1376127
 *
 * Created by Jacob Strieb
 * January 2021
 */


#include <stdio.h>
#include <stdint.h>
#include <string.h>

#include "murmur.h"



/*******************************************************************************
 * Helper functions
 ******************************************************************************/

int run_test(uint8_t *input, int length, uint32_t seed, uint32_t expected) {
  uint32_t result = murmur3(input, length, seed);
  printf("Expected: 0x%08x  |  Got: 0x%08x\n", expected, result);
  return result == expected;
}



/*******************************************************************************
 * Main function
 ******************************************************************************/

/**
 * Really hope the tests are correct, because I snatched them verbatim
 * without checking them anywhere else, and they match my impelmentation!
 *
 * See the link at the top of the file for the goals for several of the
 * specific tests.
 */
int main(int argc, char *argv[]) {
  int success = 1;

  puts("Testing murmur3...\n");

  success = success && run_test(NULL, 0, 0, 0);
  success = success && run_test(NULL, 0, 1, 0x514e28b7);
  success = success && run_test(NULL, 0, 0xffffffff, 0x81f16f39);

  uint8_t input[] = { 0xff, 0xff, 0xff, 0xff };
  success = success && run_test((uint8_t *)&input, 4, 0, 0x76293b50);

  uint8_t input2[] = { 0x21, 0x43, 0x65, 0x87 };
  success = success && run_test((uint8_t *)&input2, 4, 0, 0xf55b516b);
  success = success && run_test((uint8_t *)&input2, 4, 0x5082edee, 0x2362f9de);
  success = success && run_test((uint8_t *)&input2, 3, 0, 0x7e4a8634);
  success = success && run_test((uint8_t *)&input2, 2, 0, 0xa0f7b07a);
  success = success && run_test((uint8_t *)&input2, 1, 0, 0x72661cf4);

  uint8_t input3[] = { 0x00, 0x00, 0x00, 0x00 };
  success = success && run_test((uint8_t *)&input3, 4, 0, 0x2362f9de);
  success = success && run_test((uint8_t *)&input3, 3, 0, 0x85f0b427);
  success = success && run_test((uint8_t *)&input3, 2, 0, 0x30f4c306);
  success = success && run_test((uint8_t *)&input3, 1, 0, 0x514e28b7);

  char input4[] = "";
  success = success && run_test((uint8_t *)&input4, 0, 0, 0);
  success = success && run_test((uint8_t *)&input4, 0, 1, 0x514e28b7);
  success = success && run_test((uint8_t *)&input4, 0, 0xffffffff, 0x81f16f39);

  char input5[] = "\0\0\0\0";
  success = success && run_test((uint8_t *)&input5, 4, 0, 0x2362f9de);

  char input6[] = "aaaa";
  success = success && run_test((uint8_t *)&input6, 4, 0x9747b28c, 0x5a97808a);
  success = success && run_test((uint8_t *)&input6, 3, 0x9747b28c, 0x283e0130);
  success = success && run_test((uint8_t *)&input6, 2, 0x9747b28c, 0x5d211726);
  success = success && run_test((uint8_t *)&input6, 1, 0x9747b28c, 0x7fa09ea6);

  char input7[] = "abcd";
  success = success && run_test((uint8_t *)&input7, 4, 0x9747b28c, 0xf0478627);
  success = success && run_test((uint8_t *)&input7, 3, 0x9747b28c, 0xc84a62dd);
  success = success && run_test((uint8_t *)&input7, 2, 0x9747b28c, 0x74875592);
  success = success && run_test((uint8_t *)&input7, 1, 0x9747b28c, 0x7fa09ea6);

  char input8[] = "Hello, world!";
  success = success && run_test((uint8_t *)&input8, 13, 0x9747b28c, 0x24884cba);

  char input9[] = "ππππππππ";
  success = success && run_test((uint8_t *)&input9, 16, 0x9747b28c, 0xd58063c1);

  uint8_t input10[256];
  memset((void *)&input10, 'a', 256);
  success = success && run_test((uint8_t *)&input10, 256, 0x9747b28c,
      0x37405bdc);

  uint8_t input11[] = "abc";
  success = success && run_test((uint8_t *)&input11, 3, 0, 0xb3dd93fa);

  uint8_t input12[] = "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq";
  success = success && run_test((uint8_t *)&input12, 56, 0, 0xee925b90);

  uint8_t input13[] = "The quick brown fox jumps over the lazy dog";
  success = success && run_test((uint8_t *)&input13, 43, 0x9747b28c, 0x2fa826cd);

  puts("");
  puts(success ? "Succeeded!" : "Failed!");
  puts("");

  return !success;

  // TODO: Remove
  (void)argc;
  (void)argv;
}
