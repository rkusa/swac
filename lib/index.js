var utils = require('./utils')

exports.State      = require('./state')

exports.Model             = require('./model')
exports.GroupedCollection = require('./collection').GroupedCollection
exports.Collection        = require('./collection').Collection
exports.observableArray   = require('./observable').Array

exports.Template   = require('./template')
exports.Fragment   = require('./fragment')

var isServer  = exports.isServer  = utils.isServer
  , isBrowser = exports.isBrowser = utils.isBrowser

if (isBrowser) {
  window.Arkansas = {
    State: exports.State
  }
  
  function sameOrigin(href) {
    var origin = location.protocol + "//" + location.hostname + ":" + location.port
    return href.indexOf('http') == -1 || href.indexOf(origin) == 0
  }

  $(function() {
    $('body').on('click', 'a', function(e) {
      if (this.hash || !$(this).attr('href') || $(this).attr('href') == '#') return;
      if (!sameOrigin($(this).attr('href'))) return
      e.preventDefault()
      // if (this.pathname !== location.pathname)
      var path = this.pathname
      if ($(this).data('confirm') && !confirm($(this).data('confirm'))) return
      if ($(this).data('method')) path = '/_' + $(this).data('method').toLowerCase() + path
      var ctx = new page.Context(path, null)
      page.dispatch(ctx)
      if (!ctx.unhandled && !Boolean($(this).data('silent')))
        ctx.pushState()
    })
    page({ click: false, dispatch: true })
    $('body').on('submit', 'form', function(e) {
      if ($(this).data('side') == 'server') return
      e.preventDefault()
      var path = '/_' + $(this).attr('method').toLowerCase() + $(this).attr('action')
      var ctx = new page.Context(path, { body: $(this).serializeArray() })
      page.dispatch(ctx)
    })
  })
}

var routing = require('./routing')
exports.get  = routing.get
exports.post = routing.post

