(() => {
  function ensurePickerStyles() {
    if (document.getElementById('dailySavedFoodPickerStyles')) return;
    const style = document.createElement('style');
    style.id = 'dailySavedFoodPickerStyles';
    style.textContent = `
      .daily-saved-food-picker{width:100%;max-width:100%;min-width:0;overflow:hidden;margin-bottom:10px}
      .daily-saved-food-picker .add-row{display:grid;grid-template-columns:minmax(0,1fr) 76px 28px auto;gap:6px;align-items:center;width:100%;min-width:0}
      .daily-saved-food-picker input{width:100%;max-width:100%;min-width:0}
      .daily-saved-food-picker #dailySavedIngredientUnit{min-width:0;white-space:nowrap;text-align:center;font-size:12px;color:var(--muted)}
      .daily-saved-food-picker button{padding-left:12px;padding-right:12px;white-space:nowrap}
      .daily-saved-food-picker small{display:block;margin-top:6px}
      @media(max-width:380px){
        .daily-saved-food-picker .add-row{grid-template-columns:minmax(0,1fr) 66px 24px auto;gap:5px}
        .daily-saved-food-picker button{padding-left:10px;padding-right:10px}
      }
    `;
    document.head.appendChild(style);
  }

  function waitForFoodLog() {
    if (typeof ingredients === 'undefined' || !Array.isArray(ingredients) || !ingredients.length || typeof addEntryToDay !== 'function') {
      setTimeout(waitForFoodLog, 100);
      return;
    }

    ensurePickerStyles();

    const addCard = document.querySelector('#diaryPanel .add-card');
    if (!addCard || document.getElementById('dailySavedIngredientSearch')) return;

    const picker = document.createElement('div');
    picker.className = 'daily-saved-food-picker';
    picker.innerHTML = `
      <div class="add-row">
        <input id="dailySavedIngredientSearch" list="ingredientDatalist" type="search" placeholder="Search saved foods" autocomplete="off" aria-label="Saved ingredient">
        <input id="dailySavedIngredientAmount" type="number" min="0" step="1" value="100" aria-label="Amount">
        <span id="dailySavedIngredientUnit">g</span>
        <button id="addSavedIngredientToDay" type="button">Add</button>
      </div>
      <small class="seasoning">Add from your saved foods</small>
    `;

    addCard.prepend(picker);

    const search = document.getElementById('dailySavedIngredientSearch');
    const amount = document.getElementById('dailySavedIngredientAmount');
    const unit = document.getElementById('dailySavedIngredientUnit');
    const addButton = document.getElementById('addSavedIngredientToDay');

    const sorted = ingredients.slice().sort((a, b) => a.name.localeCompare(b.name));

    function selectedIngredient() {
      const q = String(search.value || '').toLowerCase().trim();
      if (!q) return null;
      return sorted.find(i => i.name.toLowerCase() === q || i.id.toLowerCase() === q)
        || sorted.find(i => i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q))
        || null;
    }

    function refreshUnit() {
      const ing = selectedIngredient();
      unit.textContent = ing ? ingredientUnitLabel(ing) : '';
      if (ing && ['item', 'scoop', 'can', 'pack'].includes(ing.unit) && Number(amount.value) === 100) amount.value = 1;
    }

    search.addEventListener('input', refreshUnit);
    addButton.addEventListener('click', () => {
      const ing = selectedIngredient();
      const qty = Number(amount.value || 0);
      if (!ing || qty <= 0) {
        showToast('Search for a saved food first');
        return;
      }
      const unitLabel = ingredientUnitLabel(ing);
      addEntryToDay(
        `${ing.name} (${fmt(qty)} ${unitLabel})`,
        ingredientMacros(ing, qty),
        [{ name: ing.name, amount: qty, unit: unitLabel }]
      );
      showToast('Added');
    });

    refreshUnit();
  }

  ensurePickerStyles();
  waitForFoodLog();
})();
