'use strict';
const ProgressBar = require('progress');
const fs = require('fs');
const Glob = require('glob').Glob;
const mkdir = path => new Promise((s, e) => fs.mkdir(path, (x, r) => x ? e(x) : s(r)));
const MAXCONCURRENCY = 16;

const IN_PATH = './alottafiles/node_modules';
const OUT_PATH = './alottafiles/_node_modules';

module.exports = function copyFiles(filecopier) {
    let start = Date.now();
    let folderCount = 0;
    let fileCount = 0;

    console.log('creating folder structure, gathering files...');
    const mg = new Glob(IN_PATH + '/**/*', {
        mark: true,
    }, function globMatch() {
        console.log(folderCount + ' folders created, '
        + fileCount + ' files gathered in '
        + Math.round(Date.now() - start) + 'ms.');
        console.log('\nfile copying starting...');
        prog = new ProgressBar(':bar :ratef/s :percent :etas', {
            complete: '█',
            incomplete: '░',
            total: fileCount,
        });

        start = Date.now();
        files.slice(0, MAXCONCURRENCY).map(startNextFile);
    });
    
    process.on('exit', () => {
        console.log(fileCount + ' files copied in ' + Math.round(Date.now() - start) + 'ms.');
    });

    let ci = 0;
    let prog;
    const files = [];
    function startNextFile() {
        const i = ci++;
        if (!files[i]) { return; }
        files[i](function complete(ex) {
            if (ex) { console.error(ex); }
            prog.tick(1);
            startNextFile();
        });
    }

    const p = Promise.resolve(mkdir(OUT_PATH).catch(reportError));
    mg.on('match', function onMatch(src, st) {
        const dest = OUT_PATH + src.substring(IN_PATH.length);
        if (/\/$/.test(src)) {
            folderCount += 1;
            p.then(() => mkdir(dest).catch(reportError));
            return;
        } else {
            fileCount += 1;
            if (fileCount % 1000 === 0) {
                console.log('gathered ' + fileCount + ' files.');
            }
            files.push(cb => filecopier(src, dest, cb));
        }
    });
};

function reportError(ex) {
    if (ex.code = 'EEXIST') { return; }
    console.error(ex);
    process.exit(2);
}
