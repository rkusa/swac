var ViewModelProxy = require('viewmodelproxy')
  , Observer = require('./observer')
  , utils = require('./utils')

var State = module.exports = function() {
  var locals = {}
  var proxy = new ViewModelProxy(locals)
  this.locals = proxy.viewModel
  this.fragments = {}
  this.observer = new Observer(locals)

  proxy.state = this
  proxy.fragment = {
    children: [],
    get template() {
      return proxy.state.templates[proxy.state.currentView]
    }
  }

  this.templates = {}
  this.currentView = null

  var _uuid = 1
  this.uuid = function() {
    return _uuid++
  }
}

var implode = require('implode')
implode.register('swac/State', State, ['currentView', 'templates', 'fragments', 'locals', 'observer'])

State.prototype.$serialize = function() {
  var empty = function() {}
  for (var name in this.templates) {
    this.templates[name].main = empty
  }
  return this
}

var handlebars = require('handlebars')
State.prototype.$deserialize = function() {
  for (var name in this.templates) {
    this.templates[name] = handlebars.template(this.templates[name])
    this.templates[name](this.locals)
  }

  var self = this
  document.addEventListener('DOMContentLoaded', function() {
    utils.aquireFragments(document, self.fragments)
    // page({ click: false, dispatch: true })
  })
}