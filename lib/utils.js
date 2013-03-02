exports.isServer  = process.title.indexOf('node') > -1
exports.isClient = !exports.isServer

exports.debug = function() {
  if (exports.isClient && window.debug === true)
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

var EventEmitter = require('./eventemitter')
exports.eventify = function(obj) {
  EventEmitter.eventify(obj)
}

// returns a random v4 UUID
// from: https://gist.github.com/982883
exports.UUID = function b(
  a                  // placeholder
){
  return a           // if the placeholder was passed, return
    ? (              // a random number from 0 to 15
      a ^            // unless b is 8,
      Math.random()  // in which case
      * 16           // a random number from
      >> a/4         // 8 to 11
      ).toString(16) // in hexadecimal
    : (              // or otherwise a concatenated string:
      [1e7] +        // 10000000 +
      -1e3 +         // -1000 +
      -4e3 +         // -4000 +
      -8e3 +         // -80000000 +
      -1e11          // -100000000000,
      ).replace(     // replacing
        /[018]/g,    // zeroes, ones, and eights with
        b            // random hex digits
      )
}

exports.series = function(arr, fn, done) {
  var arr = arr.slice()
  !function async() {
    if (arr.length === 0) return done ? done() : undefined
    fn(arr.shift(), async)
  }()
}

exports.chain = function(fn) {
  return new Chain(fn)
}

function Chain(fn) {
  var that = this
  this.queue = []
  this.waiting = false
  this.args = []
  this.callback = function() {
    that.args = Array.prototype.slice.call(arguments)
    var next = that.queue.shift()
    if (!next) return that.waiting = false
    that.waiting = true
    next.apply(null, that.args.concat(that.callback))
  }
  this.queue.push(fn)
  this.callback()
}

Chain.prototype.chain = function(fn) {
  this.queue.push(fn)
  if (!this.waiting) this.callback.apply(this, this.args)
  return this
}

exports.Wait = new EventEmitter
var wait = 0, waited = false
exports.wait = function(label) {
  waited = true
  ++wait
  // if (label) console.time(label)
  // console.log('wait ' + wait)
  // console.log((new Error).stack.split("\n")[2])
}
exports.done = function(label) {
  --wait
  // if (label) console.timeEnd(label)
  // console.log('done ' + wait)
  // console.log((new Error).stack.split("\n")[2])
  if (wait === 0) {
    exports.Wait.emit('ready')
    exports.Wait.removeAllListeners()
  }
}
exports.ready = function(fn) {
  if (exports.isReady) fn()
  else exports.Wait.on('ready', fn)
}
Object.defineProperty(exports, 'isReady', {
  enumerable: true,
  get: function() {
    return wait === 0 && waited
  }
})