var arkansas = require('../lib/server')
  , app = arkansas.app
  , express = arkansas.express
  , appPath = __dirname + '/../examples/todos'
  , Todo = require('./fixtures').Todo
  , browser = new (require("zombie"))({ silent: true, debug: true })
  , should = require('should')
  , server, db
  
describe.skip('Client-Side functionality', function() {
  before(function(done) {
    app.configure(function() {
      app.set('views', appPath + '/views')
      app.use(express.static(appPath + '/public'))
    })
    arkansas.init(appPath + '/app')
    db = {
      1: new Todo({ id: 1, task: 'first', isDone: false }),
      2: new Todo({ id: 2, task: 'second', isDone: true })
    }
    Todo.list = function(callback) {
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
      if (!props['id']) {
        var id = 1
        while (db[id]) id++
        props['id'] = id
      }
      db[props['id']] = new Todo(props)
      db[props['id']].isNew = false
      if (callback) callback(db[props['id']])
    }
    Todo.delete = function(id, callback) {
      delete db[id]
      if (callback) callback()
    }
    server = require('http').createServer(app)
    server.listen(3001, browser.visit.bind(browser, 'http://127.0.0.1:3001/', done))
  })
  
  after(function() {
    server.close()
  })
  
  it('should receive the app\'s state', function() {
    browser.window.should.have.property('app')
  })
  
  describe('Fragment Re-rendering', function() {
    var fragments = { todo: null, toggle: null, collection: null, main: null }
    before(function() {
      fragments.main = browser.window.app.fragments[0]
      fragments.toggle = browser.window.app.fragments[1]
      fragments.collection = browser.window.app.fragments[2]
      fragments.todo = browser.window.app.fragments[3]
    })
    it.skip('should dispose its children', function(done) {
      var count = 3
        , callback = function() {
          if (--count > 0) return
          done()
        }
      fragments.collection.on('delete', callback)
      fragments.todo.on('delete', callback)
      fragments.toggle.on('delete', callback)
      fragments.main.refresh()
    })
  })
})