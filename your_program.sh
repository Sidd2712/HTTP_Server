#!/bin/sh
#


set -e # Exit early if any commands fail


exec node app/main.js "$@"
