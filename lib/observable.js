var utils = require('./utils')
  , Model = require('./model')
  , Contract = require('./serialization').Contract
  , Group = exports.Group = Model.define('Group', function() {
  this.property('collection')
})

exports.Array = function(values, model) {
  if (!model && !Array.isArray(values)) {
    model = values
    values = null
  }
  
  var array = values || new Array
    , byId = {}
    , positionModifier = 0

  utils.eventify(array)
  var contract = ['model']
  contract.id = 'ObservableArray'
  Object.defineProperty(array, '$contract', {
    value: contract
  })
  array.model = model
  
  function adding(element) {
    if (typeof element !== 'object') return element
    if (model && !(element instanceof model)) {
      element = new model(element)
      element.isNew = false
    }
    if (!'_id' in element) return element
    if (element._id) {
      byId[element._id] = element
    } else {
      if (gotEventified(element)) {
        function reassign() {
          byId[element._id] = element
          if (element._changedValues._id !== undefined
            ||element._changedValues._id !== null)
            delete byId[element._changedValues._id]
        }
        element.on('changed._id', reassign)
        element.once('removed', element.off.bind(null,'changed._id', reassign))
      }
    }
    return element
  }

  function added(element) {
    if (typeof element === 'object') {
      // element.on('changed', array.emit.bind(array, 'changed'))
      if (gotEventified(element)) {
        var onDestroy = array.remove.bind(array, element)
        element.once('destroy', onDestroy)
        element.once('removed', element.off.bind(null, 'destroy', onDestroy))
      }
    }

    array.emit('added', element)
  }

  function removed(element) {
    if (byId[element._id] === element)
      delete byId[element._id]
    array.emit('removed', element)
    element.emit('removed', array)
  }
  
  function reassignPositions() {
    for (var i = 0; i < array.length; ++i) {
      array[i]._index = i
    }
    positionModifier = 0
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

  array.remove = function(element) {
    var index = -1
    if ((index = this.indexOf(element)) === -1)
      return false
    return this.splice(index, 1)
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
    if (typeof elements === 'undefined') elements = []
    elements.unshift(0, array.length)
    array.splice.apply(array, elements)
    return array.length
  }
  
  array.groupBy = function(prop, sub) {
    var grouped = exports.Array(Group)
      , onChanged = grouped.emit.bind(grouped, 'changed')
      , onChangedPivot = function (item) {
          grouped.remove(item)
          grouped.add(item)
        }

    grouped.on('changed', function() {
      var i = 1
    })

    grouped.add = function(item) {
      var that = this
        , group = this.get(item[prop])
      if (!group) {
        var group = new Group({ collection: (sub ? new sub : exports.Array(model)) })
        group._id = item[prop]
        // group.collection.on('removed', function(element) {
        //   if (this.length === 0) {
        //     group.isNew = true
        //     group.destroy()
        //   }
        // })
        this.push(group)
        Object.defineProperty(group.collection, '_position', {
          value: group._position + '.collection'
        })
      }
      item = group.collection.add(item)
      if (gotEventified(item)) {
        item.on('changed', onChanged)
        item.once('changed.' + prop, onChangedPivot)
      }
    }

    grouped.get = grouped.find

    grouped.remove = function(item) {
      if (typeof item === 'undefined') return
      if (gotEventified(item)) {
        item.off('changed', onChanged)
        item.off('changed.' + prop, onChangedPivot)
      }
      var group = this.get(item._changedValues[prop])
      if (!group) return
      group.collection.splice(group.collection.indexOf(item), 1)
      if (group.collection.length === 0) {
        this.splice(this.indexOf(group), 1)
      }
    }

    grouped.find = function(id) {
      for (var i = 0; i < this.length; ++i) {
        var result = this[i].collection.find(id)
        if (result) return result
      }
      return null
    }

    this.forEach(grouped.add.bind(grouped))
    
    return grouped
  }
  
  array.forEach(function(item) {
    added(item)
  })

  return array
}

new Contract('ObservableArray', exports.Array, ['model'])

function gotEventified(obj) {
  return obj && typeof obj.EventEmitter === 'object'
}