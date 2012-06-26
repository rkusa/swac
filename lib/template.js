var Template = module.exports = function(id, fn) {
  var that = this

  this.id = id
  this.fn = typeof fn === 'function' ? fn.toString() : fn

  Object.defineProperty(this, 'function', {
    get: function() {
      return new Function('__obj', "if (!__obj) __obj = {};\n  var _this = this, __out = [], __fragment = arguments.callee.fragment, __capture = function(callback) {\n    var out = __out, result;\n    __out = [];\n  callback.fragment = __fragment;\n    callback.call(this);\n    result = __out.join('');\n    __out = out;\n    return __safe(result);\n  }, __sanitize = function(value) {\n    if (value && value.ecoSafe) {\n      return value;\n    } else if (typeof value !== 'undefined' && value != null) {\n      return __escape(value);\n    } else {\n      return '';\n    }\n  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;\n  __safe = __obj.safe = function(value) {\n    if (value && value.ecoSafe) {\n      return value;\n    } else {\n      if (!(typeof value !== 'undefined' && value != null)) value = '';\n      var result = new String(value);\n      result.ecoSafe = true;\n      return result;\n    }\n  };\n  if (!__escape) {\n    __escape = __obj.escape = function(value) {\n      return ('' + value)\n        .replace(/&/g, '&amp;')\n        .replace(/</g, '&lt;')\n        .replace(/>/g, '&gt;')\n        .replace(/\x22/g, '&quot;');\n    };\n  }\n  (function() {\n __out.push((" + that.fn + ").call(this, __obj));\n  }).call(__obj);\n  __obj.safe = __objSafe, __obj.escape = __escape;\n  return __out.join('');")
    },
    enumerable: true
  })
}

Template.prototype.serialize = function() {
  return { type: 'Template', obj: {
    id: this.id,
    fn: this.fn
  }}
}

Template.prototype.deserialize = function(obj) {
  this.id = obj.id
  this.fn = obj.fn
}