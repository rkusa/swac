var Router = require('koa-router')
  , router = exports.router = new Router()
  , basePath

exports.middleware = function(base, opts) {
  if (!opts) opts = {}
  basePath = (base[base.length - 1] === '/' ? base : base + '/') || '/'

  // if (opts.views) server.set('views', opts.views)

  return router.middleware()
  // return function(req, res, next) {
  //   var d = domain.create()
  //   if (process.domain) {
  //     process.domain.add(d)
  //   }
  //   d.req = req
  //   d.run(function() {
  //     server.handle(req, res, next)
  //   })
  // }
}

var path = require('path')
  , fs = require('fs')
  , browserify = require('browserify-middleware')
browserify.settings.production('cache', '7 days')

function mount(middleware) {
  return function*() {
    var ctx = this

    // this functions wraps the connect middleware
    // to catch `next` and `res.end` calls
    var cont = yield function(done) {
      var res = {
        getHeader: function(field) {
          return ctx.get(field)
        },
        setHeader: function(field, value) {
          ctx.set(field, value)
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
  // var authorize = function(req, res, next) {
  //   next()
  // }
  // if (opts.allow || opts.deny) {
  //   if (!opts.allow) opts.allow = function() { return true }
  //   if (!opts.deny)  opts.deny  = function() { return false }
  //   authorize = function(req, res, next) {
  //     if (!opts.allow(req) || opts.deny(req)) return exports.unauthorized(req, res)
  //     next()
  //   }
  // }

  if (opts.serverOnly !== true) {
    // inject browserify's middleware
    var middleware = browserify(target, {
      external: ['swac', 'node-eventproxy', 'implode']
    })
    router.get(opts.mount, /* authorize, */ mount(middleware))
  }

  require(target)
}

var initialized = false
function initialize() {
  if (initialized) return
  initialized = true

  // bundle swac
  var bundle = [{}, {}, {}]
  bundle[0][__dirname + '/../'] = { expose: 'swac' }
  // bundle[1][__dirname + '/../node_modules/node-eventproxy'] = { expose: 'node-eventproxy' }
  bundle[1][__dirname + '/../node_modules/implode'] = { expose: 'implode' }
  bundle[1][__dirname + '/../lib/handlebars.browser.js'] = { expose: 'handlebars' }
  var middleware = browserify(bundle, {
    ignore: [__dirname + '/request.server.js', __dirname + '/server.js']
  })
  router.get(basePath + 'swac.js', mount(middleware))
}

