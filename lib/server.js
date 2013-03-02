var express = exports.express = require('express')
  , domain = require('domain')
  , browserify = require('browserify')
  , Template = require('./template')
  , implode = require('./implode')
  , fs = require('fs')
  , path = require('path')
  , utils = require('./utils')
  , swac = require('./')
  , routing = require('./routing')
  
var server   = exports.app     = express()
var razorjs  = exports.razorjs = require('razorjs')
var basePath = null

swac.Model.server = routing.server = exports

server.configure(function() {
  server.set('view engine', 'html')
  server.engine('html', razorjs.express)
})

exports.middleware = function(base) {
  basePath = base
  
  return function(req, res, next) {
    var d = domain.create()
    d.req = req
    d.run(next)
  }
}

exports.ready = utils.ready

exports.scope = function scope(name, middleware) {
  scope[name] = Array.isArray(middleware) ? middleware : [middleware]
}

exports.area = function(target, opts) {
  if (basePath === null) {
    throw new Error('SWAC middleware not injected')
  }
  
  initialize()

  // determine area name and actual file/directory
  var name = path.basename(target, '.js')
  if (!fs.existsSync(target) && target.indexOf('.js') === -1) target += '.js'
  if (fs.statSync(target).isDirectory()) target += '/index.js'
  if (!fs.existsSync(target)) throw new Error(target + ' does not exist')

  // set browserify's mount to the area's name
  if (!opts) opts = {}
  if (!opts.mount) opts.mount = path.join(basePath, name + '.js')

  // if an allow or deny function got provided, add a middleware which
  // authorize the requested bundle using these functions
  var authorize = function(req, res, next) {
    next()
  }
  if (opts.allow || opts.deny) {
    if (!opts.allow) opts.allow = function() { return true }
    if (!opts.deny)  opts.deny  = function() { return false }
    authorize = function(req, res, next) {
      if (!opts.allow(req) || opts.deny(req)) return res.send(401)
      next()
    }
  }
  
  // inject browserify's middleware
  !function() {
    var src = null
    server.get(opts.mount, authorize, function(req, res) {
      res.status(200)
      res.set('Content-Type', 'text/javascript')
      !function wait() {
        if (src !== null)
          res.send(src)
        else process.nextTick(wait)
      }()
    })
    utils.ready(function() {
      var bundle = browserify(target)
      bundle.external('swac')
      bundle.bundle(function(err, result) {
        if (err) throw err
        src = new Buffer(result)
      })
    })
  }()

  // inject the allow and deny functions into the in this area
  // defined routes
  var context = routing.using({
    authorize: authorize,
    layout: opts.layout
  })
  Object.keys(context).forEach(function(key) {
    swac[key] = context[key]
  })
  require(target)
  Object.keys(context).forEach(function(key) {
    swac[key] = routing[key]
  })
}

var initialized = false
function initialize() {
  if (initialized) return
  initialized = true
  
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
  
  // bundle swac
  var src = null
  server.get(path.join(basePath, 'swac.js'), function(req, res) {
    res.status(200)
    res.set('Content-Type', 'text/javascript')
    !function wait() {
      if (src !== null)
        res.send(src)
      else process.nextTick(wait)
    }()
  })
  utils.ready(function() {
    var commons = browserify()
    commons.require('swac')
    commons.bundle(function(err, result) {
      if (err) throw err
      src = new Buffer(result)
    })
  })
}