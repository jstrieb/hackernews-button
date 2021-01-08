/* bloom-create.c
 *
 * Command-line program to create a Bloom filter.
 *
 * Created by Jacob Strieb
 * January 2021
 */


#include <assert.h>
#include <errno.h>
#include <getopt.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

#include "bloom.h"



/*******************************************************************************
 * Types, structs, and constants
 ******************************************************************************/

struct args {
  char *infile;
  char *outfile;
  int bloom_bits;
};



/*******************************************************************************
 * Helper functions
 ******************************************************************************/

/***
 * Print a usage string describing this program's command-line arguments.
 */
void print_usage(char *prog_name) {
  printf("Usage: %s [OPTION]... OUTFILE\n"
      "Create a Bloom filter from a newline-separated list of input strings.\n"
      "OUTFILE is where the binary data of the Bloom filter will be stored.\n\n"
      "Options:\n"
      " -i, --input=IN\t\tInput file to read strings from, default is stdin\n"
      " -b, --bloom-bits=EXP\tUse 2^EXP bits for Bloom filter, default is 27\n"
      " -h, --help\t\tDisplay this help message\n"
      "\nCreated by Jacob Strieb in January 2021.\n", prog_name);
}


/***
 * Parse comand line arguments, setting their values in the parsed_args struct.
 */
void parse_args(int argc, char *argv[], struct args *parsed_args) {
  // Set default values
  parsed_args->infile = NULL;
  parsed_args->outfile = NULL;
  // 2^27 bits = 2^24 bytes = 16MB (approx)
  // Calculated for 3-10M entries using: https://hur.st/bloomfilter
  parsed_args->bloom_bits = 27;

  int c, long_index;
  struct option opts[] = {
    { "input", required_argument, NULL, 'i' },
    { "bloom-bits", required_argument, NULL, 'b' },
    { "help", no_argument, NULL, 'h' },
    { 0, 0, 0, 0 }
  };
  while ((c = getopt_long(argc, argv, "i:b:h", opts, &long_index)) != -1) {
    switch(c) {
      case 'i':
        // According to GDB this just points into argv, so we don't have to
        // worry about this string being overwritten when we return up the
        // stack to the caller and try to use the pointer
        parsed_args->infile = optarg;
        break;

      case 'b':
        parsed_args->bloom_bits = atoi(optarg);
        if (parsed_args->bloom_bits > 31 || parsed_args->bloom_bits <= 0) {
          fprintf(stderr, "%s\n\n", "Must have 0 < bloom-bits < 32.");
          print_usage(argv[0]);
          exit(EXIT_FAILURE);
        }
        break;

      case 'h':
        print_usage(argv[0]);
        exit(EXIT_SUCCESS);
        break;

      default:
        // Add a blank line because an error will probably be printed
        puts("");
        print_usage(argv[0]);
        exit(EXIT_FAILURE);
        break;
    }
  }

  // Make sure there is an outfile
  if (optind >= argc) {
    fprintf(stderr, "%s\n\n", "Output file not specified!");
    print_usage(argv[0]);
    exit(EXIT_FAILURE);
  }

  parsed_args->outfile = argv[optind];

  return;
}

/*******************************************************************************
 * Main function
 ******************************************************************************/

int main(int argc, char *argv[]) {
  // Parse command-line arguments
  struct args args;
  parse_args(argc, argv, &args);

  // Open files specified by user inputs
  FILE *infile, *outfile;
  if (args.infile == NULL) {
    infile = stdin;
  } else if ((infile = fopen(args.infile, "r")) == NULL) {
    perror("Unable to open input file");
    return EXIT_FAILURE;
  }
  if (args.outfile == NULL || (outfile = fopen(args.outfile, "w")) == NULL) {
    perror("Unable to open output file");
    print_usage(argv[0]);
    return EXIT_FAILURE;
  }

  // Allocate a new bloom filter
  byte *bloom;
  if ((bloom = new_bloom(args.bloom_bits)) == NULL) {
    perror("Unable to create Bloom filter");
    return EXIT_FAILURE;
  }

  // Add strings to the bloom filter from the input, line-by-line
  size_t n = 0;
  char *buffer = NULL;
  ssize_t bytes_read;
  while ((bytes_read = getline(&buffer, &n, infile)) != -1) {
    assert(bytes_read >= 1);
    // Use one less byte of the buffer since it includes the deliminter due to
    // the implementation of getline, and hashing the newline will cause
    // problems with JavaScript strings later on
    // NOTE: Important to see that bytes_read is VERY different from n, which
    // is the allocated size -- originally, missing this led to a gnarly bug
    add_bloom(bloom, args.bloom_bits, (uint8_t *)buffer, bytes_read - 1);
  }

  // Write the bloom filter out to a file
  fwrite((void *)bloom, sizeof(uint8_t), 1 << (args.bloom_bits - 3), outfile);

  // Clean up
  free(buffer);
  free_bloom(bloom);

  fclose(infile);
  fclose(outfile);

  return EXIT_SUCCESS;
}
