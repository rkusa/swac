var EventEmitter = module.exports = function() {
}

EventEmitter.prototype.on = function() {
  var args = Array.prototype.slice.call(arguments)
  args.splice(1, 0, undefined)
  this.many.apply(this, args)
}

EventEmitter.prototype.once = function() {
  var args = Array.prototype.slice.call(arguments)
  args.splice(1, 0, 1)
  this.many.apply(this, args)
}

// many(event, ttl, fn[, context[, arg1[, arg2[, ... argN]]]])
// many(event, ttl, origin, fn[, context[, arg1[, arg2[, ... argN]]]])
EventEmitter.prototype.many = function() {
  var args = Array.prototype.slice.call(arguments)
    , event = args.shift(), ttl = args.shift()
    , fn = args.shift(), origin
  if (typeof fn !== 'function') {
    origin = fn
    fn = args.shift()
  }
  var context = args.shift()
  
  if (!this.events)
    this.events = {}
  if (!this.events[event])
    this.events[event] = []
  var search = this.events[event].filter(function(item) {
    return item.origin === origin && item.fn === fn && item.context === context
  })
  if (search.length > 0) return
  this.events[event].push({
    origin: origin,
    fn: fn,
    context: context,
    args: args,
    ttl: ttl
  })
}

// emit(event[, arg1[, arg2[, ... argN]]]])
EventEmitter.prototype.emit = function() {
  var args = Array.prototype.slice.call(arguments)
    , event = args.shift()

  if (!this.events) return
  if (!this.events[event] || this.events[event].length === 0)
    return
  
  for (var i = this.events[event].length - 1; i >= 0; --i) {
    var e = this.events[event][i]
      , fn = (typeof e.fn === 'function' ? e.fn : e.origin[e.fn])
    
    if (e.ttl !== undefined && --e.ttl < 1) {
      this.events[event].splice(i, 1)
    }
    fn.apply((e.context || e.origin), e.args)
  }
}

EventEmitter.prototype.off =
EventEmitter.prototype.removeAllListeners = function(event, origin, fn) {
  if (!this.events) return
  if (!event) {
    this.events = {}
    return
  }
  if (!this.events[event]) return

  if (typeof origin === 'function') {
    fn = origin
    origin = undefined
  }
  
  for (var i = this.events[event].length - 1; i >= 0; --i) {
    var e = this.events[event][i]
    
    if ((origin && e.origin === origin && (!fn || fn === e.fn))
     || (!e.origin && fn === e.fn)) this.events[event].splice(i, 1)
  } 
}

module.exports.eventify = function(obj) {
  if (typeof obj === 'function') obj = obj.prototype
  Object.keys(EventEmitter.prototype).forEach(function(method) {
    obj[method] = EventEmitter.prototype[method]
  })
}
