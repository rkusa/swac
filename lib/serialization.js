var contracts = {}
exports.Contract = function(id, obj, contract) {
  if (contracts[id]) throw new Error('contract id already taken')
  contracts[id] = obj
  contract.id = id
  Object.defineProperty(obj.prototype, '$contract', {
    value: contract
  })
}

exports.prepare = function(obj) {
  return (function traverse(val, path) {
    switch (typeof val) {
      case 'function':
        if (val.prototype.hasOwnProperty('$contract')) {
          return { $obj: val.prototype.$contract.id }
        }
        return val
      case 'object':
        // get rid of builtin objects and consider typeof null === 'object'
        if (val === null ||
            val instanceof Boolean ||
            val instanceof Date ||
            val instanceof Number ||
            val instanceof RegExp ||
            val instanceof String) {
          return val
        }

        // already encountered? if so, return a reference
        if (val.hasOwnProperty('$path'))
          return { $ref: val.$path }
            
        // otherwise mark as encountered
        Object.defineProperty(val, '$path', {
          value: path.join('.')
        })
          
        // so it is an array or an object, no matter what,
        // copy and traverse its items
        var copy = Array.isArray(val) ? [] : {}
        
        if ('$contract' in val) {
          copy.$type = val.$contract.id
          val.$contract.forEach(function(prop) {
            copy[prop] = traverse(val[prop], path.concat(prop))
          })
          if (Array.isArray(val)) {
            for (var i = 0; i < val.length; ++i) {
              copy[i] = traverse(val[i], path.concat(i))
            }
          }
        } else {          
          for (var i in val) {
            copy[i] = traverse(val[i], path.concat(i))
          }
        }
          
        return copy
      default:
        return val
    }
  })(obj, [])
}

exports.recover = function(obj) {
  var result
  return (function traverse(val) {
    if (typeof val !== 'object' || val === null)
      return val
    
    if (val.hasOwnProperty('$type')) {
      var recovered = new contracts[val.$type]
      if (!result) result = recovered
      Object.keys(val).forEach(function(prop) {
        if (prop === '$type') return
        recovered[prop] = traverse(val[prop])
      })
      return recovered
    // is reference? if so, resolve
    } else if (val.hasOwnProperty('$ref')) {
      var pos = result
      val.$ref.split('.').forEach(function(part) {
        pos = pos[part]
      })
      return pos
    }
          
    // so it is an array or an object, no matter what,
    // copy and traverse its items
    var copy = Array.isArray(val) ? [] : {}
    if (!result) result = copy
    for (var i in val) {
      copy[i] = traverse(val[i])
    }
          
    return copy
  })(obj)
}