var fixtures = require('./fixtures')
  , swac = require('../')
  , utils = require('../lib/utils')
  , should = require('should')
  , routing = require('../lib/routing')
  , State = require('../lib/state')
  , root, stack = [], context

GLOBAL.page = require('page')
GLOBAL.window = {
  document: {},
  location: {
    pathname: '/A'
  },
  history: {
    pushState: function() {}
  },
  app: {}
}
GLOBAL.history = window.history
GLOBAL.document = window.document
GLOBAL.removeEventListener = function() {}

function switchToServer () {
  utils.isServer = true
  utils.isClient = false
  routing.Request = require('../lib/helper/request.server.js')
}
function switchToBrowser () {
  utils.isServer = false
  utils.isClient = true  
  routing.Request = require('../lib/helper/request.client.js')
}
function defineRoute (id, parent) {
  if (!parent) parent = swac
  return parent.get('/' + id, function(app, done) {
    app.sections['main'] = function() { return '' }
    stack.push(id)
    if (utils.isServer) done.render('empty')
    else done()
  })
}
function defineRouteTree() {
  // Route Tree:
  //     (A)       (F)
  //     / \        |
  //   (B) (C)     (G)
  //   / \
  // (D) (E)
  root = defineRoute('A')
  defineRoute('C', root)
  var b = defineRoute('B', root)
  defineRoute('D', b)
  defineRoute('E', b)
  var f = defineRoute('F')
  defineRoute('G', f)
}
function initialRequest (path, cont) {
  switchToServer()
  fixtures.client.get(path)
  .expect(200).end(function(err) {
    if (err) throw err
    switchToBrowser()
    stack = []
    window.app = new State
    routing.initialized = false
    page.show(path) // initialize routing
    cont()
  })
}

describe('Routing', function() {
  before(function() {
    switchToBrowser()
    defineRouteTree()
    switchToServer()
    defineRouteTree()
  })
  beforeEach(function() {
    stack = []
  })
  after(function() {
    switchToServer()
  })
  it('Server-Side', function(finish) {
    fixtures.client.get('/A/B/E')
    .expect(200).end(function(err, res) {
      if (err) return finish(err)
      stack.length.should.equal(3)
      stack[0].should.equal('A')
      stack[1].should.equal('B')
      stack[2].should.equal('E')
      // console.log(stack)
      finish()
    })
  })
  describe('Client-Side', function() {
    it('move forward', function(finish) {
      initialRequest('/A', function() {
        page.show('/A/B')
        stack.length.should.equal(1)
        stack[0].should.equal('B')
        finish()
      })
    })
    it('move further', function(finish) {
      initialRequest('/A', function() {
        page.show('/A/B/D')
        stack.length.should.equal(2)
        stack[0].should.equal('B')
        stack[1].should.equal('D')
        finish()
      })
    })
    it('move back', function(finish) {
      initialRequest('/A/B/E', function() {
        page.show('/A/C')
        stack.length.should.equal(1)
        stack[0].should.equal('C')
        finish()
      })
    })
    // TODO:
    it('change tree', function(finish) {
      initialRequest('/A/B/E', function() {
        page.show('/F/G')
        // console.log(stack)
        stack.length.should.equal(2)
        stack[0].should.equal('F')
        stack[1].should.equal('G')
        finish()
      })
    })
  })
})