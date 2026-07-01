let ingredients = [];
let recipes = [];
let ingredientMap = new Map();
let customTags = loadCustomTags();

const fmt = n => Number.isFinite(n) ? (Math.round(n * 10) / 10).toString() : '0';
const tagStoreKey = 'recipeLibraryCustomTags';

function loadCustomTags(){
  try {
    return JSON.parse(localStorage.getItem('recipeLibraryCustomTags')) || {};
  } catch {
    return {};
  }
}

function saveCustomTags(){
  localStorage.setItem(tagStoreKey, JSON.stringify(customTags));
}

function escapeHTML(value){
  return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function normalizeTag(value){
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 32);
}

function getRecipeTags(recipe){
  return customTags[recipe.id] || recipe.tags || [];
}

function setRecipeTags(recipeId, tags){
  const unique = [...new Set(tags.map(normalizeTag).filter(Boolean))];
  customTags[recipeId] = unique;
  saveCustomTags();
}

function emptyMacros(){return {calories:0,protein:0,carbs:0,fat:0,fibre:0,addedSugar:0,naturalSugar:0,totalSugar:0};}

function addMacros(a,b){
  for(const key of Object.keys(a)) a[key] += b[key] || 0;
  a.totalSugar = a.addedSugar + a.naturalSugar;
  return a;
}

function ingredientMacros(ingredient, amount){
  const m = emptyMacros();
  if(!ingredient) return m;
  const factor = ingredient.unit === 'item' || ingredient.unit === 'scoop' || ingredient.unit === 'can' || ingredient.unit === 'pack'
    ? amount
    : amount / 100;
  for(const key of ['calories','protein','carbs','fat','fibre','addedSugar','naturalSugar']){
    m[key] = (ingredient[key] || 0) * factor;
  }
  m.totalSugar = m.addedSugar + m.naturalSugar;
  return m;
}

function recipeMacros(recipe){
  const total = emptyMacros();
  document.querySelectorAll(`[data-recipe="${recipe.id}"][data-ingredient]`).forEach(input => {
    const ing = ingredientMap.get(input.dataset.ingredient);
    addMacros(total, ingredientMacros(ing, Number(input.value || 0)));
  });
  return total;
}

function macroHTML(m){
  return `<div class="macro"><strong>${fmt(m.calories)}</strong><span>kcal</span></div>
  <div class="macro"><strong>${fmt(m.protein)}g</strong><span>protein</span></div>
  <div class="macro"><strong>${fmt(m.carbs)}g</strong><span>carbs</span></div>
  <div class="macro"><strong>${fmt(m.fat)}g</strong><span>fat</span></div>
  <div class="macro"><strong>${fmt(m.fibre)}g</strong><span>fibre</span></div>`;
}

function sugarText(m){
  return `Added sugar: ${fmt(m.addedSugar)}g · Natural sugar: ${fmt(m.naturalSugar)}g · Total sugar: ${fmt(m.totalSugar)}g`;
}

function refreshTagFilter(){
  const tagFilter = document.getElementById('tagFilter');
  const selected = tagFilter.value;
  const tags = [...new Set(recipes.flatMap(getRecipeTags))].sort((a,b)=>a.localeCompare(b));
  tagFilter.innerHTML = '<option value="">All tags</option>';
  tags.forEach(t => tagFilter.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(t)}">${escapeHTML(t)}</option>`));
  tagFilter.value = tags.includes(selected) ? selected : '';
}

function renderTagChips(recipe){
  return getRecipeTags(recipe).map(t => `
    <span class="tag">${escapeHTML(t)} <button type="button" class="tag-x" data-remove-tag="${escapeHTML(recipe.id)}" data-tag="${escapeHTML(t)}" aria-label="Remove ${escapeHTML(t)} tag">×</button></span>
  `).join('');
}

function renderRecipes(){
  const q = document.getElementById('search').value.toLowerCase().trim();
  const tag = document.getElementById('tagFilter').value;
  const grid = document.getElementById('recipeGrid');
  grid.innerHTML = '';

  const matchingRecipes = recipes.filter(r => {
    const tags = getRecipeTags(r);
    const ingredientNames = (r.ingredients || []).map(item => ingredientMap.get(item.ingredientId)?.name || item.ingredientId);
    const text = [r.name, ...tags, ...ingredientNames, ...(r.method||[]), ...(r.seasoning||[])].join(' ').toLowerCase();
    return (!q || text.includes(q)) && (!tag || tags.includes(tag));
  });

  if(!matchingRecipes.length){
    grid.innerHTML = '<article class="card"><h2>No recipes found</h2><p class="seasoning">Try a different keyword or tag.</p></article>';
    return;
  }

  matchingRecipes.forEach(recipe => {
    const card = document.createElement('article');
    card.className = 'card';
    const rows = recipe.ingredients.map(item => {
      const ing = ingredientMap.get(item.ingredientId);
      const label = ing ? ing.name : item.ingredientId;
      const unitLabel = ing && ['item','scoop','can','pack'].includes(ing.unit) ? ing.unit : 'g';
      return `<tr><td>${escapeHTML(label)}</td><td><input type="number" min="0" step="1" value="${item.amount}" data-recipe="${escapeHTML(recipe.id)}" data-ingredient="${escapeHTML(item.ingredientId)}"></td><td>${escapeHTML(unitLabel)}</td></tr>`;
    }).join('');

    card.innerHTML = `<h2>${escapeHTML(recipe.name)}</h2>
      <div class="tags">${renderTagChips(recipe)}</div>
      <div class="tag-editor">
        <input type="text" placeholder="Add tag" data-tag-input="${escapeHTML(recipe.id)}">
        <button type="button" data-add-tag="${escapeHTML(recipe.id)}">Add</button>
      </div>
      <div class="macro-line" id="macros-${escapeHTML(recipe.id)}"></div>
      <p class="seasoning" id="sugar-${escapeHTML(recipe.id)}"></p>
      <table><thead><tr><th>Ingredient</th><th>Amount</th><th>Unit</th></tr></thead><tbody>${rows}</tbody></table>
      ${(recipe.seasoning||[]).length ? `<p class="seasoning"><strong>Seasoning:</strong> ${recipe.seasoning.map(escapeHTML).join(', ')}</p>` : ''}
      <ol class="method">${(recipe.method||[]).map(step=>`<li>${escapeHTML(step)}</li>`).join('')}</ol>`;
    grid.appendChild(card);
  });
  document.querySelectorAll('input[data-recipe]').forEach(input => input.addEventListener('input', updateAllMacros));
  updateAllMacros();
}

function updateAllMacros(){
  recipes.forEach(recipe => {
    const box = document.getElementById(`macros-${recipe.id}`);
    const sugar = document.getElementById(`sugar-${recipe.id}`);
    if(!box) return;
    const total = recipeMacros(recipe);
    box.innerHTML = macroHTML(total);
    sugar.textContent = sugarText(total);
  });
  updateIngredientCalculator();
}

function populateIngredientSelect(){
  const filter = document.getElementById('ingredientSearch').value.toLowerCase().trim();
  const select = document.getElementById('ingredientSelect');
  const previous = select.value;
  const filtered = ingredients
    .slice()
    .sort((a,b)=>a.name.localeCompare(b.name))
    .filter(i => !filter || i.name.toLowerCase().includes(filter) || i.id.toLowerCase().includes(filter));

  select.innerHTML = '';
  filtered.forEach(i => {
    select.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(i.id)}">${escapeHTML(i.name)}</option>`);
  });

  if(filtered.some(i => i.id === previous)) select.value = previous;
  else if(filtered[0]) select.value = filtered[0].id;

  updateIngredientCalculator();
}

function updateIngredientCalculator(){
  const select = document.getElementById('ingredientSelect');
  const id = select.value;
  const amount = Number(document.getElementById('ingredientAmount').value || 0);
  const ing = ingredientMap.get(id);
  const unit = document.getElementById('ingredientUnit');

  if(!ing){
    unit.textContent = '';
    document.getElementById('ingredientResult').innerHTML = '<p class="seasoning">No matching ingredient found.</p>';
    return;
  }

  unit.textContent = ['item','scoop','can','pack'].includes(ing.unit) ? ing.unit : 'g';
  const m = ingredientMacros(ing, amount);
  document.getElementById('ingredientResult').innerHTML = macroHTML(m) + `<p class="seasoning">${sugarText(m)}</p>`;
}

function handleRecipeGridClick(event){
  const addButton = event.target.closest('[data-add-tag]');
  const removeButton = event.target.closest('[data-remove-tag]');

  if(addButton){
    const recipeId = addButton.dataset.addTag;
    const recipe = recipes.find(r => r.id === recipeId);
    const input = document.querySelector(`[data-tag-input="${recipeId}"]`);
    const newTag = normalizeTag(input.value);
    if(recipe && newTag){
      setRecipeTags(recipeId, [...getRecipeTags(recipe), newTag]);
      refreshTagFilter();
      renderRecipes();
    }
  }

  if(removeButton){
    const recipeId = removeButton.dataset.removeTag;
    const recipe = recipes.find(r => r.id === recipeId);
    const tagToRemove = removeButton.dataset.tag;
    if(recipe){
      setRecipeTags(recipeId, getRecipeTags(recipe).filter(t => t !== tagToRemove));
      refreshTagFilter();
      renderRecipes();
    }
  }
}

async function init(){
  const [ingRes, recRes] = await Promise.all([fetch('ingredients.json'), fetch('recipes.json')]);
  ingredients = await ingRes.json();
  recipes = await recRes.json();
  ingredientMap = new Map(ingredients.map(i => [i.id, i]));
  refreshTagFilter();
  populateIngredientSelect();
  renderRecipes();
  document.getElementById('search').addEventListener('input', renderRecipes);
  document.getElementById('tagFilter').addEventListener('change', renderRecipes);
  document.getElementById('ingredientSearch').addEventListener('input', populateIngredientSelect);
  document.getElementById('ingredientSelect').addEventListener('change', updateIngredientCalculator);
  document.getElementById('ingredientAmount').addEventListener('input', updateIngredientCalculator);
  document.getElementById('recipeGrid').addEventListener('click', handleRecipeGridClick);
}

init().catch(err => {
  document.getElementById('recipeGrid').innerHTML = `<article class="card"><h2>Could not load recipes</h2><p>${escapeHTML(err.message)}</p></article>`;
});
