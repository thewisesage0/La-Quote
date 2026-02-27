const form = document.getElementById('motionForm');
const result = document.getElementById('result');
const resetBtn = document.getElementById('resetBtn');

const converters = {
  velocity: {
    mps: (value) => value,
    kmph: (value) => value * (1000 / 3600),
  },
  acceleration: {
    mps2: (value) => value,
    cmps2: (value) => value / 100,
    g: (value) => value * 9.80665,
  },
  time: {
    s: (value) => value,
    min: (value) => value * 60,
    h: (value) => value * 3600,
  },
  displacement: {
    m: (value) => value,
    km: (value) => value * 1000,
    cm: (value) => value / 100,
  },
};

function parseInput(name) {
  const input = document.getElementById(name).value;
  if (input === '') return null;
  const value = Number(input);
  return Number.isFinite(value) ? value : null;
}

function convertToSI(variable, value) {
  const unit = document.getElementById(`${variable}Unit`).value;
  if (variable === 'u' || variable === 'v') {
    return converters.velocity[unit](value);
  }
  if (variable === 'a') {
    return converters.acceleration[unit](value);
  }
  if (variable === 't') {
    return converters.time[unit](value);
  }
  return converters.displacement[unit](value);
}

function formatSI(variable, value) {
  const units = {
    u: 'm/s',
    v: 'm/s',
    a: 'm/s²',
    t: 's',
    s: 'm',
  };
  return `${value.toFixed(6)} ${units[variable]}`;
}

function solve(known) {
  const missing = ['u', 'v', 'a', 't', 's'].filter((k) => known[k] == null);
  if (missing.length !== 1) {
    throw new Error('Please provide exactly 4 known values so only one variable is missing.');
  }

  const m = missing[0];
  const { u, v, a, t, s } = known;

  if (m === 'v' && u != null && a != null && t != null) {
    return {
      variable: 'v',
      value: u + a * t,
      equation: 'v = u + at',
    };
  }

  if (m === 'u' && v != null && a != null && t != null) {
    return {
      variable: 'u',
      value: v - a * t,
      equation: 'u = v - at',
    };
  }

  if (m === 'a' && v != null && u != null && t != null) {
    if (t === 0) throw new Error('Time cannot be zero when solving for acceleration using a = (v-u)/t.');
    return {
      variable: 'a',
      value: (v - u) / t,
      equation: 'a = (v - u) / t',
    };
  }

  if (m === 't' && v != null && u != null && a != null) {
    if (a === 0) throw new Error('Acceleration cannot be zero when solving for time using t = (v-u)/a.');
    return {
      variable: 't',
      value: (v - u) / a,
      equation: 't = (v - u) / a',
    };
  }

  if (m === 's' && u != null && t != null && a != null) {
    return {
      variable: 's',
      value: u * t + 0.5 * a * t * t,
      equation: 's = ut + 1/2 at²',
    };
  }

  if (m === 'v' && u != null && a != null && s != null) {
    const expr = u * u + 2 * a * s;
    if (expr < 0) throw new Error('Cannot compute v from v² = u² + 2as because RHS is negative.');
    return {
      variable: 'v',
      value: Math.sqrt(expr),
      equation: 'v² = u² + 2as',
    };
  }

  if (m === 'u' && v != null && a != null && s != null) {
    const expr = v * v - 2 * a * s;
    if (expr < 0) throw new Error('Cannot compute u from v² = u² + 2as because RHS is negative.');
    return {
      variable: 'u',
      value: Math.sqrt(expr),
      equation: 'u² = v² - 2as',
    };
  }

  if (m === 'a' && v != null && u != null && s != null) {
    if (s === 0) throw new Error('Displacement cannot be zero when solving for acceleration using a = (v²-u²)/(2s).');
    return {
      variable: 'a',
      value: (v * v - u * u) / (2 * s),
      equation: 'a = (v² - u²) / 2s',
    };
  }

  if (m === 's' && v != null && u != null && a != null) {
    if (a === 0) throw new Error('Acceleration cannot be zero when solving for displacement using s = (v²-u²)/(2a).');
    return {
      variable: 's',
      value: (v * v - u * u) / (2 * a),
      equation: 's = (v² - u²) / 2a',
    };
  }

  if (m === 's' && u != null && v != null && t != null) {
    return {
      variable: 's',
      value: ((u + v) / 2) * t,
      equation: 's = (u + v)/2 × t',
    };
  }

  throw new Error('These inputs do not match a solvable combination from the 3 equations of motion.');
}

function clearResult() {
  result.textContent = '';
  result.className = 'result';
}

resetBtn.addEventListener('click', () => {
  form.reset();
  clearResult();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  clearResult();

  try {
    const raw = {
      u: parseInput('u'),
      v: parseInput('v'),
      a: parseInput('a'),
      t: parseInput('t'),
      s: parseInput('s'),
    };

    const knownSI = {};
    for (const key of Object.keys(raw)) {
      knownSI[key] = raw[key] == null ? null : convertToSI(key, raw[key]);
    }

    const answer = solve(knownSI);

    result.classList.add('success');
    result.innerHTML = `
      <p><strong>Solved variable:</strong> <code>${answer.variable}</code></p>
      <p><strong>Equation used:</strong> <code>${answer.equation}</code></p>
      <p><strong>Answer (SI):</strong> <code>${formatSI(answer.variable, answer.value)}</code></p>
      <details>
        <summary>Converted SI inputs</summary>
        <ul>
          ${Object.entries(knownSI)
            .filter(([, value]) => value != null)
            .map(([k, value]) => `<li><code>${k}</code> = ${formatSI(k, value)}</li>`)
            .join('')}
        </ul>
      </details>
    `;
  } catch (error) {
    result.classList.add('error');
    result.textContent = error.message;
  }
});
