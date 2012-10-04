var nano = require('nano')('http://localhost:5984')
  , db = nano.db.use('arkansas')

exports.createApiFor = function(model) {
  model.list = function(callback) {
    db.view(model._type, 'all', function(err, body) {
      if (err) throw err
      var rows = []
      body.rows.forEach(function(data) {
        var row = new model(data.value)
        row.isNew = false
        rows.push(row)
      })
      if (callback) callback(rows)
    })
  }
  model.get = function(id, callback) {
    db.get(id, function(err, body) {
      if (err) throw err
      var row = new model(body)
      row.isNew = false
      if (callback) callback(row)
    })
  }
  model.put = function(id, props, callback) {
    db.get(id, function(err, body) {
      var row = new model(body)
      row.isNew = false
      Object.keys(props).forEach(function(key) {
        if (row.hasOwnProperty(key)) row[key] = props[key]
      })
      row._rev = body._rev
      db.insert(row, row._id, function(err) {
        if (err) throw err
        if (callback) callback(row)
      })
    })

  }
  model.post = function(props, callback) {
    if (props instanceof model) {
      var row = props
      props = {}
      Object.keys(row).forEach(function(key) {
        props[key] = row[key]
      })
    }
    props.type = model._type
    if (!props._id) delete props._id
    db.insert(props, props._id, function(err, body) {
      if (err) throw err
      var row = new model(props)
      row._id = body.id
      row.isNew = false
      if (callback) callback(row)
    })
  }
  model.delete = function(id, callback) {
    db.get(id, function(err, body) {
      if (err) throw err

      db.destroy(id, body._rev, function(err) {
        if (err) throw err
        if (callback) callback()
      })
    })
  }
}