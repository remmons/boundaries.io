module.exports = function(router) {

  router.get('/').to('main.about');
  router.get('/map').to('boundaries.index');
  router.get('/boundaries/whereami').to('boundaries.whereami');
  router.get('/boundaries/nearme').to('boundaries.nearme');
  router.get('/boundaries/named/:name').to('boundaries.named');
  router.get('/boundaries/named/:name.svg').to('boundaries.svg');
  router.resource('boundaries');

}