const { Schema, model } = require('mongoose');

const CounterSchema = new Schema({
    _id: { type: String, required: true },
    sequence_value: { type: Number, default: 0 },
});

const Counter = model('Counter', CounterSchema);

module.exports = Counter;