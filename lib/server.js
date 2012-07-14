var express = exports.express = require('express')
  , cons = require('consolidate')
  , browserify = require('browserify')

var server = exports.app = express()

server.configure(function() {
  server.set('view engine', 'html')
  server.engine('html', require('consolidate').eco)
})

exports.init = function(path, opts) {
  server.use(
    browserify(path.indexOf('.js') > -1 ? path : path + '.js', opts)
  )
  require(path)

  var State = require('./state')
  server.get('/_render/:viewName', function(req, res) {
    var context = new State
    context.path = { requested: null, pattern: 0 }
    server.render(req.params.viewName, context, function(err) {
      if (err) throw err
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(context.serialize())
    })
  })
}
