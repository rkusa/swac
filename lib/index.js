exports.State      = require('./state')

exports.Model      = require('./model')
exports.Collection = require('./collection')

exports.Template   = require('./template')
exports.Fragment   = require('./fragment')

require('./handlebars-helper')

var isServer  = exports.isServer  = process.title === 'node'
  , isBrowser = exports.isBrowser = !isServer
  , server

if (isBrowser) {
  function sameOrigin(href) {
    var origin = location.protocol + "//" + location.hostname + ":" + location.port
    return href.indexOf('http') == -1 || href.indexOf(origin) == 0
  }

  $(function() {
    $('a').on('click', function(e) {
      if (this.hash) return;
      if (!sameOrigin($(this).attr('href'))) return
      e.preventDefault()
      page.show(this.pathname, null, Boolean($(this).data('silent')))
    })
    page({ click: false })
    $('form').on('submit', function(e) {
      e.preventDefault()
      var path = '/' + $(this).attr('method') + $(this).attr('action')
      page.show(path, { body: $(this).serializeArray() }, true)
    })
  })
} else {
  // trick browserify to ignore this one
  server = (require)('./server').app
}

var initialized = false
var route = function(method, path, action, rdy, options) {
  var that = this
    , options = typeof rdy === 'object' ? rdy : options
    , rdy = typeof rdy === 'function' ? rdy : null
    , callback = function(app, cb, params, body) {
      if (body && body.length > 0) {
        var obj = {}
        body.forEach(function(input) {
          obj[input.name] = input.value
        })
        body = obj
      }
      if (!isBrowser || initialized) action(app, cb, params, body)
      if (isBrowser && rdy) rdy(window.app)
    }
  var fn = function(app, cb, req, res) {
    if (!req) req = {}
    if (isBrowser && req.state) req.body = req.state.body 
    if (isBrowser && app.path == path)
      return cb()
    that.parent(app, callback.bind(null, app, cb, req.params, req.body), req, res)
  }
  var bla = function(req, res) {
    var app = isBrowser ? window.app : new exports.State
    var done
    if (isBrowser) {
      done = function() {}
      done.redirect = function() {}
    } else {
      done = function() {
        app.path = path
        res.render('index', app)
      }
      done.redirect = res.redirect
    }
    fn.call(this, app, done, req, res)
    initialized = true
  }
  if (method != 'get') path = '/' + method + path
  if (isBrowser) page(path, bla)
  else {
    server.get(path, bla)
  }

  return {
    get: route.bind({ parent: fn }, 'get'),
    post: route.bind({ parent: fn }, 'post')
  }
}
var context = { parent: function(app, cb) {
  cb()
}}

exports.get  = route.bind(context, 'get')
exports.post = route.bind(context, 'post')