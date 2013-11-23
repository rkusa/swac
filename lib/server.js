var express = exports.express = require('express')
  , domain = require('domain')
  , browserify = require('browserify')
  , Template = require('./template')
  , implode = require('implode')
  , fs = require('fs')
  , path = require('path')
  , utils = require('./utils')
  , swac = require('./')
  , routing = require('./routing')
  
var server   = exports.app     = express()
var razorjs  = exports.razorjs = require('razorjs')
var basePath = null

routing.server = exports

server.configure(function() {
  server.set('view engine', 'html')
  server.engine('html', razorjs.express)
})

exports.middleware = function(base) {
  basePath = (base[base.length - 1] === '/' ? base : base + '/') || '/'
  
  return function(req, res, next) {
    var d = domain.create()
    d.req = req
    d.run(next)
  }
}

razorjs.attr = function attr(name, value) {
  return 'attr("' + name + '", ' + razorjs.wrap([], 'return ' + value) + ')'
}

razorjs.section = function section(name, section) {
  var app = process.domain.app
  if (app.currentView === 'layout') return section
  if (name === 'main' && !app.currentViewIsMain) return section
  return 'registerSection("' + name + '", ' + razorjs.wrap([], section) + ')'
}

razorjs.inline = function inline(js) {
  return 'block(' + razorjs.wrap([], 'return ' + js) + ')'
}

razorjs.helper = function(name, args, fn) {
  return 'registerHelper("' + name + '", function helper(' + args.join(', ') + ') {\n'
       + 'var _b = [];\n'
       + 'Object.keys(helper.caller).forEach(function(key) { helper[key] = helper.caller[key]; });\n'
       + 'with(this) {\n'
       + fn + '\n'
       + '}\n'
       + 'return _b.join("");\n'
       + '})'
}

exports.scope = function scope(name, middleware) {
  scope[name] = Array.isArray(middleware) ? middleware : [middleware]
}

exports.unauthorized = function(req, res) {
  res.send(401)
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
  if (!opts.mount) opts.mount = basePath + name + '.js'

  // if an allow or deny function got provided, add a middleware which
  // authorize the requested bundle using these functions
  var authorize = function(req, res, next) {
    next()
  }
  if (opts.allow || opts.deny) {
    if (!opts.allow) opts.allow = function() { return true }
    if (!opts.deny)  opts.deny  = function() { return false }
    authorize = function(req, res, next) {
      if (!opts.allow(req) || opts.deny(req)) return exports.unauthorized(req, res)
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
    var bundle = browserify(target)
    bundle.external('swac')
    bundle.external('node-eventproxy')
    bundle.external('implode')
    // bundle.external('events')
    // bundle.require(__dirname + '/builtins/events', { expose: 'events' })
    // bundle.ignore('util')
    bundle.bundle(function(err, result) {
      if (err) throw err
      src = new Buffer(result)
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
      $contract: [],
      sections: {},
      currentViewIsMain: req.query.isMain !== 'false',
      registerSection: function(name, fn) {
        context[name] = new Template(fn)
      }
    }
    process.domain.app = context
    server.render(req.params.viewName, context, function(err) {
      if (err) throw err
      delete context.$contract
      delete context.sections
      delete context.registerSection
      delete context.currentViewIsMain
      res.json(200, implode(context))
    })
  })
  
  // bundle swac
  var src = null
  server.get(basePath + 'swac.js', function(req, res) {
    res.status(200)
    res.set('Content-Type', 'text/javascript')
    !function wait() {
      if (src !== null)
        res.send(src)
      else process.nextTick(wait)
    }()
  })
  var commons = browserify()
  commons.require('swac')
  commons.require(__dirname + '/builtins/events', { expose: 'events' })
  commons.ignore('util')
  commons.require('node-eventproxy')
  commons.require('implode')
  commons.bundle({ detectGlobals: false, insertGlobals: false }, function(err, result) {
    if (err) throw err
    src = new Buffer(result)
  })
}