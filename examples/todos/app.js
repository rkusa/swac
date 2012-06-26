var Arkansas = require('arkansas')
  , Todo     = require('./models/todo')
  , get      = Arkansas.get
  , post     = Arkansas.post
  , root

root = get('/:condition?', function(app, done, params) {
  console.log('/' + params.condition)

  app.register('todos', Arkansas.observableArray(Todo))


  app.todos.defineValue('left', function() {
    var count = 0
    this.forEach(function(todo) {
      if (!todo.isDone) ++count
    })
    return count
  })
  app.todos.defineValue('completed', function() {
    var count = 0
    this.forEach(function(todo) {
      if (todo.isDone) ++count
    })
    return count
  })
  app.todos.defineValue('done', function() {
    var done = true
    this.forEach(function(todo) {
      if (!todo.isDone) done = false
    })
    return done
  })

  app.condition = params.condition
  Todo.list(function(todos) {
    console.log(todos.length)
    app.todos.reset(todos.filter(function(todo) {
      return !params.condition
          || (todo.isDone && params.condition === 'completed')
          || (!todo.isDone && params.condition === 'active')
    }))
    done()
  })
}, function(app) {
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
    app.todos.push(todo)
    done.redirect('/')
  })
}, function() {
  $('#new-todo').val('')
})

root.post('/todos/:id/edit', function(app, done, params, body) {
  console.log('/todos/' + params.id + '/edit')

  var model = app.todos.find(params.id)
  if (model) {
    model.todo = body.todo
    model.save(function() {
      done.redirect('/')
    })
  } else done.redirect('/')
}, function(app, params) {
  $('#todo-' + params.id).removeClass('editing')
})

root.get('/todos/:id/toggle', function(app, done, params) {
  console.log('/todos/' + params.id + '/toggle')

  var model = app.todos.find(params.id)
  if (model) {
    model.isDone = !model.isDone
    model.save(function() {
      done.redirect('/')
    })
  } else done.redirect('/')
})

root.get('/todos/toggle-all', function(app, done) {
  var left = app.todos.filter(function(todo) {
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
  var completed = app.todos.filter(function(todo) {
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

  var model = app.todos.find(params.id)
  if (model) {
    model.destroy(function() {
      done.redirect('/')
    })
  } else done.redirect('/')
})