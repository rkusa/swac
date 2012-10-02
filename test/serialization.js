var Arkansas = require('../')
  , Todo = require('../examples/todos/models/todo')
  , Serialization = require('../lib/serialization')
  , should = require('should')

var User = function(name, password, roles) {
  var that = this;
  ['name', 'password', 'roles'].forEach(function(prop) {
    var value
    Object.defineProperty(that, prop, {
      get: function() { return value },
      set: function(val) { value = val },
      enumerable: true
    })
  })
  this.name = name
  this.password = password
  this.roles = roles
}
new Serialization.Contract('Test/User', User, ['name', 'roles'])

var Role = function(name) {
  Object.defineProperty(this, 'name', {
    get: function() { return name },
    set: function(val) { name = val },
    enumerable: true
  })
}
new Serialization.Contract('Test/Role', Role, ['name'])

var State = function() {}
new Serialization.Contract('Test/State', State, ['roles', 'users', 'loggedInAs'])

var admin = new Role('Admin')
  , member = new Role('Member')
  , user = new User('Test', 'secret', [admin, member])
  , obj = new State
  , prepared, recovered
obj.trap = admin
obj.roles = [admin, member, new Role('Guest')]
obj.users = [user]
obj.users.type = User
obj.loggedInAs = user

var roles, users, loggedInAs
describe('Serialization', function() {
  describe('#prepare', function() {
    before(function() {
      prepared = Serialization.prepare(obj)
      roles = prepared.roles
      users = prepared.users
      loggedInAs = prepared.loggedInAs
    })
    it('should stick to the contract', function() {
      should.not.exist(prepared.trap)
      for (var i = 0; i < 2; ++i)
        Object.keys(roles[i]).length.should.equal(2)
    })
    it('should prepare arrays', function() {
      roles.length.should.equal(3)
      users.length.should.equal(1)
      loggedInAs.roles.length.should.equal(2)
    })
    it('should replicate properties', function() {
      roles[0].name.should.equal('Admin')
      roles[1].name.should.equal('Member')
      roles[2].name.should.equal('Guest')
     loggedInAs.name.should.equal('Test')
    })
    it('should add proper #$type', function() {
      for (var i = 0; i < 2; ++i)
        roles[i].$type.should.equal('Test/Role')
      loggedInAs.$type.should.equal('Test/User')
    })
    it('should resolve references', function() {
      loggedInAs.roles[0].$ref.should.equal('#.roles.0')
      loggedInAs.roles[1].$ref.should.equal('#.roles.1')
      users[0].$ref.should.equal('#.loggedInAs')
    })
    it('should resolve class references', function() {
      users.type.should.have.property('$obj', 'Test/User')
    })
  })
  describe('#recover', function() {
    before(function() {
      recovered = Serialization.recover(prepared)
      roles = recovered.roles
      users = recovered.users
      loggedInAs = recovered.loggedInAs
    })
    it('should recover proper root instance', function() {
      recovered.should.be.an.instanceof(State)
      Object.keys(recovered).length.should.equal(3)
    })
    it('should recover arrays', function() {
      roles.length.should.equal(3)
      users.length.should.equal(1)
    })
    it('should recover "classes"', function() {
      roles.forEach(function(role) {
        role.should.be.instanceof(Role)
      })
      users[0].should.be.instanceof(User)
      loggedInAs.should.be.instanceof(User)
    })
    it('should recover references', function() {
      roles[0].should.equal(users[0].roles[0])
      roles[1].should.equal(users[0].roles[1])
      loggedInAs.should.equal(users[0])
    })
    it('should recover class references', function() {
      users.type.should.equal(User)
    })
  })
})