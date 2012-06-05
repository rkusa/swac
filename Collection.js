var events = require('events')
  , util = require('util')

var Collection = module.exports = function(model) {
  this._model = model
  this._collection = []
  this._fragment = null
}

util.inherits(Collection, events.EventEmitter)

Collection.prototype.reset = function(data) {
  var that = this
  data.forEach(function(data) {
    var model = new that._model
    Object.defineProperty(model, '_position', {
      value: that._position + '._collection.' + that._collection.length
    })
    Object.keys(data).forEach(function(key) {
      if (typeof model[key] !== 'undefined') model[key] = data[key]
    })
    that._collection.push(model)
  })
}

Collection.prototype.serialize = function() {
  var data =[]
  this._collection.forEach(function(item) {
    data.push(item.serialize())
  })
  return { type: 'Collection:' + this._model._name, obj: data }
}

Collection.prototype.deserialize = function(obj) {
  var that = this
  obj.forEach(function(item) {
    var model = new that._model
    model.deserialize(item.obj)
    that._collection.push(model)
  })
}