var async = require('async')
  , fixtures = require('./fixtures')
  , Todo = fixtures.Todo
  , should = require('should')
  , app = new (require('../').State)
  , domainify = fixtures.domainify

app.req = {}

describe('Security', function() {
  var allow, deny
  before(function() {
    fixtures.server.area(__dirname + '/fixtures/security.app', {
      allow: function(req) {
        return allow
      },
      deny: function(req) {
        return deny
      }
    })
  })
  describe('Browserify Bundle', function() {
    it('should allow access, if allow = true, deny = false', function(done) {
      allow = true; deny = false
      fixtures.client.get('/security.app.js')
        .expect(200)
        .end(done)
    })
    it('should deny access, if allow = false, deny = true', function(done) {
      allow = false; deny = true
      fixtures.client.get('/security.app.js')
        .expect(401)
        .end(done)
    })
    it('should deny access, if allow = true, deny = true', function(done) {
      allow = true; deny = true
      fixtures.client.get('/security.app.js')
        .expect(401)
        .end(done)
    })
    it('should deny access, if allow = false, deny = false', function(done) {
      allow = false; deny = false
      fixtures.client.get('/security.app.js')
        .expect(401)
        .end(done)
    })
  })
  describe('Server-Side Routes', function() {
    it('should allow access, if allow = true, deny = false', function(done) {
      allow = true; deny = false
      fixtures.client.get('/security')
        .expect(200)
        .end(done)
    })
    it('should deny access, if allow = false, deny = true', function(done) {
      allow = false; deny = true
      fixtures.client.get('/security')
        .expect(401)
        .end(done)
    })
    it('should deny access, if allow = true, deny = true', function(done) {
      allow = true; deny = true
      fixtures.client.get('/security')
        .expect(401)
        .end(done)
    })
    it('should deny access, if allow = false, deny = false', function(done) {
      allow = false; deny = false
      fixtures.client.get('/security')
        .expect(401)
        .end(done)
    })
  })
  describe('Model', function() {
    var a, b, allow = true
    before(domainify(function(done) {
      async.parallel([
        function(cb) {
          a = new Todo({ task: 'A', isDone: false })
          a.save(function() {
            cb()
          })
        },
        function(cb) {
          b = new Todo({ task: 'B', isDone: false })
          b.save(function() {
            cb()
          })
        }
      ], done)
    }))
    after(function() {
      Todo.allow.instance = {}
      Todo.deny.instance = {}
      fixtures.adapter.clear()
    })
    describe('all', function() {
      before(function() {
        Todo.allow.instance.all = function(req, todo) {
          return allow && (!todo || todo.task === 'A')
        }
        Todo.deny.instance.all  = function() { return false  }
      })
      it('should work using GET', function(done) {
        async.series([
          function(cb) {
            fixtures.client.get('/_api/todo/' + a.id)
            .end(function(err, res) {
              res.status.should.equal(200)
              var obj = JSON.parse(res.text)
              obj.should.have.property('id', a.id)
              cb()
            })
          },
          function(cb) {
            fixtures.client.get('/_api/todo/' + b.id)
            .end(function(err, res) {
              res.status.should.equal(200)
              var obj = JSON.parse(res.text)
              should.strictEqual(obj, null)
              cb()
            })
          },
          function(cb) {
            Todo.get(a.id, function(err, todo) {
              todo.should.have.property('id', a.id)
              cb()
            })
          },
          function(cb) {
            Todo.get(b.id, function(err, todo) {
              should.strictEqual(todo, null)
              cb()
            })
          }
        ], done)
      })
      it('should work using LIST', function(done) {
        async.series([
          function(cb) {
            fixtures.client.get('/_api/todo')
            .end(function(err, res) {
              res.status.should.equal(200)
              var obj = JSON.parse(res.text)
              obj.should.have.lengthOf(1)
              obj[0].should.have.property('id', a.id)
              cb()
            })
          },
          function(cb) {
            Todo.list(function(err, todos) {
              todos.should.have.lengthOf(1)
              todos[0].should.have.property('id', a.id)
              cb()
            })
          }
        ], done)
      })
      it('should work using POST', function(done) {
        async.series([
          function(cb) {
            allow = false
            fixtures.client.post('/_api/todo')
            .send({ task: 'C' })
            .expect(403)
            .end(cb)
          },
          function(cb) {
            allow = true
            fixtures.client.post('/_api/todo')
            .send({ task: 'C' })
            .expect(403)
            .end(cb)
          },
          function(cb) {
            allow = true
            fixtures.client.post('/_api/todo')
            .send({ task: 'A' })
            .expect(200)
            .end(cb)
          },
          function(cb) {
            allow = false
            Todo.post({ task: 'D' }, function(err, todo) {
              err.should.have.property('message', 'Forbidden')
              cb()
            })
          },
          function(cb) {
            allow = true
            Todo.post({ task: 'D' }, function(err, todo) {
              err.should.have.property('message', 'Forbidden')
              cb()
            })
          },
          function(cb) {
            allow = true
            Todo.post({ task: 'A' }, function(err, todo) {
              should.strictEqual(err, null)
              todo.should.have.property('task', 'A')
              cb()
            })
          }
        ], done)
      }),
      it.skip('should work using PUT', function(done) {
      }),
      it.skip('should work using DELETE', function(done) {
      })
    })
    var todo
    describe('server-only properties', function() {
      before(function(done) {
        Todo.post({ task: 'A', isDone: true }, function(err, t) {
          should.strictEqual(err, null)
          todo = t
          Todo.prototype._validation.isDone.serverOnly = true
          done()
        })
      })
      after(function() {
        Todo.prototype._validation.isDone.serverOnly = false
      })
      it('should be accessible from the server-side', function(done) {
        Todo.get(todo.id, function(err, t) {
          should.strictEqual(err, null)
          t.isDone.should.equal(true)
          done()
        })
      })
      it('should be writable from the server-side', function(done) {
        todo.isDone = false
        Todo.put(todo, function(err, t) {
          should.strictEqual(err, null)
          Todo.get(todo.id, function(err, t) {
            should.strictEqual(err, null)
            t.isDone.should.equal(false)
            done()
          })
        })
      })
      it('should not be accessible from the client-side', function(done) {
        fixtures.client.get('/_api/todo/' + todo.id)
        .end(function(err, res) {
          res.status.should.equal(200)
          var obj = JSON.parse(res.text)
          obj.should.not.have.property('isDone')
          done()
        })
      })
      it('should not be writable from the client-side', function(done) {
        fixtures.client.put('/_api/todo/' + todo.id)
        .send({ task: 'A', isDone: true })
        .expect(200)
        .end(function() {
          Todo.get(todo.id, function(err, t) {
            should.strictEqual(err, null)
            t.isDone.should.equal(false)
            done()
          })
        })
      })
    })
  })
})