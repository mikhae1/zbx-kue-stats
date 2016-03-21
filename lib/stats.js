var kue = require('kue');
var fs = require('fs');

var kueStates = ['active', 'inactive', 'complete', 'delayed', 'failed'];
var out = {},
  qcount = 0;

exports.query = function(fname, opts, next) {
  var queue = kue.createQueue({
    //redis: 'redis://uds-redis-test-clu03:6379/1', // flow-test
    prefix: opts.prefix,
    redis: {
      port: opts.port,
      host: opts.host,
      db: opts.db,
      options: {
        connect_timeout: opts.t - 200
      }
    }
  });

  kueStates.forEach(function(type) {
    qcount++;
    queue[type + 'Count'](function(err, count) {
      if (err) return next(err);

      qcount--;
      out['Total ' + type] = count;
    });
  });

  // per type stats
  queue.types(function(err, types) {
    if (err) return next(err);

    types.forEach(function(type) {
      kueStates.forEach(function(state) {
        qcount++;
        queue.cardByType(type, state, function(err, count) {
          if (err) return next(err);

          out[type + ' ' + state] = count;

          if (--qcount === 0) done();
        });
      });
    });
  });

  function done() {
    fs.writeFileSync(fname, JSON.stringify(out, null, 2));

    queue.shutdown(0, function(err) {
      if (err) return next(err);
      next(null, out);
    });
  }
};