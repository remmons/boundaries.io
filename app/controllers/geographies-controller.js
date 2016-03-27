var elasticsearch = require('elasticsearch');
var ApplicationController = require('./application-controller');
var geojson2svg = require('geojson2svg');
var reproject = require('reproject-spherical-mercator');
var geojsonExtent = require('geojson-extent');

var GeographiesController = ApplicationController.extend({

  constructor: function() {
    ApplicationController.apply(this, arguments);
    this.respondsTo('html', 'json', 'application/topojson');
    this.beforeFilter('_setType', '_mountCollection');
    this.nameKey = 'properties.NAME';
  },

  _setType: function* () {
    this.set('type', this.type);
  },

  _mountCollection: function* () {
    this.geos = yield this.mongo.collection(this.collection);
    this.es = new elasticsearch.Client;
  },

  index: function* () {
    var geos = [];
    if (this.request.query.search) {
      geos = yield this.geos.find({
        $text: {$search: this.request.query.search}
      }, {
        score: {$meta: "textScore"}
      })
      .sort({score: {$meta: 'textScore'}})
      .limit(this.request.query.limit || 15)
      .toArray();
    }
    this.set('geographies', geos);
    yield this.respondWith(geos);
  },

  show: function* () {
    var geo = yield this.geos.findOne({
      _id: this.mongo._db.bsonLib.ObjectID(this.params.id)
    });

    this.set({
      geography: geo,
      renderer: this.getGeojsonSvgConverter(geo, 300, 300)
    });

    yield this.respondWith(geo);
  },

  svg: function* () {

    var geo;
    var geometry;
    var width = this.params.width || 300;
    var height = this.params.height || 300;

    geo = yield this.findByName(this.params.name);
    renderer = this.getGeojsonSvgConverter(geo, {
      width: width,
      height: height
    });

    this.render = false;
    this.ctx.type = 'image/svg+xml';

    this.body = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        ${renderer.converter.convert(renderer.geometry).join('')}
      </svg>
    `;
  },

  named: function* () {
    var geo = yield this.findByName(this.params.name);

    if (!geo) {
      return this.throw(404);
    }

    this.set({
      geography: geo,
      renderer: this.getGeojsonSvgConverter(geo, 300, 300),
      nameKey: this.nameKey
    });

    yield this.respondTo({
      html: function* () {},
      json: function* () {
        this.body = geo;
      }
    });
  },

  whereami: function* () {
    var thenable = this.at(this.params.lat, this.params.lng);
    yield this.respondWith(thenable);
  },

  nearme: function* () {
    var thenable = this.near(this.params.lat, this.params.lng);
    yield this.respondWith(thenable);
  },

  getGeojsonSvgConverter: function(geo, options) {
    options || (options = {});
    var width = options.width || 300;
    var height = options.height || 300;
    var geometry = reproject(geo.geometry);
    var extentTuple = geojsonExtent(geometry);
    var extent;
    var converter;

    extent = {
      left: extentTuple[0],
      bottom: extentTuple[1],
      right: extentTuple[2],
      top: extentTuple[3]
    };

    converter = geojson2svg({
      viewportSize: {
        width: width,
        height: height
      },
      output: 'svg',
      mapExtent: extent,
      attributes: {
        stroke: this.params.stroke || 'none',
        fill: this.params.fill || 'black'
      },
      explode: true
    });

    return {
      converter: converter,
      geometry: geometry,
      extent: extent
    };
  },

  findByName: function* (name) {
    var criteria = {};
    criteria[this.nameKey] = new RegExp(this.params.name, 'i');
    return yield this.geos.findOne(criteria);
  },

  at: function* (lat, lng, options) {
    options || (options = {});

    var lat = parseFloat(lat, 10);
    var lng = parseFloat(lng, 10);
    var where;

    if (isNaN(lat) || isNaN(lng)) return this.throw(304, 'Bad Request');
    if (!lat || !lng) return this.throw(304, 'Bad Request');

    where = {
      index: this.collection,
      type: 'geo',
      size: 1,
      body: {
        query: {
          bool: {
            must: {
              match_all: {}
            },
            filter: {
              geo_shape: {
                geometry: {
                  shape: {
                    type: 'Point',
                    coordinates: [lng, lat]
                  }
                }
              }
            }
          }
        }
      }
    };

    var results = yield this.es.search(where);

    return results.hits.hits.map((res) => res._source);
  },

  near: function* (lat, lng, options) {
    options || (options = {});

    var lat = parseFloat(lat, 10);
    var lng = parseFloat(lng, 10);
    var where;

    if (isNaN(lat) || isNaN(lng)) return this.throw(304, 'Bad Request');

    options = kona._.merge({limit: 5}, options);
    where = {
      geometry: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          }
        }
      }
    };

    return yield this.geos.find(where, options).toArray();
  },

});

module.exports = GeographiesController;