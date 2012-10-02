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
      case 'object':
        // get rid of builtin objects
        // and consider that typeof null === 'object'
        if (val === null ||
            val instanceof Boolean ||
            val instanceof Date ||
            val instanceof Number ||
            val instanceof RegExp ||
            val instanceof String) {
          return val
        }

        // already encountered? if so, return a reference
        if (val.hasOwnProperty('$path')) {
          // follow path to check its existence to prepend
          // errors from obsolete $path properties
          try {
            var pos = { '#': obj }    
            val.$path.split('.').forEach(function(part) {
              pos = pos[part]
            })
            if (pos !== undefined)
              return { $ref: val.$path }
          } catch(e) {}
        }
            
        // otherwise mark as encountered and append its path
        Object.defineProperty(val, '$path', {
          value: path.join('.'),
          writable: true
        })
          
        // so it is an array or an object
        var copy = Array.isArray(val) ? [] : {}
        
        // if the object contains a $contract, stick to it
        if ('$contract' in val) {
          var contract = val.$contract
          copy.$type = contract.id
          
          // preprocess the object with the
          // $serialize method if existent
          if ('$serialize' in val)
            val = val.$serialize()
          
          // stick to the contract
          contract.forEach(function(prop) {
            copy[prop] = traverse(val[prop], path.concat(prop))
          })
          
          // additionally if it is an array,
          // take its items too
          if (Array.isArray(val)) {
            for (var i = 0; i < val.length; ++i) {
              copy[i] = traverse(val[i], path.concat(i))
            }
          }
        // otherwise, copy and traverse its items
        } else {
          for (var i in val) {
            copy[i] = traverse(val[i], path.concat(i))
          }
        }
        
        // done
        return copy
      case 'function':
        // if its prototype contains a $contract, return a reference
        if (val.prototype.hasOwnProperty('$contract')) {
          return { $obj: val.prototype.$contract.id }
        }
      default:
        // do nothing
        return val
    }
  })(obj, ['#'])
}

exports.recover = function(obj) {
  // reference to the root of the new object
  // for reference resolving
  var root
  
  return (function traverse(val, ident, parent) {
    // no object = nothing to do
    if (typeof val !== 'object' || val === null)
      return !parent ? val : parent[ident] = val
    
    // if it is a reference, resolve it
    if ('$ref' in val) {
      // follow path
      var pos = root
      val.$ref.split('.').forEach(function(part) {
        pos = pos[part]
      })
      
      return parent[ident] = pos
    // if it is a reference to a class, resolve it
    } else if ('$obj' in val) {
      return parent[ident] = contracts[val.$obj]
    }
    
    var copy
    
    // if it is a class, rebuild it
    if ('$type' in val) {
      // create new instance appropriated instance
      copy = new contracts[val.$type]
          
      // preprocess the object with the
      // $deserialize method if existent
      if ('$deserialize' in copy)
        val = copy.$deserialize(val)
        
      delete val.$type
    // otherwise, it is an array or an object
    } else {
      copy = /* parent[ident] ||*/ (Array.isArray(val) ? [] : {})
    }
    
    // if parent not set, its the root obj
    if (!parent) root = { '#': copy }
    else parent[ident] = copy
    
    // copy and traverse its items
    for (var i in val) {
      traverse(val[i], i, copy)
    }

    // done   
    return copy
  })(obj, null, null)
}