// const fs = require('fs');
const execa = require('execa');
// const pify = require('pify');
const test = require('ava');

process.chdir(__dirname);

// const fsP = pify(fs);

test('show help screen', async t => {
  t.regex(
    await execa.stdout('./index.js', ['--help']),
    /Reduces sketch file size/
  );
});

test('show version', async t => {
  t.is(
    await execa.stdout('./index.js', ['--version']),
    require('./package.json').version
  );
});

test('output error on corrupt images', async t => {
  await t.throws(execa('./index.js', ['fixtures/test_corrupt.sketch', 'test']));
});

test('successfully compress sketch file', async t => {
  t.regex(
    await execa.stdout('./index.js', [
      'fixtures/test_uncompressed.sketch',
      'test'
    ]),
    /Space saved/
  );
});
