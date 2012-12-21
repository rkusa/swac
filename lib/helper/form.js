var utils = require('./utils')
  , implode = require('../implode')
  , Template = require('../template')

var Forms = function (model, fragment, buf) {
  this.model = model
  var that = this
  this.get = function(prop, fragment) {
    if (fragment) {
      var fn = function() {
        return that.model[prop]
      }
      fn.fragment = fragment
      return fn()
    } else {
      return that.model[prop]
    }
  }
  var _fragment
  Object.defineProperty(this, 'fragment', {
    get: function() {
      return _fragment
    },
    set: function(val) {
      _fragment = val
      that.get.fragment = val
    }
  })
  this.fragment = fragment
  this.buf      = buf
}

implode.register('Forms', Forms, ['model', 'fragment'])

var formFor = module.exports = function (/* model, [attrs], definition */) {
  var args = Array.prototype.slice.call(arguments)
  	, definition = args.pop()
  	, model = args.shift()
  	, attrs = args.shift() || {}

  if (!model) {
    throw new Error('model is missing')
  }

  if (typeof definition != 'function') {
    attrs = definition
    definition = null
  }

  if (!attrs.method) attrs.method = 'POST'
  
  var buf = []
    , forms = new Forms(model, formFor.caller.fragment)
  buf.push(utils.startTag('form', attrs))
  if (definition) {
    var template = new Template(definition)
    buf.push(template.fn.call(this, forms))
  }
  buf.push(utils.endTag('form', attrs))
  
  return buf.join("\n")
}

formFor.labelFor = function (/*model, prop, content, attrs*/) {
  return rectify(arguments, function (model, prop, content, attrs) {
    if (model) {
      if (!content)
        content = utils.humanize(prop)
      if (!attrs.for)
        attrs.for = model._type.toLowerCase() + '_' + prop
    }
    
    return utils.tag('label', content, attrs)
  })
}

Forms.prototype.label = function label(prop, content, attrs) {
  this.get(prop, label.caller.fragment)
  var html = formFor.labelFor.apply(Forms,
    [this.model].concat(Array.prototype.slice.call(arguments)))
  if (this.buf) this.buf.push(html)
  return html
}

formFor.textareaFor = function (/*model, prop, content, attrs, options*/) {
  return rectify(arguments, function (model, prop, content, attrs, options) {
    if (model) {
      if (!attrs.id)
        attrs.id = model._type.toLowerCase() + '_' + prop
      if (!attrs.name)
        attrs.name = model._type.toLowerCase() + '[' + prop + ']'
      content = content || model[prop] || ''
    } else if (!attrs.name) {
        attrs.name = prop
    }
    return utils.tag('textarea', content, attrs)
  })
}

Forms.prototype.textarea = function textarea(prop, content, attrs) {
  this.get(prop, textarea.caller.fragment)
  var html = formFor.textareaFor.apply(Forms,
    [this.model].concat(Array.prototype.slice.call(arguments)))
  if (this.buf) this.buf.push(html)
  return html
}

Object.defineProperty(formFor, '_inputTypes', {
  value: ['hidden', 'text', 'search', 'tel', 'url', 'email',
          'password', 'datetime', 'date', 'month', 'week',
          'time', 'datetime-local', 'number', 'range', 'color',
          'checkbox', 'radio', 'file', 'submit', 'image',
          'reset', 'button'],
  writable: false
})

formFor.inputFor = function (/* model, type, prop, value, attrs */) {
  return rectify(arguments, function (model, prop, value, attrs, type) {
    if (model) {
      if (!attrs.id)
        attrs.id = model._type.toLowerCase() + '_' + prop
      if (!attrs.name)
        attrs.name = model._type.toLowerCase() + '[' + prop + ']'
      attrs.value = value || model[prop] || ''
    } else {
      if (!attrs.name)
        attrs.name = prop
      attrs.value = value
    }
    
    if (!attrs.type) {
      attrs.type = type || 'text'
    }
    
    return utils.tag('input', null, attrs)
  }, true)
}

Forms.prototype.input = function input(type, prop, value, attrs) {
  this.get(prop, input.caller.fragment)
  var html = formFor.inputFor.apply(Forms,
    [this.model].concat(Array.prototype.slice.call(arguments)))
  if (this.buf) this.buf.push(html)
  return html
}

formFor.fieldFor = function (model, prop, attrs) {
  var schema = model._validation[prop]
    , attrs = attrs || {}
    , type = 'text'
  
  if (schema) {
    if (schema.required) attrs.required = 'true'
    
    switch (schema.type) {
      case 'string':
        if (schema.pattern && !attrs.pattern)
          attrs.pattern = schema.pattern
        if (schema.maxLength && !attrs.maxLength)
          attrs.maxLength = schema.maxLength
        break
      case 'number':
        type = 'number'
        if (typeof schema.minimum != 'undefined' && !attrs.min)
          attrs.min = schema.minimum
        if (typeof schema.maximum != 'undefined' && !attrs.max)
          attrs.max = schema.maximum
        if (schema.divisibleBy && !attrs.step)
          attrs.step = schema.divisibleBy
        if (typeof schema.exclusiveMinimum != 'undefined' && !attrs.min)
          attrs.min = schema.exclusiveMinimum + (schema.divisibleBy || 0)
        if (typeof schema.exclusiveMaximum != 'undefined' && !attrs.max)
          attrs.max = schema.exclusiveMaximum - (schema.divisibleBy || 0)
        break
      default:
        break
    }
    switch (schema.format) {
      case 'email': type = 'email'; break
      case 'url': type = 'url'; break
      case 'date-time': type = 'datetime'; break
      case 'date': type = 'date'; break
      case 'time': type = 'time'; break
      default: break
    }
  }

  return formFor.inputFor(model, type, prop, attrs)
}

Forms.prototype.for = function forFn(prop, attrs) {
  this.get(prop, forFn.caller.fragment)
  var html = formFor.fieldFor(this.model, prop, attrs)
  if (this.buf) this.buf.push(html)
  return html
} 

// no __noSuchMethod__ in v8 :-(
formFor._inputTypes.forEach(function (type) {
  if (formFor[type]) return
  formFor[type + 'FieldFor'] = function (/*model, prop, value, attrs*/) {
    var args = Array.prototype.slice.call(arguments)
    return formFor.inputFor.apply(this, args.slice(0, 1).concat([type], args.slice(1)))
  }

  Forms.prototype[type + 'Field'] = function fn(prop, value, attrs)  {
    this.get(prop, fn.caller.fragment)
    return formFor.inputFor.apply(Forms,
      [this.model, type].concat(Array.prototype.slice.call(arguments)))
  }
})

function rectify(args, callback, typed) {
  var args = Array.prototype.slice.call(args)
	, model = args.shift()
	, type = typed ? args.shift() : null
	, prop = (typeof model == 'object') ? args.shift() : model
	, attrs = args.pop()
	, content = args.shift()

  if (!attrs || typeof attrs !== 'object') {
    content = attrs
    attrs = {}
  }
  if (typeof model != 'object') model = null

  return callback(model, prop, content, attrs, type)
}