var events = require('events')
  , util = require('util')
  , Model = require('./model')
  , Group = Model.define('Group', function() {
  this.property('collection')
})


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
    if (typeof element !== 'object') return element
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
    if (typeof element === 'object') {
      if (!element.hasOwnProperty('_position'))
        Object.defineProperty(element, '_position', {
          value: null,
          writable: true
        })
      element._position = array._position + '.' + (array.indexOf(element))
      element.on('changed', array.emit.bind(array, 'changed'))
    }

    array.emit('added', element)
  }

  function removed(element) {
    if (byId[element._id] === element)
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
      result = Array.prototype.push.call(that, (element = adding(element)))
      added(element)
    })
    this.emit('changed')
    return result
  }

  array.add = function(element) {
    return this[this.push(element) - 1]
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
    result.forEach(function(element) {
      removed(element)
    })
    newElements.slice(2).forEach(function(element) {
      added(element)
    })

    array.emit('changed')
    return result
  }
  
  array.unshift = function() {
    var that = this
      , elements = Array.prototype.slice.call(arguments)
      , result
    elements.forEach(function(element) {
      result = Array.prototype.unshift.call(that, (element = adding(element)))
      added(element)
    })
    this.emit('changed')
    return result
  }

  array.reset = function(elements) {
    this.removeAllListeners()

    if (elements && elements.length > 0) {
      elements.unshift(0, array.length)
      array.splice.apply(array, elements)
    }

    return array.length
  }

  array.defineValue = function(name, fn) {
    if (name in this) return
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

  array.groupBy = function(prop) {
    var grouped = exports.Array(Group)
      , onChanged = grouped.emit.bind(grouped, 'changed')

    grouped.on('changed', function() {
      var i = 1
    })

    grouped.add = function(item) {
      var group = this.get(item[prop])
      if (!group) {
        var group = new Group({ collection: exports.Array(model) })
        group._id = item[prop]
        this.push(group)
        Object.defineProperty(group.collection, '_position', {
          value: group._position + '.collection'
        })
      }
      item = group.collection.add(item)
      item.on('changed', onChanged)
      item.on('changed:' + prop, function callback() {
        item.removeListener('changed:' + prop, callback)
        grouped.remove(item)
        grouped.add(item)
      })
    }

    grouped.get = grouped.find

    grouped.remove = function(item) {
      item.removeListener('changed', onChanged)
      var group = this.get(item._changedValues[prop])
      if (!group) return
      group.collection.splice(group.collection.indexOf(item), 1)
      if (group.collection.length === 0) {
        this.splice(this.indexOf(group), 1)
      }
    }

    this.forEach(grouped.add.bind(grouped))

    grouped.find = function(id) {
      for (var i = 0; i < this.length; ++i) {
        var result = this[i].collection.find(id)
        if (result) return result
      }
      return null
    }

    grouped.serialize = function() {
      var data =[]
      this.forEach(function(item) {
        data.push(item.serialize())
      })
      return { type: 'GroupedObservableArray:' + model._name + ':' + prop, obj: data }
    }

    grouped.deserialize = function(obj) {
      var that = this
      obj.forEach(function(item) {
        var record = new Group
        record.deserialize(item.obj)
        var items = record.collection
        record.collection = exports.Array(model)
        record.collection.reset(items)
        record.collection.forEach(function(item) {
          item.on('changed:' + prop, function callback() {
            item.removeListener('changed:' + prop, callback)
            that.remove(item)
            that.add(item)
          })
        })
        that.push(record)
      })
    }

    return grouped
  }

  return array
}
