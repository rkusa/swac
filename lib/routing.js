var swac    = require('./')
  , State   = require('./state')
  , page    = require('page')
  , implode = require('implode')
  , utils   = require('./utils')
  , qs      = require('qs')
  , path    = require('path')
  , server

exports.initialized = swac.isClient ? false : true

if (swac.isServer) exports.Request = require('./helper/request.server.js')
else               exports.Request = require('./helper/request.client.js')

var Route = function(method, pattern, action, opts) {
  this.path = this.pattern = pattern
  this.method = method
  this.action = action
  this.rdy    = null
  this.opts   = opts || {}
  this.depth  = 0
}

Route.prototype.execute = function(app, req, res, callback) {
  if (this.rdy) res.ready(this.rdy, !exports.initialized)

  if (!exports.initialized || (req._req.state && req._req.state.trigger === false)) {
    return callback()
  }
  
  utils.debug(this.method.toUpperCase() + ' ' + this.path)

  if (this.method === 'init') {
    this.action(req._req, app, callback)
  } else {
    app._currentRoute = this.method.toUpperCase() + ' ' + this.path
    this.action(app, callback, req.params, req.body, req.query)
  }
}

Route.prototype.ready = function(fn) {
  this.rdy = fn
}

Route.prototype.cleanup = function(fn) {
  this.cleanup = fn
}

Route.prototype.revert = function(app, res) {
  utils.debug('Revert ' + this.path)

  if (this.cleanup) res.cleanup(this.cleanup)
  
  var keys = app._origins[this.method.toUpperCase() + ' ' + this.path]
  if (!keys) return
  keys.forEach(function(key) {
    app.unregister(key)
    utils.debug('unset ' + key)
  })
  
  var sections = app._sectionOrigins[this.method.toUpperCase() + ' ' + this.path]
  if (!sections) return
  sections.forEach(function(section) {
    app.sections[section].invalidate()
    utils.debug('invalidate section ' + section)
  })
}

Route.prototype.appendAfter = function(parent) {
  if (!(parent instanceof Route)) return
    
  this.parent = parent
  this.depth  = parent.depth + 1

  // chain pattern with parent patterns
  var parent = this
  while ((parent = parent.parent) && parent.pattern) {
    this.path = parent.pattern + this.path
  }
  // cleanup slashes
  this.path = this.path.replace(/^\/\//, '/')
}

Route.prototype.createChild = function(method, pattern, action, opts) {
  // arguments
  if (method === 'init' || typeof pattern === 'function') {
    action = pattern
    pattern = ''
  }

  if (!opts.authorize) {
    opts.authorize = function(req, res, next) { next() }
  }

  // cleanup pattern
  if (pattern !== '') {
    // force / at the beginning
    if (pattern[0] !== '/') pattern = '/' + pattern
    // remove / from ending
    if (pattern.length > 1 && pattern[pattern.length - 1] === '/')
      pattern = pattern.substr(0, pattern.length - 1)
  }

  var child = new Route(method, pattern, action, opts)
  child.appendAfter(this)

  if (!child.path) return child

  var callback = function(req, res) {
    var request = new exports.Request(req, res)
      , from = request.app._location ? request.app._location : new Route('', '', function(_, cb) { cb() }, opts)
    from.executeUntil(child, request, request.createResponse())
  }

  // call express method on the server side
  if (utils.isServer) {
    // lazy loading
    if (!server) server = require('./server').server
    server[method](child.path, opts.authorize, callback)
  }
  // and page.js on the client side
  // post requests will be routed to /_post/...
  else {
    var path = utils.isClient && method != 'get'
                ? '/_' + method + child.path
                : child.path
    page(path, callback)
  }

  return child
}

Route.prototype.executeUntil = function(to, req, res) {
  var from = this, stack = [to], revert = []
  if (exports.initialized) utils.debug('From: ' + from.path)
  if (exports.initialized) utils.debug('To: ' + to.path)

  // traverse up, until both are on the same depth
  while (from.depth !== to.depth) {
    if (from.depth > to.depth) {
      if (!!!~stack.indexOf(from)) revert.push(from)
      from = from.parent
    } else {
      if (!!!~stack.indexOf(to)) stack.push(to)
      to = to.parent
    }
  }

  // find first shared ancestor
  while (from.depth >= 1 && from !== to) {
    if (!!!~stack.indexOf(to)) stack.push(to)
    if (!!!~revert.indexOf(from)) revert.push(from)
    from = from.parent
    to   = to.parent
  }

  // if from and to are still not the same, we are at depth 0,
  // i.e., both nodes are in different trees and we are done here,
  if (from.depth === 0 && from !== to) {
    if (!!!~stack.indexOf(to)) stack.push(to)
    if (!!!~revert.indexOf(from)) revert.push(from)
  }

  // otherwise:
  if (from === to) {
    // we are not done here, because it could be possible that some
    // parameters have changed, e.g., having the pattern /:id the
    // parameter id could have changed

    var route = to
    do {
      // count the relevant sections of the pattern
      var relevant   = (route.pattern.match(/\//g) || []).length

      // count the relevant sections of the full path to calcularte the
      // count of sections that are irrelevant
      var irrelevant = (route.path.match(/\//g) || []).length - relevant

      if (relevant === 0 || irrelevant === 0) continue

      // split into sections
      var lhs = app._path.replace(/^\/_(post|put|delete)\//, '/').split('/').splice(irrelevant + 1, relevant)
        , rhs = req.path.replace(/^\/_(post|put|delete)\//, '/').split('/').splice(irrelevant + 1, relevant)
      for (var i = 0; i < lhs.length; ++i) {
        if (lhs[i] !== rhs[i]) {
          // parameter has changed
          stack.push(route.parent)
          revert.push(route.parent)
          break
        }
      }
    } while((route = route.parent))
  }

  if (exports.initialized) utils.debug('Stack: ' + stack.map(function(r) { return r.pattern }))

  // revert routes that are not in the path anymore
  revert.forEach(function(route) {
    route.revert(req.app, res)
  })

  // execute stack
  var route

  // finalize the request
  var finalize = function() {
    exports.initialized = true
    req.app._location = route
    req.app._path = req.path
    res.finalize(this.opts)
  }.bind(this)

  // the callback method that is provided to each route node
  var done = function done() {
    // get the next route from the stack
    route = stack.pop()

    var callback
    // if the stack is not empty yet, i.e., if this is not
    // the last route part, the callback standard callback is provided
    if (stack.length) {
      callback = done
    }
    // otherwise a slightly modified callback is provided
    else {
      callback = function() {
        done.end()
      }
      callback.redirect = done.redirect
      callback.render = function() {
        res.render.apply(res, Array.prototype.slice.call(arguments).concat(finalize))
      }
    }

    // exectue the route part
    route.execute(req.app, req, res, callback)
  }
  done.end      = finalize
  done.redirect = function(url, opts) {
    req.app._location = route
    req.app._path = req.path
    res.redirect(url, opts)
  }
  done.render   = function() {
    // catch most recent render
    done.end = res.render.bind.apply(res.render, [res].concat(Array.prototype.slice.call(arguments), finalize))
    done()
  }

  done()
}

function createRoute(parent, opts, method, pattern, action) {
  var route = Route.prototype.createChild.call(parent, method, pattern, action, opts)

  var ret = {
    init:   createRoute.bind(null, route, opts, 'init'),
    get:    createRoute.bind(null, route, opts, 'get'),
    post:   createRoute.bind(null, route, opts, 'post'),
    put:    createRoute.bind(null, route, opts, 'put'),
    del:    createRoute.bind(null, route, opts, 'delete'),
    delete: createRoute.bind(null, route, opts, 'delete'),
  }
  ret.ready = function(fn) {
    route.ready(fn)
    return ret
  }
  ret.cleanup = function(fn) {
    route.cleanup(fn)
    return ret
  }
  return ret
}

exports.using = function(opts) {
  if (!opts)           opts = {}
  if (!opts.layout)    opts.layout = 'layout'
  if (!opts.authorize) {
    opts.authorize = function(req, res, next) { next() }
  }

  return {
    init:   createRoute.bind(null, false, opts, 'init'),
    get:    createRoute.bind(null, false, opts, 'get'),
    post:   createRoute.bind(null, false, opts, 'post'),
    put:    createRoute.bind(null, false, opts, 'put'),
    del:    createRoute.bind(null, false, opts, 'delete'),
    delete: createRoute.bind(null, false, opts, 'delete')
  }
}

var def = exports.using()
Object.keys(def).forEach(function(key) {
  exports[key] = def[key]
})