var utils = require('./utils')
  , Model = require('./model')
  , implode = require('implode')
  , Group = exports.Group = Model.define('Group', function() {
  this.property('collection')
  this.property('keepIfEmpty')
})

exports.Array = function(values, model) {
  if (!model && !Array.isArray(values)) {
    model = values
    values = null
  }
  
  var array = new Array
    , byId = {}
    , positionModifier = 0

  utils.eventify(array)
  var contract = ['model', 'events', 'compareFunction']
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
    if (!('id' in element)) return element
    if (element.id !== undefined) {
      byId[element.id] = element
    } else {
      if (gotEventified(element)) {
        element.on('changed.id', array, 'reassign', array, element)
        element.once('removed', element, 'off', element, 'changed.id', array, 'reassign')
      }
    }
    return element
  }

  function added(element, index) {
    if (typeof element === 'object') {
      if (gotEventified(element)) {
        element.on('changed', array, 'emit', array, 'changed')
        element.once('destroy', array, 'remove', array, element)
      }
    }
    
    array.emit('added', element, index)
  }

  function removed(element) {
    if (byId[element.id] === element)
      delete byId[element.id]
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

  array.reassign = function(element) {
    byId[element.id] = element
    if (element._changedValues.id !== undefined
     || element._changedValues.id !== null)
      delete byId[element._changedValues.id]
  }

  array.find = array.get = function(id) {
    return byId[id]
  }
  
  array.pop = function() {
    var result = Array.prototype.pop.apply(this, arguments)
    removed(result)
    this.emit('changed')
    return result
  }

  function push(element) {
    if (!array.compareFunction) {
      var result = Array.prototype.push.call(array, (element = adding(element)))
      added(element)
      return result - 1
    } else {
      var idx = binarySearch(array, element, true, array.compareFunction)
      Array.prototype.splice.call(array, idx, 0, (element = adding(element)))
      // array have to be appended to the event queue
      // because if multiple items should be inserted
      // the position of each can depend on each other
      // setTimeout(function() {
        added(element, idx)
        if (array.compareFunction.affected) {
          array.compareFunction.affected.forEach(function(key) {
            element.on('changed.' + key, array, 'move', array, element)
          })  
        }
      // })
      return idx
    }
  }
  
  array.push = function() {
    var that = this
      , elements = Array.prototype.slice.call(arguments)

    elements = elements.filter(function(el) {
      return el !== null && el !== undefined
    })
    
    elements.forEach(function(element) {
      push(element)
    })

    this.emit('changed')
    return this.length
  }
  
  array.add = function(element) {
    element = this[push(element)]
    this.emit('changed')
    return element
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
      // if (gotEventified(this[i]))
      //   this[i].emit('moved', i)
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
          element.on('changed.' + key, that, 'move', that, element)
        })  
      })
    }

    array.emit('changed')
  }
  
  array.sortBy = function(prop) {
    var fn = function sort(lhs, rhs) {
      // console.log(sort.prop)
      var prop = sort.prop
      if (!lhs[prop] && !rhs[prop]) return 0
      if (!lhs[prop]) return -1
      if (!rhs[prop]) return 1
      var a = typeof lhs[prop] === 'string' ? lhs[prop].toLowerCase() : lhs[prop] 
        , b = typeof rhs[prop] === 'string' ? rhs[prop].toLowerCase() : rhs[prop] 
      if (a < b) return -1
      if (a === b) return 0
      else return 1
    }
    fn.prop = prop
    this.sort(fn)
  }
  
  array.unsort = function() {
    var that = this
    if (this.compareFunction && this.compareFunction.affected) {
      this.forEach(function(element) {
        that.compareFunction.affected.forEach(function(key) {
          element.off('changed.' + key, that, 'move')
        })
      })
    }
    this.compareFunction = null
  }
  
  array.move = function(element) {
    var index = this.indexOf(element)
    if (index === -1) return
    
    Array.prototype.splice.call(this, index, 1)
    var idx = binarySearch(this, element, true, this.compareFunction)
    Array.prototype.splice.call(this, idx, 0, element)
    
    if (gotEventified(element))
      element.emit('moved', idx)
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
    } else {    
      for (var i = 0; i < newElements.length; ++i)
        newElements[i] = added(newElements[i], index + i)
    }
    
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
        added(element, 0)
      })
    } else {
      this.push.apply(this, elements)
    }
    
    this.emit('changed')
    return result
  }

  array.reset = function(elements) {
    if (typeof elements === 'undefined') elements = []
    array.splice.apply(array, [0, array.length].concat(elements))
    return array.length
  }
  
  array.save = function(callback) {
    var waitFor = this.length
      , cb = function() {
      if (--waitFor === 0 && callback) callback()
    }
    this.forEach(function(item) {
      item.save(cb)
    })
  }
  
  Object.defineProperty(array, 'size', {
    get: function() {
      if (typeof arguments.callee.caller.fragment != 'undefined')
        arguments.callee.caller.fragment.observe(array)

      return array.length
    }
  })
  
  array.groupBy = exports.GroupedArray.bind(array, model)
  
  var defaultMethods = ['map', 'filter', 'reduce']
  defaultMethods.forEach(function(method) {
    array[method] = function custom(fn, arg1) {
      fn.fragment = custom.caller.fragment
      var result = Array.prototype[method].call(array, function() {
        var args = Array.prototype.slice.call(arguments)
        return fn.apply(array, args)
      }, arg1)
      return Array.isArray(result) ? exports.Array(result, model) : result
    }
  })
  
  array.$deserialize = function(obj) {
    if (typeof obj.compareFunction === 'function')
      obj.sort(obj.compareFunction)
    return obj
  }
  
  if (values && Array.isArray(values)) {
    values.forEach(function(item) {
      array.push(item)
    })
  }

  return array
}

exports.GroupedArray = function(model, prop, sub) {
  var grouped = exports.Array(Group)  
  grouped.prop = prop
  grouped.$contract.id = 'ObservableGroupedArray'
  grouped.$contract.push('prop')
  grouped.compareFunction = null
  
  grouped.check = function(group) {
    if (!group.keepIfEmpty && group.collection.length === 0) {
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
      group = this.createGroup(item[this.prop])
      this.push(group)
    }
    item = group.collection.add(item)
    
    if (gotEventified(item))
      item.once('changed.' + this.prop, this, 'pivotChanged', this, item)
  }

  grouped.reset = function(items) {
    // empty
    for (var i = this.length - 1; i >= 0; --i)
      this[i].collection.reset()
    
    var that = this
    this.forEach(function(group) {
      that.check(group)
    })
    
    // insert
    if (items)
      items.forEach(this.add.bind(this))
  }

  grouped.createGroup = function(key, keepIfEmpty) {
    var group = new Group({
      collection: (sub ? new sub : exports.Array(model)),
      keepIfEmpty: keepIfEmpty === true
    })
    group.id = key
    group.isNew = true
    group.collection.on('removed', this, 'check', this, group)
    group.collection.on('changed', this, 'emit', this, 'changed')
    if (this.compareFunction) {
      group.collection.sort(this.compareFunction)
    }
    return group
  }
  
  grouped.sort = function(compareFunction) {
    var that = this
    
    this.compareFunction = compareFunction || function(lhs, rhs) {
      if (lhs < rhs) return -1
      if (lhs === rhs) return 0
      else return 1
    }
    
    this.forEach(function(group) {
      group.collection.sort(that.compareFunction)
    })
  }
  
  grouped.unsort = function() {
    var that = this
    this.forEach(function(group) {
      group.collection.unsort(that.compareFunction)
    })
    this.compareFunction = null
  }

  grouped.get = grouped.find
  
  grouped.getOrCreate = function(id) {
    var group = this.get(id)
    if (!group) {
      group = this.createGroup(id, true)
      this.push(group)
    }
    group.keepIfEmpty = true
    return group
  }
  
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
  
  grouped.$deserialize = function(obj) {
    var compareFunction
    eval('compareFunction = ' + obj.compareFunction)
    obj.compareFunction = compareFunction
    return obj
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