var express = exports.express = require('express')
  , cons = require('consolidate')
  , browserify = require('browserify')
  , Template = require('./template')
  , implode = require('./implode')
  
var server = exports.app = express()

server.configure(function() {
  server.set('view engine', 'html')
  server.engine('html', require('razorjs').express)
})

exports.init = function(path, opts) {
  server.use(
    browserify(path.indexOf('.js') > -1 ? path : path + '.js', opts)
  )
  require(path)

  var State = require('./state')
  server.get('/_render/:viewName', function(req, res) {
    var context = {
      area: function(name, fn) {
        context[name] = new Template(fn)
      }
    }
    server.render(req.params.viewName, context, function(err) {
      if (err) throw err
      delete context.area
      res.json(200, implode(context))
    })
  })
}
