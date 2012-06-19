var Arkansas = require('arkansas')
  , Todo     = require('./models/todo')
  , Todos    = require('./collections/todos')
  , get      = Arkansas.get
  , post     = Arkansas.post
  , root

root = get('/:filter?', function(app, done, params) {
  console.log('/' + params.filter)

  app.register('todos', new Todos(Todo))
	Todo.list(function(todos) {
    app.todos.reset(todos)
    done()
  })
}, function(app) {
  console.log('script: /')
  $('#todo-list').on('dblclick', 'li', function() {
    $(this).addClass('editing')
  })
})

root.post('/todos/new', function(app, done, params, body) {
  console.log('/todos/new')

  var todo = new Todo({
    todo: body.todo,
    isDone: false
  })
  todo.save(function(body) {
    todo._id = body._id
    app.todos.add(todo)
    done.redirect('/')
  })
}, function() {
  $('#new-todo').val('')
})

root.post('/todos/:id/edit', function(app, done, params, body) {
  console.log('/todos/' + params.id + '/edit')

  var search = app.todos._collection.filter(function(model) {
    return model._id == params.id
  })

  if (search.length > 0) {
    var model = search[0]
    model.todo = body.todo
    model.save(function() {
      done.redirect('/')
    })
  }
}, function(app, params) {
  $('#todo-' + params.id).removeClass('editing')
})

root.get('/todos/:id/toggle', function(app, done, params) {
  console.log('/todos/' + params.id + '/toggle')

  var search = app.todos._collection.filter(function(model) {
    return model._id == params.id
  })

  if (search.length > 0) {
    var model = search[0]
    model.isDone = !model.isDone
    model.save(function() {
      done.redirect('/')
    })
  }
})

root.get('/todos/toggle-all', function(app, done) {
  var left = app.todos._collection.filter(function(todo) {
    return !todo.isDone
  })
  var count = left.length
  left.forEach(function(todo) {
    todo.isDone = true
    todo.save(function() {
      if (--count == 0) done.redirect('/')
    })
  })
})

root.get('/todos/clear/completed', function(app, done) {
  var completed = app.todos._collection.filter(function(todo) {
    return todo.isDone
  })
  var count = completed.length
  completed.forEach(function(todo) {
    todo.destroy(function() {
      if (--count === 0) done.redirect('/')
    })
  })
})

root.post('/todos/:id/delete', function(app, done, params) {
  console.log('/todos/' + params.id + '/delete')

  var search = app.todos._collection.filter(function(model) {
    return model._id == params.id
  })

  if (search.length > 0) {
    var model = search[0]
    model.destroy(function() {
      done.redirect('/')
    })
  }
})