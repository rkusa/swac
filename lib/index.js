var utils = require('./utils')

exports.State      = require('./state')

exports.Model             = require('./model')
exports.GroupedCollection = require('./collection').GroupedCollection
exports.Collection        = require('./collection').Collection
exports.observableArray   = require('./observable').Array

exports.Template   = require('./template')
exports.Fragment   = require('./fragment')

exports.Routes = {}

var isServer  = exports.isServer  = utils.isServer
  , isBrowser = exports.isBrowser = utils.isBrowser

if (isBrowser) {
  var page = require('page')
    , qs   = require('qs')
  
  window.Arkansas = {
    State: exports.State,
    areas: {
      byRoute: {}
    }
  }
  
  function sameOrigin(href) {
    var origin = location.protocol + "//" + location.hostname + ":" + location.port
    return href.indexOf('http') == -1 || href.indexOf(origin) === 0
  }

  $(function() {
    $('body').on('click', 'a', function(e) {
      if (this.hash || !$(this).attr('href') || $(this).attr('href') == '#') return;
      if (!sameOrigin($(this).attr('href'))) return
      e.preventDefault()
      // if (this.pathname !== location.pathname)
      var path = this.pathname + this.search
      if ($(this).data('confirm') && !confirm($(this).data('confirm'))) return
      var ctx = new page.Context(path, null)
      page.dispatch(ctx)
      if (!ctx.unhandled && !Boolean($(this).data('silent')))
        ctx.pushState()
    })
    page({ click: false, dispatch: true })
    $('body').on('submit', 'form', function(e) {
      if ($(this).data('side') == 'server') return
      var method = $(this).attr('method').toLowerCase()
        , ctx, path = $(this).attr('action')
      e.preventDefault()
      if (method === 'post') {
        var _method = $(this).find('input[name=_method]')
        if (_method.length) method = _method.val()
        path = '/_' + method + path
        ctx = new page.Context(path, { body: qs.parse($(this).serialize()) })
        page.dispatch(ctx)
      } else {
        if (path.indexOf('?') > -1) path += '&'
        else path += '?'
        path += $(this).serialize()
        ctx = new page.Context(path)
        page.dispatch(ctx)
        if (!ctx.unhandled)
          ctx.pushState()
      }
    })
  })
}

if (utils.isBrowser) {
  var routing = require('./routing')
  exports.get  = routing.get
  exports.post = routing.post
  exports.put = routing.put
  exports.delete = routing.delete
}