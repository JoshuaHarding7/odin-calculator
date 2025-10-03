/***************
 * Math core (no eval / new Function)
 ***************/
function add(a, b)      { return a + b; }
function subtract(a, b) { return a - b; }
function multiply(a, b) { return a * b; }
function divide(a, b)   { return b === 0 ? Infinity : a / b; }

function operate(op, a, b) {
  switch (op) {
    case '+': return add(a, b);
    case '-': return subtract(a, b);
    case '*': return multiply(a, b);
    case '/': return divide(a, b);
    default:  return NaN;
  }
}

/***************
 * Helpers (formatting, mapping, UI)
 ***************/
function formatResult(n) {
  if (!isFinite(n)) return 'Nice try. No dividing by zero.';
  // Keep sensible precision and strip trailing junk
  const s = Number(n.toFixed(12)).toString();
  return s.length > 14 ? Number(n.toPrecision(10)).toString() : s;
}

function normalizeOp(symbol) {
  if (symbol === '×') return '*';
  if (symbol === '÷') return '/';
  if (symbol === '−') return '-';
  return symbol;
}
function prettyFromOp(op) {
  return op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : op;
}

const displayEl = document.getElementById('display');
const keysEl = document.querySelector('.keys');
const decimalBtn = keysEl.querySelector('[data-type="decimal"]');
const opButtons = Array.from(keysEl.querySelectorAll('[data-type="operator"]'));
let activeOpBtn = null;

function setActiveOperator(opOrNull) {
  if (activeOpBtn) { activeOpBtn.classList.remove('active-op'); activeOpBtn = null; }
  if (!opOrNull) return;
  const symbol = prettyFromOp(opOrNull);
  const btn = opButtons.find(b => b.dataset.op === symbol);
  if (btn) { btn.classList.add('active-op'); activeOpBtn = btn; }
}

function fitDisplay(str) {
  // Adaptive font sizing for long strings
  const len = str.length;
  let size = 32; // px (≈2rem if base 16)
  if (len > 20) size = 18;
  else if (len > 16) size = 21;
  else if (len > 12) size = 26;
  displayEl.style.fontSize = size + 'px';
}

function updateDisplay(str) {
  displayEl.textContent = str;
  fitDisplay(str);
  // dot button enable/disable based on currentValue below (handled in state updates)
}

/***************
 * State
 ***************/
let previousValue = null;   // number | null
let currentValue  = '0';    // string being typed
let operator      = null;   // '+', '-', '*', '/' | null
let justEvaluated = false;  // after '='
let errorLock     = false;  // after divide-by-zero until Clear

function refreshDecimalEnabled() {
  // disable dot if current value already has one
  const hasDot = currentValue.includes('.');
  decimalBtn.disabled = hasDot || errorLock;
}

/***************
 * Input handlers
 ***************/
function inputDigit(d) {
  if (errorLock) return;

  if (justEvaluated) {
    previousValue = null;
    operator = null;
    justEvaluated = false;
    currentValue = '0';
    setActiveOperator(null);
  }

  if (currentValue === '0') currentValue = d;
  else currentValue += d;

  updateDisplay(currentValue);
  refreshDecimalEnabled();
}

function inputDecimal() {
  if (errorLock) return;

  if (justEvaluated) {
    previousValue = null;
    operator = null;
    justEvaluated = false;
    currentValue = '0';
    setActiveOperator(null);
  }

  if (!currentValue.includes('.')) {
    currentValue += (currentValue === '0') ? '.' : '.';
    updateDisplay(currentValue);
  }
  refreshDecimalEnabled();
}

function backspace() {
  if (errorLock) return;

  if (justEvaluated) {
    // If user hits backspace after result, start fresh
    previousValue = null;
    operator = null;
    justEvaluated = false;
    currentValue = '0';
    setActiveOperator(null);
    updateDisplay(currentValue);
    refreshDecimalEnabled();
    return;
  }

  if (currentValue.length <= 1) currentValue = '0';
  else currentValue = currentValue.slice(0, -1);

  updateDisplay(currentValue);
  refreshDecimalEnabled();
}

function toggleSign() {
  if (errorLock) return;
  if (currentValue === '0') return;

  if (currentValue.startsWith('-')) currentValue = currentValue.slice(1);
  else currentValue = '-' + currentValue;

  updateDisplay(currentValue);
}

function percentify() {
  if (errorLock) return;
  const n = Number(currentValue);
  const r = n / 100;
  currentValue = formatResult(r);
  updateDisplay(currentValue);
  refreshDecimalEnabled();
}

function chooseOperator(opSymbol) {
  if (errorLock) return;

  const op = normalizeOp(opSymbol);

  if (justEvaluated) {
    justEvaluated = false;
    operator = op;
    setActiveOperator(op);
    currentValue = ''; // expect new number
    refreshDecimalEnabled();
    return;
  }

  // Move current to previous if none yet
  if (previousValue === null) {
    previousValue = Number(currentValue);
    operator = op;
    setActiveOperator(op);
    currentValue = ''; // waiting for second number
    updateDisplay(String(previousValue));
    refreshDecimalEnabled();
    return;
  }

  // If user taps operators consecutively, replace operator only
  if (currentValue === '') {
    operator = op;
    setActiveOperator(op);
    return;
  }

  // Evaluate chaining a op b, then set new operator
  const a = previousValue;
  const b = Number(currentValue);
  const result = operate(operator, a, b);
  const formatted = formatResult(result);
  updateDisplay(formatted);

  if (!isFinite(result)) {
    errorLock = true;
    previousValue = null;
    currentValue = '0';
    operator = null;
    setActiveOperator(null);
    justEvaluated = false;
    refreshDecimalEnabled();
    return;
  }

  previousValue = result;
  operator = op;
  setActiveOperator(op);
  currentValue = '';
  refreshDecimalEnabled();
}

function evaluateEquals() {
  if (errorLock) return;
  if (previousValue === null || operator === null || currentValue === '') return;

  const a = previousValue;
  const b = Number(currentValue);
  const result = operate(operator, a, b);
  const formatted = formatResult(result);
  updateDisplay(formatted);

  if (!isFinite(result)) {
    errorLock = true;
    previousValue = null;
    currentValue = '0';
    operator = null;
    setActiveOperator(null);
    justEvaluated = false;
    refreshDecimalEnabled();
    return;
  }

  previousValue = result;
  currentValue = formatted;
  operator = null;
  setActiveOperator(null);
  justEvaluated = true;
  refreshDecimalEnabled();
}

function clearAll() {
  previousValue = null;
  currentValue = '0';
  operator = null;
  justEvaluated = false;
  errorLock = false;
  setActiveOperator(null);
  updateDisplay(currentValue);
  refreshDecimalEnabled();
}

/***************
 * Wire buttons (click)
 ***************/
keysEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const type = btn.dataset.type;

  if (type === 'digit')      inputDigit(btn.dataset.digit);
  else if (type === 'decimal')   inputDecimal();
  else if (type === 'backspace') backspace();
  else if (type === 'sign')      toggleSign();
  else if (type === 'percent')   percentify();
  else if (type === 'clear')     clearAll();
  else if (type === 'operator')  chooseOperator(btn.dataset.op);
  else if (type === 'equals')    evaluateEquals();
});

/***************
 * Keyboard support
 ***************/
function handleKey(e) {
  const { key } = e;

  if (/\d/.test(key)) { inputDigit(key); return; }
  if (key === '.')    { inputDecimal(); return; }

  if (key === '+' || key === '-' || key === '*' || key === '/') {
    chooseOperator(key);
    return;
  }

  if (key === 'Enter' || key === '=') { e.preventDefault(); evaluateEquals(); return; }
  if (key === 'Backspace')            { e.preventDefault(); backspace(); return; }
  if (key === 'Escape')               { clearAll(); return; }
  if (key.toLowerCase() === 'c')      { clearAll(); return; }
  if (key === '%')                    { percentify(); return; }
}
window.addEventListener('keydown', handleKey);

// init
updateDisplay(currentValue);
refreshDecimalEnabled();