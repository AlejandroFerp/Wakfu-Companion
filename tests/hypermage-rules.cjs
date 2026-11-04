const assert = require('node:assert/strict');
const { createHypermageObservations, observeHypermageLine } = require('../public/assets/js/modules/hypermageRules.js');
const line = text => `20:25:26,508 - [Información (combate)] ${text}`;
let state = createHypermageObservations();
for (const n of [10, 20, 50, 60]) state = observeHypermageLine(state, 'Bucrota', line(`Bucrota: Abundancia (+${n} niv.) (Runa generada)`));
assert.equal(state.abundance, 60);
state = observeHypermageLine(state, 'Bucrota', line('Otro: Abundancia (+100 niv.)'));
assert.equal(state.abundance, 60);
state = observeHypermageLine(state, 'Bucrota', line('Bucrota: Consume Abundancia'));
assert.equal(state.abundance, null);
state = observeHypermageLine(state, 'Bucrota', line("[Bucrota] Fuego fatuo: Guardado Acua'runa"));
assert.equal(state.lastGeneratedRune, "Acua'runa");
state = observeHypermageLine(state, 'Bucrota', line('Bucrota: 25 BC (Runa generada)'));
assert.equal(state.lastBCChange, 25);
state = observeHypermageLine(state, 'Bucrota', line('Bucrota: Brisa Cuadramental Almacenada (+500 niv.) (Corazón de Luz activo)'));
assert.equal(state.breeze, 500);
console.log('Reglas de observación del hipermago: correctas');

