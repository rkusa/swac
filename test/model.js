var Model = require('../lib/model')
  , User, user, db = {}

describe('Model', function() {
  before(function() {
    User = Model.define('User', function() {
      this.property('name')
      this.property('role')
    })

    User.list = function(callback) {
      var arr = []
      Object.keys(db).forEach(function(key) {
        arr.push(db[key])
      })
      if (callback) callback(arr)
    }
    User.get = function(id, callback) {
      if (callback) callback(db[id])
    }
    User.put = function(id, props, callback) {
      var todo
      if (!(todo = db[id])) return false
      Object.keys(props).forEach(function(key) {
        if (todo.hasOwnProperty(key)) todo[key] = props[key]
      })
      if (callback) callback(todo)
    }
    User.post = function(props, callback) {
      if (!props['id']) {
        var id = 1
        while (db[id]) id++
        props['id'] = id
      }
      db[props['id']] = new User(props)
      db[props['id']].isNew = false
      if (callback) callback(db[props['id']])
    }
    User.delete = function(id, callback) {
      delete db[id]
      if (callback) callback()
    }
  })

  describe('.define()', function() {
    it('should return a function', function() {
      User.should.be.a('function')
    })
  })

  describe('instance', function() {
    before(function() {
      user = new User({ name: 'Markus' })
    })

    it('should have the defined properties', function() {
      user.should.have.ownProperty('id')
      user.should.have.ownProperty('name', 'Markus')
      user.should.have.ownProperty('role', null)
    })

    describe('properties', function() {
      it('should fire appropriated events on being changed', function(done) {
        var count = 0
          , callback = function() {
            if (++count == 2) done()
          }
        user.on('changed', callback)
        user.on('changed:role', callback)

        user.role = 'Admin'
        user.role.should.equal('Admin')

        user.removeListener('changed', callback)
        user.removeListener('changed:role', callback)
      })
    })

    describe('.save()', function() {
      it('should create a new record if not exists', function(done) {
        var lengthBefore = Object.keys(db).length
          , user = new User({ id: 9, name: 'Markus' })
        db.should.not.have.property(9)
        user.save(function() {
          Object.keys(db).should.have.lengthOf(lengthBefore + 1)
          db.should.have.property(9)
          db[9].should.have.property('name', 'Markus')
          done()
        })
      })
      it('should update the record if exists', function(done) {
        var user = new User({ id: 10 })
        user.save(function() {
          db.should.have.property(10)
          user.role = 'Guest'
          user.save(function() {
            db[10].role.should.eql(user.role)
            done()
          })
        })
      })
    })

    describe('.destroy()', function() {
      it('should destroy the record if exists', function(done) {
        var user = new User({ id: 11 })
        user.save(function() {
          db.should.have.property(11)
          user.destroy(function() {
            db.should.not.have.property(11)
            done()
          })
        })
      })
      it('should fire the appropriated events', function(done) {
        var user = new User({ id: 11 })
        user.save(function() {
          db.should.have.property(11)
          user.destroy(function() {
            db.should.not.have.property(11)
            done()
          })
        })
      })
    })
  })

  describe('API', function() {
    it('should be defined', function() {
      User.list.should.be.a('function')
      User.get.should.be.a('function')
      User.post.should.be.a('function')
      User.put.should.be.a('function')
      User.delete.should.be.a('function')
    })
    it('POST / should create a new model', function(done) {
      User.post({ name: 'Arne', role: 'Moderator' }, function(user) {
        user.id.should.not.eql(null)
        var record = db[user.id]
        record.name.should.eql('Arne')
        record.role.should.eql('Moderator')
        done()
      })
    })
    it('PUT /:id should update the model with id = :id', function(done) {
      User.post({ id: 5, name: 'Daniel' }, function(daniel) {
        User.put(daniel.id, { role: 'Poweruser' }, function(daniel) {
          var record = db[daniel.id]
          record.name.should.eql('Daniel')
          record.role.should.eql('Poweruser')
          done()
        })
      })
    })
    it('GET /:id should return the model with id = :id', function(done) {
      var id = Object.keys(db)[0]
        , record = db[id]
      User.get(id, function(user) {
        user.should.be.a('object')
        record.name.should.eql(user.name)
        done()
      })
    })
    it('GET / should return list', function(done) {
      User.list(function(users) {
        users.should.have.lengthOf(Object.keys(db).length)
        done()
      })
    })
    it('DELETE /:id should delete the model with id = :id', function(done) {
      var lengthBefore = Object.keys(db).length
        , id = Object.keys(db)[0]
      User.delete(id, function() {
        Object.keys(db).should.have.lengthOf(lengthBefore - 1)
        db.should.not.have.property(id)
        done()
      })
    })
  })
})