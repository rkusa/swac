var State = require('./state')
  , Model = require('./model')
  , page = require('page')
  , implode = require('./implode')
  , utils = require('./utils')
  , qs = require('qs')
  , server
  , initialized = false

if (utils.isServer) {
  // trick browserify to ignore this one
  server = (require)('./server').app
}

// Root Context which stops bottom-up tree traversal
var rootContext = { parent: function(app, cb) {
  cb()
}, depth: -1 }

// method ... HTTP Method
// path   ... route path
// action ... route callback
// rdy    ... route clientside-only javascript
// options
var route = function(conf, method, path, action, rdy, options) {
  // arguments
  var that = this
  if (method === 'init' || typeof path === 'function') {
    options = rdy
    rdy = action
    action = path
    path = ''
  }
  options = typeof rdy === 'object' ? rdy : options || {}
  rdy = typeof rdy === 'function' ? rdy : null

  if (path !== '') {
    // force / at the beginning
    if (path[0] !== '/') path = '/' + path
    // remove / from ending
    if (path.length > 1 && path[path.length - 1] === '/')
      path = path.substr(0, path.length - 1)
  }

  // informations used to determine tree position
  var about = {
    pattern: path,
    parent: this.parentRoute,
    path: '',
    depth: this.depth + 1
  }

  // chain current path with parent paths
  var parent = about
  about.path = path
  while ((parent = parent.parent) && parent.pattern) {
    about.path = parent.pattern + about.path
  }
  about.path = about.path.replace(/^\/\//, '/')
  
  // core route functionality
  var leaf = function(app, cb, req, res) {
    if (!req) req = {}

    // clientside post & query support
    if (utils.isClient) {
      if(req.state) req.body = req.state.body
      req.query = qs.parse(req.querystring)
    }
    if (req.body && Array.isArray(req.body) && req.body.length > 0) {
      var obj = {}
      req.body.forEach(function(input) {
        obj[input.name] = input.value
      })
      req.body = obj
    }

    // client-side tree traversal
    if (utils.isClient) {
      if (app.path.redirected === true) {
        app.path.route = about
        delete app.path.redirected
        return
      }
      
      if (!initialized)
        if (rdy) rdy(window.app, req.params)

      if (initialized && !app.path.traversing) {
        var from = app.path.route
          , to   = about

        // traverse up, until both are on the same depth
        while (from.depth !== to.depth) {
          if (from.depth > to.depth) from = from.parent
          else to = to.parent
        }

        // find first shared ancestor
        while (from.depth > 1 && from !== to) {
          from = from.parent
          to   = to.parent
        }
        app.path.stop = to
        var route = to
        if (about === app.path.stop) app.path.stop = app.path.stop.parent
        do {
          // if (about === route) continue
          var relevant = (route.pattern.match(/\//g) || []).length
            , irrelevant = (route.path.match(/\//g) || []).length - relevant
            , lhs = app.path.requested.split('/').splice(irrelevant + 1, relevant)
            , rhs = req.path.replace(/^\/_(post|put|delete)\//, '/').split('/').splice(irrelevant + 1, relevant)
          for (var i = 0; i < lhs.length; ++i) {
            if (lhs[i] !== rhs[i]) {
              app.path.stop = route.parent
              break
            }
          }
        } while((route = route.parent))
      }
      if (app.path.stop === about)
        return cb()
      app.path.traversing = true
    }
    
    // call parent first
    var done = function() {
      console.log(about.path)
      if (utils.isClient && !initialized) cb()
      else {
        if (method !== 'init')
          action(app, cb, req.params, req.body, req.query)
        else
          action(req, app, cb)
      }
    }
    done.render = function(/* viewName, ... */) {
      // catch last recent render
      var _done = cb
      cb = _done.render.bind(_done, Array.prototype.slice.call(arguments))
      cb.render = _done.render
      cb.redirect = _done.redirect
      done()
    }
    done.redirect = cb.redirect
    that.parent(app, done, req, res)
  }

  // return route context
  var result = {
    get:    route.bind({ parent: leaf, parentRoute: about, depth: about.depth }, conf, 'get'),
    post:   route.bind({ parent: leaf, parentRoute: about, depth: about.depth }, conf, 'post'),
    put:    route.bind({ parent: leaf, parentRoute: about, depth: about.depth }, conf, 'put'),
    delete: route.bind({ parent: leaf, parentRoute: about, depth: about.depth }, conf, 'delete')
  }

  if (method === 'init') return result

  // register route
  var callback = function(req, res) {
    // if server: ethereal state
    // if client: persistent state
    req.pattern = path
    var app = utils.isClient ? window.app : new State
      , done
      
    // `done` object definition:
    if (utils.isClient) {
      done = function() {
        app.path = { route: about, requested: req.path }
        if (initialized && rdy) rdy(window.app, req.params)
      }
      done.redirect = function(url, opts) {
        if (!opts) opts = {}
        app.path = { route: about, requested: url }
        if (!opts.silent) page.show(url)
        else {
          app.path.redirected = true
          var ctx = new page.Context(url, null)
          page.dispatch(ctx)
        }
      }
      done.render = function(/* viewName, ... */) {
        if (app.path.route.pattern === path) return done()
        app.path = { route: about, requested: req.path }
        if (typeof window.arkansas === 'undefined') return done()

        var views = Array.prototype.slice.call(arguments)
        if (views.length === 1 && Array.isArray(views[0]))
          views = views[0]
        
        var count = views.length
          , areas = window.arkansas.areas
          , render = function() {
          if (--count !== 0) return
          Object.keys(areas.byRoute[path]).forEach(function(key) {
            var fragment = app.areas[key]
            // emit delete to get childs to delete them selfs
            // and to unbind all models and collections
            fragment.emit('delete')
            fragment.template = areas.byRoute[path][key]
            fragment.refresh()
          })
          if (initialized && rdy) setTimeout(rdy.bind(null, window.app, req.params))
        }
        views.forEach(function(viewName) {
          if (!(path in areas.byRoute)) {
            $.ajax({
              url: '/_render/' + encodeURIComponent(viewName),
              dataType: 'json',
              success: function(data) {
                areas.byRoute[path] = implode.recover(data)
                Object.keys(areas.byRoute[path]).forEach(function(area) {
                  if (typeof app.area[area] === 'function') return
                  app.area(area, areas.byRoute[path][area].fn)
                })
                render()
              }
            })
          } else {
            render()
          }
        })
      }
    } else {
      // express render and redirect
      done = function() {
        app.path = { route: about, requested: req.path }
        process.nextTick(function() {
          res.render(conf.layout, app)
        })
      }
      done.redirect = function(url) {
        app.path = { route: about, requested: url }
        res.redirect(url)
      }
      done.render = function(viewName) {
        var views = Array.prototype.slice.call(arguments)
        if (views.length === 1 && Array.isArray(views[0]))
          views = views[0]

        app.path = { route: about, requested: req.path }

        var count = views.length
          , render = function(err) {
          if (err) throw err
          if (--count !== 0) return
          done()
        }

        views.forEach(function(viewName) {
          server.render(viewName, app, render)
        })
      }
    }
    leaf.call(this, app, done, req, res)
    initialized = true
  }

  var attach = function() {
    // call express method on the server side
    if (utils.isServer) server[method](about.path, conf.authorize, callback)
    // and page.js on the client side
    // post requests will be routed to /_post/...
    else page(utils.isClient && method != 'get'
      ? '/_' + method + about.path
      : about.path, callback)
  }
  
  if (!options.restrain) {
    attach()
  } else {
    result.attach = attach
  }
  
  return result
}

exports.using = function(opts) {
  if (!opts)           opts = {}
  if (!opts.layout)    opts.layout = 'layout'
  if (!opts.authorize) opts.authorize = function(req, res, next) {
    next()
  }

  return {
    authorize: opts.authorize,
    init:      route.bind(rootContext, opts, 'init'),
    get:       route.bind(rootContext, opts, 'get'),
    post:      route.bind(rootContext, opts, 'post'),
    put:       route.bind(rootContext, opts, 'put'),
    delete:    route.bind(rootContext, opts, 'delete'),
  }
}

var def = exports.using()
Object.keys(def).forEach(function(key) {
  exports[key] = def[key]
})