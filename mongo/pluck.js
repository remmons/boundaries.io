#!/usr/bin/env nodejs

var fs = require('fs');
var JSONStream = require('JSONStream');

process.stdin.setEncoding('utf8');

process.stdin
  .pipe(JSONStream.parse('features.*'))
  .pipe(JSONStream.stringify(false))
  .pipe(process.stdout);