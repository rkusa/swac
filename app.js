var isBrowser = typeof window != 'undefined'
  , isServer  = !isBrowser
  , Model = require('./model')
  , Collection = require('./collection')
  , Fragment = require('./fragment')
  , App = require('./shared')
  , root
  , render

if (isBrowser) {
	$(function() {
    page()
	})
	render = function(locals) {
	}
} else {
	render = function(app, req, res, locals) {
		res.render('index', app)
	}
}

var initialized = false
var route = function(method, path, action, rdy) {
  var that = this
    , callback = function(app, cb) {
      if (!isBrowser || initialized) action(app, cb)
      if (isBrowser && rdy) rdy(window.app)
    }
  var fn = function(app, cb) {
    if (isBrowser && app.path == path) return callback(app, cb)
    that.parent(app, callback.bind(null, app, cb))
  }
  var bla = function(req, res) {
    var app = isBrowser ? window.app : new App
    fn.call(this, app, function() {
      app.path = path
      render(app, req, res)
    })
    initialized = true
  }
  if (isBrowser) page(path, bla)
  else express.get(path, bla)

  return {
    get: route.bind({ parent: fn }, 'GET'),
    post: route.bind({ parent: fn }, 'POST')
  }
}
var context = { parent: function(app, cb) {
    cb()
  }}
  , get = route.bind(context, 'GET')
  , post = route.bind(context, 'POST')




var Todo = Model.define('Todo', function() {
  this.property('id')
	this.property('todo')
  this.property('isDone')
})

Todo.list(function() {
  var arr = []
  Object.keys(db).forEach(function(key) {
    arr.push(db[key])
  })
  return arr
})
Todo.get(function(id) {
  return db[id]
})
Todo.put(function(id, props) {
  var todo
  if (!(todo = db[id])) return false
  Object.keys(props).forEach(function(key) {
    if (todo.hasOwnProperty(key)) todo[key] = props[key]
  })
  return todo
})
Todo.post(function(props) {
  var id = 1
  while (db[id]) id++
  props['id'] = id
  db[id] = new Todo(props)
  return db[id]
})
Todo.delete(function(id) {
  delete db[id]
  return true
})

var Todos = Collection.define('Todos', function() {
  this.filter('itemsLeft', function() {
    var count = 0
    this._collection.forEach(function(todo) {
      if (!todo.isDone) ++count
    })
    return count
  })
})

root = get('/', function(app, render) {
  app.register('todos', new Todos(Todo))

	app.todos.reset([
		{ todo: 'Eins', isDone: true },
		{ todo: 'Zwei', isDone: false }
	])

	render()
}, function(app) {
  // $('#new-todo').on('keypress', function(e) {
  //   if (e.keyCode == 13) app.todos.add(new Todo({ todo: $(this).val(), isDone: false }))
  // })
})