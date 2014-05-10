var utils   = require('./utils')

var Router = require('hierarchical-router')
Router.create = function(opts) {
  var router = new Router(opts)

  router.on('navigate', navigate)
  router.on('execute', execute)
  router.on('revert', revert)

  return router
}

function getState() {
  return utils.isServer ? process.domain.swac.state
                        : window.swac.state
}

function navigate(path, method, ctx) {
  var state = getState()
  state.location = { path: path, method: method, query: ctx.query, params: ctx.query }
}

function execute(path) {
  var state = getState()
  state.current = path
}

function revert(path) {
  var state = getState()
  if (!(path in state.origins)) return

  state.origins[path].forEach(function(path) {
    var obj = state.locals
    while (path.length > 1) {
      obj = obj[path.shift()]
    }
    delete obj[path[0]]
  })

  // if (this.cleanup) context.cleanup(this.cleanup)
}

module.exports = utils.isServer ? require('./swac.server.js')
                                : require('./swac.client.js')
var swac = module.exports

/*jshint unused:false */
swac.isServer = utils.isServer
swac.isClient = utils.isClient

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

swac.initialize = swac.init = function(state) {
  state = window.swac.state = implode.recover(state)
  window.app = state.locals
}