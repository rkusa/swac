var gulp = require('gulp')

gulp.task('default', ['lint', 'test'])

var mocha = require('gulp-mocha')
gulp.task('test', function() {
  return gulp.src('test/test.js')
             .pipe(mocha())
})

var jshint = require('gulp-jshint')
gulp.task('lint', function() {
  gulp.src(['lib/*.js', 'test/*.js', 'gulpfile.js'])
      .pipe(jshint())
      .pipe(jshint.reporter('jshint-stylish'))
      .pipe(jshint.reporter('fail'))
})