var gulp = require('gulp')
var plugins = require('gulp-load-plugins')()
var del = require('del')
var run_sequence = require('run-sequence')
var less_plugin_auto_prefix = require('less-plugin-autoprefix')
var autoprefix = new less_plugin_auto_prefix({ browsers: ['last 2 versions'] })
var util = require('util')
var path = require('path')

// TODO svg2png etc

var sequence_error = function (callback, error) {
  if (error) {
    plugins.util.log(plugins.util.colors.red('There was an error running the sequence!'))
    process.exit(1)
  }

  callback()
}

var paths = {
  js: [
    'src/js/*.js'
  ],

  less: [
    'src/less/*.less'
  ],

  images: [
    'src/img/**/*.svg'
  ],
}

gulp.task('pre-build', function (callback) {
  return run_sequence('clean', 'lint', function (error) {
    sequence_error(callback, error)
  })
})

gulp.task('build', function (callback) {
  return run_sequence(Object.keys(paths), function (error) {
    sequence_error(callback, error)
  })
})

gulp.task('clean', function (callback) {
  del(['public'], callback)
})

var watch

gulp.task('lint', function () {
  return gulp.src(paths.js)
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('jshint-stylish'))
        .pipe(watch ? plugins.util.noop() : plugins.jshint.reporter('fail'))
        .pipe(plugins.jscs())
})

gulp.task('js', function () {
  return gulp.src(paths.js)
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.uglify())
        .pipe(plugins.sourcemaps.write('maps'))
        .pipe(gulp.dest('public/assets/js'))
})

gulp.task('less', function () {
  return gulp.src(paths.less)
        .pipe(plugins.less({
          plugins: [autoprefix]
        }))
        .pipe(plugins.minifyCss())
        .pipe(gulp.dest('public/assets/css'))
})

gulp.task('images', function () {
  return gulp.src(paths.images)
        .pipe(gulp.dest('public/assets/img'))
})

gulp.task('watch', function () {
  for (var task in paths) {
    gulp.watch(paths[task], [task])
  }
})

gulp.task('watch-lint', function () {
  watch = true
  gulp.watch(paths.js, ['lint'])
})

gulp.task('default', function (callback) {
  return run_sequence('pre-build', 'build', 'watch', function (error) {
    sequence_error(callback, error)
  })
})

gulp.task('prod', function (callback) {
  return run_sequence('pre-build', 'build', function (error) {
    sequence_error(callback, error)
  })
})