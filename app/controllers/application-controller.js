var Controller = require('kona/lib/controller/request');

var ApplicationController = Controller.extend({

  constructor: function() {
    Controller.apply(this, arguments);

    this.set('links', [{
      title: 'Countries',
      controller: 'geographies/countries'
    }, {
      title: 'States',
      controller: 'geographies/states'
    }, {
      title: 'Counties',
      controller: 'geographies/counties'
    }, {
      title: 'Places',
      controller: 'geographies/places'
    }, {
      title: 'Postal Codes',
      controller: 'geographies/postal-codes'
    }, {
      title: 'Neighborhoods',
      controller: 'geographies/neighborhoods'
    }]);
  }

});

module.exports = ApplicationController;