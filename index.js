#!/usr/bin/env node
const fs = require('fs');
const meow = require('meow');
const getStdin = require('get-stdin');
const ora = require('ora');
const imagemin = require('imagemin');
const imageminJpegtran = require('imagemin-jpegtran');
const imageminPngquant = require('imagemin-pngquant');
const imageminSvgo = require('imagemin-svgo');
const unzip = require('unzip');
const path = require('path');
var archiver = require('archiver');

const TEMP_DIR = `${__dirname}/.tmp/`;
const OUTPUT_DIR = `${TEMP_DIR}/test/`;
const FILE_STAGING_DIR = `${TEMP_DIR}/staging/`;

const cli = meow(
  `
Usage
  $ sketchmin <path|glob>
Examples
  $ sketchmin designs/main.sketch
  $ sketchmin designs/*.sketch
`
);

const spinner = ora('Minifying Sketch File(s)');
let sketchFilename = 'test.sketch';
const dirsToCompress = [];

function run(input) {
  spinner.start();

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
  }

  if (!fs.existsSync(FILE_STAGING_DIR)) {
    fs.mkdirSync(FILE_STAGING_DIR);
  }

  sketchFilename = input[0];

  fs
    .createReadStream(input[0])
    .pipe(unzip.Parse())
    .on('entry', function(entry) {
      const fileName = entry.path;
      const type = entry.type; // 'Directory' or 'File'
      // const size = entry.size;
      const directory = path.dirname(fileName);

      // Create needed directories
      if (type === 'Directory' || directory) {
	createDirectory(directory);
      }

      // Write all files
      if (fileName) {
	entry.pipe(fs.createWriteStream(`${FILE_STAGING_DIR}/${fileName}`));
      } else {
	entry.autodrain();
      }
    })
    .on('finish', compressImage)
    .on('error', end);
}

function compressImage() {
  if (dirsToCompress.length > 0) {
    dirsToCompress.forEach((dir, index) => {
      return imagemin([`${dir}/*.{png,jpeg,svg,jpg}`], dir, {
	plugins: [
	  imageminJpegtran(),
	  imageminPngquant({ quality: '65-80' }),
	  imageminSvgo()
	]
      }).then(files => {
	//=> [{data: <Buffer 89 50 4e …>, path: 'build/images/foo.jpg'}, …]
	if (index === dirsToCompress.length - 1) {
	  compressFolder();
	}
      });
    });
  }

  end();
}

function end() {
  setTimeout(() => {
    spinner.stop();
  }, 1000);
}

function compressFolder() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }
  const output = fs.createWriteStream(
    `${OUTPUT_DIR}/${path.basename(sketchFilename)}`
  );
  const archive = archiver('zip');

  output.on('close', function() {
    console.log(archive.pointer() + ' total bytes');
    console.log(
      'archiver has been finalized and the output file descriptor has closed.'
    );
  });

  archive.on('error', function(err) {
    throw err;
  });
  archive.pipe(output);
  // // append files from a glob pattern
  archive.directory(FILE_STAGING_DIR, false);
  archive.finalize();

  end();
}

function createDirectory(directory) {
  const path = `${FILE_STAGING_DIR}${directory}`;
  dirsToCompress.push(path);
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
}

if (!cli.input.length && process.stdin.isTTY) {
  console.error('Please specify at least one filename.'); // eslint-disable-line
  process.exit(1);
}

if (cli.input.length) {
  run(cli.input, cli.flags);
} else {
  getStdin.buffer().then(buf => run(buf, cli.flags));
}
