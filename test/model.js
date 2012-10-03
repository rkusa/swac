var fixtures = require('./fixtures')
  , serialization = require('../lib/serialization')
  , should = require('should')
  , Todo = require('../examples/todos/models/todo')
  , db = {}

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
  describe('.define()', function() {
    it('should return a function', function() {
      Todo.should.be.a('function')
    })
  })

  describe('instance', function() {
    var todo

    before(function() {
      todo = new Todo({ task: 'Tu dies' })
    })

    it('should have the defined properties', function() {
      todo.should.have.ownProperty('_id')
      todo.should.have.ownProperty('task', 'Tu dies')
      todo.should.have.ownProperty('isDone', null)
    })

    describe('properties', function() {
      it('should fire appropriated events on being changed', function(done) {
        var count = 0
          , callback = function() {
            if (++count == 2) done()
          }
        
        todo.once('changed', callback)
        todo.once('changed.isDone', callback)

        todo.isDone = true
        todo.isDone.should.equal(true)
      })
    })

    describe('.save()', function() {
      it('should create a new record if not exists', function(done) {
        var lengthBefore = Object.keys(db).length
          , todo = new Todo({ _id: 9, task: 'Tu das' })
        db.should.not.have.property(9)
        todo.save(function() {
          Object.keys(db).should.have.lengthOf(lengthBefore + 1)
          db.should.have.property(9)
          db[9].should.have.property('task', 'Tu das')
          done()
        })
      })
      it('should update the record if exists', function(done) {
        var todo = new Todo({ _id: 10 })
        todo.save(function() {
          db.should.have.property(10)
          todo.task = 'Und das'
          todo.save(function() {
            db[10].task.should.eql(todo.task)
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

    var prepared
    describe('Serialization', function() {
      before(function() {
        prepared = serialization.prepare(todo)
      })
      it('should include the proper #$type', function() {
        prepared.should.have.property('$type', 'Model/Todo')
      })
      it('should include the #_id property', function() {
        prepared.obj.should.have.property('_id')
      })
      it('should only include its properties', function() {
        Object.keys(prepared.obj).should.have.lengthOf(5)
        prepared.obj.should.have.property('task')
        prepared.obj.should.have.property('isDone')
        prepared.obj.should.have.property('events')
      })
    })
    
    describe('Deserialization', function() {
      var recovered
      before(function() {
        recovered = serialization.recover(prepared)
      })
      it('should recover its instance', function() {
        recovered.should.be.instanceof(Todo)
      })
      it('shouldn\'t have the #$type property', function() {
        recovered.should.not.have.property('$type')
      })
      it('should keep its properties', function() {
        Object.keys(recovered).should.have.lengthOf(5)
        recovered.should.have.property('_id', prepared._id)
        recovered.should.have.property('task', prepared.task)
        recovered.should.have.property('isDone', prepared.isDone)
        recovered.should.have.property('events')
      })
    })
  })
  
  function testAPI (method, path, done) {
    var called = false
    Todo[method] = function() {
      called = true
      var args = Array.prototype.slice.call(arguments)
        , fn = args.pop()
      fn()
    }
    if (method === 'list') method = 'get'
    else if (method === 'delete') method = 'del'
    fixtures.client[method](path).expect(200)
    .end(function(err, res) {
      if (err) return done(err)
      called.should.be.ok
      done()
    })
  }
  describe('API', function() {
    it('POST / should create a new model',
      testAPI.bind(this, 'post', '/api/todo'))
    it('PUT /:id should update the model with id = :id',
      testAPI.bind(this, 'put', '/api/todo/42'))
    it('GET /:id should return the model with id = :id',
      testAPI.bind(this, 'get', '/api/todo/42'))
    it('GET / should return list',
      testAPI.bind(this, 'list', '/api/todo'))
    it('DELETE /:id should delete the model with id = :id',
      testAPI.bind(this, 'delete', '/api/todo/42'))
  })
})