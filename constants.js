const ERRORS = {
  PATHGLOB: 'Please specify an input file or files.',
  OUTPUTPATH: 'Please specify an output directory.',
  OUTPUTPATH_EXTENSION:
    'WARNING: Output directory looks like it has en extension, which means it might not be a folder',
  CORRUPT_FILE: 'There was a problem unzipping a file',
  CORRUPT_IMAGE: 'There was a problem compressing an image',
  NO_FILES: 'No sketch files were found.'
};

module.exports = {
  ERRORS
};
