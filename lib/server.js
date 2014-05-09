var Router = require('hierarchical-router')
var swac   = require('./swac')

var METHODS = ['get', 'post', 'put', 'delete']

var State = require('./state')
var domain = require('domain')

var options

exports.initialize = function(opts) {
  if (options) {
    throw new Error('swac.initialize() middleware already added')
  }
  options = opts || {}
  options.basePath = normalizeBasePath(options.basePath)
  options.viewPath = options.viewPath && normalizeBasePath(options.viewPath, true) || undefined
  return function*(next) {
    var d = domain.create()
    if (process.domain) {
      process.domain.add(d)
    }
    d.swac = { state: new State }
    d.enter()
    yield next
    d.exit()
  }
}

var Area = exports.Area = function(entry, opts) {
  if (!opts) opts = {}
  this.router = Router.create({
    viewPath: opts.viewPath && normalizeBasePath(opts.viewPath, true) || options.viewPath
  })

  if (!opts) opts = {}
  var basePath = opts.basePath && normalizeBasePath(opts.basePath) || options.basePath

  // determine area name and actual file/directory
  var name = path.basename(entry, '.js')
  if (!fs.existsSync(entry) && entry.indexOf('.js') === -1) entry += '.js'
  if (fs.statSync(entry).isDirectory()) entry += '/index.js'
  if (!fs.existsSync(entry)) throw new Error(entry + ' does not exist')

  // set browserify's mount to the area's name
  if (!opts.mount) opts.mount = basePath + name + '.js'

  if (opts.serverOnly !== true) {
    // inject browserify's middleware
    this.router.add('get', basePath + 'swac.js', swacBundle())

    var middleware = browserify(entry, {
      external: ['swac', 'node-eventproxy', 'implode']
    })
    this.router.add('get', opts.mount, mount(middleware))
  }

  METHODS.forEach(function(method) {
    swac[method] = this.router[method].bind(this.router)
  }, this)
  swac.del = swac.delete
  require(entry)
  METHODS.forEach(function(method) {
    delete swac[method]
  })
  delete swac.del
}

Area.prototype.middleware = function() {
  var middleware = this.router.middleware()
  return function*(next) {
    if (!process.domain || !process.domain.swac) {
      throw new Error('swac.initialize() middleware not added yet')
    }
    yield* middleware.call(this, next)
  }
}

var _swacBundle
function swacBundle() {
  if (_swacBundle) return _swacBundle

  // bundle swac
  var bundle = [{}, {}, {}]
  bundle[0][__dirname + '/../'] = { expose: 'swac' }
  // bundle[1][__dirname + '/../node_modules/node-eventproxy'] = { expose: 'node-eventproxy' }
  bundle[1][__dirname + '/../node_modules/implode'] = { expose: 'implode' }
  bundle[1][__dirname + '/../lib/handlebars.browser.js'] = { expose: 'handlebars' }
  var middleware = browserify(bundle, {
    ignore: [__dirname + '/swac.server.js', __dirname + '/server.js']
  })
  return _swacBundle = mount(middleware)
}

var path = require('path')
  , fs = require('fs')
  , browserify = require('browserify-middleware')
browserify.settings.production('cache', '7 days')

function mount(middleware) {
  return function(context) {
    return function*(next) {
      var ctx = context.$ctx

      // this functions wraps the connect middleware
      // to catch `next` and `res.end` calls
      var cont = yield function(done) {
        var res = {
          getHeader: function(field) {
            return ctx.response.get(field)
          },
          setHeader: function(field, value) {
            ctx.set(field, value)
          },
          get statusCode() {
            return ctx.status
          },
          set statusCode(val) {
            ctx.status = val
          },
          end: function(body) {
            if (body) ctx.body = body
            done(null, false)
          }
        }

        // call the connect middleware
        middleware({ headers: this.request.header, path: this.request.path }, res, done)
      }

      // cont equals `false` when `res.redirect` or `res.end` got called
      // in this case, yield next to continue through Koa's middleware stack
      if (cont !== false) {
        yield next
      }
    }
  }
}

var stackTrace = require('stack-trace')
  , path = require('path')
function normalizeBasePath(input, makeAbsolute) {
  var basePath = input && (input[input.length - 1] === '/'
          ? input
          : input + '/') || '/'

  if (makeAbsolute === true && basePath[0] !== '/') {
    var trace = stackTrace.parse(new Error)
    basePath = path.dirname(trace[2].getFileName()) + '/' + basePath
  }

  return basePath
}