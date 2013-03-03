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
        var todo = new Todo({ id: 10, task: 'foobar' })
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
        Todo.get(9, function(err, todo) {
          fixtures.db.should.have.property(9)
          todo.destroy(function() {
            fixtures.db.should.not.have.property(9)
            done()
          })
        })
      }))
      it('should fire the appropriated events', domainify(function(done) {
        Todo.get(10, function(err, todo) {
          fixtures.db.should.have.property(10)
          todo.once('destroy', function callback() {
            fixtures.db.should.not.have.property(10)
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
      backup.apply(Model.api.Todo, args)
    }
    var req = fixtures.client[method === 'list' ? 'get' : (method === 'delete' ? 'del' : method)](path)
    if (method === 'put' || method === 'post')
      req.send({ id: 42, task: 'Foobar' })
    req
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
      var todo = new Todo({ task: '', isDone: 'invalid' })
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
          actual.should.equal('string')
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

  describe('Authorization', function() {
    describe('Per-Instance', function() {
      before(function(done) {
        utils.series([
          { id: 42, task: 'Authorization A', isDone: false },
          { id: 43, task: 'Authorization B', isDone: true }
        ], function(data, next) {
          Todo.post(data, next)
        }, done)
      })
      var allow, force
      var restriction = {
        all: undefined, read: undefined, get: undefined,
        write: undefined, post: undefined, put: undefined,
        list: undefined, delete: undefined
      }
      after(function() {
        Todo.extend(function() {
          this.allow(restriction)
          this.deny(restriction)
        })
      })
      function methods(scope) {
        before(function() {
          allow = false
          force = false 
        })
        it('get', function(done) {
          Todo.get(43, function(err, todo) {
            if (['all', 'read', 'get'].indexOf(scope) !== -1) {
              should.strictEqual(err, null)
              should.strictEqual(todo, null)
            } else {
              should.strictEqual(err, null)
              todo.should.have.property('id', 43)
            }
            done()
          })
        })
        it('list', function(done) {
          Todo.list(function(err, todos) {
            if (['all', 'read', 'list'].indexOf(scope) !== -1) {
              should.strictEqual(err, null)
              todos.should.be.an.instanceOf(Array)
              todos.should.have.lengthOf(1)
              allow = true
              Todo.list(function(err, todos) {
                should.strictEqual(err, null)
                todos.should.be.an.instanceOf(Array)
                todos.should.have.lengthOf(2)
                done()
              })
            } else {
              should.strictEqual(err, null)
              todos.should.be.an.instanceOf(Array)
              todos.should.have.lengthOf(2)
              done()
            }
          })
        })
        it('post', function(done) {
          allow = false
          Todo.post({ id: 44, task: 'foobar', isDone: true }, function(err, todo) {
            if (['all', 'write', 'post'].indexOf(scope) !== -1) {
              err.should.have.property('status', 403)
              Todo.post({ id: 44, task: 'foobar', isDone: false }, function(err, todo) {
                should.strictEqual(err, null)
                todo.should.have.property('id', 44)
                done()
              })
            } else {
              should.strictEqual(err, null)
              todo.should.have.property('id', 44)
              todo.should.have.property('isDone', true)
              done()
            }
          })
        })
        it('put', function(done) {
          force = true
          Todo.put(44, { task: 'C' }, function(err, todo) {
            if (['all', 'write', 'put'].indexOf(scope) !== -1) {
              err.should.have.property('status', 403)
              force = false
              allow = true
              Todo.put(44, { task: 'C' }, function(err, todo) {
                should.strictEqual(err, null)
                todo.should.have.property('task', 'C')
                allow = false
                done()
              })
            } else {
              should.strictEqual(err, null)
              todo.should.have.property('task', 'C')
              done()
            }
          })
        })
        it('delete', function(done) {
          force = true
          Todo.delete(44, function(err) {
            if (['all', 'write', 'delete'].indexOf(scope) !== -1) {
              err.should.have.property('status', 403)
              force = false
              allow = true
              Todo.delete(44, function(err) {
                should.strictEqual(err, null)
                allow = false
                done()
              })
            } else {
              should.strictEqual(err, null)
              done()
            }
          })
        })
      }
      function restrict(scope) {
        describe('allow', function() {
          before(function() {
            Todo.extend(function() {
              this.allow(restriction)
              this.deny(restriction)
              var rest = {}
              rest[scope] = function(req, todo) {
                return !force && (allow || !todo.isDone) }
              this.allow(rest)
            })
          })
          methods(scope)
        })
        describe('deny', function() {
          before(function() {
            Todo.extend(function() {
              this.allow(restriction)
              this.deny(restriction)
              var rest = {}
              rest[scope] = function(req, todo) {
                return !(!force && (allow || !todo.isDone)) }
              this.deny(rest)
            })
          })
          methods(scope)
        })
      }
      var that = this
      ;['all', 'read', 'write', 'get', 'list', 'put', 'post', 'delete'].forEach(function(method) {
        describe(method, restrict.bind(that, method))
      })

      describe('Asynchronous', function() {
        var allow, asyncAllow
        before(function() {
          Todo.extend(function() {
            this.allow(restriction)
            this.deny(restriction)
            this.allow({
              all: function(req, todo, callback) {
                if (allow === true) return true
                setTimeout(function() {
                  callback(asyncAllow)
                })
              }
            })
          })
        })
        it('should possibly be synchronous', function(done) {
          allow = true
          Todo.get(42, function(err, todo) {
            should.strictEqual(err, null)
            todo.should.have.property('id', 42)
            done()
          })
        })
        it('should work', function(done) {
          allow = false
          asyncAllow = false
          Todo.get(42, function(err, todo) {
            should.strictEqual(todo, null)
            asyncAllow = true
            Todo.get(42, function(err, todo) {
              should.strictEqual(err, null)
              todo.should.have.property('id', 42)
              done()
            })
          })
        })
      })
    })

    describe('Per-Property', function() {
      var allow
      describe('PUT', function() {
        it('allow/deny method should have the corret attributes', function(done) {
          var changes = { isDone: true, task: 'abc' }
          Todo.extend(function() {
            this.allow(['isDone', 'task'], {
              write: function(req, todo, val, prop, callback) {
                req.should.be.a('object')
                todo.should.be.a('object')
                todo.should.equal(fixtures.db[42])
                val.should.equal(changes[prop])
                callback.should.be.a('function')
                return true
              }
            })
          })
          Todo.put(42, changes, function(err, todo) {
            should.strictEqual(err, null)
            should.strictEqual(todo, fixtures.db[42])
            done()
          })
        })
        it('should work synchronously', function(done) {
          Todo.extend(function() {
            this.allow('task', {
              write: function(req, todo, val, prop, callback) {
                return allow
              }
            })
          })
          allow = false
          Todo.put(42, { task: 'A' }, function(err, todo) {
            todo.should.have.property('task', 'abc')
            allow = true
            Todo.put(42, { task: 'A' }, function(err, todo) {
              todo.should.have.property('task', 'A')
              done()
            })
          })
        })
        it('should work asynchronously', function(done) {
          Todo.extend(function() {
            this.allow('task', {
              write: function(req, todo, val, prop, callback) {
                process.nextTick(function() {
                  callback(allow)
                })
              }
            })
          })
          allow = false
          Todo.put(42, { task: 'B' }, function(err, todo) {
            todo.should.have.property('task', 'A')
            allow = true
            Todo.put(42, { task: 'B' }, function(err, todo) {
              todo.should.have.property('task', 'B')
              done()
            })
          })
        })
      })
      describe('POST', function() {
        it('allow/deny method should have the corret attributes', function(done) {
          var todo = { isDone: true, task: 'abc' }
          Todo.extend(function() {
            this.allow(['isDone', 'task'], {
              write: function(req, todo, val, prop, callback) {
                req.should.be.a('object')
                todo.should.be.a('object')
                todo.should.equal(todo)
                val.should.equal(todo[prop])
                callback.should.be.a('function')
                return true
              }
            })
          })
          Todo.post(todo, function(err, todo) {
            should.strictEqual(err, null)
            todo.should.be.a('object')
            done()
          })
        })
        it('should work synchronously', function(done) {
          Todo.extend(function() {
            this.allow('category', {
              write: function(req, todo, val, prop, callback) {
                return allow
              }
            })
          })
          allow = false
          Todo.post({ task: 'A', category: 'A' }, function(err, todo) {
            should.strictEqual(err, null)
            todo.should.have.property('category', null)
            todo.destroy()
            allow = true
            Todo.post({ task: 'A', category: 'A' }, function(err, todo) {
              should.strictEqual(err, null)
              todo.should.have.property('category', 'A')
              todo.destroy()
              done()
            })
          })
        })
        it('should work asynchronously', function(done) {
          Todo.extend(function() {
            this.allow('category', {
              write: function(req, todo, val, prop, callback) {
                process.nextTick(function() {
                  callback(allow)
                })
              }
            })
          })
          allow = false
          Todo.post({ task: 'B', category: 'B' }, function(err, todo) {
            todo.should.have.property('category', null)
            allow = true
            Todo.post({ task: 'B', category: 'B' }, function(err, todo) {
              todo.should.have.property('category', 'B')
              todo.destroy()
              done()
            })
          })
        })
      })
    })
  })
})
