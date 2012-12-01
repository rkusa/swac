var fixtures = require('./fixtures')
  , implode = require('../lib/implode')
  , should = require('should')
  , Todo = fixtures.Todo

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
        var lengthBefore = Object.keys(fixtures.db).length
          , todo = new Todo({ _id: 9, task: 'Tu das' })
        fixtures.db.should.not.have.property(9)
        todo.save(function() {
          Object.keys(fixtures.db).should.have.lengthOf(lengthBefore + 1)
          fixtures.db.should.have.property(9)
          fixtures.db[9].should.have.property('task', 'Tu das')
          done()
        })
      })
      it('should update the record if exists', function(done) {
        var todo = new Todo({ _id: 10 })
        todo.save(function() {
          fixtures.db.should.have.property(10)
          todo.task = 'Und das'
          todo.save(function() {
            fixtures.db[10].task.should.eql(todo.task)
            done()
          })
        })
      })
    })

    describe('.destroy()', function() {
      it('should destroy the record if exists', function(done) {
        var todo = new Todo({ _id: 11 })
        todo.save(function() {
          fixtures.db.should.have.property(11)
          todo.destroy(function() {
            fixtures.db.should.not.have.property(11)
            done()
          })
        })
      })
      it('should fire the appropriated events', function(done) {
        var todo = new Todo({ _id: 11 })
        todo.save(function() {
          fixtures.db.should.have.property(11)
          todo.once('destroy', function callback() {
            fixtures.db.should.not.have.property(11)
            done()
          })
          todo.destroy()
        })
      })
    })
  })

  function testAPI (method, path, done) {
    var called = false
      , backup = Todo[method]
    Todo[method] = function() {
      Todo[method] = backup
      called = true
      var args = Array.prototype.slice.call(arguments)
        , fn = args.pop()
      fn()
    }
    fixtures.client[method === 'list' ? 'get' : (method === 'delete' ? 'del' : method)](path).expect(200)
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
