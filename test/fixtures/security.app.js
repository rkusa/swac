var swac = require('swac')

swac.get('/security', function(app, done) {
  done.render('empty')
})