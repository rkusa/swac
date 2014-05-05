exports.isClient = typeof window !== 'undefined' && !!window.document
exports.isServer = !exports.isClient

function quotedString(str) {
  return '"' + str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u2028/g, '\\u2028')   // Per Ecma-262 7.3 + 7.8.4
    .replace(/\u2029/g, '\\u2029') + '"'
}

exports.objectLiteral = function(obj) {
  var pairs = []

  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'object') {
        pairs.push(quotedString(key) + ':' + exports.objectLiteral(obj[key]))
      } else {
        var isRaw = typeof obj[key] === 'number' || key === '$fn'
        pairs.push(quotedString(key) + ':' + (isRaw ? obj[key] : JSON.stringify(obj[key])))
      }
    }
  }

  return '{' + pairs.join(',') + '}'
}

exports.aquireFragments = function(start, fragments, accept) {
  if (!accept) accept = function() { return true; }
  var treeWalker = document.createTreeWalker(start, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT, function(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      // for (var i = 0; i < node.attributes.length; ++i) {
      //   var attr = node.attributes.item(i)
      //   if (attr.nodeName.lastIndexOf('data-bind-', 0) === 0) {
      //     var name = attr.nodeName.substr(10)
      //       , fragment = fragments[parseInt(attr.value)]
      //     fragment.attribute = node.attributes.getNamedItem(name)
      //     fragment.ownerElement = node
      //   }
      // }
      return NodeFilter.FILTER_SKIP
    }
    return accept(node) &&
      node.nodeValue[0] == '-'
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP
  }, false)
  while(treeWalker.nextNode()) {
    var value = treeWalker.currentNode.nodeValue, res
    if (res = value.match(/\-(\{(\d+))|((\d+)\})/)) {
      var fragment = fragments[res[2] || res[4]]
      if (res.index) /* closing */ fragment.endNode = treeWalker.currentNode
      else           /* opening */ fragment.startNode = treeWalker.currentNode
    }
  }
}