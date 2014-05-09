var Router = require('hierarchical-router')

Router.render = function(viewName, basePath) {
  return function*() {
    return 'EPICS'
  }
}

Router.getArguments = function() {
  return [window.swac.state.locals]
}

var router = Router.create()
  , methods = ['init', 'get', 'post', 'put', 'delete', 'del']
methods.forEach(function(method) {
  exports[method] = router[method].bind(router)
})

router.start()