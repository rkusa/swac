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
    $('form').on('submit', function(e) {
      e.preventDefault()
      var path = '/' + $(this).attr('method') + $(this).attr('action')
      page.show(path, { body: $(this).serializeArray() }, true)
    })
	})
} else {
	render = function(app, req, res, locals) {
		res.render('index', app)
	}
}

var initialized = false
var route = function(method, path, action, rdy, options) {
  var that = this
    , options = typeof rdy === 'object' ? rdy : options
    , rdy = typeof rdy === 'function' ? rdy : null
    , callback = function(app, cb, params, body) {
      if (body && body.length > 0) {
        var obj = {}
        body.forEach(function(input) {
          obj[input.name] = input.value
        })
        body = obj
      }
      if (!isBrowser || initialized) action(app, cb, params, body)
      if (isBrowser && rdy) rdy(window.app)
    }
  var fn = function(app, cb, req, res) {
    if (!req) req = {}
    if (isBrowser && req.state) req.body = req.state.body 
    if (isBrowser && app.path == path)
      return cb()
    that.parent(app, callback.bind(null, app, cb, req.params, req.body), req, res)
  }
  var bla = function(req, res) {
    var app = isBrowser ? window.app : new App
    var done
    if (isBrowser) {
      done = function() {}
      done.redirect = function() {}
    } else {
      done = function() {
        app.path = path
        res.render('index', app)
      }
      done.redirect = res.redirect
    }
    fn.call(this, app, done, req, res)
    initialized = true
  }
  if (method != 'get') path = '/' + method + path
  if (isBrowser) page(path, bla)
  else express.get(path, bla)

  return {
    get: route.bind({ parent: fn }, 'get'),
    post: route.bind({ parent: fn }, 'post')
  }
}
var context = { parent: function(app, cb) {
    cb()
  }}
  , get = route.bind(context, 'get')
  , post = route.bind(context, 'post')




var Todo = Model.define('Todo', function() {
  this.property('id')
	this.property('todo')
  this.property('isDone')
})

Todo.list = function() {
  var arr = []
  Object.keys(db).forEach(function(key) {
    arr.push(db[key])
  })
  return arr
}
Todo.get = function(id) {
  return db[id]
}
Todo.put = function(id, props) {
  var todo
  if (!(todo = db[id])) return false
  Object.keys(props).forEach(function(key) {
    if (todo.hasOwnProperty(key)) todo[key] = props[key]
  })
  return todo
}
Todo.post = function(props) {
  var id = 1
  while (db[id]) id++
  props['id'] = id
  db[id] = new Todo(props)
  return db[id]
}
Todo.delete = function(id) {
  delete db[id]
  return true
}

var Todos = Collection.define('Todos', function() {
  this.filter('itemsLeft', function() {
    var count = 0
    this._collection.forEach(function(todo) {
      if (!todo.isDone) ++count
    })
    return count
  })
})

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