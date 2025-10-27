const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PACK_LIMIT_FILE = path.join(DATA_DIR, 'pack_limits.json');

const PACKS = {
  iconic: {
    name: 'Iconic Moment Pack',
    cost: 500,
    currency: 'eCoins',
    description: 'Premium pack featuring Iconic stars with supporting Black to White cards.',
    rarity_chances: {
      Iconic: 0.12,
      Black: 0.18,
      Gold: 0.20,
      Silver: 0.18,
      Bronze: 0.17,
      White: 0.15,
    },
    includeRarities: ['Iconic', 'Black', 'Gold', 'Silver', 'Bronze', 'White'],
  },
  legend: {
    name: 'Legend Box Draw',
    cost: 25000,
    currency: 'GP',
    description: 'A box draw with a strong emphasis on Legend players.',
    rarity_chances: {
      Legend: 0.05,
      Black: 0.15,
      Gold: 0.25,
      Silver: 0.35,
      Bronze: 0.20,
      White: 0.0,
    },
    includeRarities: ['Legend', 'Black', 'Gold', 'Silver', 'Bronze'],
  },
  standard: {
    name: 'Standard Pack',
    cost: 10000,
    currency: 'GP',
    description: 'Standard pack featuring a balanced selection of players.',
    rarity_chances: {
      Black: 0.05,
      Gold: 0.20,
      Silver: 0.40,
      Bronze: 0.25,
      White: 0.10,
    },
    includeRarities: ['Black', 'Gold', 'Silver', 'Bronze', 'White'],
  },
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadPackLimits() {
  ensureDataDir();
  if (!fs.existsSync(PACK_LIMIT_FILE)) {
    const defaults = {
      iconic: { remaining: PACKS.iconic.limit, total: PACKS.iconic.limit },
    };
    fs.writeFileSync(PACK_LIMIT_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }

  try {
    const data = JSON.parse(fs.readFileSync(PACK_LIMIT_FILE, 'utf8'));
    if (!data.iconic) {
      data.iconic = { remaining: PACKS.iconic.limit, total: PACKS.iconic.limit };
    } else {
      data.iconic.total = PACKS.iconic.limit;
      if (typeof data.iconic.remaining !== 'number') {
        data.iconic.remaining = PACKS.iconic.limit;
      }
    }
    return data;
  } catch (err) {
    const defaults = {
      iconic: { remaining: PACKS.iconic.limit, total: PACKS.iconic.limit },
    };
    fs.writeFileSync(PACK_LIMIT_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
}

function savePackLimits(limits) {
  ensureDataDir();
  fs.writeFileSync(PACK_LIMIT_FILE, JSON.stringify(limits, null, 2));
}

module.exports = {
  PACKS,
  PACK_LIMIT_FILE,
  loadPackLimits,
  savePackLimits,
};
