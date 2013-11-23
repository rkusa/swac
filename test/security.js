var async = require('async')
  , fixtures = require('./fixtures')
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
})