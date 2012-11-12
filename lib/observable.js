var utils = require('./utils')
  , Model = require('./model')
  , implode = require('./implode')
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
  var contract = ['model', 'events']
  contract.id = 'ObservableArray'
  Object.defineProperty(array, '$contract', {
    value: contract,
    writable: true
  })
  array.model = model
  array.compareFunction = null
  
  function adding(element) {
    if (typeof element !== 'object') return element
    if (model && !(element instanceof model)) {
      element = new model(element)
      element.isNew = false
    }
    if (!('_id' in element)) return element
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
        element.once('removed', element.off.bind(element,'changed._id', reassign))
      }
    }
    return element
  }

  function added(element) {
    if (typeof element === 'object') {
      if (gotEventified(element)) {
        element.on('changed', array, 'emit', array, 'changed')
        element.once('destroy', array, 'remove', array, element)
      }
    }

    array.emit('added', element)
  }

  function removed(element) {
    if (byId[element._id] === element)
      delete byId[element._id]
    array.emit('removed', element)
    if (gotEventified(element)) {
      element.emit('removed', array)
      element.off('changed', array)
      element.off('destroy', array)
      if (array.compareFunction && array.compareFunction.affected) {
        array.compareFunction.affected.forEach(function(key) {
          element.off('changed.' + key, array)
        })  
      }
    }
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
    
    if (!this.compareFunction) {
      elements.forEach(function(element) {
        result = Array.prototype.push.call(that, (element = adding(element)))
        added(element)
      })
    } else {
      elements.forEach(function(element) {
        var idx = binarySearch(that, element, true, that.compareFunction)
        Array.prototype.splice.call(that, idx, 0, (element = adding(element)))
        added(element)
        if (that.compareFunction.affected) {
          that.compareFunction.affected.forEach(function(key) {
            element.on('changed.' + key, that, 'reinsert', that, element)
          })  
        }
      })
    }
    
    this.emit('changed')
    return result
  }

  array.add = function(element) {
    return this[this.push(element) - 1]
  }

  var remove = array.remove = function(element) {
    var index = -1
    if ((index = this.indexOf(element)) === -1)
      return false
    return this.splice(index, 1)
  }

  array.reverse = function() {
    this.unsort()
    Array.prototype.reverse.apply(this, arguments)
    this.emit('changed')
  }
  
  array.shift = function() {
    var result = Array.prototype.shift.apply(this, arguments)
    removed(result)
    this.emit('changed')
    return result
  }

  array.sort = function(compareFunction) {
    var that = this
    
    this.compareFunction = compareFunction || function(lhs, rhs) {
      if (lhs < rhs) return -1
      if (lhs === rhs) return 0
      else return 1
    }
    var sorted = mergeSort(this, this.compareFunction)
    for (var i = 0; i < sorted.length; ++i) {
      this[i] = sorted[i]
    }

    if (model) {
      var tmp1 = new model
        , tmp2 = new model
      
      this.compareFunction.affected = []
      this.compareFunction.fragment = {
        observe: function(_, key) {
          if (that.compareFunction.affected.indexOf(key) === -1)
            that.compareFunction.affected.push(key)
        }
      }
      this.compareFunction(tmp1, tmp2)
      delete this.compareFunction.fragment
      
      this.forEach(function(element) {
        that.compareFunction.affected.forEach(function(key) {
          element.on('changed.' + key, that, 'reinsert', that, element)
        })  
      })
    }

    array.emit('changed')
  }
  
  array.unsort = function() {
    var that = this
    if (this.compareFunction && this.compareFunction.affected) {
      this.forEach(function(element) {
        that.compareFunction.affected.forEach(function(key) {
          element.off('changed.' + key, that, 'reinsert')
        })
      })
    }
    this.compareFunction = null
  }
  
  array.reinsert = function(element) {
    var index = this.indexOf(element)
    if (index === -1) return
    
    this.splice(index, 1)
    this.push(element)
    
    if (this.compareFunction && index !== this.indexOf(element)) {
      // throw moved event
    }
  }
  
  array.splice = function() {
    var args = Array.prototype.slice.call(arguments)
      , index = args.shift()
      , howMany = args.shift()
      , newElements = []
      , that = this

    args.forEach(function(element) {
      newElements.push(element)
    })
    
    if (!this.compareFunction) {
      for (var i = 0; i < newElements.length; ++i)
        newElements[i] = adding(newElements[i])
      args = [index, howMany].concat(newElements)
    } else {
      args = [index, howMany]
    }
    
    var result = Array.prototype.splice.apply(this, args)
    result.forEach(function(element) {
      removed(element)
    })
    
    if (this.compareFunction) {
      this.push.apply(this, newElements)
    }
    
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
    
    if (!this.compareFunction) {
      elements.forEach(function(element) {
        result = Array.prototype.unshift.call(that, (element = adding(element)))
        added(element)
      })
    } else {
      this.push.apply(this, elements)
    }
    
    this.emit('changed')
    return result
  }

  array.reset = function(elements) {
    this.unsort()
    if (typeof elements === 'undefined') elements = []
    elements.unshift(0, array.length)
    array.splice.apply(array, elements)
    return array.length
  }
  
  Object.defineProperty(array, 'size', {
    get: function() {
      if (typeof arguments.callee.caller.fragment != 'undefined')
        arguments.callee.caller.fragment.observe(array)

      return array.length
    }
  })
  
  array.groupBy = exports.GroupedArray.bind(array, model)
    
  array.forEach(function(item) {
    added(item)
  })

  return array
}

exports.GroupedArray = function(model, prop, sub) {
  var grouped = exports.Array(Group)  
  grouped.prop = prop
  grouped.$contract.id = 'ObservableGroupedArray'
  grouped.$contract.push('prop')
  
  grouped.check = function(group) {
    if (group.collection.length === 0) {
      group.off('changed', this)
      group.destroy()
    }
  }
  
  grouped.pivotChanged = function(item) {
    this.remove(item, true)
    this.add(item)
  }

  grouped.add = function(item) {
    var group = this.get(item[this.prop])
    if (!group) {
      group = new Group({ collection: (sub ? new sub : exports.Array(model)) })
      group._id = item[this.prop]
      group.isNew = true
      group.collection.on('removed', this, 'check', this, group)
      group.collection.on('changed', this, 'emit', this, 'changed')
      this.push(group)
    }
    item = group.collection.add(item)
    if (gotEventified(item))
      item.once('changed.' + this.prop, this, 'pivotChanged', this, item)
  }

  grouped.get = grouped.find
  
  
  var remove = function(element) {
    var index = -1
    if ((index = this.indexOf(element)) === -1)
      return false
    return this.splice(index, 1)
  }

  grouped.remove = function(item, move) {
    if (typeof item === 'undefined') return
    if (item instanceof Group)
      return remove.call(this, item)
    if (gotEventified(item))
      item.off('changed.' + this.prop, this)
    var group = this.get(move ? item._changedValues[this.prop] : item[this.prop])
    if (!group) return
    group.collection.remove(item)
  }

  grouped.find = function(id) {
    for (var i = 0; i < this.length; ++i) {
      var result = this[i].collection.find(id)
      if (result) return result
    }
    return null
  }
  
  if (this.length > 0)
    this.forEach(grouped.add.bind(grouped))
  
  return grouped
}

implode.register('ObservableArray', exports.Array, ['model', 'events'])
implode.register('ObservableGroupedArray', exports.GroupedArray, ['model', 'events'])

function gotEventified(obj) {
  return obj && typeof obj.emit === 'function'
}

var merge = function(lhs, rhs, compareFunction) {
  var result = []
  
  while (lhs.length && rhs.length) {
    if (compareFunction(lhs[0], rhs[0]) < 1)
      result.push(lhs.shift())
    else
      result.push(rhs.shift())
  }
  
  while (lhs.length)
    result.push(lhs.shift())
  
  while (rhs.length)
    result.push(rhs.shift())
  
  return result
}

function mergeSort(arr, compareFunction) {
  if (arr.length < 2)
    return arr
  
  var middle = parseInt(arr.length / 2)
  var left   = arr.slice(0, middle)
  var right  = arr.slice(middle, arr.length)
  
  return merge(mergeSort(left, compareFunction),
               mergeSort(right, compareFunction),
               compareFunction)
}

// modified version of
//+ Carlos R. L. Rodrigues
//@ http://jsfromhell.com/array/search [rev. #2]
// o: array that will be looked up
// v: object that will be searched
// b: if true, the function will return the index where the value should be inserted to keep the array ordered, otherwise returns the index where the value was found or -1 if it wasn't found
function binarySearch(o, v, i, compareFunction){
    var h = o.length, l = -1, m
    while(h - l > 1)
        if(compareFunction(o[m = h + l >> 1], v) < 1) l = m
        else h = m
    return o[h] != v ? i ? h : -1 : h
}