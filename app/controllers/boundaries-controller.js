const ApplicationController = require('./application-controller');
const geojson2svg = require('geojson2svg');
const reproject = require('reproject-spherical-mercator');
const geojsonExtent = require('geojson-extent');
const objectId = require('mongodb').ObjectID

const GeographiesController = ApplicationController.extend({

  constructor: function() {
    ApplicationController.apply(this, arguments);
    this.respondsTo('html', 'json', 'application/topojson');
    this.beforeFilter('_mountCollection');
    this.type = 'Boundary';
    this.set('type', this.type);
    this.nameKey = 'properties.NAME';
  },

  _mountCollection: function* () {
    this.geos = yield this.mongo.collection('boundaries');
  },

  index: function* () {
    let geos = [];
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
    let geo = yield this.geos.findOne({
      _id: objectId(this.params.id)
    });

    this.set({
      geography: geo,
      renderer: this.getGeojsonSvgConverter(geo, 300, 300)
    });

    yield this.respondWith(geo);
  },

  svg: function* () {

    let geo;
    let geometry;
    let width = this.params.width || 300;
    let height = this.params.height || 300;

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
    let geo = yield this.findByName(this.params.name);

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
    let thenable = this.at(this.params.lat, this.params.lng);
    yield this.respondWith(thenable);
  },

  nearme: function* () {
    let thenable = this.near(this.params.lat, this.params.lng);
    yield this.respondWith(thenable);
  },

  getGeojsonSvgConverter: function(geo, options) {
    options || (options = {});
    let width = options.width || 300;
    let height = options.height || 300;
    let geometry = reproject(geo.geometry);
    let extentTuple = geojsonExtent(geometry);
    let extent;
    let converter;

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
    let criteria = {};
    criteria[this.nameKey] = new RegExp(this.params.name, 'i');
    return yield this.geos.findOne(criteria);
  },

  at: function* (lat, lng, options) {
    options || (options = {});

    let where;

    lat = parseFloat(lat, 10);
    lng = parseFloat(lng, 10);

    if (isNaN(lat) || isNaN(lng)) return this.throw(304, 'Bad Request');
    if (!lat || !lng) return this.throw(304, 'Bad Request');

    where = {
      geometry: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          }
        }
      }
    };

    return yield this.geos
      .find(where)
      .sort({'properties.admin_level': 1})
      .limit(10)
      .toArray();
  },

  near: function* (lat, lng, options) {
    options || (options = {});

    let where;

    lat = parseFloat(lat, 10);
    lng = parseFloat(lng, 10);

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