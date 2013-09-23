var validate = require('../lib/validate')
  , should = require('should')
  , Model = require('swac').Model

describe('Validation', function() {
  describe('required', function() {
    
  })
  describe('number', function() {
    var model = Model.define('NumberValidation', function() {
      this.property('num')
    })
    describe('type', function() {
      it('should accept undefined', function() {
        var issues = validate(new model(), { num: { type: 'number' } })
        should.strictEqual(issues.num, undefined)
      })
      it('should accept integer', function() {
        var issues = validate(new model({ num: 42 }), { num: { type: 'number' } })
        should.strictEqual(issues.num, undefined)
      })
      it('should accept integer provided as strings', function() {
        var issues = validate(new model({ num: '42' }), { num: { type: 'number' } })
        should.strictEqual(issues.num, undefined)
      })
      it('should accept floats', function() {
        var issues = validate(new model({ num: 3.14159265359 }), { num: { type: 'number' } })
        should.strictEqual(issues.num, undefined)
      })
      it('should accept floats provided as strings', function() {
        var issues = validate(new model({ num: '3.14159265359' }), { num: { type: 'number' } })
        should.strictEqual(issues.num, undefined)
      })
      it('should accept empty strings and interpret them as zero', function() {
        var instance = new model({ num: '' })
        var issues = validate(instance, { num: { type: 'number' } })
        should.strictEqual(issues.num, undefined)
        instance.should.have.property('num', 0)
      })
      it('should fail with non numeric inputs', function() {
        var issues = validate(new model({ num: 'asd' }), { num: { type: 'number' } })
        issues.num.should.have.property('message', 'must be a number')
      })
    })
    it('minimum', function() {
      var instance = new model({ num: '' }), schema = { num: { type: 'number', min: 42 } }
      var issues = validate(instance, schema)
      issues.num.should.have.property('message', 'must be greater than or equal to 42')
      instance.num = 42
      issues = validate(instance, schema)
      should.strictEqual(issues.num, undefined)
    })
    it('maximum', function() {
      var instance = new model({ num: 43 }), schema = { num: { type: 'number', max: 42 } }
      var issues = validate(instance, schema)
      issues.num.should.have.property('message', 'must be less than or equal to 42')
      instance.num = 41
      issues = validate(instance, schema)
      should.strictEqual(issues.num, undefined)
    })
  })
  describe('string', function() {
    var model = Model.define('StringValidation', function() {
      this.property('str')
    })
    it('minLength', function() {
      var instance = new model({ str: '' }), schema = { str: { minLength: 1 } }
      var issues = validate(instance, schema)
      issues.str.should.have.property('message', 'is too short (minimum is 1 characters)')
      instance.str = 'swac'
      issues = validate(instance, schema)
      should.strictEqual(issues.str, undefined)
    })
    it('maxLength', function() {
      var instance = new model({ str: 'swac' }), schema = { str: { maxLength: 1 } }
      var issues = validate(instance, schema)
      issues.str.should.have.property('message', 'is too long (maximum is 1 characters)')
      instance.str = 'S'
      issues = validate(instance, schema)
      should.strictEqual(issues.str, undefined)
    })
  })
  describe('array', function() {
    var model = Model.define('ArrayValidation', function() {
      this.property('arr')
    })
    it('should work', function() {
      var instance = new model({ arr: 'swac' }), schema = { arr: { type: 'array' } }
      var issues = validate(instance, schema)
      issues.arr.should.have.property('message', 'must be an array')
      instance.arr = ['swac']
      issues = validate(instance, schema)
      should.strictEqual(issues.arr, undefined)
    })
  })
  describe('object', function() {
    var model = Model.define('ObjectValidation', function() {
      this.property('obj')
    })
    it('should work', function() {
      var instance = new model({ obj: [] }), schema = { obj: { type: 'object' } }
      var issues = validate(instance, schema)
      issues.obj.should.have.property('message', 'must be an object')
      instance.obj = { name: 'swac' }
      issues = validate(instance, schema)
      should.strictEqual(issues.obj, undefined)
    })
  })
  describe('date', function() {
    var model = Model.define('DateValidation', function() {
      this.property('date')
    })
    it('should work', function() {
      var instance = new model({ date: 'asd' }), schema = { date: { type: 'date' } }
      var issues = validate(instance, schema)
      issues.date.should.have.property('message', 'must be a valid date')
      instance.date = new Date
      issues = validate(instance, schema)
      should.strictEqual(issues.date, undefined)
    })
  })
  describe('boolean', function() {
    var model = Model.define('BooleanValidation', function() {
      this.property('bool')
    })
    it('should work', function() {
      var instance = new model({ bool: 'swac' }), schema = { bool: { type: 'boolean' } }
      var issues = validate(instance, schema)
      issues.bool.should.have.property('message', 'must be a boolean')
      instance.bool = true
      issues = validate(instance, schema)
      should.strictEqual(issues.bool, undefined)
    })
  })
  describe('email', function() {
    var model = Model.define('EmailValidation', function() {
      this.property('email')
    })
    it('should work', function() {
      var instance = new model({ email: 'asd' }), schema = { email: { type: 'email' } }
      var issues = validate(instance, schema)
      issues.email.should.have.property('message', 'must be a valid email')
      instance.email = 'github.m@rkusa.st'
      issues = validate(instance, schema)
      should.strictEqual(issues.email, undefined)
    })
  })
  describe('enum', function() {
    var model = Model.define('EnumValidation', function() {
      this.property('enum')
    })
    it('should work', function() {
      var instance = new model({ enum: 'd' }), schema = { enum: { enum: ['a', 'b', 'c'] } }
      var issues = validate(instance, schema)
      issues.enum.should.have.property('message', 'must one of the following values: a, b, c')
      instance.enum = 'a'
      issues = validate(instance, schema)
      should.strictEqual(issues.enum, undefined)
    })
  })
  describe('conform', function() {
    var model = Model.define('ConformValidation', function() {
      this.property('conform')
    })
    it('should work synchronously', function() {
      var instance = new model({ conform: 'asdf' }), schema = { conform: { conform: function(val) {
        return val === 'swac'
      } } }
      var issues = validate(instance, schema)
      issues.conform.should.have.property('message', 'must conform to given constraint')
      instance.conform = 'swac'
      issues = validate(instance, schema)
      should.strictEqual(issues.conform, undefined)
    })
    it('should work asynchronously', function(done) {
      var instance = new model({ conform: 'asdf' }), schema = { conform: { conform: function(val, done) {
        process.nextTick(function() {
          done(val === 'swac')
        })
      } } }
      validate(instance, schema, function(issues) {
        issues.conform.should.have.property('message', 'must conform to given constraint')
        instance.conform = 'swac'
        validate(instance, schema, function(issues) {
          should.strictEqual(issues.conform, undefined)
          done()
        })
      })
    })
  })
})