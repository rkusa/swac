var fixtures = require('./fixtures')
  , implode = require('../lib/implode')
  , should = require('should')
  , Todo = fixtures.Todo
  , utils = require('../lib/utils')
  , Model = require('../lib/model')
  , domainify = fixtures.domainify

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
      todo.should.have.ownProperty('id')
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
      it('should create a new record if not exists', domainify(function(done) {
        var lengthBefore = Object.keys(fixtures.db).length
          , todo = new Todo({ id: 9, task: 'Tu das' })
        fixtures.db.should.not.have.property(9)
        todo.save(function() {
          Object.keys(fixtures.db).should.have.lengthOf(lengthBefore + 1)
          fixtures.db.should.have.property(9)
          fixtures.db[9].should.have.property('task', 'Tu das')
          done()
        })
      }))
      it('should update the record if exists', domainify(function(done) {
        var todo = new Todo({ id: 10 })
        todo.save(function() {
          fixtures.db.should.have.property(10)
          todo.task = 'Und das'
          todo.save(function() {
            fixtures.db[10].task.should.eql(todo.task)
            done()
          })
        })
      }))
    })

    describe('.destroy()', function() {
      it('should destroy the record if exists', domainify(function(done) {
        var todo = new Todo({ id: 11 })
        todo.save(function() {
          fixtures.db.should.have.property(11)
          todo.destroy(function() {
            fixtures.db.should.not.have.property(11)
            done()
          })
        })
      }))
      it('should fire the appropriated events', domainify(function(done) {
        var todo = new Todo({ id: 11 })
        todo.save(function() {
          fixtures.db.should.have.property(11)
          todo.once('destroy', function callback() {
            fixtures.db.should.not.have.property(11)
            done()
          })
          todo.destroy()
        })
      }))
    })
  })

  function testAPI (method, path, done) {
    var called = false
      , backup = Model.api.Todo[method]
    Model.api.Todo[method] = function() {
      Model.api.Todo[method] = backup
      called = true
      var args = Array.prototype.slice.call(arguments)
        , fn = args.pop()
      fn()
    }
    fixtures.client[method === 'list' ? 'get' : (method === 'delete' ? 'del' : method)](path)
    .expect(200)
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

  describe('Server-Only Part', function() {
    it('Client-Side', function() {
      utils.isServer = false
      utils.isClient = true
      var Model = require('./fixtures/example.model')
        , model = new Model
      model.should.have.property('Client')
      model.should.not.have.property('Server')
    })
    it('Server-Side', function(done) {
      delete require.cache[require.resolve('./fixtures/example.model')]
      utils.isServer = true
      utils.isClient = false
      var Model = require('./fixtures/example.model')
      process.nextTick(function() {
        var model = new Model
        model.should.have.property('Client')
        model.should.have.property('Server')
        done()
      })
    })
  })
})
