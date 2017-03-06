module.exports = function(config) {

  config.mongo = process.env.TEST_DB_URL || 'mongodb://mongo/geo_test';

};