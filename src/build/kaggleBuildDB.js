'use strict';

const fs = require('fs');

const dataFolder = '/home/acastillo/Documents/kaggle/champs-scalar-coupling/';
const type = '3JHN';

function build(path, type) {

  var train = fs.readFileSync(`${path}/train-${type}.csv`).toString().split('\n');
  let head = train.splice(0, 1);

  let max = train.length - 1;
  let db = [{}, {}, {}, {}, {}];
  for (let i = 0; i < max; i++) {
    if (i % 10000 === 0) {
      console.log(i / max * 100);
    }

    let example = train[i].split(',');
    if (example[4] === type) {
      example[0] = Number(example[0]);
      example[2] = Number(example[2]);
      example[3] = Number(example[3]);
      example[5] = Number(example[5]);
      example[6] = Number(example[6]);
      example[7] = Number(example[7]);
      example[8] = Number(example[8]);

      for (let k = 14; k >= 10; k--) {
        if (example[k].length > 0) {
          if (!db[k - 10][example[k]]) {
            db[k - 10][example[k]] = { cs: [], d1: [], t: [] };
          }

          db[k - 10][example[k]].cs.push(example[5]);
          db[k - 10][example[k]].d1.push(Math.round(example[6] * 100000) / 100000);
          db[k - 10][example[k]].t.push(Math.round(example[8] * 100000) / 100000);
        }
      }
    }
  }

  // storeData(diaIDs, db);
  fs.writeFileSync(`${path}/kaggle${type}-full.json`, JSON.stringify(db));
}

module.exports = build;



