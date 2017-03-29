// GULPFILE with live reload, for web development
const gulp = require('gulp');
const browserSync = require('browser-sync');
const reload = browserSync.reload;

// watch files for changes and reload
gulp.task('serve', function() {
    browserSync({
        server: {
            baseDir: 'src'
        },
        browser: ['Chrome']
    });

    gulp.watch(['*', '**/*'], {cwd: 'src'}, reload);
});