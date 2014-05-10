var utils   = require('./utils')

/*jshint unused:false */
var isServer = exports.isServer = utils.isServer
  , isClient = exports.isClient = utils.isClient

var Router = require('hierarchical-router')
Router.create = function(opts) {
  var router = new Router(opts)

  router.on('revert', revert)

  return router
}

function revert(route, context) {
  console.log('TODO: REVERT')
  // if (this.cleanup) context.cleanup(this.cleanup)
  //
  // var keys = context.$state._origins[this.method.toUpperCase() + ' ' + this.path]
  // if (!keys) return
  // keys.forEach(function(key) {
  //   state.unregister(key)
  //   debug('unset %s', key)
  // })
  //
  // var sections = state._sectionOrigins[this.method.toUpperCase() + ' ' + this.path]
  // if (!sections) return
  // sections.forEach(function(section) {
  //   state.sections[section].invalidate()
  //   debug('invalidate section %s', section)
  // })
}

module.exports = exports = isServer ? require('./swac.server.js')
                                    : require('./swac.client.js')

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

exports.initialize = exports.init = function(state) {
  state = window.swac.state = implode.recover(state)
  window.app = state.locals
}