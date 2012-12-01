var fixtures = require('./fixtures')
  , implode = require('../lib/implode')
  , should = require('should')
  , Todo = fixtures.Todo
  , db = {}

Todo.list = function(view, key, callback) {
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
      testAPI.bind(this, 'post', '/_api/todo'))
    it('PUT /:id should update the model with id = :id',
      testAPI.bind(this, 'put', '/_api/todo/42'))
    it('GET /:id should return the model with id = :id',
      testAPI.bind(this, 'get', '/_api/todo/42'))
    it('GET / should return list',
      testAPI.bind(this, 'list', '/_api/todo'))
    it('DELETE /:id should delete the model with id = :id',
      testAPI.bind(this, 'delete', '/_api/todo/42'))
  })
  
  describe('Validation', function() {
    it('should return false appropriately', function() {
      var todo = new Todo({ task: '' })
        , validation = todo.validate()
      validation.should.equal(false)
      with (todo) {
        Object.keys($errors).should.have.lengthOf(2)
        with ($errors.task) {
          attribute.should.equal('minLength')
          expected.should.equal(1)
          actual.should.equal(0)
          message.should.equal('is too short (minimum is 1 characters)')
        }
        with ($errors.isDone) {
          attribute.should.equal('type')
          expected.should.equal('boolean')
          actual.should.equal('object')
          message.should.equal('must be of boolean type')
        }
      }
    })
    it('should return true appropriately', function() {
      var todo = new Todo({ task: 'Test', isDone: false })
        , validation = todo.validate()
      validation.should.equal(true)
      Object.keys(todo.$errors).should.have.lengthOf(0)
    })
  })
})
