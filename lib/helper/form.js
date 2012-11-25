var utils = require('./utils')
  , aUtils = require('../utils')

var Forms = module.exports = function (model, caller, buf) {
  this.model = model
  this.get = function(prop) {
    return model[prop]
  }
  this.get.fragment = caller.fragment
  this.buf   = buf
}

Forms.formFor = function formFor(/* model, [attrs], definition */) {
  var args = Array.prototype.slice.call(arguments)
	, that = this
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
    , forms = new Forms(model, formFor.caller)
  buf.push(utils.startTag('form', attrs))
  if (definition) buf.push(aUtils.mergeTemplate(definition.call(forms)))
  buf.push(utils.endTag('form', attrs))
  
  return buf.join("\n")
}

Forms.labelFor = function (/*model, prop, content, attrs*/) {
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

Forms.prototype.label = function(prop, content, attrs) {
  this.get(prop)
  var html = Forms.labelFor(this.model, prop, content, attrs)
  if (this.buf) this.buf.push(html)
  return html
}

Forms.textareaFor = function (/*model, prop, content, attrs*/) {
  return rectify(arguments, function (model, prop, content, attrs) {
    if (model && !content) content = model[prop]
    return utils.tag('textarea', content, attrs)
  })
}

Forms.prototype.textarea = function(prop, content, attrs) {
  this.get(prop)
  var html = Forms.textareaFor(this.model, prop, content, attrs)
  if (this.buf) this.buf.push(html)
  return html
}

Object.defineProperty(Forms, '_inputTypes', {
  value: ['hidden', 'text', 'search', 'tel', 'url', 'email',
          'password', 'datetime', 'date', 'month', 'week',
          'time', 'datetime-local', 'number', 'range', 'color',
          'checkbox', 'radio', 'file', 'submit', 'image',
          'reset', 'button'],
  writable: false
})

Forms.inputFor = function (/* model, type, prop, value, attrs */) {
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

Forms.prototype.input = function (type, prop, value, attrs) {
  this.get(prop)
  var html = Forms.inputFor(this.model, type, prop, value, attrs)
  if (this.buf) this.buf.push(html)
  return html
}

Forms.fieldFor = function (model, prop, attrs) {
  var schema = model._validation
    , attrs = attrs || {}
    , type = 'text'
  
  if (schema.required) attrs.required = 'true'
  
  switch (schema.type) {
    case 'string':
      switch (schema.format) {
        case 'email': type = 'email'; break
        case 'url': type = 'url'; break
        case 'date-time': type = 'datetime'; break
        case 'date': type = 'date'; break
        case 'time': type = 'time'; break
        default: break
      }
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
  
  return Forms.inputFor(model, type, prop, attrs)
}

Forms.prototype.for = function(prop, attrs) {
  this.get(prop)
  var html = Forms.fieldFor(this.model, prop, attrs)
  if (this.buf) this.buf.push(html)
  return html
} 

// no __noSuchMethod__ in v8 :-(
Forms._inputTypes.forEach(function (type) {
  if (Forms[type]) return
  Forms[type + 'FieldFor'] = function (/*model, prop, value, attrs*/) {
    var args = Array.prototype.slice.call(arguments)
    return Forms.inputFor.apply(this, args.slice(0, 1).concat([type], args.slice(1)))
  }
  Forms.prototype[type + 'Field'] = function(prop, value, attrs)  {
    this.get(prop)
    return this.input.call(this, type, prop, value, attrs)
  }
})

function rectify(args, callback, typed) {
  var args = Array.prototype.slice.call(args)
	, model = args.shift()
	, type = typed ? args.shift() : null
	, prop = (typeof model == 'object') ? args.shift() : model
	, attrs = args.pop()
	, content = args.shift()

  if (!attrs || typeof attrs != 'object') attrs = {}
  if (typeof model != 'object')           model = null

  return callback(model, prop, content, attrs, type)
}