var Observer = module.exports = function(target) {
  this.listener = new PathNode

  new NestedObserver(this, target)
}

var implode = require('implode')
implode.register('swac/Observer', Observer, ['listener'])

Observer.prototype.add = function(fragment, path) {
  (function traverse(path, listener) {
    var part = path.shift()

    if (!listener.children[part]) {
      listener.children[part] = new PathNode
    }

    if (path.length === 0) {
      listener.children[part].listener[fragment.id] = fragment
    } else {
      traverse(path, listener.children[part])
    }
  })(path.slice(), this.listener)
}

Observer.prototype.handle = function(change) {
  if (change.type === 'add') return

  var part, listener = this.listener
  while (change.path.length) {
    part = change.path.shift()
    if (listener) listener = listener.children[part]
  }

  if (listener) {
    listener.notify()
  }
}

var NestedObserver = function(root, target, path) {
  this.root = root
  this.path = path || []

  Object.observe(target, this.handle.bind(this))
}

NestedObserver.prototype.handle = function(changes) {
  changes.forEach(function(change) {
    if (change.name[0] === '$') return

    var path = this.path.concat(change.name)

    if (change.type !== 'delete' && typeof change.object[change.name] === 'object') {
      new NestedObserver(this.root, change.object[change.name], path.slice())
    }

    this.root.handle({
      type: change.type,
      path: path
    })
  }, this)
}

var PathNode = function() {
  this.children = {}
  this.listener = {}
}

implode.register('swac/PathNode', PathNode, ['children', 'listener'])

PathNode.prototype.notify = function() {
  for (var key in this.children) {
    this.children[key].notify()
  }

  for (var id in this.listener) {
    var fragment = this.listener[id]
    fragment.refresh()
    console.log('notify', fragment)
  }
}