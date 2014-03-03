exports.isClient = typeof window !== 'undefined' && !!window.document
exports.isServer = !exports.isClient

Object.defineProperty(exports, 'requestContext', {
  get: function() {
    return exports.isClient ? window.app : process.domain.app
  }
})

exports.debug = function() {
  if (exports.isClient && typeof window !== 'undefined' && typeof window.swac !== 'undefined' && window.swac.debug === true)
    console.log.apply(console, arguments)
}

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: { value: ctor, enumerable: false }
  })
}

exports.aquireFragments = function(start, fragments, accept) {
  if (!accept) accept = function() { return true; }
  var treeWalker = document.createTreeWalker(start, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT, function(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      for (var i = 0; i < node.attributes.length; ++i) {
        var attr = node.attributes.item(i)
        if (attr.nodeName.lastIndexOf('data-bind-', 0) === 0) {
          var name = attr.nodeName.substr(10)
            , fragment = fragments[parseInt(attr.value)]
          fragment.attribute = node.attributes.getNamedItem(name)
        }
      }
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

var EventEmitter = require('events').EventEmitter
  , proxy = require('node-eventproxy')
exports.eventify = function(constructor) {
  for (var method in EventEmitter.prototype) {
    constructor.prototype[method] = EventEmitter.prototype[method]
  }
  proxy.enable(constructor)
  constructor.prototype.off = constructor.prototype.removeListener
  constructor.prototype._maxListeners = 20
}

var Observer = function(event) {
  this.event = event
  this.args = []
}

Observer.prototype.until = function(event, target) {
  this.until = event
  this.untilTarget = target
  return this
}

Observer.prototype.withArgs = function() {
  this.args.push.apply(this.args, Array.prototype.slice.call(arguments))
  return this
}

Observer.prototype.call = function(target, method) {
  this.target = target
  this.method = method
  return this
}

Observer.prototype.on = function(target, method) {
  var proxied = proxy.apply(null, [this.target, this.method, this.target].concat(this.args))
  target.off(this.event, proxied)
  target[method || 'on'](this.event, proxied)
  if (!this.until) return
  proxied = proxy(target, 'off', target, this.event, proxied);
  (this.untilTarget || target).off(this.until, proxied);
  (this.untilTarget || target).once(this.until, proxied)
}

Observer.prototype.once = function(target) {
  this.on(target, 'once')
}

exports.observe = function(event) {
  return new Observer(event)
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
    fn(arr.shift(), async, arr.length)
  }()
}

var Factory = exports.Factory = function(/* base[, args...] */) {
  this.args = Array.prototype.slice.call(arguments)
  this.base = this.args.shift()
}

require('implode').register('Factory', Factory, ['args', 'base'])

Factory.prototype.new = function() {
  var args = Array.prototype.slice.call(arguments)
    , that = this
  function F() {
    return that.base.apply(this, that.args.concat(args))
  }
  F.prototype = this.base.prototype
  return new F()
}

exports.serializeForm = function(form) {
  var values = [], el
  [].slice.call(form.elements).forEach(function(el) {
    console.dir(el)
    var type = el.getAttribute('type')
    if (el.nodeName.toLowerCase() !== 'fieldset' &&
      !el.disabled && type !== 'submit' && type !== 'reset' && type !== 'button' &&
      ((type !== 'radio' && type !== 'checkbox') || el.checked)) {

      values.push(encodeURIComponent(el.getAttribute('name')) + '=' + encodeURIComponent(el.value))
    }
  })
  return values.join('&')
}