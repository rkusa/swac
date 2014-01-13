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

  $(function() {
    $('body').on('click', 'a', function(e) {
      if (e.ctrlKey || e.metaKey) return
      if (Boolean($(this).data('external'))) return
      if (this.protocol !== 'http:' && this.protocol !== 'https:') return
      if (this.hash || !$(this).attr('href') || $(this).attr('href') == '#') return
      if (!sameOrigin($(this).attr('href'))) return
      e.preventDefault()
      // if (this.pathname !== location.pathname)
      var path = this.pathname + this.search
      if ($(this).data('confirm') && !confirm($(this).data('confirm'))) return
      var ctx = new page.Context(path, {
        trigger: typeof $(this).data('trigger') === 'undefined' ? true : Boolean($(this).data('trigger'))
      })
      page.dispatch(ctx)
      if (!ctx.unhandled && !Boolean($(this).data('silent')))
        ctx.pushState()
    })
    $('body').on('submit', 'form', function(e) {
      if ($(this).data('side') == 'server') return
      var method = $(this).attr('method').toLowerCase()
        , ctx, path = this.action, origin = window.location.protocol + "//" + window.location.host
      if (path.indexOf(origin) === 0)
        path = path.substr(origin.length)
      if (method === 'post') {
        var _method = $(this).find('input[name=_method]')
        if (_method.length) method = _method.val()
        path = '/_' + method + (path === '' ? '/' : path)
        ctx = new page.Context(path, { body: qs.parse($(this).serialize()) })
        page.dispatch(ctx)
      } else {
        if (path.indexOf('?') > -1) path += '&'
        else path += '?'
        path += $(this).serialize()
        ctx = new page.Context(path)
        page.dispatch(ctx)
        if (!ctx.unhandled && !Boolean($(this).data('silent')))
          ctx.pushState()
      }
      if (!ctx.unhandled)
        e.preventDefault()
    })
  })
  
  var routing    = require('./routing')
  exports.init   = routing.init
  exports.get    = routing.get
  exports.post   = routing.post
  exports.put    = routing.put
  exports.delete = routing.delete
}