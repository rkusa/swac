var express = exports.express = require('express')
  , browserify = require('browserify')
  , Template = require('./template')
  , implode = require('./implode')
  , routing, arkansas
  
var server = exports.app = express()

server.configure(function() {
  server.set('view engine', 'html')
  server.engine('html', require('razorjs').express)
})

exports.area = function(name, path, opts, allow) {
  init()

  if (typeof opts === 'function') {
    allow = opts
    opts = undefined
  }
  if (!opts) opts = {}
  opts.mount = '/' + name + '.js'
  
  if (allow) {
    server.use(function(req, res, next) {
      if (req.url.split('?')[0] !== name) return next()
      if (!allow(req)) return res.send(401)
      next()
    })
  }
  server.use(
    browserify(path.indexOf('.js') > -1 ? path : path + '.js', opts)
  )

  if (!routing)  routing  = require('./routing')
  if (!arkansas) arkansas = require('./')
  var pre
  if (allow) pre = function(req, res, next) {
    if (!allow(req)) return res.send(401)
    next()
  }
  var context = routing.using(pre, opts)
  Object.keys(context).forEach(function(key) {
    arkansas[key] = context[key]
  })
  require(path)
  Object.keys(context).forEach(function(key) {
    arkansas[key] = routing[key]
  })
}

function init() {
  if (init.hasBeenExecuted) return
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
  init.hasBeenExecuted = true
}