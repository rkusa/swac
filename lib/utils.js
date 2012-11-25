exports.isServer  = process.title.indexOf('node') > -1
exports.isBrowser = !exports.isServer

exports.debug = function() {
  if (exports.isBrowser)
    console.log.apply(console, arguments)
}

exports.aquireFragments = function(start, fragments, accept) {
  if (!accept) accept = function() { return true; }
  var treeWalker = document.createTreeWalker(start, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT, {
    acceptNode: function(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        for (var i = 0; i < node.attributes.length; ++i) {
          var attr = node.attributes.item(i)
          if (attr.nodeName.lastIndexOf('data-bind-', 0) === 0) {
            var name = attr.nodeName.substr(10)
              , fragment = fragments[attr.nodeValue]
            fragment.attribute = node.attributes.getNamedItem(name)
          }
        }
        return NodeFilter.FILTER_SKIP
      }
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

exports.mergeTemplate = function(x) {
  var o = [];
  for(var i=0; x && i<x.length; ++i) {
    var n = x[i] || '';
    if(n === undefined) continue;
    else if(n.html !== undefined) o.push(n.html.call ? n.html() : n.html);
    else if(n.slice && !n.substr) o.push(mergeResult(n));
    else o.push(String(n).replace(/&(?!(\w+|\#\d+);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
  }
  return o.join('');
}

var EventEmitter = require('./eventemitter')
exports.eventify = function(obj) {
  EventEmitter.eventify(obj)
}