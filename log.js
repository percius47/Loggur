const moment = require('moment');
const util = require('util');
const path = require('path');
const fs = require('fs');

function lastmod(path) {
    try {
        return fs.statSync(path).mtime.getTime();
    } catch (e) {
        return 0;
    }
}

function mkdir(path) {
    let root = "";
    path.split("/").forEach(dir => {
        root = root ? `${root}/${dir}` : dir;
        lastmod(root) || fs.mkdirSync(root);
    });
}

class LogUtil {

    constructor(options) {
        const opt = options || {};
        this.colors = opt.colors || true;
        this.compact = opt.compact || true;
        this.sorted = opt.sorted === true ? true : false;
        this.depth = opt.depth || null;
        this.join = opt.join || ' ';
        this.break = opt.break || Infinity;
        this.format = opt.format || 'YYMMDD.HHmmss';
    }

    print() {
        console.log(
            moment().format(this.format),
            [...arguments]
                .map(v => util.inspect(v, {
                    maxArrayLength: null,
                    breakLength: this.break,
                    colors: this.colors,
                    compact: this.compact,
                    sorted: this.sorted,
                    depth: this.depth
                }))
                .join(this.join)
        );
    }

    open(options, exits) {
        let log = this;
        let opt = options || {};
        let dir = opt.dir || "logs";
        let exiting = false;
        let logfile = null;
        let logstream = null;
        let pattern = opt.pattern || 'YY-MM-DD-HH';
        let last_pattern;
        let count_min = opt.min || 1000;
        let count = 0;

        mkdir(dir);

        // create file write stream
        function open_file_stream() {
            close_file_stream();
            logfile = path.join(dir, last_pattern = moment().format(pattern));
            logstream = fs.createWriteStream(logfile, {flags: 'a'});
            let cur = path.join(dir, "current");
            try { fs.unlinkSync(cur) } catch (e) { }
            try { fs.symlinkSync(last_pattern, cur) } catch (e) { }
            count = 0;
        }

        function close_file_stream() {
            if (logstream) {
                logstream.end();
                logstream = null;
            }
        }

        function emit_log() {
            log.print(...arguments);
            emit(...arguments);
        }

        function emit() {
            if (exiting) {
                // console.log({dir: opt.dir, exiting_skip_log: obj})
                return;
            }
            let args = [...arguments].map(v => JSON.stringify(v));
            let next_pattern = moment().format(pattern);
            if (++count > count_min && next_pattern !== last_pattern) {
                open_file_stream();
            }
            let output = [moment().format('YYMMDD-HHmmss'),...args,'\n'].join(' ');
            logstream.write(output);
        }

        function exit() {
            exiting = true;
            close_file_stream();
        }

        open_file_stream();

        if (exits) exits.push(exit);

        return { emit, log: emit_log, close: close_file_stream };
    }

}

module.exports = {
    new: function(options) {
        return new LogUtil(options);
    },
    class: LogUtil,
    default: new LogUtil()
};