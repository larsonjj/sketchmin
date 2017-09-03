# Sketchmin [![Build Status](https://travis-ci.org/larsonjj/sketchmin.svg?branch=master)](https://travis-ci.org/larsonjj/sketchmin)

> Reduce the size of your sketch files in a fast and easy way.

# Description

Have a large Sketch file with a lot of imagery (jpg, png, etc)? Well, you're in luck! This package scans your `.sketch` files, compresses the standalone images (png, jpg, etc), resizes them (optional), and repackages everything up nice and tidy.


## Install

```
$ npm install --global sketchmin
```


## Usage

```
$ sketchmin --help

  Usage
    $ sketchmin <path|glob> <outputpath>

  Options
    -r, --resize   Provide max-width to resize all images to

  Examples
    $ sketchmin designs/main.sketch designs/
    $ sketchmin designs/*.sketch designs/
    $ sketchmin designs/**/*.sketch designs/ -r 2000
```

## License

MIT © [Jake Larson](https://github.com/larsonjj)
