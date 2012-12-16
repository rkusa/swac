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
}}

// method ... HTTP Method
// path   ... route path
// action ... route callback
// rdy    ... route clientside-only javascript
// options
var route = function(conf, method, path, action, rdy, options) {
  // arguments
  var that = this
  options = typeof rdy === 'object' ? rdy : options || {}
  rdy = typeof rdy === 'function' ? rdy : null
  
  // informations used to determine tree position
  var about = { pattern: path, parent: this.parentRoute }
  
  // post requests will be routed to /_post/...
  if (utils.isBrowser && method != 'get') path = '/_' + method + path
  
  // core route functionality
  var leaf = function(app, cb, req, res) {
    if (!req) req = {}
    // clientside post support
    if (utils.isBrowser) {
      if(req.state) req.body = req.state.body
      req.query = qs.parse(req.querystring)
    }
    if (utils.isBrowser && req.state) req.body = req.state.body
    if (req.body && Array.isArray(req.body) && req.body.length > 0) {
      var obj = {}
      req.body.forEach(function(input) {
        obj[input.name] = input.value
      })
      req.body = obj
    }
    if (req.user) {
      app.user = req.user
    }

    if (utils.isBrowser) {
      if (app.path.redirected === true) {
        app.path.route = about
        delete app.path.redirected
        return
      }
      
      if (!initialized || (app.path.route === about
          && req.path == app.path.requested)) {
        if (rdy) rdy(window.app, req.params)
      }

      if (app.path.stop)
        return cb()

      if (app.path.traversing) {
        var route = app.path.route
        do {
          if (route.pattern === about.pattern) {
            app.path.stop = true
            return cb()
          }
        } while((route = route.parent))
      }
      app.path.traversing = true
    }
    
    // call parent first
    var done = function() {
      if (utils.isBrowser && !initialized) cb()
      else action(app, cb, req.params, req.body, req.query)
      if (utils.isBrowser && rdy) rdy(window.app, req.params)
    }
    done.render = function(viewName) {
      // catch last recent render
      var _done = cb
      cb = _done.render.bind(_done, viewName)
      cb.render = _done.render
      cb.redirect = _done.redirect
      done()
    }
    done.redirect = cb.redirect
    that.parent(app, done, req, res)
  }

  // register route
  var callback = function(req, res) {
    Model.currentRequest = req

    // if server: ethereal state
    // if client: persistent state
    req.pattern = path
    var app = utils.isBrowser ? window.app : req.arkansas
      , done
      
    // `done` object definition:
    if (utils.isBrowser) {
      done = function() {
        app.path = { route: about, requested: req.path }
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
      done.render = function(viewName) {
        if (app.path.route.pattern === path) return done()
        app.path = { route: about, requested: req.path }
        if (typeof window.Arkansas === 'undefined') return done()
        var areas = window.Arkansas.areas
          , render = function(result) {
          Object.keys(areas.byRoute[path]).forEach(function(key) {
            var fragment = app.areas[key]
            // emit delete to get childs to delete them selfs
            // and to unbind all models and collections
            fragment.emit('delete')
            fragment.template = areas.byRoute[path][key]
            fragment.refresh()
          })
        }
        if (!(path in areas.byRoute)) {
          $.ajax({
            url: '/_render/' + encodeURIComponent(viewName),
            dataType: 'json',
            success: function(data) {
              areas.byRoute[path] = implode.recover(data)
              render()
            }
          })
        } else {
          render()
        }
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
        app.path = { route: about, requested: req.path }
        server.render(viewName, app, function(err) {
          if (err) throw err
          done()
        })
      }
    }
    leaf.call(this, app, done, req, res)
    initialized = true
  }

  // return route context
  var result = {
    get:    route.bind({ parent: leaf, parentRoute: about }, conf, 'get'),
    post:   route.bind({ parent: leaf, parentRoute: about }, conf, 'post'),
    put:    route.bind({ parent: leaf, parentRoute: about }, conf, 'put'),
    delete: route.bind({ parent: leaf, parentRoute: about }, conf, 'delete')
  }
  
  var attach = function() {
    // call express method on the server side
    if (utils.isServer) server[method](path, conf.authorize, callback)
    // and page.js on the client side
    else page(path, callback)
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
    get:    route.bind(rootContext, opts, 'get'),
    post:   route.bind(rootContext, opts, 'post'),
    put:    route.bind(rootContext, opts, 'put'),
    delete: route.bind(rootContext, opts, 'delete'),
  }
}

var def = exports.using()
Object.keys(def).forEach(function(key) {
  exports[key] = def[key]
})