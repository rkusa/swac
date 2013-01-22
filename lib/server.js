var express = exports.express = require('express')
  , domain = require('domain')
  , browserify = require('browserify')
  , Template = require('./template')
  , implode = require('./implode')
  , fs = require('fs')
  , path = require('path')
  , utils = require('./utils')
  , routing, arkansas
  
var server  = exports.app     = express()
var razorjs = exports.razorjs = require('razorjs')

server.configure(function() {
  server.set('view engine', 'html')
  server.engine('html', razorjs.express)
})

exports.middleware = function(req, res, next) {
  var d = domain.create()
  d.req = req
  d.run(next)
}

exports.ready = function(fn) {
  if (utils.isReady) fn()
  else utils.Wait.on('ready', fn)
}

exports.scope = function scope(name, middleware) {
  scope[name] = Array.isArray(middleware) ? middleware : [middleware]
}

exports.area = function(target, opts) {
  init()

  // determine area name and actual file/directory
  var name = path.basename(target, '.js')
  if (!fs.existsSync(target) && target.indexOf('.js') === -1) target += '.js'
  if (fs.statSync(target).isDirectory()) target += '/index.js'
  if (!fs.existsSync(target)) throw new Error(target + ' does not exist')

  // set browserify's mount to the area's name
  if (!opts) opts = {}
  if (!opts.mount) opts.mount = '/' + name + '.js'
  
  // if an allow or deny function got provided, add a middleware which
  // authorize the requested bundle using these functions
  var authorize
  if (opts.allow || opts.deny) {
    if (!opts.allow) opts.allow = function() { return true }
    if (!opts.deny)  opts.deny  = function() { return false }
    authorize = function(req, res, next) {
      if (!opts.allow(req) || opts.deny(req)) return res.send(401)
      next()
    }
    server.use(opts.mount, authorize)
  }

  // inject browserify's middleware
  server.use(browserify(target, opts))

  // delayed loading of arkansas' main and routing functionality
  if (!routing)  routing  = require('./routing')
  if (!arkansas) arkansas = require('./')

  // next tick to delay route definitions
  // otherwise, the server.use above would habe
  // a lower priority than the routes
  process.nextTick(function() {
    // inject the allow and deny functions into the in this area
    // defined routes
    var context = routing.using({
      authorize: authorize,
      layout: opts.layout
    })
    Object.keys(context).forEach(function(key) {
      arkansas[key] = context[key]
    })
    require(target)
    Object.keys(context).forEach(function(key) {
      arkansas[key] = routing[key]
    })
  })
}

function init() {
  if (init.hasBeenExecuted) return
  var State = require('./state')
  process.nextTick(function() {
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
  })
  init.hasBeenExecuted = true
}