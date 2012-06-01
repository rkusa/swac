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
      var caller = arguments.callee.caller
      console.log(caller)
      bindings.push({
        block: caller.id,
        event: 'changed:' + key,
        model: this._modelName
      })
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