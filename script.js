// Grid de LaLiga: cuadrícula diaria 3x3 de clubes (jugadores.js lo genera scripts/construir.py).
var EPOCA = Date.UTC(2026, 9, 6), INTENTOS = 9, MIN_RESPUESTAS = 3;
function $(id) { return document.getElementById(id); }
function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
var hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
var dia = Math.floor((Date.parse(hoy + 'T00:00:00Z') - EPOCA) / 86400000);

function respuestas(a, b) {
  return JUGADORES.filter(function (j) { return j.c.indexOf(a) >= 0 && j.c.indexOf(b) >= 0; });
}

// Generador con semilla: mismo grid para todos el mismo día. Se buscan 3+3 clubes con casillas jugables.
function generar(semilla) {
  var s = semilla * 2654435761 % 4294967296;
  function rnd() { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }
  for (var intento = 0; intento < 5000; intento++) {
    var idx = CLUBES.map(function (_, i) { return i; });
    for (var i = idx.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    var filas = idx.slice(0, 3), cols = idx.slice(3, 6), vale = true;
    for (var f = 0; f < 3 && vale; f++) for (var c = 0; c < 3 && vale; c++) if (respuestas(filas[f], cols[c]).length < MIN_RESPUESTAS) vale = false;
    if (vale) return { filas: filas, cols: cols };
  }
  return null;
}
var G = generar(dia + 1);

var estado = { dia: dia, celdas: {}, usados: 0 };
try { var g = JSON.parse(localStorage.getItem('grid-laliga')); if (g && g.dia === dia) estado = g; } catch (e) {}
function guardar() { try { localStorage.setItem('grid-laliga', JSON.stringify(estado)); } catch (e) {} }
var activa = null, lista = [];

function aciertos() { return Object.keys(estado.celdas).length; }
function terminado() { return aciertos() === 9 || estado.usados >= INTENTOS; }

function pintar() {
  $('numero').textContent = '#' + (dia + 1);
  $('vidas').textContent = (INTENTOS - estado.usados) + ' intentos';
  var h = '<div></div>' + G.cols.map(function (c) { return '<div class="club">' + CLUBES[c] + '</div>'; }).join('');
  G.filas.forEach(function (f, fi) {
    h += '<div class="club">' + CLUBES[f] + '</div>';
    G.cols.forEach(function (c, ci) {
      var k = fi + '-' + ci, v = estado.celdas[k];
      h += '<button class="celda' + (v ? ' ok' : '') + (activa === k ? ' activa' : '') + '" data-k="' + k + '"' + (v || terminado() ? ' disabled' : '') + '>' + (v || '') + '</button>';
    });
  });
  $('grid').innerHTML = h;
  $('final').hidden = !terminado();
  if (terminado()) {
    $('panel').hidden = true;
    $('finalTit').textContent = aciertos() === 9 ? '¡Grid completo!' : aciertos() + ' de 9';
  }
}

function abrir(k) {
  activa = k;
  var p = k.split('-');
  $('panelTit').textContent = CLUBES[G.filas[+p[0]]] + ' y ' + CLUBES[G.cols[+p[1]]];
  $('panel').hidden = false;
  $('entrada').value = '';
  $('sugerencias').hidden = true;
  $('entrada').focus();
  pintar();
}

function probar(j) {
  if (!activa || !j) return;
  var p = activa.split('-'), f = G.filas[+p[0]], c = G.cols[+p[1]];
  var usado = Object.keys(estado.celdas).some(function (k) { return estado.celdas[k] === j.n; });
  if (usado) return;
  estado.usados++;
  var celda = activa;
  if (j.c.indexOf(f) >= 0 && j.c.indexOf(c) >= 0) { estado.celdas[celda] = j.n; activa = null; $('panel').hidden = true; }
  guardar();
  pintar();
  if (!estado.celdas[celda]) {
    var el = document.querySelector('[data-k="' + celda + '"]');
    if (el) { el.classList.add('agitar'); }
    $('entrada').value = '';
    $('sugerencias').hidden = true;
  }
}

$('grid').addEventListener('click', function (e) { var b = e.target.closest('.celda'); if (b && !b.disabled) abrir(b.dataset.k); });
$('cerrar').addEventListener('click', function () { activa = null; $('panel').hidden = true; pintar(); });
$('entrada').addEventListener('input', function () {
  var q = norm($('entrada').value);
  lista = q.length < 2 ? [] : JUGADORES.filter(function (j) { return norm(j.n).indexOf(q) >= 0; }).slice(0, 8);
  $('sugerencias').hidden = !lista.length;
  $('sugerencias').innerHTML = lista.map(function (j, i) { return '<li data-i="' + i + '"></li>'; }).join('');
  $('sugerencias').querySelectorAll('li').forEach(function (li) { li.textContent = lista[+li.dataset.i].n; });
});
$('sugerencias').addEventListener('mousedown', function (e) {
  var li = e.target.closest('li');
  if (li) { e.preventDefault(); probar(lista[+li.dataset.i]); }
});
$('entrada').addEventListener('keydown', function (e) { if (e.key === 'Enter' && lista.length) { e.preventDefault(); probar(lista[0]); } });
$('compartir').addEventListener('click', function () {
  var filas = [0, 1, 2].map(function (f) { return [0, 1, 2].map(function (c) { return estado.celdas[f + '-' + c] ? '🟩' : '⬜'; }).join(''); });
  var txt = 'Grid de LaLiga #' + (dia + 1) + ': ' + aciertos() + '/9\n' + filas.join('\n') + '\n' + location.href.split('#')[0];
  if (navigator.share) navigator.share({ text: txt }).catch(function () {});
  else navigator.clipboard.writeText(txt).then(function () { $('compartir').textContent = 'Copiado'; });
});
pintar();
