var swac = require('../../lib')

swac.get('/security', function(app, done) {
  done.render('empty')
})