var Geo = Backbone.Model.extend({
  idAttribute: '_id',
  toLatLng: function() {
    var coords = this.get('geometry').coordinates[0];
    if (coords[0] && coords[0].length) coords = coords[0];
    if (coords[0] && coords[0].length) coords = coords[0];
    return [coords[1], coords[0]];
  },
  label: function() {
    return this.get('properties').GEOID
  }
});


var Country = Geo.extend({
  label: function() {
    return this.get('properties').name;
  }
}, {
  queryKey: 'properties.NAME'
});

var PostalCode = Geo.extend({
  toLatLng: function() {
    var props = this.get('properties');
    return [props['INTPTLAT10'], props['INTPTLON10']];
  },
  label: function() {
    return this.get('properties')['ZCTA5CE10'];
  }
}, {
  queryKey: 'properties.ZCTA5CE10'
});

var Place = Geo.extend({
  toLatLng: function() {
    var props = this.get('properties');
    return [props['INTPTLAT'], props['INTPTLON']];
  },
  label: function() {
    return this.get('properties')['NAME'];
  }
}, {
  queryKey: 'properties.NAME'
});

var Neighborhood = Geo.extend({
  label: function() {
    return this.get('properties').name;
  }
}, {
  queryKey: 'properties.NAME'
});

var County = Geo.extend({
  label: function() {
    return this.get('properties').NAMELSAD;
  }
}, {
  queryKey: 'properties.NAMELSAD'
});

var State = Geo.extend({
  label: function() {
    return this.get('properties').name;
  }
}, {
  queryKey: 'properties.name'
});

var Geos = Backbone.Collection.extend({
  model: Geo,
  url: '/geographies'
});

var CountryCollection = Geos.extend({
  model: Country,
  url: '/geographies/countries'
});

var PostalCodeCollection = Geos.extend({
  model: PostalCode,
  url: '/geographies/postal-codes'
});

var PlaceCollection = Geos.extend({
  model: Place,
  url: '/geographies/places'
});

var NeighborhoodCollection = Geos.extend({
  model: Neighborhood,
  url: '/geographies/neighborhoods'
});

var CountyCollection = Geos.extend({
  model: County,
  url: '/geographies/counties'
});

var StateCollection = Geos.extend({
  model: State,
  url: '/geographies/states'
});

var Map = Backbone.View.extend({

  el: '#map',

  initialize: function(options) {
    this.options = (options || {});
    _.bindAll(this, 'render');
    this.createMap();
    this.registerListeners();
  },

  registerListeners: function() {
    this.map.on('click', function(e) {
      this.trigger('onMapClick', e);
    }, this);
  },

  createMap: function() {
    if (!this.map) {
      this.map = L.map('map', _.extend({
        zoom: 5
      }, this.options));
      this.addTiles();
    }
  },

  removeMap: function() {
    this.map.remove();
  },

  tiles: {
    'CartoDB_PositronNoLabels': ['http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
      subdomains: 'abcd',
      minZoom: 0,
      maxZoom: 18
    }],
    'CartoDB_Positron': ['http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
      subdomains: 'abcd',
      minZoom: 0,
      maxZoom: 18
    }],
    'CartoDB_DarkMatterNoLabels': ['http://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
      subdomains: 'abcd',
      minZoom: 0,
      maxZoom: 18
    }]
  },

  addTiles: function() {
    L.tileLayer.apply(L, this.tiles[this.options.tiles || 'CartoDB_Positron']).addTo(this.map);
  }

});

var GeoMap = Map.extend({

  el: '#map',

  events: {},

  initialize: function(options) {
    Map.prototype.initialize.apply(this, arguments);
    this.geos = this.options.geos;
    this.featureGroup = new L.featureGroup();
    this.listen();
    this.render();
    this.featureGroup.addTo(this.map);
  },

  listen: function() {
    this.listenTo(this.geos, 'add', this.addModelFeature);
    this.listenTo(this.geos, 'reset', function() {
      this.render();
    }, this);
    this.listenTo(this.geos, 'remove', function(model) {
      this.featureGroup.removeLayer();
    });
  },


  featureLayerForModel: function(model) {
    var centerLatLng, label;
    var uuid = 'g-' + new Date().getTime();
    var styles = {
      weight: 0.8,
      color: '#FF6300',
      // color: '#ea8545',
      fillColor: '#FF6300',
      // fillColor: '#ea8545',
      fillOpacity: 0.2
    };
    var geojsonFeature;

    geojsonFeature = L.geoJson()
      .addData(model.toJSON())
      .on('mouseover', function() {
        geojsonFeature.setStyle(function() {
          return {
            weight: 1,
            color: '#CC4F00',
            // color: '#ea8545',
            fillColor: '#CC4F00',
            // fillColor: '#ea8545',
            fillOpacity: 0.3
          };
        });
      })
      .on('mouseout', function() {
        geojsonFeature.setStyle(styles);
      });

    geojsonFeature.setStyle(styles);

    if (this.options.labels) {

      centerLatLng = L.latLng.apply(L, model.toLatLng());

      label = new L.divIcon({
        className: 'geo-label',
        html: '<strong id="' + uuid + '">' + model.label() + '</strong>'
      });

      L.marker(geojsonFeature.getBounds().getCenter(), {icon: label})
        .addTo(geojsonFeature);

      var onmouseout = function() {
        setTimeout(function() {
          $('#' + uuid).fadeOut(400);
        }, 1500);
      };

      geojsonFeature
        .on('mouseover', function() {
          $('#' + uuid).fadeIn(400);
        })
        .on('mouseout', onmouseout);

      onmouseout();

    }

    return geojsonFeature;
  },

  addModelFeature: function(model) {

    var featureLayer = this.featureLayerForModel(model);

    model.featureLayer = featureLayer;

    featureLayer.on('click', function(e) {
      model.collection.remove(model);
      this.featureGroup.removeLayer(featureLayer);
      e.originalEvent.stopImmediatePropagation();
    }, this);

    this.featureGroup.addLayer(featureLayer);

    // this.map.fitBounds(this.featureGroup.getBounds(), {padding: L.point(100, 100)});

    try {
      localStorage.setItem('bounds',
        this.featureGroup.getBounds().toBBoxString()
      );
    } catch(e) {console.error(e)}

  },

  render: function(options) {

    this.featureGroup.clearLayers();

    Map.prototype.render.apply(this, arguments);

    if (this.geos && this.geos.length) {
      this.geos.each(this.addModelFeature, this);
    }
  }
});


var GeoQuery = Backbone.View.extend({

  events: {
    'keyup [name=query]': 'search'
  },

  search: function(e) {
    if (e.keyCode === 13) {
      this.trigger('search', e);
    }
  }

});


var Controls = Backbone.View.extend({
  events: {
    'click [data-control]': 'dispatch'
  },
  dispatch: function(e) {
    var behavior = e.target.getAttribute('data-control');
    this.trigger(behavior, e);
  }
});