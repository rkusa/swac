var events = require('events')
  , util = require('util')
  , Model = module.exports

Model.models = {}

Model.define = function(name, definition) {
  var model = Model.models[name] = function(properties) {
    var that = this
    definition.call(this)
    if (properties)
      Object.keys(properties).forEach(function(property) {
        if (that.hasOwnProperty(property))
          that[property] = properties[property]
      })
    Object.defineProperty(this, '_modelName', {
      value: name
    })
  }
  util.inherits(model, events.EventEmitter)
  Object.defineProperty(model, '_name', {
    value: name
  })

  model.prototype.destroy = function() {
    this.emit('destroy')
  }

  model.prototype.property = function(key) {
    var that = this
      , value = null
    Object.defineProperty(that, key, {
      get: function() {
        // console.log(that._position)
        if (typeof arguments.callee.caller.fragment != 'undefined')
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

  model.prototype.serialize = function() {
    var obj = {}
      , that = this
    Object.keys(this).forEach(function(key) {
      obj[key] = that[key]
    })
    return { type: 'Model:' + name, obj: obj }
  }

  model.prototype.deserialize = function(obj) {
    var that = this
    Object.keys(obj).forEach(function(key) {
      if (that.hasOwnProperty(key)) that[key] = obj[key]
    })
  }

  return model
}