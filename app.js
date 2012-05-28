!function(Backbone) {
	var route
		, app = {}

	if ('undefined' == typeof module) {
		var render = function(locals) {
			Object.keys(app).forEach(function(key) {
				// TODO: only on change
				$('*[data-bind="$' + key + '"]').text(app[key])
			})
		}
		route = function(path, callback) {
			page(path, function() {
				callback(render)
			})
		}
	} else {
		var render = function(req, res, locals) {
			Object.keys(app).forEach(function(key) {
				switch(typeof app[key]) {
					case 'object':
						locals[key] = function(chunk, context, bodies, params) {
							console.log(bodies.block.toString())
						}
						break;
					default:
						locals[key] = function(chunk, context, bodies, params) {
							var tag = ['strong', 'em', 'span'].indexOf(params.filters[0]) != -1 ? params.filters[0] : 'span'
							chunk.write('<' + tag + ' data-bind="$' + key + '">')
							chunk.write(app[key])
							chunk.write('</' + tag + '>')
							return chunk
						}
						break;
				}
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
		app.page = 1
		app.todos.reset([
			{ _id: 1, todo: 'Tu dies' },
			{ _id: 2, todo: 'Tu das' }
		])
		render({ title: 'Seite 1' })
	})
	
	route('/2', function(render) {
		app.page = 2
		app.todos.reset([
			{ _id: 3, todo: 'Auf gehts!' },
			{ _id: 4, todo: 'Ab gehts!' }
		])
		render({ title: 'Seite 2' })
	})
	
	
}(typeof Backbone == 'undefined' ? require('backbone') : Backbone)