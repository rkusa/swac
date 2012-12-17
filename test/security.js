var async = require('async')
  , fixtures = require('./fixtures')
  , Todo = fixtures.Todo
  , should = require('should')
  , app = new (require('arkansas').State)

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
    before(function(done) {
      async.parallel([
        function(cb) {
          a = new Todo({ task: 'A', isDone: false })
          a.save(function(body) {
            a.id = body.id
            cb()
          })
        },
        function(cb) {
          b = new Todo({ task: 'B', isDone: false })
          b.save(function(body) {
            b.id = body.id
            cb()
          })
        }
      ], done)
    })
    after(function() {
      Todo.allow = {}
      Todo.deny = {}
    })
    describe('all', function() {
      before(function() {
        Todo.allow.all = function(req, todo) {
          return allow && (!todo || todo.task === 'A')
        }
        Todo.deny.all  = function() { return false  }
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
            app.get(Todo, a.id, function(err, todo) {
              todo.should.have.property('id', a.id)
              cb()
            })
          },
          function(cb) {
            app.get(Todo, b.id, function(err, todo) {
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
            app.list(Todo, function(err, todos) {
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
            .expect(401)
            .end(cb)
          },
          function(cb) {
            allow = true
            fixtures.client.post('/_api/todo')
            .send({ task: 'C' })
            .expect(200)
            .end(cb)
          },
          function(cb) {
            allow = false
            app.post(Todo, { task: 'D' }, function(err, todo) {
              err.should.have.property('message', 'Unauthorized')
              cb()
            })
          },
          function(cb) {
            allow = true
            app.post(Todo, { task: 'D' }, function(err, todo) {
              should.strictEqual(err, null)
              todo.should.have.property('task', 'D')
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
  })
})