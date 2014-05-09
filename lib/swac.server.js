var handlebars = require('handlebars')
var fs = require('fs')
var Router = require('hierarchical-router')

Router.render = function(viewName, basePath) {
  return function*() {
    var state = process.domain.swac.state
    var source = yield fs.readFile.bind(fs, basePath + viewName + '.html', 'utf8')
    var precompiled = precompile(source)
    state.templates[viewName] = precompiled
    state.currentView = viewName
    var template = handlebars.template(state.templates[viewName])
    return template(state.locals)
  }
}

Router.getArguments = function() {
  return [process.domain.swac.state.locals]
}

function precompile(input, options) {
  if (!input || (typeof input !== 'string' && input.constructor !== handlebars.AST.ProgramNode)) {
    throw new TypeError("You must pass a string or Handlebars AST to Handlebars.precompile. You passed " + input)
  }

  options = options || {}
  if (!('data' in options)) {
    options.data = true
  }

  var ast = handlebars.parse(input)
  var environment = new handlebars.Compiler().compile(ast, options)
  return new handlebars.JavaScriptCompiler().compile(environment, options, undefined, true)
}