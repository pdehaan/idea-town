const autoprefixer = require('gulp-autoprefixer');
const babelify = require('babelify');
const base64 = require('gulp-base64');
const bourbon = require('node-bourbon');
const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const cache = require('gulp-cache');
const connect = require('gulp-connect');
const del = require('del');
const eslint = require('gulp-eslint');
const globby = require('globby');
const gulp = require('gulp');
const gulpif = require('gulp-if');
const gutil = require('gulp-util');
const imagemin = require('gulp-imagemin');
const minifycss = require('gulp-minify-css');
const neat = require('node-neat');
const normalize = require('node-normalize-scss');
const rename = require('gulp-rename');
const runSequence = require('run-sequence');
const sass = require('gulp-sass');
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const tabzilla = require('mozilla-tabzilla');
const through = require('through2');
const uglify = require('gulp-uglify');

// TODO: ENV VAR to check prod/dev?
const IS_DEBUG = true;

const SRC_PATH = './idea_town/frontend/static-src/';
const DEST_PATH = './idea_town/frontend/static/';

function lintTask() {
  return gulp.src(['*.js', SRC_PATH + 'app/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failOnError());
}

gulp.task('lint', lintTask);

// Lint the gulpfile
gulp.task('selfie', function selfieTask() {
  return gulp.src('gulpfile.js')
    .pipe(lintTask());
});

gulp.task('clean', function cleanTask(done) {
  del([
    DEST_PATH
  ], done);
});

gulp.task('tabzilla-base64', function tabzillaInlineImageTask() {
  return gulp.src(tabzilla.includePaths + '/_tabzilla.scss')
    .pipe(base64())
    .pipe(gulp.dest(tabzilla.includePaths));
});

// based on https://github.com/gulpjs/gulp/blob/master/docs/recipes/browserify-with-globs.md,
// except we use the Promise returned by globby, instead of passing it a callback
gulp.task('scripts', function scriptsTask() {
  const bundledStream = through();

  // this part runs second
  bundledStream
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
     // don't uglify in development. eases build chain debugging
    .pipe(gulpif(!IS_DEBUG, uglify()))
    .on('error', gutil.log)
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(DEST_PATH + 'app/'));

  // this part runs first, then pipes to bundledStream
  globby([SRC_PATH + 'app/**/*.js']).then(function gatherFiles(entries) {
    const b = browserify({
      entries: entries,
      debug: IS_DEBUG,
      transform: [babelify]
    });
    b.bundle()
      .pipe(bundledStream);
  }, function onGlobbyError(err) {
    return bundledStream.emit('error', err);
  });

  return bundledStream;
});

gulp.task('styles', ['tabzilla-base64'], function stylesTask() {
  return gulp.src(SRC_PATH + 'styles/**/*.scss')
    .pipe(sass({
      includePaths: [normalize.includePaths, tabzilla.includePaths, bourbon.includePaths, neat.includePaths]
    }).on('error', sass.logError))
    .pipe(autoprefixer('last 2 versions'))
    .pipe(gulp.dest(DEST_PATH + 'styles'))
      // don't minify in development
      .pipe(gulpif(!IS_DEBUG, rename({ suffix: '.min' })))
      .pipe(gulpif(!IS_DEBUG, minifycss()))
    .pipe(gulp.dest(DEST_PATH + 'styles'));
});

gulp.task('images', function imagesTask() {
  return gulp.src(SRC_PATH + 'images/**/*')
    .pipe(cache(imagemin({ optimizationLevel: 3, progressive: true, interlaced: true })))
    .pipe(gulp.dest(DEST_PATH + 'images'));
});

gulp.task('build', function buildTask(done) {
  runSequence(
    'clean',
    'scripts',
    'styles',
    'images',
    done
  );
});

gulp.task('watch', ['build'], function watchTask() {
  gulp.watch(SRC_PATH + 'styles/**/*', ['styles']);
  gulp.watch(SRC_PATH + 'images/**/*', ['images']);
  gulp.watch(SRC_PATH + 'app/**/*.js', ['scripts']);
});

// Set up a webserver for the static assets
gulp.task('connect', function connectTask() {
  connect.server({
    root: DEST_PATH,
    livereload: false,
    port: 9988
  });
});

gulp.task('server', ['build', 'connect', 'watch']);

gulp.task('default', ['build', 'watch']);
