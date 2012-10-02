exports.isServer  = process.title.indexOf('node') > -1
exports.isBrowser = !exports.isServer

exports.debug = function() {
  if (exports.isBrowser)
    console.log.apply(console, arguments)
}

exports.aquireFragments = function(start, fragments, accept) {
  if (!accept) accept = function() { return true; }
  var treeWalker = document.createTreeWalker(start, NodeFilter.SHOW_COMMENT, {
    acceptNode: function(node) {
      return accept(node) &&
        node.nodeValue[0] == '-'
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP
    }
  })
  while(treeWalker.nextNode()) {
    var value = treeWalker.currentNode.nodeValue, res
    if (res = value.match(/\-(\{(\d+))|((\d+)\})/)) {
      var fragment = fragments[res[2] || res[4]]
      if (res.index) /* closing */ fragment.endNode = treeWalker.currentNode
      else           /* opening */ fragment.startNode = treeWalker.currentNode
    }
  }
}

var EventEmitter2 = require('eventemitter2').EventEmitter2
exports.eventify = function(obj) {
  Object.defineProperty(obj, 'EventEmitter', {
    value: new EventEmitter2({ wildcard: true })
  });
  ['emit', 'on', 'once', 'many', 'off', 'removeAllListeners'].forEach(function(method) {
    Object.defineProperty(obj, method, {
      value: obj.EventEmitter[method].bind(obj.EventEmitter)
    })
  })
}

exports.makeTrackable = function(obj, position) {
  if (!obj.hasOwnProperty('_position')) {
    Object.defineProperty(obj, '_position', {
      value: null,
      writable: true,
      configurable: true
    })
  }
  if (position && typeof position === 'string')
    obj._position = position
  return obj
}