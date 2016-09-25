var GeographiesController = require('../geographies-controller');

var CountriesController = GeographiesController.extend({

  constructor: function() {
    GeographiesController.apply(this, arguments);
    this.nameKey = 'properties.NAME'
    this.type = 'Country';
    this.collection = 'countries';
  }

});

module.exports = CountriesController;