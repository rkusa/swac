var server = require('../examples/todos/server')
  , db = server.db
  , Todo = require('../examples/todos/models/todo')
  , http = require('request')

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
      todo.should.have.ownProperty('id')
      todo.should.have.ownProperty('todo', 'Tu dies')
      todo.should.have.ownProperty('isDone', null)
    })

    describe('properties', function() {
      it('should fire appropriated events on being changed', function(done) {
        var count = 0
          , callback = function() {
            if (++count == 2) done()
          }
        todo.on('changed', callback)
        todo.on('changed:isDone', callback)

        todo.isDone = true
        todo.isDone.should.equal(true)

        todo.removeListener('changed', callback)
        todo.removeListener('changed:role', callback)
      })
    })

    describe('.save()', function() {
      it('should create a new record if not exists', function(done) {
        var lengthBefore = Object.keys(db).length
          , todo = new Todo({ id: 9, todo: 'Tu das' })
        db.should.not.have.property(9)
        todo.save(function() {
          Object.keys(db).should.have.lengthOf(lengthBefore + 1)
          db.should.have.property(9)
          db[9].should.have.property('todo', 'Tu das')
          done()
        })
      })
      it('should update the record if exists', function(done) {
        var todo = new Todo({ id: 10 })
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
        var todo = new Todo({ id: 11 })
        todo.save(function() {
          db.should.have.property(11)
          todo.destroy(function() {
            db.should.not.have.property(11)
            done()
          })
        })
      })
      it('should fire the appropriated events', function(done) {
        var todo = new Todo({ id: 11 })
        todo.save(function() {
          db.should.have.property(11)
          todo.on('destroy', function callback() {
            todo.removeListener('destroy', callback)
            db.should.not.have.property(11)
            done()
          })
          todo.destroy()
        })
      })
    })
  })

  describe('API', function() {
    it('should be defined', function() {
      Todo.list.should.be.a('function')
      Todo.get.should.be.a('function')
      Todo.post.should.be.a('function')
      Todo.put.should.be.a('function')
      Todo.delete.should.be.a('function')
    })
    it('.post() should create a new model', function(done) {
      Todo.post({ todo: 'Danach das', isDone: false }, function(todo) {
        todo.id.should.not.eql(null)
        var record = db[todo.id]
        record.todo.should.eql(todo.todo)
        record.isDone.should.eql(todo.isDone)
        done()
      })
    })
    it('POST / should create a new model', function(done) {
      var todo = { todo: 'Danach das', isDone: false }
      http.post({
        uri: 'http://localhost:3000/api/todo',
        json: todo
      }, function(err, res, body) {
        body.should.have.property('todo', todo.todo)
        body.should.have.property('isDone', todo.isDone)
        done()
      })
    })
    it('.put(:id) should update the model with id = :id', function(done) {
      Todo.post({ id: 5, todo: 'Das!' }, function(todo) {
        Todo.put(todo.id, { isDone: true }, function(todo) {
          var record = db[todo.id]
          record.todo.should.eql(todo.todo)
          record.isDone.should.eql(todo.isDone)
          done()
        })
      })
    })
    it('PUT /:id should update the model with id = :id', function(done) {
      Todo.post({ id: 5, todo: 'Das!', isDone: false }, function(todo) {
        todo.isDone = true
        http.put({
          uri: 'http://localhost:3000/api/todo/' + todo.id,
          json: todo
        }, function(err, res, body) {
          body.should.have.property('todo', todo.todo)
          body.should.have.property('isDone', todo.isDone)
          done()
        })
      })
    })
    it('.get(:id) should return the model with id = :id', function(done) {
      var id = Object.keys(db)[0]
        , record = db[id]
      Todo.get(id, function(todo) {
        todo.should.be.a('object')
        record.todo.should.eql(todo.todo)
        done()
      })
    })
    it('GET /:id should return the model with id = :id', function(done) {
      var id = Object.keys(db)[0]
        , record = db[id]
      http.get({
        uri: 'http://localhost:3000/api/todo/' + id
      }, function(err, res, body) {
        res.should.be.json
        body = JSON.parse(body)
        body.should.have.property('todo', record.todo)
        body.should.have.property('isDone', record.isDone)
        done()
      })
    })
    it('.list() should return list', function(done) {
      Todo.list(function(todos) {
        todos.should.have.lengthOf(Object.keys(db).length)
        done()
      })
    })
    it('GET / should return list', function(done) {
      http.get({
        uri: 'http://localhost:3000/api/todo'
      }, function(err, res, body) {
        res.should.be.json
        body = JSON.parse(body)
        body.should.have.lengthOf(Object.keys(db).length)
        done()
      })
    })
    it('.delete(:id) should delete the model with id = :id', function(done) {
      var lengthBefore = Object.keys(db).length
        , id = Object.keys(db)[0]
      Todo.delete(id, function() {
        Object.keys(db).should.have.lengthOf(lengthBefore - 1)
        db.should.not.have.property(id)
        done()
      })
    })
    it('DELETE /:id should delete the model with id = :id', function(done) {
      var lengthBefore = Object.keys(db).length
        , id = Object.keys(db)[0]
      http.del({
        uri: 'http://localhost:3000/api/todo/' + id
      }, function(err, res, body) {
        Object.keys(db).should.have.lengthOf(lengthBefore - 1)
        db.should.not.have.property(id)
        done()
      })
    })
  })
})