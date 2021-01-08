################################################################################
################################################################################
##
## This file is used for building the final extension release package,
## compiling bloom filter code to run in a terminal and in WebAssembly, running
## tests on the Bloom filter and Murmur3 implementations, and for cleaning up
## garbage files that may accumulate over time.
##
## Created by Jacob Strieb
## January 2021
##
################################################################################
################################################################################



################################################################################
# Variables
################################################################################

SHELL = /bin/sh

CC = gcc
CFLAGS = -std=gnu99 \
				 -pedantic \
				 -Wall \
				 -Wextra \
				 -Werror \
				 -O3
VPATH = bloom-filter test
INC = bloom-filter



################################################################################
# Bundle extension for release (download and resize icons if necessary)
################################################################################

hn-discussion.zip: manifest.json background.js icons
	zip \
		--recurse-paths \
		hn-discussion.zip \
		manifest.json background.js icons

# NOTE: Requires ImageMagick
icons: ycombinator-logo.jpg
	mkdir -p icons
	convert -resize 16x16 ycombinator-logo.jpg icons/icon-16.png
	convert -resize 32x32 ycombinator-logo.jpg icons/icon-32.png
	convert -resize 48x48 ycombinator-logo.jpg icons/icon-48.png
	convert -resize 64x64 ycombinator-logo.jpg icons/icon-64.png
	convert -resize 96x96 ycombinator-logo.jpg icons/icon-96.png

ycombinator-logo.jpg:
	curl \
		--output "ycombinator-logo.jpg" \
		"https://feeds.backtracks.fm/feeds/series/cb81757a-3054-11e7-89cf-0e1b887eb36a/images/main.jpg"



################################################################################
# Test Bloom filter and Murmur3 implementations
################################################################################

.PHONY: test
test: bin/murmur-test bin/bloom-test bin/murmur-test.html bin/bloom-test.html
	bin/murmur-test
	bin/bloom-test

bin:
	mkdir -p bin

bin/murmur-test: bin murmur.c murmur-test.c
	$(CC) $(CFLAGS) -I $(INC) $(filter %.c, $^) -o $@

bin/murmur-test.html: bin murmur.c murmur-test.c test-template.html
	emcc $(filter %.c, $^) \
		-I $(INC) \
		-s WASM=1 \
		-s ASSERTIONS=1 \
		-s EXTRA_EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
		--shell-file $(filter %.html, $^) \
		-o $@
	@echo "Start a local web server in this directory and go to /murmur-test.html"

bin/bloom-test: bin murmur.c bloom.c bloom-test.c
	$(CC) $(CFLAGS) -I $(INC) $(filter %.c, $^) -o $@

bin/bloom-test.html: bin murmur.c bloom.c bloom-test.c test-template.html
	emcc $(filter %.c, $^) \
		-I $(INC) \
		-s WASM=1 \
		-s ASSERTIONS=1 \
		-s EXTRA_EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
		--shell-file $(filter %.html, $^) \
		-o $@
	@echo "Start a local web server in this directory and go to /bloom-test.html"



################################################################################
# Additional targets
################################################################################

.PHONY: clean
clean:
	rm -rf bin
