var Arkansas = require('arkansas')
  , Todo     = require('./models/todo')
  , Todos    = require('./collections/todos')
  , get      = Arkansas.get
  , post     = Arkansas.post
  , root

root = get('/', function(app, done) {
  console.log('/')

  app.register('todos', new Todos(Todo))
	app.todos.reset(Todo.list())

	done()
}, function(app) {
  // $('#new-todo').on('keypress', function(e) {
  //   if (e.keyCode == 13) app.todos.add(new Todo({ todo: $(this).val(), isDone: false }))
  // })
})

root.post('/todos/new', function(app, done, params, body) {
  console.log('/todos/new')

  app.todos.add(
    new Todo({
      todo: body.todo,
      isDone: false
    })
  )
  done.redirect('/')
}, { silent: true })