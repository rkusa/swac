![](https://dl.dropbox.com/u/6699613/swac.png)  
[![Build Status](https://secure.travis-ci.org/rkusa/swac.png)](http://travis-ci.org/rkusa/swac) [![Dependency Status](https://gemnasium.com/rkusa/swac.png)](https://gemnasium.com/rkusa/swac)

SWAC is a framework for developing Web application codebases that work on both the server- and the client-side.

```json
{ "name": "swac",
  "version": "0.9.0" }
```
 
**Status:** Not Ready for Production  
**Examples:** [SWAC TodoMVC](https://github.com/rkusa/todomvc.swac), [SWAC Demo](https://github.com/rkusa/swac-demo)

## Introduction

A Web application’s codebase is typically split into a server-side and a client-side with essential functionalities being implemented twice, such as validation or rendering. For implementing the codebase on the client, JavaScript is the languages all modern Web browsers can interpret. As the counterpart, the server-side codebase can be realized by plenty of programming languages, which provide facilities to implement standardized communication interfaces. While recent developments such as Node.js allow using JavaScript as a client-side programming languages outside the browser in a simple and efficient way also on the server-side, they lack offering a common codebase for the entire Web application. SWAC is a framework for developing Web application codebases that work on both the server- and the client-side by being - in its design - compatible to their differences.
    
## Getting Started

### Your Server

First, require the `swac/server` module:

```js
var swac = require('swac/server')
  , app = swac.app
  , express = swac.express
```

Next, configure your express server, add the swac middleware and point to your app definition:

```js
app.configure(function() {
  app.set('views', __dirname + '/views')
  app.use(express.static(__dirname + '/public'))

  // bodyparser middleware have to be - if used - placed 
  // above the swac middleware
  // app.use(express.bodyParser())
  // app.use(express.methodOverride())

  app.use(swac.middleware())

  // sesssion middleware have to be - if used - placed
  // below the swac middleware
  // app.use(express.cookieParser())
  // app.use(express.session({ secret: 'asd8723euzukasiudi', store: store }))
})

swac.area(__dirname + '/app')
```

Finally, attach it to a [HTTP](http://nodejs.org/docs/latest/api/http.html), [HTTPS](http://nodejs.org/docs/latest/api/https.html) or [SPDY](https://github.com/indutny/node-spdy) server:

```js
var server = require('http').createServer(app)
swac.ready(function() {
  server.listen(80)
})
```

### Your App

First, require the `swac` module:

```js
var swac   = require('swac')
```

Second, define your routes

```js
swac.get('/', function(app, done) {
  done.render('index')
})
```

### Contents
1. [API](#api)
2. [Security](#security)
3. [License](#license)

- - -

## API
1. [Server](#server)
2. [Routes](#routes)
3. [Application](#application)
4. [Application Model](#application-model)
5. [Model Factory](#model-factory)
6. [Model Definition](#model-definition)
7. [Model](#model)
8. [Model.prototype](#modelprototype)
9. [Collection](#collection)
10. [Collection.prototype](#collectionprototype)

## Server
`require('swac/server')`

### .middleware([basePath])
This is the SWAC connect middleware that must be used.

**Arguments:**

* **basePath** - the base path to which the area bundles are published to

### .area(path[, opts])
This method creates an area with the file in the path as starting point. The therefor created JavaScript bundle will contain all the area's dependencie.

**Arguments:**

* **path** - the path to the starting point of the application/area
* **opts** - additional options

**Options:**

* **layout** - the view which will function as the area's layout 
* **mount** - the path the area's JavaScript package should be mounted to
* **allow** - a function which could be used to authenticate and/or authorize the access to the area (true = allow access; false = deny access)
* **deny** - a function which could be used to authenticate and/or authorize the access to the area (true = deny access; false = allow access)

**Example:**

```js
var server = require('swac/server')
server.area(__dirname + '/admin.js', {
  layout: 'admin',
  allow: function(req) {
    return req.user && req.user.role && req.user.role === 'admin'
  }
})
```

### .scope(name, middleware)
This methods is used to define scopes, which will be used to authenticate API access.

**Arguments:**

* **name** - the scopes name; will be used to reference the scope
* **middleware** - a [connect](https://github.com/senchalabs/connect) middleware to authenticate API access

**Example:**

```js
server.scope('app', passport.authenticate('bearer', { session: false }))
```

### .ready(fn)
This methods is used to delay the execution of the provided function until the SWAC server is ready, i.e., until the client-side bundles are build and the database tables are initialized.

**Arguments:**

* **fn** - the function thats execution should be delayed

**Example:**

```js
swac.ready(function() {
  server.listen(80)
})
```

## Application
`require('swac')`

### .VERB(pattern, action[, rdy[, options]])
The `.VERB()` methods provide the routing functionality, where **VERB** is one of the HTTP verbs, such as app.post().

**Arguments:**

* **pattern** - the route's pattern
* **action** - the callback
* **rdy** - a optional client-only callback
* **options** - the possibility to provide options, such as `{ restrain: true }`, which allows to attach the route with `route.attach()` after its definition

**action(app, done, params, body, query)**  
These are the arguments provided to the callback of a route.

* **app** - the applications root model
* **done** - the function, which must be called to finish the action's functionality
    * done.**render(viewName)** - render a view
    * done.**redirect(path, options)** - redirect to a provided path
* **params** - the route params such as `params.id` for the pattern `/:id`
* **body** - the POST values
* **query** - the URL query paramters

**Example:**
```js
var root = get('/', function(app, done) {
  app.register('todos', swac.observableArray(Todo))
  app.list(Todo, function(todos) {
    app.todos.reset(todos)
    done.render('index')
  })
}, function() {
  $('#todo-list').on('dblclick', 'li', function() {
    $(this).addClass('editing')
  })
})
```

### .init(action[, rdy])
The `init` method provides the routing functionality, but without specifying an actually route. Its exists to be able to bootstrap a route tree.

**Arguments:**

* **action** - the callback
* **rdy** - a optional client-only callback

**Example:**
```js
var root = swac.init(function(req, app, done) {
  app.register('user', req.user)
  done()
})
```

**action(app, done, params, body, query)**  
These are the arguments provided to the callback of a route.

* **req** - the connect request object
* **app** - the applications root model
* **done** - the function, which must be called to finish the action's functionality

## Route Hierarchy

In SWAC routes are defined hierarchically. The resulting route hierarchy is used to determine the necessary parts that have to be executed to reflect changes between two user interactions. The business logic of a route is thereby separated into parts, where each part reflects the changes necessary to move from one route to an immediately following one.

**Example:**

```js
var root     = swac.get('/')             // = /
var projects = root.get('/projects')     // = /projects
var project  = projects.get('/:project') // = /projects/:project
var tasks    = project.get('/tasks')     // = /projects/:project/tasks
```

## Application Model
The `app` object is the root model of an application.

### .register(name, obj)
Register an object to a property of the *app* model to flag it to be serialized and transferred to the client.

**Arguments:**

* **name** - the property name, through which the object should be accessible
* **obj** - the object, which should be added

**Example**
```js
app.register('todos', swac.observableArray(Todo))
```

### .registerSection(name, fn)
This method is used to separate the application into sections.

**Arguments:**

* **name** - the area's name
* **fn** - the block

**Example:**

*layout.html*

```html
<div>@section('main')</div>
```

*index.html*

```html
@section main {
  <div>
    ...
  </div>
}
```

### .block(fn)
This method is used to partition the template into fragments to allow string-granularity updates.

**Arguments:**

* **fn** - the block/fragment
* **argN** - values which should be provided to the fragments function (these fragments do not support closures - so this is the way of providing additional data to the fragment)

**Example:**

```html
@block(function([arg1, arg2, ..., argN]) {
	<div>
		...
	</div>
}[, arg1, arg2, ..., argN])
```

### .attr(name, fn)
This method is used to bind a function to an attribute of an HTML tag.

**Arguments:**

* **name** - the attribute's name
* **fn** - the function which should be executed to get the attributes value

**Example**

```html
<div @attr('style', function() {
  @(todos.size === 0 ? 'display:none' : '')
})>
	...
</div>
```

### .collection(context, [opts,] fn)
This method is used to iterate through a collection and render the specified block for each item.

**Arguments:**

* **context** - the array
* **opts** - options, such as `{ silent: true }` to make the collection's fragment to do not update on appropriated events
* **fn** - the template, which is used to render each item

**Example:**

```html
<ul>
  @collection(todos, function(todo) {
  	<li>@todo.task</li>
  })
</ul>
```

## Model Factory
`require('swac').Model`

### .define(name[, opts], definition[, callback])
Defines a model with the given properties.

**Arguments:**

* **name** - the unique model name
* **opts** - additional options
* **definition** - the function, which defines the model's properties
* **callback** - an optional callback, which got fired as soon as the model definition is complete (useful for database adapters which create tables or views)

**Options**

* **scope** - the scope which should be used to authenticate API access
* **serverOnly** - (boolean, default: false) make the model only accessible from the server-side (no API)

**Example:**

```js
Model.define('Todo', function() {
  this.use('couchdb')
  this.property('task')
  this.property('isDone')
})
```

## Model Definition

### .property(name[, opts])
Define a property.

**Arguments:**

* **name** - the property's name

**Options:**

* **silent** - (boolean, default: true) whether the property should support events
* **serverOnly** - (boolean, default: false) makes the property only accessible from the server-side (property will not be accessible through the web API)
* **default** - the properties default value (can be a function)
* Validation: see below **required**, **type**, **pattern**

**Validation:**

* **required** - (boolean, default: false) whether the property must be set or not
* **type** - (string, default: any) string, number, boolean, array, object, date or email
* **minimum** - the minimum number (only applies if type is set to number)
* **min** - alias for minimum
* **maximum** - the maximum number (only applies if type is set to number)
* **max** - alias for maximum
* **minLength** - minimum string length (only applies if type is set to string)
* **maxLength** - maximum string length (only applies if type is set to string)
* **enum** - an array of possible values (whitelist)
* **conform** - a function (can be both sync or async)

**Example:**

```js
Model.define('Todo', function() {
  this.property('task', { type: 'string', minLength: 1 })
  this.property('isDone', { type: 'boolean' })
})
```

### .use(adapter[, opts[, definition]])
This method could be used to define the database adapter which should be used to store the model instances.

**Arguments:**

* **adapter** - the adapter's name or the module itself
* **opts** - additional adapter specific options
* **definition** - an optional definition to allow adapter specific functionality

### .allow|deny(definition)
This method could be used to define functions which will be used to authorize the access to the model's data.

**Arguments:**

* **definition** - an object which supports the properties as shown [below](#allowdeny-definition)

### .allow|deny(properties, definition)
This method could be used to define functions which will be used to authorize the access to the specified properties.

**Arguments:**

* **properties** - string representing the targeted property name or an array of property names
* **definition** - an object which supports the properties as shown [below](#allowdeny-definition)

**Example:**

```js
swac.Model.define('User', function() {
  this.property('name')
  this.property('role')

  this.allow('role', {
    write: function(req, role) {
      return !this.isClient
    }
  })
})
```

### allow/deny definition

**Properties:**

* **all** - all operations
* **read** - get and list
* **write** - post, put and delete
* **get**, **list**, **post**, **put** and **delete**

**Priorities:**

```
post   > write > all
put    > write > all
delete > write > all
```

```
get    > read > all
list   > read > all
```

### allow/deny context

**Properties:**

* **this.isBrowser** - true if the request originates from a API call
* **this.isServer** - otherwise

## Model

### Constructor
The model's constructor.

**Arguments:**

* **properties** - the property values the model should be instantiated with

**Example:**

```js
var todo = new Todo({ task: 'Foobar' })
```

### .get(id, callback)
This method is used to **retrieve** a specific document from the database.

**Arguments:**

* **id** - the documents id
* **callback** - the callback, which will be executed once the document got retrieved

**Example:**

```js
Todo.get('task1', function(err, todo) {
  ...
})
```

### .list([viewName[, viewKey],] callback)
This method is used to **retrieve a set** of document from the database.

**Arguments:**

* **viewName** - an optional name of the view, which should be listed
* **viewKey** - an optional key, which should be provided to the view
* **callback** - the callback, which will be executed once the documents got retrieved

**Example:**

```js
Todo.list(function(err, todos) {
  ...
})
```

### .post(data, callback)
This method is used to **create** a document in the database.

**Arguments:**

* **data** - the documents data
* **callback** - the callback, which will be executed once the document got created

**Example:**

```js
Todo.post({ task: 'Foobar' }, function(err, todo) {
  ...
})
```

### .put(id, data, callback)
This method is used to **update** a specific document in the database.

**Arguments:**

* **id** - the documents id
* **data** - the documents new data
* **callback** - the callback, which will be executed once the document got updated

**Example:**

```js
Todo.put(42, { task: 'Foobar', isDone: true }, function(err, todo) {
  ...
})
```

### .delete(id, callback)
This method is used to **delete** a specific document from the database.

**Arguments:**

* **id** - the documents id
* **callback** - the callback, which will be executed once the document got deleted

**Example:**

```js
Todo.delete('task1', function(err) {
  ...
})
```

## Model.prototype

### .save(callback)
Saves a new model or changes of an existing one.

**Arguments**

* **callback** - the callback which will be executed after the model got saved

**Example:**

```js
model.save(function() {
	done.render('index')
})
```

### .destroy(callback)
Destroy a model. This method also removes the model from the underlying database.

**Arguments:**

* **callback** - the callback that will be executed after the model got destroyed

**Example:**

```js
model.destroy(function() {
	done.render('index')
})
```

### .validate([[properties,] callback])
Validates the model according to the defined schema.

**Arguments:**

* **properties** - (string or array) the properties that should be validated
* **callback** - the callback that is called after the validation completed

**Example:**

```js
model.validate(function(isValid, hasWarnings) {
  done.render('index')
})
```

### .errorFor(prop)
Gets the error for a given property.

**Arguments:**

* **prop** - the property name

### .warningFor(prop)
Gets the warning for a given property.

**Arguments:**

* **prop** - the property name

## Collection
`require('swac').Collection`

This is the same as `require('swac').observableArray` except the difference of having the ability to define dynamic properties.

### .define(name, definition)
Defines a collection with the given dynamic properties.

**Arguments:**

* **name** - the unique model name
* **definition** - the function, which defines the collection's properties

**Example:**

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

### .sort([compareFunction)
This not only sorts the array, it will also lead new elements to be inserted according to the compareFunction.

### .unsort()
This stops the array from inserting new elements according to a previously defined compareFunction.

### .size
Same as `Array.prototype.length` but with the difference, that fragments could listen to changes of this property.

- - -

## Security

**Important Note:** Since the goal of this framework is to re-use an application's codebase between server and client it should be kept in mind that every part of the application's logic will be shared between server and client unless it is explicitly declared as server-only logic. Nevertheless, the actual communication between the business logic and the database will always be executed on the server-side.

### Areas

**tl;dr**
Areas can be used to establish both authenticate and authorize access to the application's routes.

**Example:**

```js
var server = require('swac/server')
server.area(__dirname + '/app.js', {
  allow: function(req) {
    return req.user && req.user.role && req.user.role === 'foobar'
  }
})
```

### Server-only Routes

Additionally, it is still possible to make use of [express](https://github.com/visionmedia/express) to define routes, as shown below.

```js
var swac = require('swac/server')
  , express = swac.express

app.post('/register', function(req, res) {
  ...
})
```

This is especially useful for cases where the business logic should not be shared between server and client.

### Model Authentication

Data API calls can be authenticated using scopes. A scope simply consists of a name and a [connect](https://github.com/senchalabs/connect) middleware, as shown below.

```js
var server = require('swac/server')
server.scope('app', passport.authenticate('bearer', { session: false }))
```

They can then be attached to models by simply passing the *scope* option containing the appropriated scope name. Once attached, the scope's middleware will be executed on every request to the model's API.

```js
var swac = require('swac')
module.exports = swac.Model.define('Note', { scope: 'app' }, function() {
  this.property('content')
})
```

### Model Authorization

The authorization can be established by providing appropriated *allow* and/or *deny* functions in the model's definition.

**Example:**

```js
swac.Model.define('Todo', function() {
  this.property('task')
  this.property('user')

  this.deny({
    all: function(req, todo) {
      return !req.user || (todo && req.user !== todo.user)
    }
  })
})
```

Both accept functions for *all*, *read*, *write*, *get*, *list*, *post*, *put* and *delete*. Detail can be found in the [API documentation above](#allowdefinition).

#### Asynchronous Model Authorization

All of these authorization methods can be used asynchronously or in a combination of both sync and async code.

**Example:**

```js
swac.Model.define('Todo', function() {
  this.property('task')
  this.property('user')

  this.allow({
    put: function(req, todo, callback) {
      if (!req.user || !todo) return false
      utils.can('todos', 'update', req.user, function(can) {
        callback(can)
      })
    }
  })
})
```

### Property Authorization

There is also the possibility to define authorization methods that only affects certain properties of the model. They can be defined using `this.allow(properties, authorization)` or `this.deny(properties, authorization)`.

**Arguments**

* **properties** - can be a single property or a array of properties
* **authorization** - the object containing the authorization methods

**Example:**

```js
swac.Model.define('Todo', function() {
  this.allow(['isDone', 'tasks'], {
    write: function(req, todo, value, property, callback) {
    }
  })
})
```

**authorization(req, model, value, property, callback)**  
These are the arguments provided to the authorization methods.

* **req** - the current request object
* **model** - the current model
* **value** - the value that should be set to the property
* **property** - the name of the currently affected property
* **callback** - the callback (optional, method can also be synchronously)

### Sever-only Model

Additionally, it is possible to declare a model as a *server-only* model. There will be no Web API for such models.

**Example:**

```js
swac.Model.define('Todo', { serverOnly: true }, function() {
  this.property('task')
})
```

### Sever-only Property

As a smaller granularity, it is possible to define properties of a model as *server-only*, too.

**Example:**

```js
swac.Model.define('Todo', function() {
  this.property('task', { serverOnly: true })
})
```

### Sever-only Model Definition

Finally, it is possible to split the whole model definition into two parts. A part which will be shared between server and client and a part which will not be shared. This could simply be achieved by adding an additional file with a `.server.js` extension.

**Example:**

```
models/
  ├─ todo.js
  └─ todo.server.js
```

*todo.js*

```js
module.exports = swac.Model.define('Todo', function() {
  this.property('task', { serverOnly: true })
})
```

*todo.server.js*

```js
require('./todo').extend(function() {
  this.property('secret')
})
```

Properties defined inside such a *server-only* extension are automatically flagged as *server-only* ones.

Additional use cases:

* conceal authorization logic
* conceal database adapter definition

- - -

## MIT License
Copyright (c) 2012-2013 Markus Ast

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.