var State = require('../state')
  , utils = require('../utils')
  , implode = require('implode')
  , qs      = require('qs')
  , path    = require('path')
  , page    = require('page')


// this one is used to track the last render command on
// the client-side and to abort it if necessary
var xhr

var Response = function(app, req, res) {
  this.app  = app
  this.req  = req
  this._res = res
  this.readyQueue = []
}

Response.prototype.ready = function(fn, immediately) {
  if (this.req.state && this.req.state.trigger === false) return
  if (immediately) return fn(this.app, this.req.params)
  this.readyQueue.push(fn)
}

Response.prototype.cleanup = function(fn) {
  fn(this.app)
}

Response.prototype.finalize = function(opts) {
  var fn
  while (fn = this.readyQueue.shift()) {
    fn(this.app, this.req.params)
  }
}

Response.prototype.redirect = function(url, opts) {
  if (!opts) opts = {}
  if (url[0] !== '/') {
    url = path.normalize(this.req.path.replace(/^\/_(post|put|delete)\//, '/') + '/' + url)
    // remove / from ending
    if (url.length > 1 && url[url.length - 1] === '/')
      url = url.substr(0, url.length - 1)
  }
  if (opts.external) {
    window.location.href = url
    return
  }
  this.finalize()
  setTimeout(function() {
    if (!opts.silent) {
      var ctx = new page.Context(url, opts)
      page.dispatch(ctx)
      if (!ctx.unhandled)
        ctx.pushState()
    } else {
      var ctx = new page.Context(url, opts)
      page.dispatch(ctx)
    }
  })
}

Response.prototype.render = function() {
  if (xhr) {
    xhr.abort()
    xhr = undefined
  }

  var viewNames = Array.prototype.slice.call(arguments)
    , origin = viewNames.shift()
    , callback  = viewNames.pop()
  if (viewNames.length === 1 && Array.isArray(viewNames[0]))
    viewNames = viewNames[0]

  this.app._currentRoute = origin

  var views = this.app.views, self = this
  utils.series(viewNames, function(viewName, next, remaining) {
    if (viewName in views) return next()
    xhr = new XMLHttpRequest()
    xhr.open('GET', '/_render/' + encodeURIComponent(viewName) + '?isMain=' + (remaining === 0).toString(), true)
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest')

    xhr.onreadystatechange = function() {
      if (this.readyState === 4){
        // Success
        if (this.status >= 200 && this.status < 400) {
          var data = JSON.parse(this.responseText)
          xhr = undefined
          var recovered = implode.recover(data)
          if (!(viewName in views)) views[viewName] = {}
          for (var key in recovered) {
            views[viewName][key] = recovered[key]
          }
          next()
        }
        // Error
        else { }
      }
    }

    xhr.send()
  }, function() {
    viewNames.forEach(function(viewName, i) {
      // the last view is the main one
      var isMain = viewNames.length - 1 === i
      for (var sectionName in views[viewName]) {
        var template = views[viewName][sectionName]
        if (sectionName === 'main' && !isMain) return
        var fragment = self.app.sections[sectionName]
        if (fragment && fragment.startNode) {
          self.app.fragments[fragment.id] = fragment
          if (fragment.invalid || fragment.template !== template) {
            fragment.emit('delete')
            fragment.template = template
            fragment.refresh()
            fragment.invalid = false
          }
        } else {
          self.app.registerSection(sectionName, template.source)
        }
      }
    })

    window.document.body.scrollTop = 0
    setTimeout(callback)
  })
}

var Request = module.exports = function(req, res) {
  this.app  = window.app
  this._req = req
  this._res = res
  this.path = req.path
  this.body = req.state.body || {}
  if (this.body && Array.isArray(this.body) && this.body.length > 0) {
    var obj = {}
    this.body.forEach(function(input) {
      obj[input.name] = input.value
    })
    this.body = obj
  }
  this.params = req.params
  this.query  = qs.parse(req.querystring)
}

Request.prototype.createResponse = function() {
  return new Response(this.app, this._req, this._res)
}