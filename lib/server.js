var express = require('express')
  , domain = require('domain')
  , browserify = require('browserify-middleware')
  , Template = require('./template')
  , implode = require('implode')
  , fs = require('fs')
  , path = require('path')
  , utils = require('./utils')
  , swac = require('./')
  , routing = require('./routing')

var server   = exports.server  = express()
var razorjs  = exports.razorjs = require('razorjs')
var basePath = null

server.disable('x-powered-by')
server.set('view engine', 'html')
server.engine('html', razorjs.express)
server.use(require('body-parser')())
server.use(require('method-override')())

browserify.settings.production('cache', '7 days')

exports.middleware = function(base, opts) {
  if (!opts) opts = {}
  basePath = (base[base.length - 1] === '/' ? base : base + '/') || '/'

  if (opts.views) server.set('views', opts.views)

  return function(req, res, next) {
    var d = domain.create()
    if (process.domain) {
      process.domain.add(d)
    }
    d.req = req
    d.run(function() {
      server.handle(req, res, next)
    })
  }
}

razorjs.attr = function attr(name, value) {
  return 'attr("' + name + '", ' + razorjs.wrap([], 'return _e(' + value + ')') + ')'
}

razorjs.section = function section(name, section) {
  var app = process.domain.app
  if (app.currentView === 'layout') return section
  if (name === 'main' && !app.currentViewIsMain) return section
  var wrapped = razorjs.wrap([], section)
  app.registerSection(name, wrapped)
  // return 'registerSection("' + name + '", ' + wrapped + ')'
}

razorjs.inline = function inline(js) {
  return 'block(' + razorjs.wrap([], 'return _e(' + js + ')') + ')'
}

razorjs.binding = function inline(js) {
  return '_b.push(block(' + razorjs.wrap([], js) + '));'
}

razorjs.helper = function(name, args, fn) {
  return 'registerHelper("' + name + '", ' + wrap(args, fn) + ')'
}

function wrap(args, fn) {
  return 'function helper(' + args.join(', ') + ') {\n'
       + 'var _b = [];\n'
       + 'var _e = function(v) { return v ? v.toString().replace(/&/g, \'&amp;\').replace(/"/g, \'&quot;\').replace(/</g, \'&lt;\').replace(/>/g, \'&gt;\') : v };\n'
       + 'helper.fragment = helper.caller.fragment;\n'
       + 'helper.argNames = [' + args.map(function(a) { return '"' + a + '"'}).join(', ') + '];\n'
       + 'helper.args = [' + args.join(', ') + '];\n'
       + 'with(this) {\n'
       + fn + '\n'
       + '}\n'
       + 'return _b.join("");\n'
       + '}'
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
  server.get(opts.mount, authorize, browserify(target, {
    external: ['swac', 'node-eventproxy', 'implode']
  }))

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
  var bundle = [{}, {}, {}]
  bundle[0][__dirname + '/../'] = { expose: 'swac' }
  bundle[1][__dirname + '/../node_modules/node-eventproxy'] = { expose: 'node-eventproxy' }
  bundle[2][__dirname + '/../node_modules/implode'] = { expose: 'implode' }
  server.get(basePath + 'swac.js', browserify(bundle, {
    ignore: [__dirname + '/helper/request.server.js', __dirname + '/server.js']
  }))
}