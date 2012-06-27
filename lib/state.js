var State = module.exports = function() {
    this.templates = []
    this.fragments = []
  }
  , Model = require('./model')
  , Template = require('./template')
  , Fragment = require('./fragment')
  , Observable = require('./observable')

State.prototype.register = function(name, obj) {
  if (this.hasOwnProperty(name)) return
  var value = null
  Object.defineProperty(this, name, {
    get: function() {
      return value
    },
    set: function(newValue) {
      var oldValue = value
      value = newValue
      if (!value.hasOwnProperty('_position'))
        Object.defineProperty(value, '_position', {
          value: name
        })
      if (oldValue) oldValue.emit('changed:all')
    },
    enumerable: true
  })
  this[name] = obj
  console.log(name)
  console.log(this[name])
}

State.prototype.block = function(fn) {
  var ret = ''

  var template = new Template(this.templates.length, fn)
  this.templates[template.id] = template

  var fragment = new Fragment(this.fragments.length, template, this)
  this.fragments[fragment.id] = fragment

  ret += '<!---{' + fragment.id + '-->'
  ret += fragment.render()
  ret += '<!---' + fragment.id + '}-->'

  return this.safe(ret)
}

State.prototype.collection = function(context, fn) {
  console.log(context)
  var that = this
    , ret = ''

  var template = new Template(this.templates.length, fn)
  this.templates[template.id] = template

  var list = new Fragment(this.fragments.length, template, context, this)
  this.fragments[list.id] = list

  ret += '<!---{' + list.id + '-->'

  for (var i = 0; i < context.length; ++i) {
    var fragment = new Fragment(this.fragments.length, template, context[i], this)
    fragment.parent = list.context
    this.fragments[fragment.id] = fragment

    ret += '<!---{' + fragment.id + '-->'
    ret += fragment.render()
    ret += '<!---' + fragment.id + '}-->'
  }

  ret += '<!---' + list.id + '}-->'

  return this.safe(ret)
}

function serialize (that) {
  if (typeof that === 'undefined') return
  var obj = null
  if (typeof that.serialize === 'function') {
    obj = that.serialize()
  } else if (Array.isArray(that)) {
    obj = []
    for (var i in that)
      obj[i] = serialize(that[i])
  }
  return obj
}

State.prototype.serialize = function() {
  var that = this
    , obj = {}
  Object.keys(this).forEach(function(key) {
    var serialized
    if (serialized = serialize(that[key]))
      obj[key] = serialized
  })
  obj['path'] = this.path
  return JSON.stringify(obj)
}

function deserialize (that) {
  if (typeof that === 'object') {
    if (Array.isArray(that)) {
      var obj = []
      for (var i in that) {
        obj[i] = deserialize(that[i])
      }
      return obj
    } else if (that.type && that.obj) {
      var type = that.type.split(':')
        , prop
      switch (type[0]) {
        case 'Model':      prop = new Model.models[type[1]];             break
        case 'ObservableArray': prop = Observable.Array(Model.models[type[1]]); break
        case 'Template':   prop = new Template();                        break
        case 'Fragment':   prop = new Fragment();                        break
      }
      prop.deserialize(that.obj)
      return prop
    } else {
      return that
    }
  } else {
    return that
  }
}

State.prototype.deserialize = function(obj) {
  var that = this
  Object.keys(obj).forEach(function(key) {
    if (!that[key] && key != 'fragments' && key != 'templates') {
      var value = deserialize(obj[key])
      if (typeof value.emit === 'function')
        that.register(key, value)
      else
        that[key] = value
    }
  })
  that.path = obj.path
  that.templates = deserialize(obj.templates)
  $(function() {
    that.fragments = deserialize(obj.fragments)
    var treeWalker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT, {
      acceptNode: function(node) {
        return node.nodeValue[0] == '-' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
      }
    })
    while(treeWalker.nextNode()) {
      var value = treeWalker.currentNode.nodeValue, res
      if (res = value.match(/\-(\{(\d+))|((\d+)\})/)) {
        var fragment = that.fragments[res[2] || res[4]]
        if (res.index) /* closing */ fragment.endNode = treeWalker.currentNode
        else           /* opening */ fragment.startNode = treeWalker.currentNode
      }
    }
  })
  return this
}