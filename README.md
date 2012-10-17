# Arkansas [![Build Status](https://secure.travis-ci.org/rkusa/Arkansas.png)](http://travis-ci.org/rkusa/Arkansas)

## Status

Don't use yet.

## Example
[Arkansas TodoMVC](https://github.com/rkusa/todomvc.arkansas)
    
## How to Use

### Your Server

First, require the `arkansas/server` module:

```js
var arkansas = require('arkansas/server')
  , app = arkansas.app
  , express = arkansas.express
```

Next, configure your express server and point to your app definition:

```js
app.configure(function() {
  app.set('views', __dirname + '/views')
  app.use(express.static(__dirname + '/public'))
})

arkansas.init(__dirname + '/app')
```

Finally, attach it to a HTTP/HTTPS server:

```js
var server = require('http').createServer(app)
server.listen(80)
```

### Your App

First, require the `arkansas` module:

```js
var Arkansas = require('arkansas')
  , get      = Arkansas.get
  , post     = Arkansas.post
```

Finally, define your routes

```js
get('/', function(app, done) {
  done.render('index')
})
```

## API

## Arkansas
`require('arkansas')`

### .VERB(pattern, action[, rdy[, options]])
The `.VERB()` methods provide the routing functionality, where **VERB** is one of the HTTP verbs, such as app.post().

**Arguments**
* **pattern** - the route's pattern
* **action** - the callback
* **rdy** - a optional client-only callback
* **options** - the possibility to provide options, such as `{ restrain: true }`, which allows to attach the route with `route.attach()` after its definition

**Example**
```js
var root = get('/', function(app, done) {
  app.register('todos', arkansas.observableArray(Todo))
  Todo.list(function(todos) {
    app.todos.reset(todos)
    done.render('index')
  })
}, function() {
  $('#todo-list').on('dblclick', 'li', function() {
    $(this).addClass('editing')
  })
})
```

### action(app, done, params, body)
These are the arguments provided to the callback of a route.
* **app** - the applications root model
* **done** - the function, which should be called to finish the action's functionality
** done.**render(viewName)** - render a view
** done.**redirect(path, options)** - redirect to a provided path
* **params** - the route params such as `params.id` for the pattern `/:id`
* **body** - the POST values

## app
This is the root model of an application.

### .register(name, obj)
Register an object to a property of the *app* model to flag it to be serialized and transferred to the client.

**Arguments**
* **name** - the property name, through which the object should be accessible
* **obj** - the object, which should be added

**Example**
```js
app.register('todos', arkansas.observableArray(Todo))
```

### .area(name, fn)
This method is used to mark a block in a template as a area.

**Arguments**
* **name** - the area's name
* **fn** - the block

**Example**
```HTML
@area('main', function() {
	<div>
		...
	</div>
})
```

### .block(fn)
This method is used to partition the template into fragments to allow string-granularity updates.

**Arguments**
* **fn** - the block/fragment

**Example**
```HTML
@block(function() {
	<div>
		...
	</div>
})
```

### .attr(name, fn)
This method is used to bind a function to an attribute of an HTML tag.

**Arguments**
* **name** - the attribute's name
* **fn** - the function which should be executed to get the attributes value

**Example**
```HTML
<div @@attr('style', function() { return todos.size === 0 ? 'display:none' : '' })>
	...
</div>
```

### .collection(context, [opts,] fn)
This method is used to iterate through a collection and render the specified block for each item.

**Arguments**
* **context** - the array
* **opts** - options, such as `{ silent: true }` to make the collection's fragment to do not update on appropriated events
* **fn** - the template, which is used to render each item

**Example**
```HTML
<ul>
  @@collection(todos, function(todo) {
  	<li>@todo.task</li>
  })
</ul>
```

## Model
`require('arkansas').Model`

### .define(name, definition)
Defines a model with the given properties.

**Arguments**
* **name** - the unique model name
* **definition** - the function, which defines the model's properties

**Example**
```js
Model.define('Todo', function() {
  this.property('task')
  this.property('isDone')
})
```

## Model.prototype

### .save(callback)
Saves a new model or changes of an existing one.

**Arguments**
* **callback** - the callback which will be executed after the model got saved

**Example**
```js
model.save(function() {
	done.render('index')
})
```

### .destroy(callback)
Destroy a model. This method also removes the model from the underlying database.

**Arguments**
* **callback** - the callback which will be executed after the model got destroyed

**Example**
```js
model.destroy(function() {
	done.render('index')
})
```

## Collection
`require('arkansas').Collection`
This is the same as `require('arkansas').observableArray` but with the difference of having the ability to define dynamic properties.

### .define(name, definition)
Defines a collection with the given dynamic properties.

**Arguments**
* **name** - the unique model name
* **definition** - the function, which defines the collection's properties

**Example**
```js
Collection.define('Todos', function() {
  this.property('left', function() {
		var count = 0
		this.forEach(function(todo) {
			if (!todo.isDone) ++count
		})
		return count
	})
})
```

## Collection.prototype
Complies to `Array.prototype` but with the following extensions.

### .find(id)
Search a model by its id.

### .add(item)
Add a model to the collection.

### .remove(item)
Remove a model from the collection

### .reset([items])
Empty the collection and optional add the provided items afterwards.

### .size
Same as `Array.prototype.length` but with the difference, that fragments could listen to changes of this property.

## MIT License
Copyright (c) 2012 Markus Ast

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.