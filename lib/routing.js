var State   = require('./state')
  , page    = require('page')
  , implode = require('./implode')
  , utils   = require('./utils')
  , qs      = require('qs')
  , path    = require('path')
  , server, initialized = false

// Root Context which stops bottom-up tree traversal
var rootContext = { parent: function(app, cb) {
  cb()
}, depth: -1 }

// method ... HTTP Method
// path   ... route path
// action ... route callback
// rdy    ... route clientside-only javascript
// options
var route = function(conf, method, pattern, action, rdy, options) {
  // arguments
  var that = this
  if (method === 'init' || typeof pattern === 'function') {
    options = rdy
    rdy = action
    action = pattern
    pattern = ''
  }
  options = typeof rdy === 'object' ? rdy : options || {}
  rdy = typeof rdy === 'function' ? rdy : null

  if (pattern !== '') {
    // force / at the beginning
    if (pattern[0] !== '/') pattern = '/' + pattern
    // remove / from ending
    if (pattern.length > 1 && pattern[pattern.length - 1] === '/')
      pattern = pattern.substr(0, pattern.length - 1)
  }

  // informations used to determine tree position
  var about = {
    pattern: pattern,
    parent: this.parentRoute,
    path: '',
    depth: this.depth + 1
  }

  // chain current path with parent paths
  var parent = about
  about.path = pattern
  while ((parent = parent.parent) && parent.pattern) {
    about.path = parent.pattern + about.path
  }
  about.path = about.path.replace(/^\/\//, '/')
  
  // core route functionality
  var leaf = function(app, cb, req, res) {
    if (!req) req = {}

    // clientside post & query support
    if (utils.isClient) {
      if(req.state) {
        req.body = req.state.body
        if (req.state.trigger === false)
          return cb()
      }
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
            , lhs = app.path.requested.replace(/^\/_(post|put|delete)\//, '/').split('/').splice(irrelevant + 1, relevant)
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
      utils.debug(method.toUpperCase() + ' ' + about.path)
      if (utils.isClient && !initialized) cb()
      else {
        if (method !== 'init')
          action(app, cb, req.params, req.body, req.query)
        else
          action(req, app, cb)
      }
    }
    done.render = function(/* viewName, ... */) {
      // catch most recent render
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
    req.pattern = pattern
    var app = utils.isClient ? window.app : new State
      , done
    
    if (utils.isServer) {
       process.domain.app = app
    }
    // `done` object definition:
    if (utils.isClient) {
      done = function() {
        app.path = { route: about, requested: req.path }
        if (initialized && rdy) rdy(window.app, req.params)
      }
      done.redirect = function(url, opts) {
        if (!opts) opts = {}
        if (url[0] !== '/') {
          url = path.normalize(req.path.replace(new RegExp('^/_' + method), '') + '/' + url)
          // remove / from ending
          if (url.length > 1 && url[url.length - 1] === '/')
            url = url.substr(0, url.length - 1)
        }
        done()
        if (!opts.silent) {
          var ctx = new page.Context(url, opts)
          page.dispatch(ctx)
          if (!ctx.unhandled)
            ctx.pushState()
        } else {
          app.path.redirected = true
          var ctx = new page.Context(url, opts)
          page.dispatch(ctx)
        }
      }
      done.render = function(/* viewName, ... */) {
        if (app.path.route.path === about.path) return done()
        app.path = { route: about, requested: req.path }
        if (typeof window.swac === 'undefined') return done()

        var viewNames = Array.prototype.slice.call(arguments)
        if (viewNames.length === 1 && Array.isArray(viewNames[0]))
          viewNames = viewNames[0]

        var views = window.app.views
        utils.series(viewNames, function(viewName, next, remaining) {
          if (viewName in views) return next()
          else views[viewName] = []
          $.ajax({
            url: '/_render/' + encodeURIComponent(viewName) + '?isMain=' + (remaining === 0).toString(),
            dataType: 'json',
            success: function(data) {
              var recovered = implode.recover(data)
              Object.keys(recovered).forEach(function(key) {
                views[viewName].push({ section: key, template: recovered[key] })
              })
              next()
            }
          })
        }, function() {
          viewNames.forEach(function(viewName, i) {
            var isMain = viewNames.length - 1 === i
            views[viewName].forEach(function(part) {
              if (part.section === 'main' && !isMain) return
              var fragment = app.sections[part.section]
              if (fragment) {
                // Todo: could never be true ...
                // if (fragment.template !== part.template) {
                  // emit delete to get childs to delete them selfs
                  // and to unbind all models and collections
                  fragment.emit('delete')
                  fragment.template = part.template
                // }
                fragment.refresh()
              } else {
                app.registerSection(part.section, part.template.fn)
              }
            })
          })
          if (initialized && rdy)
            setTimeout(rdy.bind(null, window.app, req.params))
        })
      }
    } else {
      // express render and redirect
      done = function() {
        app.path = { route: about, requested: req.path }
        process.nextTick(function() {
          app.currentView = 'layout'
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
        
        utils.series(views, function(viewName, next, remaining) {
          app.currentView = viewName
          app.currentViewIsMain = remaining === 0
          exports.server.app.render(viewName, app, function() {
            app.currentView = app.currentViewIsMain = null
            next()
          })
        }, done)
      }
    }
    leaf.call(this, app, done, req, res)
    initialized = true
  }

  var attach = function() {
    // call express method on the server side
    if (utils.isServer) exports.server.app[method](about.path, conf.authorize, callback)
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