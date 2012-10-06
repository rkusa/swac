# Arkansas [![Build Status](https://secure.travis-ci.org/rkusa/Arkansas.png)](http://travis-ci.org/rkusa/Arkansas)

## Status

Don't use yet.

## How to Install

```bash
npm install arkansas
```

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

### .get(pattern, action[, rdy[, options]])
**Arguments**
**Example**

### .post(pattern, action[, rdy[, options]])
**Arguments**
**Example**

### action(app, done, params, body)

## app

### .register(name, obj)
**Arguments**
**Example**

### .area(name, fn)
**Arguments**
**Example**

### .block(fn)
**Arguments**
**Example**

### .attr(name, fn)
**Arguments**
**Example**

### .collection(context, [opts,] fn)
**Arguments**
**Example**

## Model
`require('arkansas').Model`

### .define(name, definition)
**Arguments**
**Example**

## Model.prototype

### .save(callback)
**Arguments**
**Example**

### .destroy(callback)
**Arguments**
**Example**

## Collection
`require('arkansas').Collection`
same as `require('arkansas').observableArray`

### .define(name, definition)
**Arguments**
**Example**

## Collection.prototype
complies `Array.prototype`

### .find(id)
**Arguments**
**Example**

### .add(item)
**Arguments**
**Example**

### .remove(item)
**Arguments**
**Example**

### .reset([items])
**Arguments**
**Example**
