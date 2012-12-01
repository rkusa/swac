var arkansas = require('../../lib')

arkansas.get('/security', function(app, done) {
  done.render('empty')
})