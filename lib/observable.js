var events = require('events')
  , util = require('util')

exports.Array = function(values, model) {
  if (!model && !Array.isArray(values)) {
    model = values
    values = null
  }

  var array = values || new Array
    , byId = {}
    , emitter = new events.EventEmitter
    , methods = ['addListener', 'on', 'once', 'removeListener', 'removeAllListeners', 'setMaxListeners', 'listeners', 'emit']

  methods.forEach(function(method) {
    array[method] = emitter[method]
  })

  function adding(element) {
    if (model && !(element instanceof model)) {
      element = new model(element)
      element.isNew = false
    }
    if (element._id)
      byId[element._id] = element
    else {
      element.on('changed:id', function callback() {
        byId[element._id] = element
        element.removeListener('changed:id', callback)
      })
    }
    return element
  }

  function added(element) {
    Object.defineProperty(element, '_position', {
      value: array._position + '.' + (array.indexOf(element))
    })
    element.on('changed', array.emit.bind(array, 'changed'))
    array.emit('added', element)
  }

  function removed(element) {
    delete byId[element._id]
    array.emit('removed', element)
  }

  array.find = function(id) {
    return byId[id]
  }
  
  array.pop = function() {
    var result = Array.prototype.pop.apply(this, arguments)
    removed(result)
    this.emit('changed')
    return result
  }

  array.push = function() {
    var that = this
      , elements = Array.prototype.slice.call(arguments)
      , result
    elements.forEach(function(element) {
      result = Array.prototype.push.call(that, adding(element))
      added(element)
    })
    this.emit('changed')
    return result
  }

  array.reverse = function() {
    Array.prototype.reverse.apply(this, arguments)
    this.emit('changed')
  }
  
  array.shift = function() {
    var result = Array.prototype.shift.apply(this, arguments)
    removed(result)
    this.emit('changed')
    return result
  }

  array.sort = function() {
    Array.prototype.sort.apply(this, arguments)
    array.emit('changed')
  }
  
  array.splice = function() {
    var args = Array.prototype.slice.call(arguments)
      , index = args.shift()
      , howMany = args.shift()
      , newElements = []

    args.forEach(function(element) {
      newElements.push(adding(element))
    })

    newElements.unshift(index, howMany)

    var result = Array.prototype.splice.apply(this, newElements)
    newElements.slice(2).forEach(function(element) {
      added(element)
    })

    result.forEach(function(element) {
      removed(result)
    })

    array.emit('changed')
    return result
  }
  
  array.unshift = function() {
    var that = this
      , elements = Array.prototype.slice.call(arguments)
      , result
    elements.forEach(function(element) {
      result = Array.prototype.unshift.call(that, adding(element))
      added(element)
    })
    this.emit('changed')
    return result
  }

  array.reset = function(elements) {
    elements.unshift(0, array.length)
    array.splice.apply(array, elements)
    return array.length
  }

  array.defineValue = function(name, fn) {
    var that = this
    Object.defineProperty(this, name, {
      get: function() {
        if (typeof arguments.callee.caller.fragment != 'undefined')
          arguments.callee.caller.fragment.observe(that)
        return fn.call(that)
      },
      enumerable: true
    })
  }

  array.serialize = function() {
    var data =[]
    this.forEach(function(item) {
      data.push(item.serialize())
    })
    return { type: 'ObservableArray:' + model._name, obj: data }
  }

  array.deserialize = function(obj) {
    var that = this
    obj.forEach(function(item) {
      var record = new model
      record.deserialize(item.obj)
      that.push(record)
    })
  }

  return array
}