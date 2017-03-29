'use strict';

/**
 *  According to :
 *  https://gist.github.com/mlouro/8886076
 *  https://gist.github.com/Falconerd/3acc15f93b6a023e43b9
*/

/**
 * INCLUDES
 **/

// gulp
const gulp = require('gulp');

// utilitaire d'écriture
const gutil = require('gulp-util');

// browserSync est un serveur fournissant une méthode de livereload
const browserSync = require('browser-sync');

// browserify est utilisé pour remplacer les 'import', 'export' et autres dans un navigateur
// watchify est là pour optimiser le watch de gulp sur browserify
const browserify = require('browserify');
const watchify = require('watchify');

// babelify est un interpréteur Réact/JSX + ES6
// il faut aussi installer ses presets (cf package.json)
const babelify =  require('babelify');

//aptateur vinyl -  permet à gulp de manipuler les données issues de browserify sans passer par un fichier intermédiaire
const source = require('vinyl-source-stream');

// fournit un buffer pour la partie uglyfication, qui sinon fonctionnerait ligne par ligne au fur et à mesure du stream.
const buffer = require('vinyl-buffer');

// Equivalent de Object.assign
const assign = require('lodash.assign');

// del sert à supprimer des fichiers
const del = require('del');

// jshint, outil de lint js, ne prend pas en compte jsx
// jshint est configuré pour ecma 6, dans le fichier .jshintrc
//const jshint = require('gulp-jshint');
//const stylish = require('jshint-stylish');

// eslint pour lint javascript avec jsx
// nécessite le plugin babel-eslint, cf .eslintrc
var eslint = require('gulp-eslint');

// Gère les source Map : permettent de retracer une erreur js depuis un fichier minifié vers le fichier original
const sourcemaps = require('gulp-sourcemaps');

/**
 * CONFIGURATION
 **/

// paths
const appSrcs = ['./src/index.js'];
const jsSrc = ['./src/*.js', './src/*.jsx'];
const indexSrc = './src/index.html';
const distFolder = './dist';
const cleanAllSrc = ['./dist/**/*'];
const cleanHtmlSrc = ['./dist/*.html'];

// Config prod / dev
let watch = true; // make watchify avalaible
let debug = true; // make sourcemap avalaible


/**
 * INIT BROWSERIFY / WATCHIFY
 */

// Options de browserify
const customOpts = {
    entries: [appSrcs],
    debug: debug || true,
    transform: [['babelify', {presets: ["es2015", "react"]}]]
};

// écrasement des options par défaut de watchify
const opts = assign({}, watchify.args, customOpts);

// bundler browserify
let bundler = browserify( opts);

// si demandé, watch avec watchify
if (watch) {
    bundler = watchify(bundler);
}

/**
 * DEFINING CUSTOM TASKS
 */

// Customs tasks
const tasks = {

    // Browserify (utiliser les variables watch & debug)
    browserify: function () {

        return bundler.bundle()
            .on('error', function (err) {
                gutil.log(gutil.colors.red(err.message));
                browserSync.notify(err.message, 3000);
                this.emit('end');
            })
            .pipe(source('bundle.js'))
            // buffer avant toute transformation : on agit sur la totalité du stream
            .pipe(buffer())
            // démarrage du source map avant toute transformation
            .pipe(sourcemaps.init({
                loadMaps: true
            }))
            //.pipe(uglify())
            // on dit à gulp qu'il faudra enregistrer le sourcemap (juste avant sauvegarde finale)
            .pipe(sourcemaps.write('.'))
            .pipe(gulp.dest(distFolder));
    },

    // lint
    lint: function () {

        // avec eslint
        return gulp.src(jsSrc)
            //.pipe(eslint({
             //   baseConfig: {
              //      "ecmaFeatures": {
               //         "jsx": true
                //    }
               // }
            //}))
            .pipe(eslint())
            .pipe(eslint.format())
            //.pipe(eslint.failAfterError());

        // avec jslint
        //return gulp.src(jsSrc)
        //    .pipe(jshint())
        //    .pipe(jshint.reporter(stylish))
    },

    // clean all files
    cleanAll: function () {
        return del.sync(cleanAllSrc);
    },

    // clean html files
    cleanHtml: function(){
        return del.sync(cleanHtmlSrc);
    },

    // copy index
    mvIndex: function () {
        return gulp.src(indexSrc)
            .pipe(gulp.dest(distFolder));
    },

    // browser-sync
    browserSync: function () {
        return browserSync({
            server: {baseDir: distFolder},
            browser: ['Chrome']
        });
    }
};

/**
 * DECLARING TASKS
 */

// starting task sequence
gulp.task('st-cleanAll', tasks.cleanAll);
gulp.task('st-mvIndex', ['st-cleanAll'],tasks.mvIndex);
gulp.task('st-lint', ['st-mvIndex'],tasks.lint);
gulp.task('st-browserify', ['st-lint'],tasks.browserify);
gulp.task('st-browser-sync', ['st-browserify'],tasks.browserSync);

// refreshing JS sequence
gulp.task('rf-lint', tasks.lint);
gulp.task('rf-browserify', ['rf-lint'],tasks.browserify);
gulp.task('reload-js', ['rf-browserify'], browserSync.reload);

// refreshing html sequence
gulp.task('rf-cleanHtml', tasks.cleanHtml);
gulp.task('rf-mvIndex', ['rf-cleanHtml'],tasks.mvIndex);
gulp.task('reload-templates', ['rf-mvIndex'], browserSync.reload);

// WATCH : call the whole sequence of individual task then watch
gulp.task('watch', ['st-browser-sync'], function() {

    // console
    gutil.log(gutil.colors.green('Starting ...'));

    // watch js via watchify plutôt que gulp.watch
   // gulp.watch(jsSrc, ['lint', 'reload-js']);
    bundler.on('update', () => {
        // console
        gutil.log(gutil.colors.blue('Change detected'));

        //reload js
        gulp.start('reload-js');
    });

    // watch html
    gulp.watch(indexSrc, ['reload-templates']);

    // console
    gutil.log(gutil.colors.green('Watching for changes...'));
});

// SERVE : only what is in ./dist
gulp.task('serve', tasks.browserSync);