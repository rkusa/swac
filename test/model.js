var db = {}
  , Todo = require('../examples/todos/models/todo')
  , request = require('request')
  , http = require('http')

arkansas = require('../lib/server')
arkansas.init(__dirname + '/../examples/todos/app')
var server = module.exports = http.createServer(arkansas.app)
server.listen(3000, function() {
  console.log("Express server listening on port 3000")
})

Todo.list = function(callback) {
  var arr = []
  Object.keys(db).forEach(function(key) {
    arr.push(db[key])
  })
  if (callback) callback(arr)
}
Todo.get = function(id, callback) {
  if (callback) callback(db[id])
}
Todo.put = function(id, props, callback) {
  var todo
  if (!(todo = db[id])) return false
  Object.keys(props).forEach(function(key) {
    if (todo.hasOwnProperty(key)) todo[key] = props[key]
  })
  if (callback) callback(todo)
}
Todo.post = function(props, callback) {
  if (!props['_id']) {
    var id = 1
    while (db[id]) id++
    props['_id'] = id
  }
  db[props['_id']] = new Todo(props)
  db[props['_id']].isNew = false
  if (callback) callback(db[props['_id']])
}
Todo.delete = function(id, callback) {
  delete db[id]
  if (callback) callback()
}

describe('Model', function() {
  after(function() {
    server.close()
  })

  describe('.define()', function() {
    it('should return a function', function() {
      Todo.should.be.a('function')
    })
  })

  describe('instance', function() {
    var todo

    before(function() {
      todo = new Todo({ todo: 'Tu dies' })
    })

    it('should have the defined properties', function() {
      todo.should.have.ownProperty('_id')
      todo.should.have.ownProperty('todo', 'Tu dies')
      todo.should.have.ownProperty('isDone', null)
    })

    describe('properties', function() {
      it('should fire appropriated events on being changed', function(done) {
        var count = 0
          , callback = function() {
            if (++count == 2) done()
          }
        todo.once('changed.*', callback)
        todo.once('changed.isDone', callback)

        todo.isDone = true
        todo.isDone.should.equal(true)
      })
    })

    describe('.save()', function() {
      it('should create a new record if not exists', function(done) {
        var lengthBefore = Object.keys(db).length
          , todo = new Todo({ _id: 9, todo: 'Tu das' })
        db.should.not.have.property(9)
        todo.save(function() {
          Object.keys(db).should.have.lengthOf(lengthBefore + 1)
          db.should.have.property(9)
          db[9].should.have.property('todo', 'Tu das')
          done()
        })
      })
      it('should update the record if exists', function(done) {
        var todo = new Todo({ _id: 10 })
        todo.save(function() {
          db.should.have.property(10)
          todo.todo = 'Und das'
          todo.save(function() {
            db[10].todo.should.eql(todo.todo)
            done()
          })
        })
      })
    })

    describe('.destroy()', function() {
      it('should destroy the record if exists', function(done) {
        var todo = new Todo({ _id: 11 })
        todo.save(function() {
          db.should.have.property(11)
          todo.destroy(function() {
            db.should.not.have.property(11)
            done()
          })
        })
      })
      it('should fire the appropriated events', function(done) {
        var todo = new Todo({ _id: 11 })
        todo.save(function() {
          db.should.have.property(11)
          todo.once('destroy', function callback() {
            db.should.not.have.property(11)
            done()
          })
          todo.destroy()
        })
      })
    })
  })

  describe('API', function() {
    it('POST / should create a new model', function(done) {
      Todo.post = done.bind(null, null)
      request.post({ uri: 'http://localhost:3000/api/todo' })
    })
    it('PUT /:id should update the model with id = :id', function(done) {
      Todo.put = done.bind(null, null)
      request.put({ uri: 'http://localhost:3000/api/todo/42' })
    })

    it('GET /:id should return the model with id = :id', function(done) {
      Todo.get = done.bind(null, null)
      request.get({ uri: 'http://localhost:3000/api/todo/42' })
    })
    it('GET / should return list', function(done) {
      Todo.list = done.bind(null, null)
      request.get({ uri: 'http://localhost:3000/api/todo' })
    })
    it('DELETE /:id should delete the model with id = :id', function(done) {
      Todo.delete = done.bind(null, null)
      request.del({ uri: 'http://localhost:3000/api/todo/42' })
    })
  })
})