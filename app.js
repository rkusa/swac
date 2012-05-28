!function() {
	var route
		, app = {}
		, Backbone

	if ('undefined' == typeof module) {
		var render = function(locals) {
			Object.keys(locals).forEach(function(key) {
				$('*[data-bind="$' + key + '"]').text(locals[key])
			})
		}
		route = function(path, callback) {
			page(path, function() {
				callback(render)
			})
		}
	} else {
		var Value = require('./value')
		Backbone = require('backbone')
		var render = function(req, res, locals) {
			Object.keys(locals).forEach(function(key) {
				locals[key] = new Value(key, locals[key])
			})
			res.render('index', locals)
		}
		route = function(path, callback) {
			express.get(path, function(req, res) {
				callback(render.bind(render, req, res))
			})
		}
	}

	Backbone.Collection.prototype.render = function() {

	}

	var TodoModel = Backbone.Model.extend({
		})
		, TodosCollection = Backbone.Collection.extend({
			model: TodoModel
		})

	app.todos = new TodosCollection
	
	route('/', function(render) {
		app.todos.reset([
			{ _id: 1, todo: 'Tu dies' },
			{ _id: 2, todo: 'Tu das' }
		])
		render({
			page: 1,
			todos: [
				{ _id: 1, todo: 'Tu dies' },
				{ _id: 2, todo: 'Tu das' }
			]
		})
	})
	
	route('/2', function(render) {
		app.todos.reset([
			{ _id: 3, todo: 'Auf gehts!' },
			{ _id: 4, todo: 'Ab gehts!' }
		])
		render({
			page: 2
		})
	})
	
	
}()