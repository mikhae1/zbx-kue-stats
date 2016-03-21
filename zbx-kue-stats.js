#!/usr/bin/env node

var fs = require('fs');
var stats = require('./lib/stats');

var TIMEOUT = 3000;
var CACHE_TTL = 55;

var argv = require('yargs')
  .usage('Usage: $0 [options] <metric>')

.alias('h', 'host')
  .describe('h', 'Hostname')
  .demand('host')

.alias('p', 'port')
  .default('p', 6379)
  .describe('p', 'Port number')

.alias('d', 'db')
  //.default('d', 0)
  .describe('d', 'Database')

.alias('q', 'prefix')
  //.default('q', 'q')
  .describe('q', 'Kue database prefix')

.alias('t', 'timeout')
  .default('t', TIMEOUT)
  .describe('t', 'Connection timeout')

.alias('l', 'cache_ttl')
  .default('l', CACHE_TTL)
  .describe('l', 'Cach invalidation time in seconds')

.help('help')
  .epilog('copyright 2016')
  .argv;

var fname = '/tmp/zbx-kue-stats-' + argv.host + '-' + argv.db + '-' + argv.prefix + '.cache';

var fstats;
try {
  fstats = fs.statSync(fname);
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
  updateCache();
}

if (fstats) {
  if (new Date() - fstats.mtime > argv.cache_ttl * 1000) {
    updateCache();
  } else {
    readFromCache();
  }
}

function updateCache() {
  stats.query(fname, argv, quit);
}

function readFromCache() {
  var data = fs.readFileSync(fname);
  quit(null, JSON.parse(data));
}

function quit(err, res) {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  for (var key in res) {
    console.log(key + ':', res[key]);
  }
  process.exit(0);
}

setTimeout(function() {
  quit(new Error('ETIMEOUT'));
}, argv.t);