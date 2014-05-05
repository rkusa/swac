var utils   = require('./utils')

/*jshint unused:false */
var isServer = exports.isServer = utils.isServer
  , isClient = exports.isClient = utils.isClient

var handlebars = require('handlebars')

var Fragment = require('./fragment')
var Template = require('./template')

handlebars.registerHelper('reactive', function(options) {
  // var fragment = new Fragment
  // console.log(this.$proxy.root.template[options.fn.program])

  var template = new Template(options.fn)
    , fragment = new Fragment(template, this)
  return fragment.render(true)
})

var implode = require('implode')
handlebars.registerHelper('init', function() {
  var imploded = utils.objectLiteral(implode(this.$proxy.state))
  return new handlebars.SafeString(
    '<script type="text/javascript"><!--\n' +
    '  require(\'swac\').initialize(' + imploded + ')\n' +
    '--></script>'
  )
})

var State = require('./state')

if (isServer) {
  var server = require('./server')
    , Request = require('./request.server.js')

  exports.get = function(path, fn) {
    server.router.get(path, function*() {
      var ctx = this, state = new State
        , req = new Request(state)
        , res = req.createResponse()

      function done() {

      }

      done.render = function(viewName) {
        return function*() {
          ctx.body = yield res.render(viewName)
        }
      }

      yield fn(state.locals, done)
    })
  }
} else {
  exports.get = function() {

  }
}

exports.initialize = exports.init = function(state) {
  window.swac = {}
  state = window.swac.state = implode.recover(state)
  window.app = state.locals
}