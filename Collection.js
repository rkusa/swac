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
    Object.keys(data).forEach(function(key) {
      if (typeof model[key] !== 'undefined') model[key] = data[key]
    })
    that.add(model)
  })
}

Collection.prototype.add = function(model) {
  if (!model instanceof this._model)
    throw new Error('Model have to be an instance of ' + this._model._name)

  var that = this
  Object.defineProperty(model, '_position', {
    value: that._position + '._collection.' + that._collection.length
  })
  that._collection.push(model)
  model.on('destroy', this.remove.bind(this, model))
  this.emit('add', model)
}

Collection.prototype.remove = function(model) {
  var index = this._collection.indexOf(model)
  if (index === -1) return
  this._collection.splice(index, 1)
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
    that.add(model)
  })
}