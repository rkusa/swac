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

  // post requests will be routed to /_post/...
  if (Arkansas.isBrowser && method != 'get') path = '/_' + method + path

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
    if (Arkansas.isBrowser && initialized && app.path.pattern == req.pattern
      && (path != app.path.pattern || app.path.requested == req.path))
        return cb()

    // call parent first
    var done = function() {
      if (Arkansas.isBrowser && !initialized) cb()
      else action(app, cb, req.params, req.body)
      if (Arkansas.isBrowser && rdy) rdy(window.app, req.params)
    }
    done.render = done
    that.parent(app, done, req, res)
  }

  // register route
  var callback = function(req, res) {
    // if server: ethereal state
    // if client: persistent state
    req.pattern = path
    var app = Arkansas.isBrowser ? window.app : new Arkansas.State
      , done
    if (Arkansas.isBrowser) {
      done = function() {
        app.path = { requested: req.path, pattern: path }
      }
      done.redirect = function(url) {
        app.path.requested = url
      }
      done.render = function(viewName) {
        app.path = { requested: req.path, pattern: path }
        var render = function(result) {
          Object.keys(app.areas.byRoute[path]).forEach(function(key) {
            var root = app.areas.fragments[key]
            root.template = app.areas.byRoute[path][key]
            var fragments = window.app.fragments
            window.app.fragments = result.fragments
            root.refresh()
            window.app.fragments = fragments

            var treeWalker = document.createTreeWalker(root.DOMRange.commonAncestorContainer, NodeFilter.SHOW_COMMENT, {
              acceptNode: function(node) {
                return root.DOMRange.isPointInRange(node, 0) &&
                  node.nodeValue[0] == '-' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
              }
            })
            while(treeWalker.nextNode()) {
              var value = treeWalker.currentNode.nodeValue, res
              if (res = value.match(/\-(\{(\d+))|((\d+)\})/)) {
                var fragment = result.fragments[res[2] || res[4]]
                if (res.index) /* closing */ fragment.endNode = treeWalker.currentNode
                else           /* opening */ fragment.startNode = treeWalker.currentNode
              }
            }
          })
        }
        if (!(path in app.areas.byRoute)) {
          $.ajax({
            url: '/_render/' + viewName,
            dataType: 'json',
            success: function(data) {
              var result = new Arkansas.State
              result.deserialize(data, true)
              app.areas.byRoute[path] = result.areas.byRoute[0]
              render(result)
            }
          })
        } else {
          render(window.app)
        }
      }
    } else {
      // express render and redirect
      done = function() {
        app.path = { requested: req.path, pattern: path }
        res.render('layout', app)
      }
      done.redirect = function(url) {
        app.path.requested = url
        res.redirect(url)
      }
      done.render = function(viewName) {
        app.path = { requested: req.path, pattern: path }
        server.render(viewName, app, done)
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