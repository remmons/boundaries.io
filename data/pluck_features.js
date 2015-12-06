#!/usr/bin/env node

var fs = require('fs');
var es = require('event-stream');
var JSONStream = require('JSONStream');

process.stdin.setEncoding('utf8');

process.stdin
  .pipe(JSONStream.parse('features.*'))
  .pipe(JSONStream.stringify())
  .pipe(process.stdout);
