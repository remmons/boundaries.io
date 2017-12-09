var Kona = require('kona');
var app = new Kona({root: __dirname});
var compress = require('koa-compress');

// add some middleware
app.on('hook:middleware', function* () {
  app.use(compress());
});

app.initialize().on('ready', function() {
  app.listen(process.env.PORT);
});
