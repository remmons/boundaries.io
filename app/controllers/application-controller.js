var Controller = require('kona/lib/controller/request');

var ApplicationController = Controller.extend({

  constructor: function() {
    Controller.apply(this, arguments);

    this.set('links', [
      {
        title: 'Map',
        controller: 'boundaries'
      }
    ]);
  }

});

module.exports = ApplicationController;