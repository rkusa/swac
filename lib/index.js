exports.State      = require('./state')

exports.Model             = require('./model')
exports.GroupedCollection = require('./collection').GroupedCollection
exports.Collection        = require('./collection').Collection

exports.Template   = require('./template')
exports.Fragment   = require('./fragment')

var isServer  = exports.isServer  = process.title.indexOf('node') > -1
  , isBrowser = exports.isBrowser = !isServer

if (isBrowser) {
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
      page.show(path, null, Boolean($(this).data('silent')))
    })
    page({ click: false })
    $('body').on('submit', 'form', function(e) {
      if ($(this).data('side') == 'server') return
      e.preventDefault()
      var path = '/_' + $(this).attr('method').toLowerCase() + $(this).attr('action')
      page.show(path, { body: $(this).serializeArray() }, true)
    })
  })
}

var routing = require('./routing')

exports.get  = routing.get
exports.post = routing.post

exports.observableArray = require('./observable').Array
