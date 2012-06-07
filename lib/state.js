var State = module.exports = function() {
    this.templates = []
    this.fragments = []
  }
  , Model = require('./model')
  , Collection = require('./collection')
  , Template = require('./template')
  , Fragment = require('./fragment')

State.prototype.register = function(name, value) {
  this[name] = value
  Object.defineProperty(value, '_position', {
    value: name
  })
}

function serialize (that) {
  var obj = null
  if (Array.isArray(that)) {
    obj = []
    for (var i in that)
      obj[i] = serialize(that[i])
  } else if (typeof that.serialize === 'function') {
    obj = that.serialize()
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
        case 'Collection': prop = new Collection.collections[type[1]](Model.models[type[2]]); break
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
    if (!that[key] && key != 'fragments' && key != 'templates')
      that[key] = deserialize(obj[key])
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