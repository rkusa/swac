var route
  , isBrowser = typeof window != 'undefined'
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



_route = function(path, callback) {
  var that = this
  var fn = function(app, cb) {
    that.parent(app, callback.bind(null, app, cb))
  }
  var get = function(req, res) {
    var app = isBrowser ? window.app : new App
    app.path = path
    fn.call(this, app, render.bind(render, app, req, res))
  }
  if (isBrowser) page(path, get)
  else express.get(path, get)

  return {
    route: _route.bind({ parent: fn })
  }
}
route = _route.bind({ parent: function(app, cb) {
  cb()
} })





var State = Model.define("State", function() {
  this.property('page')
})
var Todo = Model.define('Todo', function() {
	this.property('todo')
  this.property('isDone')
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

root = route('/', function(app, render) {
  console.log('/')
	app.register('state', new State)
  app.register('todos', new Todos(Todo))

	app.todos.reset([
		{ todo: 'Eins', isDone: true },
		{ todo: 'Zwei', isDone: false }
	])

	render()
})

root.route('/2', function(app, render) {
  console.log('/2')
	
  app.todos.reset([
    { todo: 'Drei', isDone: true },
    { todo: 'Vier', isDone: false }
  ])

	render()
}).route('/4', function(app, render) {
  console.log('/4')
  app.todos.reset([
    { todo: 'FUNZT', isDone: true }
  ])
  render()
})

root.route('/3', function(app, render) {
  console.log('/3')
  
  app.todos.reset([
    { todo: 'Fünf', isDone: true },
    { todo: 'Sechs', isDone: false }
  ])
  
  render()
})
