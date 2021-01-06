/* murmur.h
 *
 * Inteface for using MurmurHash v3.
 *
 * Created by Jacob Strieb
 * January 2021
 */


#ifndef MURMUR_H
#define MURMUR_H


#include <stdint.h>



/*******************************************************************************
 * Interface functions
 ******************************************************************************/

/***
 * Calculate a murmur3 hash of data, a byte array. Vary the seed as necessary
 * to obtain different, deterministic hashes for the same data.
 */
uint32_t murmur3(uint8_t *data, uint32_t length, uint32_t seed);

#endif /* MURMUR_H */
