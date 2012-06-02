var events = require('events')
  , util = require('util')

var Model = module.exports = function(name, definition) {
  this._modelName = name
  definition.call(this)
  models[name] = this
}
Model.define = Model

util.inherits(Model, events.EventEmitter)

var models = module.exports.models = {}
var bindings = module.exports.bindings = []

Model.prototype.property = function(key) {
  var that = this
    , value = null
  Object.defineProperty(that, key, {
    get: function() {
      arguments.callee.caller.fragment.observe(that._position, key)
      return value
    },
    set: function(newValue) {
      if (value == newValue) return
      value = newValue
      this.emit('changed')
      this.emit('changed:' + key)
    },
    enumerable: true
  })
}