var Arkansas = require('arkansas')

module.exports = Arkansas.Collection.define('Todos', function() {
  this.filter('left', function() {
    var count = 0
    this._collection.forEach(function(todo) {
      if (!todo.isDone) ++count
    })
    return count
  })
  this.filter('completed', function() {
    var count = 0
    this._collection.forEach(function(todo) {
      if (todo.isDone) ++count
    })
    return count
  })
})