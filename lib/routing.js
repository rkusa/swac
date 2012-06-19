var Arkansas = require('./')
  , server
  , initialized = false

if (Arkansas.isServer) {
  // trick browserify to ignore this one
  server = (require)('./server').app
}

// method ... HTTP Method
// path   ... route path
// action ... route callback
// rdy    ... route clientside-only javascript
// options
var route = function(method, path, action, rdy, options) {
  // arguments
  var that = this
    , options = typeof rdy === 'object' ? rdy : options
    , rdy = typeof rdy === 'function' ? rdy : null

  var leaf = function(app, cb, req, res) {
    if (!req) req = {}
    // clientside post support
    if (Arkansas.isBrowser && req.state) req.body = req.state.body
    if (req.body && Array.isArray(req.body) && req.body.length > 0) {
      var obj = {}
      req.body.forEach(function(input) {
        obj[input.name] = input.value
      })
      req.body = obj
    }

    // if is browser and source path equals routes path
    // TODO params vergleichen
    if (Arkansas.isBrowser && initialized && app.path == path)
      return cb()

    // call parent first
    that.parent(app, function() {
      if (Arkansas.isBrowser && !initialized) cb()
      else action(app, cb, req.params, req.body)
      if (Arkansas.isBrowser && rdy) rdy(window.app, req.params)
    }, req, res)
  }

  // post requests will be routed to /post/...
  if (Arkansas.isBrowser && method != 'get') path = '/' + method + path

  // register route
  var callback = function(req, res) {
    // if server: ethereal state
    // if client: persistent state
    var app = Arkansas.isBrowser ? window.app : new Arkansas.State
    var done = function() {}
    done.redirect = function() {}
    if (Arkansas.isServer) {
      // express render and redirect
      done = function() {
        app.path = path
        app.params = req.params
        res.render('index', app)
      }
      done.redirect = function(url) {
        res.redirect(url)
      }
    }
    leaf.call(this, app, done, req, res)
    initialized = true
  }
  if (Arkansas.isServer) server[method](path, callback)
  else                   page(path, callback)

  // return route context
  return {
    get: route.bind({ parent: leaf }, 'get'),
    post: route.bind({ parent: leaf }, 'post')
  }
}
var rootContext = { parent: function(app, cb) {
  cb()
}}

exports.get  = route.bind(rootContext, 'get')
exports.post = route.bind(rootContext, 'post')