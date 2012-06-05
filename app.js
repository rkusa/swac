var route
  , isBrowser = typeof window != 'undefined'
  , isServer  = !isBrowser
  , Model = require('./model')
  , Collection = require('./collection')
  , Fragment = require('./fragment')
  , App = require('./shared')

if (isBrowser) {
	$(function() {
    page()
	})
	var render = function(locals) {
	}
	route = function(path, callback) {
		page(path, function() {
			callback(window.app, render)
		})
	}
} else {
	var render = function(app, req, res, locals) {
		res.render('index', app)
	}
	route = function(path, callback) {
		express.get(path, function(req, res) {
			var app = new App
			callback(app, render.bind(render, app, req, res))
		})
	}
}

var State = Model.define("State", function() {
  this.property('page')
})
var Todo = Model.define('Todo', function() {
	this.property('todo')
})

route('/', function(app, render) {
	app.register('state', new State)
	app.register('todos', new Collection(Todo))

	app.state.page = 1
	app.todos.reset([
		{ todo: 'Tu das' },
		{ todo: 'Tu dies' }
	])

	render()
})

route('/2', function(app, render) {
	app.state.page = 2
	render()
})
