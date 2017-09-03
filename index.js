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
const archiver = require('archiver');
const glob = require('glob');
const fsx = require('fs-extra');
const rimraf = require('rimraf');

const { ERRORS } = require('./constants');

const TEMP_DIR = path.join(__dirname, '.tmp');
const TEMP_IMAGES_GLOB = path.join(TEMP_DIR, '**', '*.{jpg,jpeg,png,svg}');

const cli = meow(
  `
Usage
  $ sketchmin <path|glob> <outputpath>
Examples
  $ sketchmin designs/main.sketch designs/
  $ sketchmin designs/*.sketch designs/
`
);

const spinner = ora('Minifying Sketch File(s)');

function run(input) {
  const [globFiles, outputDir] = input;

  if (!globFiles) {
    return console.error(ERRORS.PATHGLOB); // eslint-disable-line
  }

  if (!outputDir) {
    return console.error(ERRORS.OUTPUTPATH); // eslint-disable-line
  }

  // Cleanup temp directory and begin extraction
  rimraf(TEMP_DIR, () => extract(globFiles, outputDir));
}

function extract(globFiles, outputDir) {
  // Show loading spinner
  spinner.start();

  // Get all input files
  const inputFiles = glob.sync(globFiles).filter(file => {
    return path.extname(file).includes('sketch');
  });

  if (inputFiles && inputFiles.length === 0) {
    return console.error(ERRORS.NO_FILES); // eslint-disable-line
  }

  inputFiles.forEach(file => {
    fs
      .createReadStream(file)
      .pipe(unzip.Parse())
      .on('entry', function(entry) {
        const fileName = entry.path;
        const type = entry.type; // 'Directory' or 'File'
        // const size = entry.size;

        // Create needed directories
        if (type === 'Directory') {
          return; // ignore directories
        }

        // Write all files
        if (fileName) {
          const tempFilePath = path.join(TEMP_DIR, fileName);
          fsx.ensureFileSync(tempFilePath);
          entry.pipe(fs.createWriteStream(tempFilePath));
        } else {
          entry.autodrain();
        }
      })
      .on('finish', () => {
        compressImages(file, outputDir);
      })
      .on('error', e => {
        end();
        console.error(`${ERRORS.CORRUPT_FILE}: ${file}`); // eslint-disable-line
        // eslint-disable-next-line
        console.error(
          `It is most likely not a zip compatible file or it is corrupted.`
        );

        throw e;
      });
  });
}

function compressImages(file, outputDir) {
  // get all images
  const imageFiles = glob.sync(TEMP_IMAGES_GLOB);
  // Store imagemin promises
  const imageminPromises = [];

  imageFiles.forEach(imagePath => {
    imageminPromises.push(compressImage(imagePath, path.dirname(imagePath)));
  });

  Promise.all(imageminPromises)
    .then(() => {
      compressFolder(file, outputDir);
    })
    .catch(e => {
      end();
      console.error(ERRORS.CORRUPT_IMAGE); // eslint-disable-line
      throw e;
    });
}

function compressImage(input, out) {
  return imagemin([input], out, {
    plugins: [
      imageminPngquant({ quality: '65-80' }),
      imageminJpegtran(),
      imageminSvgo()
    ]
  });
}

function end() {
  spinner.stop();
}

function compressFolder(file, outputDir) {
  const filePath = path.join(outputDir, path.basename(file));
  fsx.ensureFileSync(filePath);

  const output = fs.createWriteStream(
    path.join(outputDir, path.basename(file))
  );

  const archive = archiver('zip');

  output.on('close', function() {
    end();
    const oldMb = fs.statSync(file).size / 1000000;
    const newMb = archive.pointer() ? archive.pointer() / 1000000 : 'Unknown';
    const difference = newMb !== 'Unknown' ? 100 - newMb / oldMb * 100 : '???';
    console.log('\nOld size: ' + oldMb + ' MB'); // eslint-disable-line
    console.log('New size: ' + newMb + ' MB'); // eslint-disable-line
    return console.log('\nSpace saved: ' + difference.toFixed(2) + ' %\n'); // eslint-disable-line
  });

  archive.on('error', function(err) {
    console.error(err); // eslint-disable-line
    end();
  });

  archive.pipe(output);

  // // append files from a glob pattern
  archive.directory(TEMP_DIR, false);

  archive.finalize();
}

if (!cli.input.length && process.stdin.isTTY) {
  console.error(ERRORS.PATHGLOB); // eslint-disable-line
  process.exit(1);
}

if (cli.input.length) {
  run(cli.input, cli.flags);
} else {
  getStdin.buffer().then(buf => run(buf, cli.flags));
}
