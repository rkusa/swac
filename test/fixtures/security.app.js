var swac = require('../../')

swac.get('/security', function(app, done) {
  done.render('empty')
})