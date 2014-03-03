var utils   = require('./utils')
  , implode = require('implode')

exports.State = require('./state')
exports.initialize = exports.State.init

exports.Template = require('./template')
exports.Fragment = require('./fragment')

exports.Routes = {}

var isServer = exports.isServer = utils.isServer
  , isClient = exports.isClient = utils.isClient
exports.UUID = utils.UUID

exports.register = function(name, helper) {
  implode.register(name, helper, [])
}

if (isClient) {
  var page = require('page')
    , qs   = require('qs')
  
  window.swac = {
    debug: false,
    State: exports.State,
    navigate: function(path, opts) {
      if (!opts) opts = {}
      var ctx = new page.Context(path, null)
      if (opts.trigger !== false) {
        page.dispatch(ctx)
      }
      if (!ctx.unhandled) {
        if (opts.replaceState === true)
          ctx.save()
        else if (!opts.silent)
          ctx.pushState()
      }
    }
  }
  
  function sameOrigin(href) {
    var origin = location.protocol + "//" + location.hostname + ":" + location.port
    return href.indexOf('http') == -1 || href.indexOf(origin) === 0
  }

  document.body.addEventListener('click', function(e) {
    if (e.ctrlKey || e.metaKey) return
    if (e.defaultPrevented) return

    // ensure link
    var el = e.target
    while (el && 'A' != el.nodeName) el = el.parentNode
    if (!el || 'A' != el.nodeName) return

    // if the `data-external` attribute is set to `true`, do not
    // intercept this link
    if (Boolean(el.dataset.external)) return

    // ensure protocol
    if (el.protocol !== 'http:' && el.protocol !== 'https:') return

    // ensure non has for the same path
    var href = el.getAttribute('href')
    if (el.hash || !href || href == '#') return

    // do not intercept x-orgin links
    if (!sameOrigin(href)) return

    // intercept link
    e.preventDefault()
    var path = el.pathname + el.search

    // provide confirm functionality through `data-confirm`
    if (el.dataset.confirm && !confirm(el.dataset.confirm)) return

    // trigger route
    var ctx = new page.Context(path, {
      // whether to actually execute the route
      trigger: typeof el.dataset.trigger === 'undefined' ? true : Boolean(el.dataset.trigger)
    })
    page.dispatch(ctx)
    if (!ctx.unhandled && !Boolean(el.dataset.silent)) {
      ctx.pushState()
    }
  })
  
  document.body.addEventListener('submit', function(e) {
    var el = e.target

    // if the `data-side` attribute is set to `server`, do not
    // intercept this link
    if (el.dataset.side === 'server') return

    var origin = window.location.protocol + "//" + window.location.host
      , method = el.method
      , path   = el.action
      , ctx

    // remove origin from path (action)
    if (path.indexOf(origin) === 0) {
      path = path.substr(origin.length)
    }

    // POST submits
    if (method === 'post') {
      // support method overwrite
      var _method = el.querySelector('input[name=_method]')
      if (_method) method = _method.value

      // non GET submits are reworked to /_VERB/..
      path = '/_' + method + (path === '' ? '/' : path)

      // serialize form elements
      var body = qs.parse(utils.serializeForm(el))

      // execute route
      ctx = new page.Context(path, { body: body })
      page.dispatch(ctx)
    }
    // GET submits
    else {
      // serialize form elements
      if (path.indexOf('?') > -1) path += '&'
      else path += '?'
      path += utils.serializeForm(el)

      // execute route
      ctx = new page.Context(path)
      page.dispatch(ctx)
      if (!ctx.unhandled && !Boolean(el.dataset.silent)) {
        ctx.pushState()
      }
    }

    // if no route found, send POST request to server
    if (!ctx.unhandled) {
      e.preventDefault()
    }
  })
  
  var routing    = require('./routing')
  exports.init   = routing.init
  exports.get    = routing.get
  exports.post   = routing.post
  exports.put    = routing.put
  exports.delete = routing.delete
}