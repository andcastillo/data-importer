'use strict';

const fs = require('fs');
let path = '/home/acastillo/Documents/git/cheminfo-js/openchemlib-extended/prediction3JHN.cvs';

function errorScore(path) {
  const data = fs.readFileSync(path).toString().split('\n');

  let result = {};
  for (let i = 1; i < data.length - 1; i++) {
    let row = data[i].split(',');
    let type = row[4];
    if (type) {
      if (!result[type]) {
        result[type] = [0, 0];
      }
      result[type][0] += Math.abs(Number(row[6]) - Number(row[7]));
      result[type][1]++;
    }
  }
  
  let types = Object.keys(result);
  let score = 0;
  console.log(types.length);
  for (let type of types) {
    score += Math.log(result[type][0] / result[type][1]);
    console.log(type + ' ' + result[type][1] +' ' + ( result[type][0] / result[type][1]) + ' ' + Math.log(result[type][0] / result[type][1]));
  
  }
  console.log('Score: ' + score / types.length + ' ' + Math.log(score / types.length));
}

module.exports = errorScore;
