exports.State      = require('./state')

exports.Model      = require('./model')
exports.Collection = require('./collection')

exports.Template   = require('./template')
exports.Fragment   = require('./fragment')

var isServer  = exports.isServer  = process.title === 'node'
  , isBrowser = exports.isBrowser = !isServer

if (isBrowser) {
  function sameOrigin(href) {
    var origin = location.protocol + "//" + location.hostname + ":" + location.port
    return href.indexOf('http') == -1 || href.indexOf(origin) == 0
  }

  $(function() {
    $('body').on('click', 'a', function(e) {
      if (this.hash) return;
      if (!sameOrigin($(this).attr('href'))) return
      e.preventDefault()
      page.show(this.pathname, null, Boolean($(this).data('silent')))
    })
    page({ click: false })
    $('body').on('submit', 'form', function(e) {
      e.preventDefault()
      var path = '/' + $(this).attr('method') + $(this).attr('action')
      page.show(path, { body: $(this).serializeArray() }, true)
    })
  })
}

var routing = require('./routing')

exports.get  = routing.get
exports.post = routing.post