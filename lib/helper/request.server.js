var State = require('../state')
  , utils = require('../utils')
  , server

var Response = function(app, req, res) {
  this.app  = app
  this._req = req
  this._res = res
}

Response.prototype.ready = Response.prototype.cleanup = function() {
  // do nothing
}

Response.prototype.finalize = function(opts) {
  process.nextTick(function() {
    this.app.currentView = 'layout'
    this._res.render(opts.layout, this.app)
  }.bind(this))
}

Response.prototype.redirect = function(url) {
  this.app.emit('redirect', this._req)
  this._res.redirect(url)
}

Response.prototype.render = function() {
  var views = Array.prototype.slice.call(arguments)
    , origin = views.shift()
    , callback = views.pop()
  if (views.length === 1 && Array.isArray(views[0]))
    views = views[0]

  this.app._currentRoute = origin

  var self = this
  utils.series(views, function(viewName, next, remaining) {
    self.app.currentView = viewName
    self.app.currentViewIsMain = remaining === 0
    if (!server) server = require('../server').server
    server.render(viewName, self.app, function(err) {
      if (err) throw err
      self.app.currentView = self.app.currentViewIsMain = null
      next()
    })
  }, callback)
}

var Request = module.exports = function(req, res) {
  this.app  = process.domain.app = new State
  this._req = req
  this._res = res
  this.body = req.body
  if (this.body && Array.isArray(this.body) && this.body.length > 0) {
    var obj = {}
    this.body.forEach(function(input) {
      obj[input.name] = input.value
    })
    this.body = obj
  }
  this.params = req.params
  this.query  = req.query
}

Request.prototype.createResponse = function() {
  return new Response(this.app, this._req, this._res)
}