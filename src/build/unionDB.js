'use strict';

const fs = require('fs');

const path = 'data/';
// const types = ['1JHC', '2JHC', '3JHC', '1JHN', '2JHN', '3JHN', '2JHH', '3JHH'];
const types = ['2JHH', '3JHH'];
let db = {};
types.forEach(type => {
    db[type] = JSON.parse(fs.readFileSync(`${path}/kaggle${type}.json`).toString());
    db[type].forEach(x => console.log(Object.keys(x).length));
    //console.log(db[type].length)
});

fs.writeFileSync(`${path}/cheminfo${types[0].substring(2)}.json`, JSON.stringify(db));

