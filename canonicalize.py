#!/usr/bin/python3
###############################################################################
###############################################################################
##
## This file is used for "canonicalizing" URLs so that equivalent URLs
## submitted in slightly different forms don't give false negatives in the
## Bloom filter. At a high level, this is necessary because the Bloom filter
## only matches exact strings, but in many cases different URLs represent the
## same page.
##
## Created by Jacob Strieb
## January 2021
##
###############################################################################
###############################################################################


import csv
import json
import sys
import urllib.parse as urlparse


###############################################################################
# Helper functions
###############################################################################

def remove_keys(d, keys):
    for k in keys:
        if k in d:
            del d[k]
    return d


###############################################################################
# Classes
###############################################################################

class URL(object):
    undesirableQueryParams = [
        "ref",
        "sms_ss",
        "gclid",
        "fbclid",
        "at_xt",
        "_r",
    ]

    def __init__(self, url):
        parsed = urlparse.urlsplit(url)
        # Drop the scheme and fragment
        self.scheme, self.fragment = "", ""
        _, self.netloc, self.path, self.queryStr, _ = tuple(parsed)

    def __iter__(self):
        attributes = [self.scheme, self.netloc, self.path, self.queryStr,
                      self.fragment]
        for a in attributes:
            yield a

    def __str__(self):
        return urlparse.urlunsplit(tuple(self))

    @property
    def queryStr(self):
        return urlparse.urlencode(self.query, doseq=True)

    @queryStr.setter
    def queryStr(self, value):
        self.query = urlparse.parse_qs(value, keep_blank_values=True)

    def canonicalize(self):
        """
        Transform the current URL object to make it as "canonical" as possible.
        This includes removing unnecessary URL parameters, removing "www." from
        the beginning of URLs, stripping unnecessary parts of the path, and
        performing a few domain-specific adjustments.

        NOTE: The order in which the transformations take place is subtly
        important. Do not change the order around without good reason.

        NOTE: Any canonicalization changes made here *MUST* be reflected in the
        `canonicalizeUrl` function within the `bloom-wrap.js` file!
        """
        # HTML files almost exclusively use URL parameters for tracking while
        # the underlying page remains the same
        if self.path.endswith(".html"):
            self.query = dict()

        # Remove URL parameters that never seem to be important
        self.query = remove_keys(self.query, URL.undesirableQueryParams)
        for key in list(self.query.keys()):
            if key.startswith("utm_"):
                del self.query[key]

        # Truncate index.html, index.php, and trailing slashes
        if self.path.endswith("index.html"):
            self.path = self.path[:-len("index.html")]
        if self.path.endswith("index.php"):
            self.path = self.path[:-len("index.php")]
        if self.path != "/":
            self.path = self.path.rstrip("/")

        # Remove www. since it is very rare that sites need it these days
        if self.netloc.startswith("www."):
            self.netloc = self.netloc[len("www."):]

        # Turn youtu.be links into youtube.com ones and remove unnecessary URL
        # parameters
        if self.netloc == "youtu.be":
            self.netloc = "youtube.com"
            self.query["v"] = self.path.strip("/")
            self.path = "/watch"
        if self.netloc == "youtube.com" and "v" in self.query:
            self.query = {"v": self.query["v"]}
        if self.netloc == "youtube.com" and "list" in self.query:
            self.query = {"list": self.query["list"]}

        # Pretty much all Amazon URL parameters seem to be useless tracking
        if self.netloc == "amazon.com":
            self.query = dict()

        # Mobile Wikipedia links are annoying
        if self.netloc == "en.m.wikipedia.org":
            self.netloc = "en.wikipedia.org"


###############################################################################
# Main function
###############################################################################

def main():
    csvReader = csv.DictReader(sys.stdin)
    for entry in csvReader:
        url = URL(entry["url"])
        url.canonicalize()
        print(url)


if __name__ == "__main__":
    main()
