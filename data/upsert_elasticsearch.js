#!/usr/bin/env node

'use strict';

const fs = require('fs');
const es = require('event-stream');
const JSONStream = require('JSONStream');
const http = require('http');
const indexName = process.argv[2];
const esHTTP = {
  hostname: process.env.ES_HOST || 'localhost',
  path: '/_bulk',
  port: process.env.ES_PORT || '9200',
  method: 'POST',
  headers: {'Content-Type': 'application/json'}
};
const BATCH_SIZE = 200;
var request;
var count = 0;

process.stdin.setEncoding('utf8');

process.stdin
  .pipe(JSONStream.parse('*'))
  .on('end', function() { if (request && count > 0) request.end(); })
  .pipe(es.map(function(geo, done) {

    var requestMeta = {
      index: {
        _index: indexName,
        _type: 'geo',
        _id: geo.properties.GEOID || geo.properties['GEOID10']
      }
    };
    var chunk = '\n' + [requestMeta, geo].map((obj) => JSON.stringify(obj)).join('\n');

    if (!request) {
      request = http.request(esHTTP, function(res) {
        res.setEncoding('utf8');
        res.on('data', () => {});
        res.on('end', function() {
          console.log('batch upsert completed');
          done(null, res.statusCode);
        });
      });
      request.on('error', (e) => done(e));
    }

    request.write(chunk);
    count++;

    if (count >= BATCH_SIZE) {
      request.end();
      request = null;
      count = 0;
    } else {
      done(null, 0);
    }

    done(null);

  }));
